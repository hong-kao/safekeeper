import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useInsurance } from '../../hooks/useInsurance';
import { Shield, AlertTriangle, Calculator, Check, ArrowRight, Eye } from 'lucide-react';
import Loader from '../shared/Loader';
import { formatEthValue } from '../../utils/format';
import { formatEther } from 'viem';

// Helper to format Wei to ETH
const formatWei = (wei) => {
    try {
        return parseFloat(formatEther(BigInt(wei))).toFixed(4);
    } catch {
        return '0.0000';
    }
};

const InsuranceTab = () => {
    const { address } = useAuth();
    const navigate = useNavigate();
    const { getQuote, buyInsurance, getPolicies, loading: txLoading, error: txError } = useInsurance(address);

    const [form, setForm] = useState({
        asset: 'ETH',
        positionSize: '',
        leverage: '',
        liquidationPrice: ''
    });

    const [premium, setPremium] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [activePolicy, setActivePolicy] = useState(null);
    const [checkingPolicy, setCheckingPolicy] = useState(true);

    // Check for existing active policy on mount
    useEffect(() => {
        const checkActivePolicy = async () => {
            if (address) {
                console.log('[InsuranceTab] Checking for active policies...');
                setCheckingPolicy(true);
                const policies = await getPolicies();
                console.log('[InsuranceTab] Policies:', policies);

                // Find active ETH policy
                const active = Array.isArray(policies)
                    ? policies.find(p => p.status === 'ACTIVE' && p.coin === 'ETH')
                    : null;

                if (active) {
                    console.log('[InsuranceTab] Found active policy:', active.id);
                    setActivePolicy(active);
                } else {
                    console.log('[InsuranceTab] No active ETH policy found');
                    setActivePolicy(null);
                }
                setCheckingPolicy(false);
            }
        };
        checkActivePolicy();
    }, [address, getPolicies]);

    // Handle Input Change
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setPremium(null); // Reset premium on change
    };

    // Calculate Premium
    const handleCalculate = async () => {
        if (!form.positionSize || !form.leverage) return;
        setCalculating(true);
        const quote = await getQuote(form.positionSize, form.leverage);
        if (quote) {
            setPremium(quote.premium);
        }
        setCalculating(false);
    };

    // Buy Insurance
    const handleBuy = async () => {
        if (!premium) return;

        console.log('[InsuranceTab] Buying insurance...');
        const result = await buyInsurance(
            form.positionSize,
            form.leverage,
            form.liquidationPrice,
            premium
        );

        if (result && result.txHash) {
            console.log('[InsuranceTab] Purchase successful! TX:', result.txHash);
            setSuccessMsg(`Insurance Purchased! TX: ${result.txHash.slice(0, 10)}...`);
            setForm({ asset: 'ETH', positionSize: '', leverage: '', liquidationPrice: '' });
            setPremium(null);

            // Redirect to Market tab after 2 seconds
            setTimeout(() => {
                navigate('/dashboard/market');
            }, 2000);
        }
    };

    // Loading state
    if (checkingPolicy) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader className="h-12 w-12 text-primary" />
            </div>
        );
    }

    // Already Protected State
    if (activePolicy) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-primary/30 rounded-2xl p-8 text-center">
                    <div className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">You're Already Protected!</h2>
                    <p className="text-gray-400 mb-6">You have an active insurance policy for ETH.</p>

                    <div className="bg-background rounded-xl p-6 border border-border mb-6 text-left">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Position Size</div>
                                <div className="font-bold text-white">{formatWei(activePolicy.positionSize)} ETH</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Leverage</div>
                                <div className="font-bold text-white">{activePolicy.leverage}x</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Liquidation Price</div>
                                <div className="font-bold text-error">${formatWei(activePolicy.liquidationPrice)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Coverage</div>
                                <div className="font-bold text-success">50%</div>
                            </div>
                        </div>
                    </div>

                    <Link
                        to="/dashboard/market"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <Eye className="h-5 w-5" />
                        View Position in Market
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        );
    }

    // Success State (after purchase)
    if (successMsg) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-surface border border-success/30 rounded-2xl p-8 text-center">
                    <div className="h-20 w-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="h-10 w-10 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
                    <p className="text-success mb-6">{successMsg}</p>
                    <p className="text-gray-400 text-sm">Redirecting to Market tab...</p>
                    <Loader className="h-6 w-6 text-primary mx-auto mt-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-warning">Beta Access Notice</h4>
                    <p className="text-sm text-warning/80">
                        Currently, <strong>ETH</strong> is the only supported asset for insurance coverage. Support for BTC and SOL is coming soon.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Purchase Form */}
                <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        Buy Coverage
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Asset</label>
                            <select
                                name="asset"
                                value={form.asset}
                                disabled
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent cursor-not-allowed opacity-70"
                            >
                                <option value="ETH">ETH (Ethereum)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Position Size (ETH)</label>
                            <input
                                type="number"
                                name="positionSize"
                                value={form.positionSize}
                                onChange={handleChange}
                                placeholder="e.g. 1.5"
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Leverage (x)</label>
                                <input
                                    type="number"
                                    name="leverage"
                                    value={form.leverage}
                                    onChange={handleChange}
                                    placeholder="e.g. 10"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Liq. Price ($)</label>
                                <input
                                    type="number"
                                    name="liquidationPrice"
                                    value={form.liquidationPrice}
                                    onChange={handleChange}
                                    placeholder="e.g. 2800"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-600"
                                />
                            </div>
                        </div>

                        {txError && (
                            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                                {txError}
                            </div>
                        )}

                        {!premium ? (
                            <button
                                onClick={handleCalculate}
                                disabled={calculating || !form.positionSize || !form.leverage}
                                className="w-full py-4 bg-surface border border-primary text-primary font-bold rounded-xl hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {calculating ? <Loader className="h-5 w-5" /> : <Calculator className="h-5 w-5" />}
                                Calculate Premium
                            </button>
                        ) : (
                            <div className="space-y-4 animate-slide-up">
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex justify-between items-center">
                                    <span className="text-gray-300">Estimated Premium</span>
                                    <span className="text-xl font-bold text-white">{formatEthValue(premium)}</span>
                                </div>
                                <button
                                    onClick={handleBuy}
                                    disabled={txLoading}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {txLoading ? <Loader className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                                    Confirm & Buy Coverage
                                </button>
                                <button
                                    onClick={() => setPremium(null)}
                                    className="w-full text-sm text-gray-500 hover:text-white"
                                >
                                    Recalculate
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Info */}
                <div className="space-y-6">
                    <div className="bg-surface/50 border border-border rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4">How it works</h3>
                        <ul className="space-y-4 text-gray-400 text-sm">
                            <li className="flex gap-3">
                                <span className="bg-primary/20 text-primary h-6 w-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                                Enter your Hyperliquid position details.
                            </li>
                            <li className="flex gap-3">
                                <span className="bg-primary/20 text-primary h-6 w-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                                We calculate a premium based on your leverage and volatility.
                            </li>
                            <li className="flex gap-3">
                                <span className="bg-primary/20 text-primary h-6 w-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                                Pay the premium in ETH to activate your policy.
                            </li>
                            <li className="flex gap-3">
                                <span className="bg-primary/20 text-primary h-6 w-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                                If you get liquidated, we automatically pay out 50% of your position size directly to your wallet.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsuranceTab;
