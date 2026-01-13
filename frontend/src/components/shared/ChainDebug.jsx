import { useState } from 'react';
import { useChainId, useAccount, useSwitchChain } from 'wagmi';

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 73571;
const RPC_URL = import.meta.env.VITE_RPC_URL || '';

const ChainDebug = () => {
    const { address, isConnected, chain } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending, error } = useSwitchChain();
    const [status, setStatus] = useState('');

    const handleSwitchChain = async () => {
        setStatus('Attempting to switch chain...');
        try {
            // Method 1: Use useSwitchChain hook
            await switchChain({ chainId: EXPECTED_CHAIN_ID });
            setStatus('Switch successful via hook!');
        } catch (err) {
            setStatus(`Hook failed: ${err.message}. Trying raw request...`);

            // Method 2: Use raw ethereum request
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
                });
                setStatus('Switch successful via raw request!');
            } catch (switchErr) {
                // Method 3: Add chain if doesn't exist
                if (switchErr.code === 4902) {
                    setStatus('Chain not found, adding...');
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                                chainName: 'SafeKeeper Tenderly',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: [RPC_URL],
                            }],
                        });
                        setStatus('Chain added! Please try switching again.');
                    } catch (addErr) {
                        setStatus(`Add chain failed: ${addErr.message}`);
                    }
                } else {
                    setStatus(`Raw switch failed: ${switchErr.message}`);
                }
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 10,
            right: 10,
            background: '#1a1a2e',
            border: '2px solid #00f0ff',
            padding: 15,
            borderRadius: 10,
            zIndex: 9999,
            color: 'white',
            fontSize: 12,
            maxWidth: 350,
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>🔧 Chain Debug Panel</h4>

            <div style={{ marginBottom: 5 }}>
                <strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}
            </div>
            <div style={{ marginBottom: 5 }}>
                <strong>Address:</strong> {address?.slice(0, 10)}...
            </div>
            <div style={{ marginBottom: 5 }}>
                <strong>Current Chain ID:</strong> <span style={{ color: currentChainId === EXPECTED_CHAIN_ID ? '#00ff00' : '#ff0000' }}>
                    {currentChainId}
                </span>
            </div>
            <div style={{ marginBottom: 5 }}>
                <strong>Expected Chain ID:</strong> {EXPECTED_CHAIN_ID}
            </div>
            <div style={{ marginBottom: 5 }}>
                <strong>Chain Name:</strong> {chain?.name || 'Unknown'}
            </div>
            <div style={{ marginBottom: 5 }}>
                <strong>RPC URL:</strong> {RPC_URL?.slice(0, 40)}...
            </div>

            <div style={{ marginTop: 10, padding: 5, background: '#2a2a4e', borderRadius: 5 }}>
                <strong>Status:</strong> {status || 'Ready'}
            </div>

            {error && (
                <div style={{ marginTop: 5, color: '#ff6b6b' }}>
                    <strong>Error:</strong> {error.message}
                </div>
            )}

            <button
                onClick={handleSwitchChain}
                disabled={isPending}
                style={{
                    marginTop: 10,
                    padding: '8px 15px',
                    background: currentChainId === EXPECTED_CHAIN_ID ? '#00aa00' : '#ff6b00',
                    border: 'none',
                    borderRadius: 5,
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%',
                }}
            >
                {isPending ? 'Switching...' :
                    currentChainId === EXPECTED_CHAIN_ID ? '✅ On Correct Chain' : '🔄 Switch to Tenderly'}
            </button>
        </div>
    );
};

export default ChainDebug;
