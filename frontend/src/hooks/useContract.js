import { useState, useCallback } from 'react';
import { publicClient, CONTRACTS, POLICY_REGISTRY_ABI, INSURANCE_POOL_ABI } from '../services/viem';

export const useContract = () => {
    const [loading, setLoading] = useState(false);

    //read pool status directly from contract
    const getPoolStatus = useCallback(async () => {
        setLoading(true);
        try {
            const result = await publicClient.readContract({
                address: CONTRACTS.insurancePool,
                abi: INSURANCE_POOL_ABI,
                functionName: 'getPoolStatus',
            });
            return {
                balance: result[0],
                totalPremiums: result[1],
                totalClaims: result[2],
                activePolicies: result[3],
            };
        } catch (err) {
            console.error('Error reading pool status:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    //read user policy from contract
    const getPolicy = useCallback(async (userAddress) => {
        setLoading(true);
        try {
            const policy = await publicClient.readContract({
                address: CONTRACTS.policyRegistry,
                abi: POLICY_REGISTRY_ABI,
                functionName: 'getPolicy',
                args: [userAddress],
            });
            return policy;
        } catch (err) {
            console.error('Error reading policy:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    //check if user has active policy
    const hasPolicy = useCallback(async (userAddress) => {
        try {
            const result = await publicClient.readContract({
                address: CONTRACTS.policyRegistry,
                abi: POLICY_REGISTRY_ABI,
                functionName: 'hasPolicy',
                args: [userAddress],
            });
            return result;
        } catch (err) {
            console.error('Error checking policy:', err);
            return false;
        }
    }, []);

    return {
        loading,
        getPoolStatus,
        getPolicy,
        hasPolicy,
    };
};
