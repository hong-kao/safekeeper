import React, { useState, useEffect } from 'react';

const YieldSimulator = ({ aprPercentage, dynamicApr }) => {
    const [amount, setAmount] = useState('10');
    const [duration, setDuration] = useState('30'); // days
    const [priceVolatility, setPriceVolatility] = useState(0); // -50% to +100%
    const [ethPrice, setEthPrice] = useState(null);

    // Fetch ETH price from backend
    useEffect(() => {
        const fetchEthPrice = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/lp/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setEthPrice(parseFloat(data.ethPriceUsd) || 3200);
                }
            } catch (err) {
                console.error('[YieldSimulator] Failed to fetch ETH price:', err);
                setEthPrice(3200); // Fallback
            }
        };
        fetchEthPrice();
        // Refresh every 30 seconds
        const interval = setInterval(fetchEthPrice, 30000);
        return () => clearInterval(interval);
    }, []);

    // Use dynamic APR if available
    const effectiveApr = aprPercentage || 0;

    // Simulate potential claims impact (based on pool utilization)
    const utilizationRate = dynamicApr?.utilizationMultiplier || 1;
    const claimsImpactPercent = Math.min(utilizationRate * 2, 8); // 0-8% based on utilization

    // Calculate projected ETH price based on volatility slider
    const projectedEthPrice = ethPrice ? ethPrice * (1 + priceVolatility / 100) : 3200;

    const calculateReturns = () => {
        const principal = parseFloat(amount) || 0;
        const days = parseInt(duration);

        // Base interest calculation
        const interest = (principal * effectiveApr * days) / 365;

        // Estimated claims impact
        const claimsImpact = (principal * claimsImpactPercent / 100) * (days / 365);

        // Net earnings in ETH
        const netInterest = Math.max(0, interest - claimsImpact);

        // USD values
        const currentValueUsd = principal * (ethPrice || 3200);
        const projectedValueUsd = (principal + netInterest) * projectedEthPrice;
        const netUsdChange = projectedValueUsd - currentValueUsd;

        return {
            grossInterest: interest.toFixed(4),
            claimsImpact: claimsImpact.toFixed(4),
            netInterest: netInterest.toFixed(4),
            total: (principal + netInterest).toFixed(4),
            currentValueUsd: currentValueUsd.toFixed(2),
            projectedValueUsd: projectedValueUsd.toFixed(2),
            netUsdChange: netUsdChange.toFixed(2),
            usdChangePercent: ((netUsdChange / currentValueUsd) * 100 || 0).toFixed(1)
        };
    };

    const returns = calculateReturns();
    const durations = [
        { label: '7 Days', value: '7' },
        { label: '30 Days', value: '30' },
        { label: '90 Days', value: '90' },
        { label: '1 Year', value: '365' }
    ];

    return (
        <div className="mt-8 bg-surface-light/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Yield Simulator</h3>
                    <p className="text-sm text-gray-400">Estimate returns with ETH price changes</p>
                </div>
                <div className="text-right">
                    <div className="px-3 py-1 bg-primary/20 rounded-full border border-primary/50 text-primary text-sm font-semibold">
                        {(effectiveApr * 100).toFixed(1)}% APY
                    </div>
                    {ethPrice && (
                        <p className="text-xs text-gray-500 mt-1">
                            ETH: ${ethPrice.toFixed(2)}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Deposit Amount (ETH)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-16 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="0.0"
                            />
                            <span className="absolute right-4 top-3 text-gray-500 font-medium pointer-events-none">ETH</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Time Horizon</label>
                        <div className="grid grid-cols-4 gap-2">
                            {durations.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => setDuration(d.value)}
                                    className={`
                                        py-2 px-1 text-sm rounded-lg border transition-all
                                        ${duration === d.value
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Volatility Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-gray-400">ETH Price Change</label>
                            <span className={`text-sm font-bold ${priceVolatility >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {priceVolatility >= 0 ? '+' : ''}{priceVolatility}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-50"
                            max="100"
                            value={priceVolatility}
                            onChange={(e) => setPriceVolatility(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>-50% (Bear)</span>
                            <span>0%</span>
                            <span>+100% (Bull)</span>
                        </div>
                    </div>
                </div>

                {/* Results - Visual Panel */}
                <div className="bg-black/40 rounded-xl p-6 border border-white/5 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-16 -mt-16"></div>

                    <div className="relative z-10 space-y-4">
                        {/* ETH Returns */}
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Net Yield (ETH)</p>
                            <p className="text-2xl font-bold text-green-400">+{returns.netInterest} ETH</p>
                            <p className="text-xs text-gray-500">
                                Gross: {returns.grossInterest} - Claims Risk: {returns.claimsImpact}
                            </p>
                        </div>

                        {/* USD Value Projection */}
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-gray-400 text-sm mb-1">Projected USD Value</p>
                            <div className="flex items-baseline space-x-2">
                                <p className="text-2xl font-semibold text-white">
                                    ${parseFloat(returns.projectedValueUsd).toLocaleString()}
                                </p>
                                <span className={`text-sm font-bold ${parseFloat(returns.netUsdChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({returns.usdChangePercent}%)
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Current: ${parseFloat(returns.currentValueUsd).toLocaleString()} |
                                Projected ETH: ${projectedEthPrice.toFixed(2)}
                            </p>
                        </div>

                        {/* Factors breakdown */}
                        {dynamicApr && (
                            <div className="pt-3 border-t border-white/10 text-xs text-gray-500">
                                <div className="flex justify-between">
                                    <span>Pool Utilization</span>
                                    <span>{dynamicApr.utilizationMultiplier}x</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Volatility Factor</span>
                                    <span>{dynamicApr.volatilityMultiplier}x</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
                * Simulated returns include ETH price volatility, pool utilization, and claims risk. Actual returns may vary.
            </p>
        </div>
    );
};

export default YieldSimulator;

