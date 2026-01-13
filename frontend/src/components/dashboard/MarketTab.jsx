import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMarketData } from '../../hooks/useMarketData';
import { useInsurance } from '../../hooks/useInsurance';
import { TrendingUp, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Loader from '../shared/Loader';
import GSAPLoader from '../shared/GSAPLoader';
import { formatEthValue } from '../../utils/format';
import { formatEther, parseEther } from 'viem';
import { useSendTransaction } from 'wagmi';

// Helper to format Wei to ETH
const formatWei = (wei) => {
    try {
        if (!wei) return '0.0000';
        return parseFloat(formatEther(BigInt(wei))).toFixed(4);
    } catch {
        return '0.0000';
    }
};

// Helper to format Wei to USD (assuming value is already in USD-like format but in Wei)
const formatWeiToUsd = (wei) => {
    try {
        if (!wei) return '0.00';
        return parseFloat(formatEther(BigInt(wei))).toFixed(2);
    } catch {
        return '0.00';
    }
};

const MarketTab = () => {
    const { address } = useAuth();
    const { prices, isConnected: wsConnected } = useMarketData();
    const { getPolicies } = useInsurance(address);

    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState('ETH');
    const [showLiquidationModal, setShowLiquidationModal] = useState(false);
    const [liquidationData, setLiquidationData] = useState(null);

    const [initialLoading, setInitialLoading] = useState(true);
    const { sendTransactionAsync } = useSendTransaction();
    const [depositLoading, setDepositLoading] = useState(false);

    const handleSimulateDeposit = async () => {
        try {
            setDepositLoading(true);
            await sendTransactionAsync({
                to: '0x000000000000000000000000000000000000dEaD',
                value: parseEther('1.5'),
            });
            alert('Deposit Simulated! 1.5 ETH sent to burn address.');
        } catch (error) {
            console.error('Deposit failed:', error);
            alert('Simulation failed (Check console)');
        } finally {
            setDepositLoading(false);
        }
    };

    // Track if user has dismissed the modal for this policy
    const dismissedPolicyRef = useRef(null);

    useEffect(() => {
        // Force show GSAP loader for 2.5 seconds on mount/asset change for effect
        setInitialLoading(true);
        const timer = setTimeout(() => setInitialLoading(false), 2500);
        return () => clearTimeout(timer);
    }, [selectedAsset]);

    useEffect(() => {
        const fetchPolicies = async () => {
            if (address) {
                console.log('[MarketTab] Fetching policies for:', address);
                const data = await getPolicies();
                console.log('[MarketTab] API Response:', data);
                // API returns { policies: [...] } wrapper object
                const policiesArray = Array.isArray(data) ? data : (data?.policies || []);
                console.log('[MarketTab] Parsed policies:', policiesArray);
                setPolicies(policiesArray);
                setLoading(false);
            }
        };
        fetchPolicies();

        // Refetch every 5 seconds to catch status updates
        const interval = setInterval(fetchPolicies, 5000);
        return () => clearInterval(interval);
    }, [address, getPolicies]);

    // Find active policy for selected asset
    const activePolicy = policies.find(p => p.coin === selectedAsset && p.status === 'ACTIVE');
    const currentPrice = prices[selectedAsset];

    // Debug logging
    console.log('[MarketTab] Debug:', {
        selectedAsset,
        totalPolicies: policies.length,
        policies: policies.map(p => ({ coin: p.coin, status: p.status, id: p.id })),
        activePolicy: activePolicy ? { id: activePolicy.id, coin: activePolicy.coin, status: activePolicy.status } : null,
        currentPrice
    });

    // Liquidation Check Logic - only show modal if not already dismissed for this policy
    useEffect(() => {
        if (activePolicy && currentPrice) {
            // Convert liquidation price from Wei to normal number
            const liqPriceWei = BigInt(activePolicy.liquidationPrice);
            const liqPrice = parseFloat(formatEther(liqPriceWei));

            // Check if liquidated and modal not already dismissed for this policy
            if (currentPrice <= liqPrice && dismissedPolicyRef.current !== activePolicy.id) {
                setLiquidationData({
                    policyId: activePolicy.id,
                    positionSize: formatWei(activePolicy.positionSize),
                    coverage: formatWei(BigInt(activePolicy.positionSize) / 2n) // 50% coverage
                });
                setShowLiquidationModal(true);
            }
        }
    }, [activePolicy, currentPrice]);

    // Handle modal dismiss - refetch policies to update status
    const handleDismissModal = async () => {
        if (activePolicy) {
            dismissedPolicyRef.current = activePolicy.id;
        }
        setShowLiquidationModal(false);

        // Refetch policies to get updated status (CLAIMED/PAID)
        if (address) {
            console.log('[MarketTab] Refetching policies after liquidation...');
            const data = await getPolicies();
            const policiesArray = Array.isArray(data) ? data : (data?.policies || []);
            console.log('[MarketTab] Updated policies:', policiesArray);
            setPolicies(policiesArray);
        }
    };

    // Calculate Risk Metrics (using converted values)
    const getRiskStatus = () => {
        if (!activePolicy) return { status: 'NO_INSURANCE', color: 'text-gray-400', bg: 'bg-gray-500/10' };
        if (!currentPrice) return { status: 'LOADING', color: 'text-gray-400', bg: 'bg-gray-500/10' };

        const liqPrice = parseFloat(formatEther(BigInt(activePolicy.liquidationPrice)));
        const diff = ((currentPrice - liqPrice) / liqPrice) * 100;

        if (currentPrice <= liqPrice) return { status: 'LIQUIDATED', color: 'text-error', bg: 'bg-error/10' };
        if (diff < 5) return { status: 'DANGER', color: 'text-error', bg: 'bg-error/10' };
        if (diff < 15) return { status: 'WARNING', color: 'text-warning', bg: 'bg-warning/10' };
        return { status: 'SAFE', color: 'text-success', bg: 'bg-success/10' };
    };

    const risk = getRiskStatus();

    // Get converted values for display
    const positionSizeEth = activePolicy ? formatWei(activePolicy.positionSize) : '0';
    const liqPriceUsd = activePolicy ? formatWeiToUsd(activePolicy.liquidationPrice) : '0';

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
                    <div className="text-6xl font-extrabold text-white tracking-tighter mb-4 h-20 flex items-center justify-center">
                        {initialLoading ? (
                            <GSAPLoader />
                        ) : (
                            <span>${currentPrice?.toFixed(2) || '0.00'}</span>
                        )}
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
                                        style={{ width: `${Math.max(0, Math.min(100, ((currentPrice - parseFloat(liqPriceUsd)) / parseFloat(liqPriceUsd) * 100 + 20) * 2))}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-background rounded-lg border border-border">
                                    <div className="text-xs text-gray-400 mb-1">Liquidation Price</div>
                                    <div className="font-mono font-bold text-error">${liqPriceUsd}</div>
                                </div>
                                <div className="p-3 bg-background rounded-lg border border-border">
                                    <div className="text-xs text-gray-400 mb-1">Coverage</div>
                                    <div className="font-mono font-bold text-primary">{positionSizeEth} ETH</div>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-border">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Premium Paid</span>
                                    <span className="font-mono text-white">{formatWei(activePolicy.premiumPaid)} ETH</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-grow text-center space-y-6 p-4">
                            <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                                <Shield className="h-8 w-8 text-gray-500 opacity-50" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Not Protected</h2>
                                <p className="text-gray-400 max-w-md mx-auto">
                                    You don't have active insurance for your {selectedAsset} position.
                                </p>
                            </div>

                            {/* Step 1: Simulate Deposit */}
                            <div className="w-full max-w-md mx-auto bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl text-left">
                                <h3 className="text-yellow-500 text-sm font-bold mb-1">Step 1: Simulate Exchange Deposit</h3>
                                <p className="text-xs text-gray-400 mb-3">Send 1.5 ETH to a burn address to simulate locking funds.</p>
                                <button
                                    onClick={handleSimulateDeposit}
                                    disabled={depositLoading}
                                    className="w-full px-4 py-2 bg-yellow-500/10 border border-yellow-500 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/20 text-sm transition-colors"
                                >
                                    {depositLoading ? 'Sending...' : '🔥 Burn 1.5 ETH (Simulate Loss)'}
                                </button>
                            </div>

                            <Link to="/dashboard/insurance" className="w-full max-w-md">
                                <button className="w-full px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                    Step 2: Get Protected
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Liquidation Alert Modal */}
            {
                showLiquidationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-surface border border-success rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-success" />
                            <div className="text-center space-y-6 relative z-10">
                                <div className="mx-auto h-20 w-20 bg-success/20 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-10 w-10 text-success" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2">CLAIM PAID!</h2>
                                    <p className="text-gray-300">
                                        Your {selectedAsset} position was liquidated at ${currentPrice?.toFixed(2) || '0.00'}.
                                    </p>
                                </div>

                                <div className="bg-background p-4 rounded-xl border border-border text-left space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">Position Size</span>
                                        <span className="font-bold text-white">{liquidationData?.positionSize || positionSizeEth} ETH</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">Coverage (50%)</span>
                                        <span className="font-bold text-success">+{liquidationData?.coverage || '0.0000'} ETH</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-gray-700">
                                        <span className="text-sm text-gray-400">Status</span>
                                        <div className="flex items-center gap-1 text-success font-bold">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>PAID (Internal Transfer)</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Tenderly Verification Link */}
                                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                                    <p className="text-xs text-primary mb-2">🔗 Verify on chain:</p>
                                    {(() => {
                                        // Find updated policy to get txHash
                                        const updatedPolicy = policies.find(p => p.id === liquidationData?.policyId);
                                        const payoutTx = updatedPolicy?.claim?.txHash;

                                        return payoutTx ? (
                                            <a
                                                href={`https://virtual.tenderly.co/tx/${payoutTx}`} // Points to the specific TX
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:text-primary/80 font-mono text-xs underline block mb-1"
                                            >
                                                View Payout Transaction →
                                            </a>
                                        ) : (
                                            <a
                                                href={`https://dashboard.tenderly.co/nokia/project/testnet/ffc6a7bf-ef70-4321-af81-77cd1d06e3a2/wallets?address=${address}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:text-primary/80 font-mono text-xs underline"
                                            >
                                                View Wallet Balance on Tenderly →
                                            </a>
                                        );
                                    })()}
                                </div>

                                <button
                                    onClick={handleDismissModal}
                                    className="w-full py-3 bg-success text-black font-bold rounded-xl hover:bg-success/90 transition-colors"
                                >
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MarketTab;
