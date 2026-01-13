import React from 'react';

const StatCard = ({ label, value, subValue, isHighlight, tooltip }) => (
    <div className={`
        relative overflow-hidden rounded-2xl p-6 backdrop-blur-md border 
        ${isHighlight
            ? 'bg-primary/10 border-primary/30'
            : 'bg-surface-light/50 border-white/5'
        }
    `}>
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
        <div className="mt-2 flex items-baseline">
            <span className={`text-2xl font-bold ${isHighlight ? 'text-primary' : 'text-white'}`}>
                {value}
            </span>
            {subValue && <span className="ml-2 text-sm text-gray-500">{subValue}</span>}
        </div>
        {tooltip && <p className="mt-1 text-xs text-gray-500">{tooltip}</p>}
    </div>
);

const PoolOverview = ({ poolStatus, aprPercentage, dynamicApr }) => {
    // Format helpers
    const formatEth = (val) => val ? parseFloat(val).toFixed(4) : '0.0000';
    const formatApr = (val) => (val * 100).toFixed(1) + '%';

    // Fallback if data loading
    if (!poolStatus) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    // Estimate USD value
    const ethPrice = dynamicApr?.ethPriceUsd || 2850;
    const tvlUsd = (parseFloat(poolStatus.balance) * parseFloat(ethPrice)).toLocaleString('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0
    });

    // APR breakdown tooltip
    const aprTooltip = dynamicApr
        ? `Base: ${(dynamicApr.baseAprBps / 100).toFixed(1)}% × Util: ${dynamicApr.utilizationMultiplier}x × Vol: ${dynamicApr.volatilityMultiplier}x`
        : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
                label="Total Value Locked"
                value={`${formatEth(poolStatus.balance)} ETH`}
                subValue={`≈ ${tvlUsd}`}
            />
            <StatCard
                label="Premiums Collected"
                value={`${formatEth(poolStatus.totalPremiums)} ETH`}
            />
            <StatCard
                label="Claims Paid"
                value={`${formatEth(poolStatus.totalClaims)} ETH`}
            />
            <StatCard
                label="Dynamic APY"
                value={formatApr(aprPercentage)}
                isHighlight={true}
                tooltip={aprTooltip}
            />
        </div>
    );
};

export default PoolOverview;
