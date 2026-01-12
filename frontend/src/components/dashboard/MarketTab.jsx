import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMarketData } from '../../hooks/useMarketData';
import { useInsurance } from '../../hooks/useInsurance';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import Loader from '../shared/Loader';

const MarketTab = () => {
    const { address } = useAuth();
    const { prices, isConnected: wsConnected } = useMarketData();
    const { getPolicies } = useInsurance(address);

    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState('ETH');
    const [showLiquidationModal, setShowLiquidationModal] = useState(false);

    useEffect(() => {
        const fetchPolicies = async () => {
            if (address) {
                const data = await getPolicies();
                setPolicies(data?.policies || []);
                setLoading(false);
            }
        };
        fetchPolicies();
    }, [address, getPolicies]);

    // Find active policy for selected asset
    const activePolicy = policies.find(p => p.coin === selectedAsset && p.status === 'ACTIVE');
    const currentPrice = prices[selectedAsset];

    // Liquidation Check Logic
    useEffect(() => {
        if (activePolicy && currentPrice) {
            const liqPrice = parseFloat(activePolicy.liquidationPrice);
            // Default to Long logic for now: Liquidated if Price <= Liq Price
            if (currentPrice <= liqPrice) {
                setShowLiquidationModal(true);
            }
        }
    }, [activePolicy, currentPrice]);

    // Calculate Risk Metrics
    const getRiskStatus = () => {
        if (!activePolicy) return { status: 'NO_INSURANCE', color: 'text-gray-400', bg: 'bg-gray-500/10' };
        if (!currentPrice) return { status: 'LOADING', color: 'text-gray-400', bg: 'bg-gray-500/10' };

        const liqPrice = parseFloat(activePolicy.liquidationPrice);
        const diff = ((currentPrice - liqPrice) / liqPrice) * 100;

        if (currentPrice <= liqPrice) return { status: 'LIQUIDATED', color: 'text-error', bg: 'bg-error/10' };
        if (diff < 5) return { status: 'DANGER', color: 'text-error', bg: 'bg-error/10' };
        if (diff < 15) return { status: 'WARNING', color: 'text-warning', bg: 'bg-warning/10' };
        return { status: 'SAFE', color: 'text-success', bg: 'bg-success/10' };
    };

    const risk = getRiskStatus();

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader className="h-12 w-12 text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header / Asset Selector */}
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border">
                <div className="flex gap-4">
                    {['ETH', 'BTC', 'SOL'].map(asset => (
                        <button
                            key={asset}
                            onClick={() => setSelectedAsset(asset)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${selectedAsset === asset ? 'bg-primary text-white' : 'hover:bg-gray-800 text-gray-400'
                                }`}
                        >
                            {asset}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-success animate-pulse' : 'bg-error'}`} />
                    <span className="text-xs text-gray-500 font-mono">
                        WS: {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Price Card */}
                <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-8 flex flex-col justify-center items-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="h-64 w-64" />
                    </div>
                    <h3 className="text-gray-400 mb-2 font-medium">Index Price ({selectedAsset})</h3>
                    <div className="text-6xl font-extrabold text-white tracking-tighter mb-4">
                        ${currentPrice?.toFixed(2) || '0.00'}
                    </div>
                    <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-1 rounded-full text-sm">
                        <TrendingUp className="h-4 w-4" />
                        Live from Hyperliquid (Simulated)
                    </div>
                </div>

                {/* Risk / Insurance Status Card */}
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Coverage Status
                    </h3>

                    {activePolicy ? (
                        <div className="space-y-6 flex-grow">
                            <div className={`p-4 rounded-xl border border-border ${risk.bg}`}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-400">Health Status</span>
                                    <span className={`font-bold ${risk.color}`}>{risk.status}</span>
                                </div>
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${risk.color.replace('text-', 'bg-')}`}
                                        style={{ width: `${Math.max(0, Math.min(100, ((currentPrice - activePolicy.liquidationPrice / 1.2) / (activePolicy.liquidationPrice * 0.2)) * 100))}%` }} // Rough visual representation
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-background rounded-lg border border-border">
                                    <div className="text-xs text-gray-400 mb-1">Liquidation Price</div>
                                    <div className="font-mono font-bold text-error">${activePolicy.liquidationPrice}</div>
                                </div>
                                <div className="p-3 bg-background rounded-lg border border-border">
                                    <div className="text-xs text-gray-400 mb-1">Coverage</div>
                                    <div className="font-mono font-bold text-primary">{activePolicy.positionSize} {activePolicy.coin}</div>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-border">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Premium Paid</span>
                                    <span className="font-mono text-white">{formatEthValue(activePolicy.premiumPaid)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-grow text-center space-y-4">
                            <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center">
                                <Shield className="h-8 w-8 text-gray-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">No Active Protection</h4>
                                <p className="text-sm text-gray-400 mt-2">You are trading naked! Buy insurance to protect your {selectedAsset} position.</p>
                            </div>
                            <button className="btn btn-primary bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors w-full">
                                Buy Insurance
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Liquidation Alert Modal */}
            {showLiquidationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-error rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-error animate-pulse" />
                        <div className="text-center space-y-6 relative z-10">
                            <div className="mx-auto h-20 w-20 bg-error/20 rounded-full flex items-center justify-center animate-bounce">
                                <AlertTriangle className="h-10 w-10 text-error" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2">LIQUIDATION DETECTED</h2>
                                <p className="text-gray-300">
                                    Your {selectedAsset} position has been liquidated at ${currentPrice.toFixed(2)}.
                                </p>
                            </div>

                            <div className="bg-background p-4 rounded-xl border border-border">
                                <div className="flex items-center gap-3 mb-2">
                                    <CheckCircle className="h-5 w-5 text-success" />
                                    <span className="font-bold text-white">SafeKeeper Activated</span>
                                </div>
                                <p className="text-sm text-gray-400 text-left">
                                    We have detected the event and initiated your payout claim. Check your wallet for the reimbursement.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowLiquidationModal(false)}
                                className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketTab;
