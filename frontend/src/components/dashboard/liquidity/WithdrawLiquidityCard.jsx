import React, { useState } from 'react';
import { parseEther, formatEther } from 'viem';

const WithdrawLiquidityCard = ({ withdraw, lpPosition, isPending, isConnected }) => {
    const [percentage, setPercentage] = useState(0);

    const handleWithdraw = () => {
        if (percentage <= 0 || !lpPosition.shares) return;

        // Calculate shares to withdraw: totalShares * percentage / 100
        // We use BigInt arithmetic for precision
        const shareAmount = (lpPosition.shares * BigInt(percentage)) / 100n;

        if (shareAmount === 0n) return;

        withdraw(shareAmount);
    };

    const hasLiquidity = lpPosition && lpPosition.shares > 0n;

    return (
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col h-full relative overflow-hidden">
            {/* Position Summary */}
            <div className="mb-6 pb-6 border-b border-white/5">
                <h3 className="text-xl font-bold text-white mb-4">Your Position</h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Underlying Balance</span>
                        <span className="text-white font-medium">{lpPosition.formatted.underlying} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Pending Yield</span>
                        <span className="text-green-400 font-medium">+{lpPosition.formatted.pendingInterest} ETH</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 rounded-lg p-3 mt-2">
                        <span className="text-gray-300 text-sm font-medium">LP Shares</span>
                        <span className="text-gray-300 font-mono text-sm">{lpPosition.formatted.shares}</span>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col justify-end">
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">Withdraw Amount</label>
                        <span className="text-primary font-bold">{percentage}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={percentage}
                        onChange={(e) => setPercentage(parseInt(e.target.value))}
                        disabled={!hasLiquidity || isPending}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>0%</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setPercentage(25)}>25%</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setPercentage(50)}>50%</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setPercentage(75)}>75%</span>
                        <span className="cursor-pointer hover:text-white" onClick={() => setPercentage(100)}>100%</span>
                    </div>
                </div>

                {!isConnected ? (
                    <button disabled className="w-full py-3.5 px-4 bg-gray-700 text-gray-400 rounded-xl font-semibold cursor-not-allowed">
                        Connect Wallet First
                    </button>
                ) : (
                    <button
                        onClick={handleWithdraw}
                        disabled={!hasLiquidity || percentage === 0 || isPending}
                        className={`
                            w-full py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg transition-all
                            ${!hasLiquidity || percentage === 0 || isPending
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-red-500/80 hover:bg-red-500 hover:shadow-red-500/20 hover:-translate-y-0.5'
                            }
                        `}
                    >
                        {isPending ? 'Withdrawing...' : 'Withdraw Liquidity'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WithdrawLiquidityCard;
