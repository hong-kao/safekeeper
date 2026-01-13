import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, INSURANCE_POOL_ABI } from '../services/viem';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';

export const useLiquidity = () => {
    const { address, isConnected } = useAccount();
    const [lpPosition, setLpPosition] = useState({
        shares: 0n,
        underlying: 0n,
        pendingInterest: 0n,
        formatted: {
            shares: '0',
            underlying: '0',
            pendingInterest: '0'
        }
    });
    const [lpHistory, setLpHistory] = useState([]);
    const [dynamicApr, setDynamicApr] = useState(null);
    const [pendingDepositAmount, setPendingDepositAmount] = useState(null);
    const [pendingWithdrawShares, setPendingWithdrawShares] = useState(null);

    // Write Hook
    const {
        data: hash,
        writeContract,
        isPending: isWritePending,
        error: writeError,
        reset: resetWrite
    } = useWriteContract();

    // Transaction Receipt
    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        data: txReceipt
    } = useWaitForTransactionReceipt({ hash });

    // READ: Pool Status
    const { data: poolStatusData, refetch: refetchPoolStatus, error: poolStatusError } = useReadContract({
        address: CONTRACTS.insurancePool,
        abi: INSURANCE_POOL_ABI,
        functionName: 'getPoolStatus',
    });

    // READ: On-chain APR (fallback)
    const { data: aprData, error: aprError } = useReadContract({
        address: CONTRACTS.insurancePool,
        abi: INSURANCE_POOL_ABI,
        functionName: 'lpAprBps',
    });

    // READ: LP Position
    const { data: positionData, refetch: refetchPosition, error: positionError } = useReadContract({
        address: CONTRACTS.insurancePool,
        abi: INSURANCE_POOL_ABI,
        functionName: 'getLpPosition',
        args: [address],
        enabled: !!address,
    });

    // READ: User Wallet Balance
    const { data: balanceData, refetch: refetchBalance } = useBalance({
        address: address,
    });

    // Combine read errors
    const readError = poolStatusError || aprError || (address && positionError);

    // Debug: Log contract address and errors
    console.log('[useLiquidity] Contract:', CONTRACTS.insurancePool);
    console.log('[useLiquidity] Read errors:', { poolStatusError, aprError, positionError });
    console.log('[useLiquidity] Pool data:', poolStatusData);

    // Fetch dynamic APR from backend
    const fetchDynamicApr = useCallback(async () => {
        try {
            const response = await apiClient.get('/lp/stats');
            setDynamicApr(response.data);
        } catch (error) {
            console.error('Failed to fetch dynamic APR:', error);
        }
    }, []);

    // Fetch LP history from backend
    const fetchLpHistory = useCallback(async () => {
        if (!address) return;
        try {
            const response = await apiClient.get(`/lp/history/${address}`);
            setLpHistory(response.data.history || []);
        } catch (error) {
            console.error('Failed to fetch LP history:', error);
        }
    }, [address]);

    // Record deposit in backend
    const recordDeposit = useCallback(async (txHash, amount, shares) => {
        try {
            await apiClient.post('/lp/deposit', {
                userAddress: address,
                amount: amount.toString(),
                sharesIssued: shares.toString(),
                txHash
            });
            fetchLpHistory();
        } catch (error) {
            console.error('Failed to record deposit:', error);
        }
    }, [address, fetchLpHistory]);

    // Record withdraw in backend
    const recordWithdraw = useCallback(async (txHash, shares, amountPaid) => {
        try {
            await apiClient.post('/lp/withdraw', {
                userAddress: address,
                sharesBurned: shares.toString(),
                amountPaid: amountPaid.toString(),
                txHash
            });
            fetchLpHistory();
        } catch (error) {
            console.error('Failed to record withdrawal:', error);
        }
    }, [address, fetchLpHistory]);

    // Process Pool Data
    const poolStatus = poolStatusData ? {
        balance: formatEther(poolStatusData[0]),
        totalPremiums: formatEther(poolStatusData[1]),
        totalClaims: formatEther(poolStatusData[2]),
        activePolicies: poolStatusData[3].toString(),
    } : null;

    // Use dynamic APR from backend, fallback to on-chain
    // effectiveAprBps = 1500 means 15% = 0.15 as decimal
    const aprPercentage = dynamicApr
        ? Number(dynamicApr.effectiveAprBps) / 10000
        : (aprData ? Number(aprData) / 10000 : 0);

    // Update local state when position data changes
    useEffect(() => {
        if (positionData) {
            setLpPosition({
                shares: positionData[0],
                underlying: positionData[1],
                pendingInterest: positionData[2],
                formatted: {
                    shares: formatEther(positionData[0]),
                    underlying: formatEther(positionData[1]),
                    pendingInterest: formatEther(positionData[2]),
                }
            });
        }
    }, [positionData]);

    // Fetch data on mount and periodically
    useEffect(() => {
        fetchDynamicApr();
        fetchLpHistory();

        const interval = setInterval(() => {
            fetchDynamicApr();
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [fetchDynamicApr, fetchLpHistory]);

    // Handle transaction confirmation - record in backend
    useEffect(() => {
        if (isConfirmed && hash) {
            refetchPoolStatus();
            refetchPosition();
            refetchBalance();

            // Record in backend based on pending action
            if (pendingDepositAmount) {
                // Estimate shares as 1:1 for simplicity (actual shares from contract events would be better)
                recordDeposit(hash, pendingDepositAmount, pendingDepositAmount);
                setPendingDepositAmount(null);
            }
            if (pendingWithdrawShares) {
                // Estimate payout as shares value (simplified)
                recordWithdraw(hash, pendingWithdrawShares, pendingWithdrawShares);
                setPendingWithdrawShares(null);
            }
        }
    }, [isConfirmed, hash, refetchPoolStatus, refetchPosition, refetchBalance, pendingDepositAmount, pendingWithdrawShares, recordDeposit, recordWithdraw]);

    // Actions
    const deposit = (amountEther) => {
        const amountWei = parseEther(amountEther);
        setPendingDepositAmount(amountWei.toString());
        setPendingWithdrawShares(null); // Clear other action
        writeContract({
            address: CONTRACTS.insurancePool,
            abi: INSURANCE_POOL_ABI,
            functionName: 'deposit',
            value: amountWei,
        });
    };

    const withdraw = (sharesAmount) => {
        setPendingWithdrawShares(sharesAmount.toString());
        setPendingDepositAmount(null); // Clear other action
        writeContract({
            address: CONTRACTS.insurancePool,
            abi: INSURANCE_POOL_ABI,
            functionName: 'withdraw',
            args: [sharesAmount],
        });
    };

    // Determine which action is pending
    const isDepositPending = (isWritePending || isConfirming) && pendingDepositAmount !== null;
    const isWithdrawPending = (isWritePending || isConfirming) && pendingWithdrawShares !== null;

    return {
        // Data
        poolStatus,
        aprPercentage,
        dynamicApr, // Includes breakdown (base, utilization, volatility)
        lpPosition,
        lpHistory,
        isConnected,
        address,
        walletBalance: balanceData ? {
            value: balanceData.value,
            formatted: parseFloat(formatEther(balanceData.value)).toFixed(4),
            symbol: balanceData.symbol
        } : null,

        // Transaction State - now specific to action type
        isDepositPending,
        isWithdrawPending,
        isWritePending,
        isConfirming,
        isConfirmed,
        writeError,
        readError, // Add read error for display
        hash,

        // Actions
        deposit,
        withdraw,
        refetch: () => {
            refetchPoolStatus();
            refetchPosition();
            refetchBalance();
            fetchDynamicApr();
            fetchLpHistory();
        }
    };
};
