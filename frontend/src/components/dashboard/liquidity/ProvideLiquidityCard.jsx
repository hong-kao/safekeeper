import React, { useState } from 'react';

const ProvideLiquidityCard = ({ deposit, isPending, isConnected, walletBalance }) => {
    const [amount, setAmount] = useState('');

    const handleDeposit = () => {
        if (!amount || parseFloat(amount) <= 0) return;
        deposit(amount);
    };

    const handleMax = () => {
        if (walletBalance?.formatted) {
            // Leave a tiny bit for gas (0.01 ETH)
            const maxVal = parseFloat(walletBalance.formatted) - 0.01;
            setAmount(maxVal > 0 ? maxVal.toFixed(4) : '0');
        }
    };

    return (
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col h-full relative overflow-hidden group">
            {/* Ambient Background Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Provide Liquidity</h3>
                    <p className="text-gray-400 text-sm">Deposit ETH to earn fixed APY yields from insurance premiums.</p>
                </div>

                <div className="flex-grow space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-300">Amount to Deposit</label>
                            {isConnected && walletBalance && (
                                <div className="text-xs text-gray-400">
                                    Balance: <span className="text-white font-medium">{walletBalance.formatted} {walletBalance.symbol}</span>
                                    <button
                                        onClick={handleMax}
                                        className="ml-2 text-primary hover:text-primary-light transition-colors"
                                    >
                                        Max
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-16 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder-gray-600"
                                placeholder="0.00"
                                disabled={!isConnected || isPending}
                            />
                            <span className="absolute right-4 top-3 text-gray-500 font-medium pointer-events-none">ETH</span>
                        </div>
                        {amount && !isNaN(amount) && (
                            <p className="mt-2 text-xs text-primary/80">
                                ≈ Minting {parseFloat(amount).toFixed(4)} LP Shares (Est.)
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    {!isConnected ? (
                        <button disabled className="w-full py-3.5 px-4 bg-gray-700 text-gray-400 rounded-xl font-semibold cursor-not-allowed">
                            Connect Wallet First
                        </button>
                    ) : (
                        <button
                            onClick={handleDeposit}
                            disabled={!amount || isPending || parseFloat(amount) <= 0}
                            className={`
                                w-full py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg transition-all
                                ${!amount || isPending || parseFloat(amount) <= 0
                                    ? 'bg-primary/50 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-dark hover:shadow-primary/25 hover:-translate-y-0.5'
                                }
                            `}
                        >
                            {isPending ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Confirming...
                                </span>
                            ) : 'Provide Liquidity'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProvideLiquidityCard;
