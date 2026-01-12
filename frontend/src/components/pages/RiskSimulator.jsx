import { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useContract } from '../../hooks/useContract';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';

export const RiskSimulator = () => {
    const { address, isConnected } = useWallet();
    const { getPolicy, hasPolicy } = useContract();

    const [policy, setPolicy] = useState(null);
    const [currentPrice, setCurrentPrice] = useState('3000');
    const [hasPolicyResult, setHasPolicyResult] = useState(null);

    const handleLoadPolicy = async () => {
        if (!address) return;

        const has = await hasPolicy(address);
        setHasPolicyResult(has);

        if (has) {
            const p = await getPolicy(address);
            setPolicy(p);
        } else {
            setPolicy(null);
        }
    };

    const calculateHealthFactor = () => {
        if (!policy) return 0;
        const price = parseFloat(currentPrice);
        const liquidationPrice = parseFloat(policy.liquidationPrice) / 1e18;
        if (liquidationPrice === 0) return 0;
        return ((price - liquidationPrice) / liquidationPrice).toFixed(4);
    };

    const calculatePayout = () => {
        if (!policy) return '0';
        const price = parseFloat(currentPrice);
        const liquidationPrice = parseFloat(policy.liquidationPrice) / 1e18;
        if (price > liquidationPrice) return '0 (not liquidated)';

        const loss = BigInt(policy.positionSize);
        const payout = loss / 2n;
        return (payout / BigInt(10 ** 18)).toString() + ' ETH';
    };

    const formatWei = (wei) => {
        if (!wei) return '0';
        try {
            return (BigInt(wei) / BigInt(10 ** 18)).toString() + ' ETH';
        } catch {
            return wei.toString();
        }
    };

    return (
        <div>
            <h2>Risk Simulator</h2>

            {!isConnected ? (
                <p>Connect wallet to simulate risk</p>
            ) : (
                <>
                    <p>Address: {address}</p>

                    <div>
                        <label>Current Price (ETH value)</label>
                        <br />
                        <Input
                            type="number"
                            value={currentPrice}
                            onChange={(e) => setCurrentPrice(e.target.value)}
                            placeholder="e.g., 3000"
                        />
                    </div>

                    <Button onClick={handleLoadPolicy}>Load My Policy</Button>

                    {hasPolicyResult === false && (
                        <p>No active policy found for your address</p>
                    )}

                    {policy && (
                        <div>
                            <h3>Your Policy</h3>
                            <p>Position Size: {formatWei(policy.positionSize)}</p>
                            <p>Leverage: {policy.leverage?.toString()}x</p>
                            <p>Liquidation Price: {formatWei(policy.liquidationPrice)}</p>
                            <p>Premium Paid: {formatWei(policy.premiumPaid)}</p>
                            <p>Claimed: {policy.claimed ? 'Yes' : 'No'}</p>

                            <h3>Simulation</h3>
                            <p>Health Factor: {calculateHealthFactor()}</p>
                            <p>Payout if liquidated now: {calculatePayout()}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
