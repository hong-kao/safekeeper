
export function formatEthValue(value) {
    if (!value && value !== 0) return '0.00 ETH';

    try {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue === 0) return '0.00 ETH';

        // If value is very large (> 1e12), assume it's in Wei
        if (numValue > 1e12) {
            const eth = numValue / 1e18;

            // Less than 0.0001 ETH - show in Gwei
            if (eth < 0.0001) {
                const gwei = numValue / 1e9;
                if (gwei < 1) {
                    // Show in Wei
                    return `${Math.round(numValue)} Wei`;
                }
                return `${gwei.toFixed(2)} Gwei`;
            }

            return `${eth.toFixed(4)} ETH`;
        }

        // Otherwise, assume it's already in ETH (small decimal)
        if (numValue < 0.0001) {
            // Convert to Gwei representation
            const gwei = numValue * 1e9;
            if (gwei < 1) {
                return `${(numValue * 1e18).toFixed(0)} Wei`;
            }
            return `${gwei.toFixed(2)} Gwei`;
        }

        return `${numValue.toFixed(4)} ETH`;
    } catch (e) {
        console.error("Format error", e);
        return '0.00 ETH';
    }
}
