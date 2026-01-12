
export function formatEthValue(weiValue) {
    if (!weiValue) return '0.00 ETH';

    try {
        const val = BigInt(weiValue);
        if (val === 0n) return '0.00 ETH';

        // 1 ETH = 10^18 Wei
        // 0.0001 ETH = 10^14 Wei
        if (val < 100000000000000n) {
            // Less than 0.0001 ETH

            // 1 Gwei = 10^9 Wei
            if (val < 1000000000n) {
                // Less than 1 Gwei
                return `${val.toString()} Wei`;
            }

            // Show in Gwei
            // Divide by 10^9
            const gwei = Number(val) / 1e9;
            return `${gwei.toFixed(2)} Gwei`;
        }

        // Show in ETH
        const eth = Number(val) / 1e18;
        // If it's very small but above threshold, show up to 6 decimals?
        // User asked for Wei/GWei for "smallll" values.
        // 0.0001 ETH is small.

        return `${eth.toFixed(4)} ETH`;
    } catch (e) {
        console.error("Format error", e);
        return '0.00 ETH';
    }
}
