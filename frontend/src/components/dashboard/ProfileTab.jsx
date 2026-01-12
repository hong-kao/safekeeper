import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useInsurance } from '../../hooks/useInsurance';
import { Shield, History, CheckCircle, Clock, ExternalLink, Wallet } from 'lucide-react';
import Loader from '../shared/Loader';
import { formatEther } from 'viem';

// Helper to format Wei to ETH
const formatWei = (wei) => {
    try {
        return parseFloat(formatEther(BigInt(wei))).toFixed(4);
    } catch {
        return '0.0000';
    }
};

// Helper to format date
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const ProfileTab = () => {
    const { address } = useAuth();
    const { getPolicies } = useInsurance(address);

    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPolicies = async () => {
            if (address) {
                setLoading(true);
                const data = await getPolicies();
                setPolicies(data || []);
                setLoading(false);
            }
        };
        fetchPolicies();
    }, [address, getPolicies]);

    // Separate policies by status
    const activePolicies = policies.filter(p => p.status === 'ACTIVE');
    const pastPolicies = policies.filter(p => p.status !== 'ACTIVE');

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader className="h-12 w-12 text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Your Profile</h1>
                        <p className="text-sm text-gray-400 font-mono">
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-6 text-center">
                    <div className="px-6 py-2 bg-background rounded-xl border border-border">
                        <div className="text-2xl font-bold text-primary">{activePolicies.length}</div>
                        <div className="text-xs text-gray-400">Active</div>
                    </div>
                    <div className="px-6 py-2 bg-background rounded-xl border border-border">
                        <div className="text-2xl font-bold text-success">{pastPolicies.length}</div>
                        <div className="text-xs text-gray-400">Claimed</div>
                    </div>
                </div>
            </div>

            {/* Current Insurances Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-white">Current Insurances</h2>
                    <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                        {activePolicies.length} Active
                    </span>
                </div>

                {activePolicies.length === 0 ? (
                    <div className="bg-surface border border-border rounded-xl p-8 text-center">
                        <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="font-bold text-white mb-2">No Active Coverage</h3>
                        <p className="text-sm text-gray-400 mb-4">You don't have any active insurance policies.</p>
                        <button className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors">
                            Buy Insurance
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {activePolicies.map((policy) => (
                            <div key={policy.id} className="bg-surface border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
                                            <span className="text-lg font-bold text-primary">{policy.coin}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{formatWei(policy.positionSize)} {policy.coin}</span>
                                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                                                    {policy.leverage}x
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Liq. Price: ${formatWei(policy.liquidationPrice)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-xs text-gray-400">{formatDate(policy.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-2 text-success">
                                            <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                                            <span className="text-xs font-bold">ACTIVE</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-gray-400">Premium Paid: </span>
                                        <span className="text-white font-mono">{formatWei(policy.premiumPaid)} ETH</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-400">Coverage: </span>
                                        <span className="text-primary font-bold">{(parseFloat(formatWei(policy.positionSize)) * 0.5).toFixed(4)} ETH</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Past Insurances Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-success" />
                    <h2 className="text-lg font-bold text-white">Past Insurances</h2>
                    <span className="ml-2 px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">
                        {pastPolicies.length} Claimed
                    </span>
                </div>

                {pastPolicies.length === 0 ? (
                    <div className="bg-surface border border-border rounded-xl p-8 text-center">
                        <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="font-bold text-white mb-2">No Past Policies</h3>
                        <p className="text-sm text-gray-400">Your claimed policies will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pastPolicies.map((policy) => (
                            <div key={policy.id} className="bg-surface/50 border border-border rounded-xl p-6 opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-success/20 rounded-xl flex items-center justify-center">
                                            <CheckCircle className="h-6 w-6 text-success" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{formatWei(policy.positionSize)} {policy.coin}</span>
                                                <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                                                    {policy.leverage}x
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Liq. Price: ${formatWei(policy.liquidationPrice)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-xs text-gray-400">{formatDate(policy.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-2 text-success">
                                            <CheckCircle className="h-3 w-3" />
                                            <span className="text-xs font-bold">CLAIMED</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                    <div className="text-sm">
                                        <span className="text-gray-400">Premium Paid: </span>
                                        <span className="text-white font-mono">{formatWei(policy.premiumPaid)} ETH</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-400">Payout Received: </span>
                                        <span className="text-success font-bold">+{(parseFloat(formatWei(policy.positionSize)) * 0.5).toFixed(4)} ETH</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileTab;
