import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import { publicClient, CONTRACTS, INSURANCE_POOL_ABI } from '../services/viem';

export const usePool = () => {
    const [poolData, setPoolData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPoolStatus = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            //try backend first
            const response = await apiClient.get('/pool/status');
            setPoolData(response.data);
            return response.data;
        } catch (err) {
            //fallback: fetch directly from contract
            try {
                const [balance, totalPremiums, totalClaims, activePolicies] =
                    await publicClient.readContract({
                        address: CONTRACTS.insurancePool,
                        abi: INSURANCE_POOL_ABI,
                        functionName: 'getPoolStatus',
                    });

                const data = {
                    poolBalance: balance.toString(),
                    totalPremiums: totalPremiums.toString(),
                    totalClaims: totalClaims.toString(),
                    activePolicies: activePolicies.toString(),
                };
                setPoolData(data);
                return data;
            } catch (contractErr) {
                const message = err.response?.data?.error || err.message;
                setError(message);
                console.error('Error fetching pool status:', contractErr);
                return null;
            }
        } finally {
            setLoading(false);
        }
    }, []);

    //fetch on mount and poll every 5 seconds
    useEffect(() => {
        fetchPoolStatus();
        const interval = setInterval(fetchPoolStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchPoolStatus]);

    return {
        poolData,
        loading,
        error,
        refetch: fetchPoolStatus,
    };
};
