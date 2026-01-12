import { useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { publicClient, walletClient, CONTRACTS, INSURANCE_POOL_ABI, PRICING_ABI } from '../services/viem';

export const useInsurance = (userAddress) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    //get premium quote from backend
    const getQuote = useCallback(async (positionSize, leverage, volatility = 0) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/insurance/quote', {
                positionSize,
                leverage,
                volatility,
            });
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    //calculate premium directly from contract
    const getPremiumFromContract = useCallback(async (positionSize, leverage, volatility = 0) => {
        try {
            const premium = await publicClient.readContract({
                address: CONTRACTS.pricing,
                abi: PRICING_ABI,
                functionName: 'premiumAmount',
                args: [BigInt(positionSize), BigInt(leverage), BigInt(volatility)],
            });
            return premium;
        } catch (err) {
            console.error('Error fetching premium from contract:', err);
            return null;
        }
    }, []);

    //buy insurance via contract
    const buyInsurance = useCallback(async (positionSize, leverage, liquidationPrice, premiumAmount) => {
        if (!userAddress || !walletClient) {
            setError('Wallet not connected');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const [account] = await walletClient.getAddresses();

            const txHash = await walletClient.writeContract({
                address: CONTRACTS.insurancePool,
                abi: INSURANCE_POOL_ABI,
                functionName: 'buyInsurance',
                args: [BigInt(positionSize), BigInt(leverage), BigInt(liquidationPrice)],
                value: BigInt(premiumAmount),
                account,
            });

            console.log('Transaction hash:', txHash);

            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log('Transaction confirmed:', receipt);

            //notify backend
            try {
                await apiClient.post('/insurance/buy', {
                    userAddress,
                    positionSize,
                    leverage,
                    liquidationPrice,
                    txHash,
                });
            } catch (backendErr) {
                console.warn('Backend notification failed:', backendErr);
            }

            return { txHash, receipt };
        } catch (err) {
            const message = err.message || 'Insurance purchase failed';
            setError(message);
            console.error('Error buying insurance:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    //fetch user's policies from backend
    const getPolicies = useCallback(async () => {
        if (!userAddress) return null;

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.get(`/insurance/policies/${userAddress}`);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    return {
        loading,
        error,
        getQuote,
        getPremiumFromContract,
        buyInsurance,
        getPolicies,
    };
};
