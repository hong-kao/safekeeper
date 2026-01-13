import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useInsurance } from '../../hooks/useInsurance';
import { useBalance } from 'wagmi';
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

// Helper to format large numbers
const formatLargeNumber = (val) => {
    if (!val) return '0';
    const num = parseFloat(val);
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(4);
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
    const { data: balanceData } = useBalance({ address });

    const [policies, setPolicies] = useState([]);
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (address) {
                console.log('[ProfileTab] Fetching policies and claims...');

                // Fetch policies
                const policyData = await getPolicies();
                console.log('[ProfileTab] Policies:', policyData);
                setPolicies(Array.isArray(policyData) ? policyData : []);

                // Fetch claims from backend API
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/claims/user/${address}`);
                    if (res.ok) {
                        const claimsData = await res.json();
                        console.log('[ProfileTab] Claims:', claimsData);
                        setClaims(Array.isArray(claimsData) ? claimsData : []);
                    }
                } catch (err) {
                    console.error('[ProfileTab] Failed to fetch claims:', err);
                }

                setLoading(false);
            }
        };
        fetchData();

        // Auto-refresh every 5 seconds to catch liquidation status changes
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [address, getPolicies]);

    // Separate policies by status
    // User requested: Ongoing claims should be in 'Ongoing' (Active) section
    const activePolicies = policies.filter(p => p.status === 'ACTIVE' || p.status === 'PENDING');
    const pastPolicies = policies.filter(p => p.status === 'CLAIMED' || p.status === 'PAID' || p.status === 'EXPIRED');

    // Separate claims by status
    const pendingClaims = claims.filter(c => c.status === 'PENDING');
    const paidClaims = claims.filter(c => c.status === 'PAID');

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
                        <div className="text-2xl font-bold text-white">
                            {formatLargeNumber(balanceData?.formatted)} <span className="text-sm text-primary">ETH</span>
                        </div>
                        <div className="text-xs text-gray-400">Balance</div>
                    </div>
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
                                        <div className="flex items-center gap-1 mt-2">
                                            {policy.status === 'ACTIVE' ? (
                                                <>
                                                    <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                                                    <span className="text-xs font-bold text-success">ACTIVE</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-bold text-yellow-500">PROCESSING</span>
                                                </>
                                            )}
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

            {/* Claims History Section */}
            {claims.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-yellow-500" />
                        <h2 className="text-lg font-bold text-white">Claims History</h2>
                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                            {claims.length} Total
                        </span>
                    </div>

                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-background border-b border-border">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Policy</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Payout</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Tx</th>
                                </tr>
                            </thead>
                            <tbody>
                                {claims.map((claim) => (
                                    <tr key={claim.id} className="border-b border-border/50 hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">
                                                    {claim.policy ? `${formatWei(claim.policy.positionSize)} ETH` : 'N/A'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {claim.policy?.leverage}x
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${claim.status === 'PAID'
                                                ? 'bg-success/20 text-success'
                                                : claim.status === 'PENDING'
                                                    ? 'bg-yellow-500/20 text-yellow-500'
                                                    : 'bg-red-500/20 text-red-500'
                                                }`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-success font-bold">
                                                +{formatWei(claim.payoutAmount)} ETH
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400">
                                            {formatDate(claim.createdAt)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {claim.txHash ? (
                                                <a
                                                    href={`https://sepolia.arbiscan.io/tx/${claim.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <span className="font-mono text-xs">{claim.txHash.slice(0, 8)}...</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileTab;
