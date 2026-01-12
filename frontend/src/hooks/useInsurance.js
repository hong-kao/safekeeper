import { useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { publicClient, walletClient, initWalletClient, switchToCorrectChain, CONTRACTS, INSURANCE_POOL_ABI, PRICING_ABI } from '../services/viem';

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
        console.log('[BUY] 1. Starting buyInsurance...');
        console.log('[BUY]    Params:', { positionSize, leverage, liquidationPrice, premiumAmount });

        if (!userAddress || !walletClient) {
            setError('Wallet not connected');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('[BUY] 2. Switching to correct chain...');
            // Ensure wallet is on the correct chain before transaction
            const switched = await switchToCorrectChain();
            console.log('[BUY] 3. Chain switch result:', switched);
            if (!switched) {
                throw new Error('Please switch to the correct network in your wallet');
            }

            console.log('[BUY] 4. Re-initializing wallet client...');
            // Re-initialize wallet client after chain switch
            await initWalletClient();

            console.log('[BUY] 5. Getting account address...');
            const [account] = await walletClient.getAddresses();
            console.log('[BUY] 6. Account:', account);

            // Convert decimal ETH values to Wei (BigInt) - positionSize/liquidationPrice are in ETH
            const positionSizeWei = BigInt(Math.floor(parseFloat(positionSize) * 1e18));
            const leverageBigInt = BigInt(Math.floor(parseFloat(leverage)));
            const liqPriceWei = BigInt(Math.floor(parseFloat(liquidationPrice) * 1e18));
            const premiumWei = BigInt(Math.floor(parseFloat(premiumAmount) * 1e18));

            console.log('[BUY] 7. Converted to Wei:', {
                positionSizeWei: positionSizeWei.toString(),
                leverageBigInt: leverageBigInt.toString(),
                liqPriceWei: liqPriceWei.toString(),
                premiumWei: premiumWei.toString(),
            });

            console.log('[BUY] 8. Calling writeContract (this opens MetaMask)...');
            const txHash = await walletClient.writeContract({
                address: CONTRACTS.insurancePool,
                abi: INSURANCE_POOL_ABI,
                functionName: 'buyInsurance',
                args: [positionSizeWei, leverageBigInt, liqPriceWei],
                value: premiumWei,
                account,
            });

            console.log('[BUY] 9. Transaction hash:', txHash);

            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log('Transaction confirmed:', receipt);

            //notify backend - send values in Wei (same format as stored in DB)
            try {
                console.log('[useInsurance] Notifying backend with:', {
                    userAddress,
                    positionSize: positionSizeWei.toString(),
                    leverage: leverageBigInt.toString(),
                    liquidationPrice: liqPriceWei.toString(),
                    premiumPaid: premiumWei.toString(),
                    txHash,
                });

                await apiClient.post('/insurance/buy', {
                    userAddress,
                    positionSize: positionSizeWei.toString(),
                    leverage: leverageBigInt.toString(),
                    liquidationPrice: liqPriceWei.toString(),
                    premiumPaid: premiumWei.toString(),
                    txHash,
                    coin: 'ETH'
                });
                console.log('[useInsurance] Backend notification successful!');
            } catch (backendErr) {
                console.error('[useInsurance] Backend notification failed:', backendErr);
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
        if (!userAddress) {
            console.log('[useInsurance] getPolicies: No userAddress');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('[useInsurance] Fetching policies for:', userAddress);
            const response = await apiClient.get(`/insurance/policies/${userAddress}`);
            console.log('[useInsurance] Policies response:', response.data);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.error || err.message;
            console.error('[useInsurance] getPolicies error:', message);
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
