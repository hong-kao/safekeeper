import { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useInsurance } from '../../hooks/useInsurance';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';

export const BuyInsurance = () => {
    const { address, isConnected, connect } = useWallet();
    const { getQuote, getPremiumFromContract, buyInsurance, loading, error } = useInsurance(address);

    const [positionSize, setPositionSize] = useState('1000000000000000000');
    const [leverage, setLeverage] = useState('10');
    const [liquidationPrice, setLiquidationPrice] = useState('2850000000000000000000');
    const [volatility, setVolatility] = useState('0');

    const [quote, setQuote] = useState(null);
    const [premium, setPremium] = useState(null);
    const [purchaseStatus, setPurchaseStatus] = useState(null);

    const handleGetQuote = async () => {
        //try contract first, fallback to api
        const contractPremium = await getPremiumFromContract(positionSize, leverage, volatility);
        if (contractPremium) {
            setPremium(contractPremium.toString());
            setQuote({
                premium: contractPremium.toString(),
                coverage: '50',
                expectedPayout: (BigInt(positionSize) / 2n).toString(),
            });
        } else {
            const q = await getQuote(positionSize, leverage, volatility);
            if (q) {
                setQuote(q);
                setPremium(q.premium);
            }
        }
    };

    const handleBuy = async () => {
        if (!premium) {
            alert('Get quote first');
            return;
        }

        const result = await buyInsurance(positionSize, leverage, liquidationPrice, premium);

        if (result) {
            setPurchaseStatus({
                success: true,
                txHash: result.txHash,
                message: 'Insurance purchased successfully!',
            });
        } else {
            setPurchaseStatus({
                success: false,
                message: error || 'Failed to purchase insurance',
            });
        }
    };

    if (!isConnected) {
        return (
            <div>
                <h2>Buy Insurance</h2>
                <p>Wallet not connected</p>
                <Button onClick={connect}>Connect Wallet</Button>
            </div>
        );
    }

    return (
        <div>
            <h2>Buy Insurance</h2>
            <p>Address: {address}</p>

            <div>
                <label>Position Size (wei)</label>
                <br />
                <Input
                    type="text"
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value)}
                    placeholder="e.g., 1000000000000000000"
                />
            </div>

            <div>
                <label>Leverage</label>
                <br />
                <Input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    placeholder="e.g., 10"
                />
            </div>

            <div>
                <label>Liquidation Price (wei)</label>
                <br />
                <Input
                    type="text"
                    value={liquidationPrice}
                    onChange={(e) => setLiquidationPrice(e.target.value)}
                    placeholder="e.g., 2850000000000000000000"
                />
            </div>

            <div>
                <label>Volatility (optional)</label>
                <br />
                <Input
                    type="number"
                    value={volatility}
                    onChange={(e) => setVolatility(e.target.value)}
                    placeholder="e.g., 0"
                />
            </div>

            <Button onClick={handleGetQuote} disabled={loading}>
                Get Quote
            </Button>

            {quote && (
                <div>
                    <p>Premium: {quote.premium} wei</p>
                    <p>Coverage: {quote.coverage}%</p>
                    <p>Expected Payout: {quote.expectedPayout} wei</p>
                </div>
            )}

            <Button onClick={handleBuy} disabled={loading || !premium}>
                Buy Insurance
            </Button>

            {purchaseStatus && (
                <div>
                    <p>{purchaseStatus.message}</p>
                    {purchaseStatus.txHash && <p>TxHash: {purchaseStatus.txHash}</p>}
                </div>
            )}

            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        </div>
    );
};
