import React from 'react';
import { useLiquidity } from '../../hooks/useLiquidity';
import PoolOverview from './liquidity/PoolOverview';
import ProvideLiquidityCard from './liquidity/ProvideLiquidityCard';
import WithdrawLiquidityCard from './liquidity/WithdrawLiquidityCard';
import YieldSimulator from './liquidity/YieldSimulator';
import { formatEther } from 'viem';

const LiquidityTab = () => {
    const {
        poolStatus,
        aprPercentage,
        dynamicApr,
        lpPosition,
        lpHistory,
        isConnected,
        walletBalance,
        deposit,
        withdraw,
        isDepositPending,
        isWithdrawPending,
        isConfirmed,
        writeError,
        readError
    } = useLiquidity();

    // Format timestamp
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Combine errors for display
    const displayError = writeError || readError;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pool</h1>
                <p className="text-gray-400">Provide liquidity to the insurance protocol and earn dynamic yields.</p>
            </div>

            {/* Error / Success Messages */}
            {displayError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                    {displayError.shortMessage || displayError.message || 'An unknown RPC error occurred.'}
                </div>
            )}

            {isConfirmed && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 text-green-400 text-sm">
                    Transaction confirmed successfully!
                </div>
            )}

            {/* Top Stats */}
            <PoolOverview
                poolStatus={poolStatus}
                aprPercentage={aprPercentage}
                dynamicApr={dynamicApr}
            />

            {/* Main Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="h-full">
                    <ProvideLiquidityCard
                        deposit={deposit}
                        isPending={isDepositPending}
                        isConnected={isConnected}
                        walletBalance={walletBalance}
                    />
                </div>
                <div className="h-full">
                    <WithdrawLiquidityCard
                        withdraw={withdraw}
                        lpPosition={lpPosition}
                        isPending={isWithdrawPending}
                        isConnected={isConnected}
                    />
                </div>
            </div>

            {/* Simulator */}
            <YieldSimulator aprPercentage={aprPercentage} dynamicApr={dynamicApr} />

            {/* Transaction History */}
            {lpHistory.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Your LP History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-gray-400 border-b border-white/10">
                                <tr>
                                    <th className="text-left py-3 px-2">Type</th>
                                    <th className="text-left py-3 px-2">Amount</th>
                                    <th className="text-left py-3 px-2">ETH Price</th>
                                    <th className="text-left py-3 px-2">Date</th>
                                    <th className="text-left py-3 px-2">Tx</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lpHistory.slice(0, 10).map((tx, i) => (
                                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${tx.type === 'DEPOSIT'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-white font-medium">
                                            {tx.type === 'DEPOSIT'
                                                ? parseFloat(formatEther(BigInt(tx.amount))).toFixed(4)
                                                : parseFloat(formatEther(BigInt(tx.amountPaid))).toFixed(4)
                                            } ETH
                                        </td>
                                        <td className="py-3 px-2 text-gray-400">
                                            ${tx.ethPriceUsd}
                                        </td>
                                        <td className="py-3 px-2 text-gray-400">
                                            {formatDate(tx.createdAt)}
                                        </td>
                                        <td className="py-3 px-2">
                                            <a
                                                href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline font-mono text-xs"
                                            >
                                                {tx.txHash?.slice(0, 8)}...
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiquidityTab;
