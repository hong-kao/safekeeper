import { useState, useEffect, useCallback } from 'react';
import { initWalletClient, walletClient } from '../services/viem';

export const useWallet = () => {
    const [address, setAddress] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    //check if already connected
    useEffect(() => {
        const checkConnection = async () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        setAddress(accounts[0]);
                        setIsConnected(true);
                        await initWalletClient();
                    }
                } catch (err) {
                    console.error('Error checking wallet connection:', err);
                }
            }
        };
        checkConnection();
    }, []);

    //listen for account changes
    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    setIsConnected(true);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, []);

    const connect = useCallback(async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            alert('Please install MetaMask');
            return;
        }

        setLoading(true);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                setAddress(accounts[0]);
                setIsConnected(true);
                await initWalletClient();
            }
        } catch (err) {
            console.error('Error connecting wallet:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setAddress(null);
        setIsConnected(false);
    }, []);

    return {
        address,
        isConnected,
        loading,
        connect,
        disconnect,
    };
};
