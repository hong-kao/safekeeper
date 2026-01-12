import { Link } from 'react-router-dom';
import { Shield, TrendingUp, Users, ArrowRight, Zap, Lock, Activity, CheckCircle2 } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';

const LandingPage = () => {
    return (
        <MainLayout>
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-24 min-h-[85vh] flex items-center">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full -z-10 mix-blend-screen animate-pulse" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/10 blur-[120px] rounded-full -z-10 mix-blend-screen" />

                <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
                    <div className="mx-auto max-w-4xl text-center">


                        <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl mb-6 leading-[1.1]">
                            Your Insurance Against <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-accent">Liquidation Cascades</span>
                        </h1>

                        <p className="mt-6 text-xl leading-8 text-gray-300 max-w-2xl mx-auto">
                            The first permissionless insurance protocol that pays you back when the market reeks you.
                            Sleep soundly with <span className="text-white font-bold">On-chain verified coverage</span> for your leveraged positions.
                        </p>

                        <div className="mt-12 flex items-center justify-center gap-x-6">
                            <Link
                                to="/login"
                                className="group relative rounded-full bg-white px-8 py-4 text-base font-bold text-black hover:scale-105 transition-all duration-200 flex items-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                            >
                                Get Protected Now
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <a href="#how-it-works" className="text-sm font-semibold leading-6 text-gray-300 hover:text-white transition-colors">
                                How it works <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Statement */}
            <section className="py-24 bg-surface/50 border-y border-border/50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-6">The Problem: Liquidation = $0</h2>
                            <p className="text-lg text-gray-400 mb-6">
                                When markets move violently, leveraged traders get liquidated. There is zero recovery mechanism.
                                <br /><br />
                                Existing insurance protocols only cover smart contract bugs. Nobody covers the real risk:
                                <span className="text-white font-bold block mt-2 text-xl">"Did the market wreck me?"</span>
                            </p>
                            <div className="flex gap-4">
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <div className="text-error font-mono font-bold text-2xl mb-1">$10B+</div>
                                    <div className="text-sm text-gray-500">Liquidated in Oct 2025</div>
                                </div>
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <div className="text-gray-300 font-mono font-bold text-2xl mb-1">0%</div>
                                    <div className="text-sm text-gray-500">Current Recovery Rate</div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-error/20 blur-[80px] rounded-full -z-10" />
                            <div className="bg-background border border-error/20 p-8 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-error" />
                                <div className="space-y-4 font-mono text-sm">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Position</span>
                                        <span>ETH-USD</span>
                                    </div>
                                    <div className="flex justify-between text-white">
                                        <span>Size</span>
                                        <span>$50,000 (10x)</span>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="flex justify-between text-error font-bold">
                                        <span>Event</span>
                                        <span>LIQ_CLOSE</span>
                                    </div>
                                    <div className="flex justify-between text-error font-bold">
                                        <span>Remaining Equity</span>
                                        <span>$0.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Features */}
            <section id="how-it-works" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-gold font-mono text-primary tracking-wider uppercase text-sm font-bold mb-4">Core Features</h2>
                        <h3 className="text-4xl font-black text-white sm:text-5xl">Trustless Protection</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-surface border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary/20 transition-colors">
                                <Lock className="h-7 w-7 text-primary" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-4">Transparent Payouts</h4>
                            <p className="text-gray-400 leading-relaxed">
                                Liquidations are verified directly on-chain. No centralized backend can deny your claim.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-surface border border-border hover:border-secondary/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-8 group-hover:bg-secondary/20 transition-colors">
                                <Activity className="h-7 w-7 text-secondary" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-4">Dynamic ML Pricing</h4>
                            <p className="text-gray-400 leading-relaxed">
                                Premiums adapt in real-time based on market volatility, leverage, and pool health - powered by models trained on historical crash data.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-surface border border-border hover:border-accent/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 group-hover:bg-accent/20 transition-colors">
                                <Zap className="h-7 w-7 text-accent" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-4">Instant Settlement</h4>
                            <p className="text-gray-400 leading-relaxed">
                                WebSocket listeners detect liquidations in sub-seconds. Smart contracts automatically settle claims directly to your wallet.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Who is this for */}
            <section className="py-24 bg-surface/30">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div>
                            <h2 className="text-4xl font-bold text-white mb-8">Who is SafeKeeper for?</h2>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <TrendingUp className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white">DeFi Natives</h4>
                                        <p className="text-gray-400">Traders who prefer non-custodial solutions and trust code over centralized assurances.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <Users className="h-6 w-6 text-secondary" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white">High Leverage Traders</h4>
                                        <p className="text-gray-400">Users trading with 10x+ leverage who need a safety net against wick-downs and volatility spikes.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <Shield className="h-6 w-6 text-accent" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white">Risk Managers</h4>
                                        <p className="text-gray-400">Professionals looking to hedge their downside without closing positions prematurely.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary/20 via-surface to-background p-1 rounded-3xl">
                            <div className="bg-black/80 backdrop-blur-xl rounded-[22px] p-8 h-full border border-white/10">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xl font-bold text-white">Live Protection Logic</h4>
                                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                                </div>

                                <div className="space-y-6 font-mono text-sm">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="text-gray-400 mb-2">Monitor</div>
                                        <div className="text-primary">> Listening to Hyperliquid WS...</div>
                                        <div className="text-primary">> Tracking 10x ETH Long Position</div>
                                    </div>

                                    <div className="flex justify-center">
                                        <ArrowRight className="h-5 w-5 text-gray-600 rotate-90" />
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="text-gray-400 mb-2">Detect</div>
                                        <div className="text-error">> LIQUIDATION DETECTED @ $2850</div>
                                        <div className="text-gray-300">> Verifying On-chain...</div>
                                    </div>

                                    <div className="flex justify-center">
                                        <ArrowRight className="h-5 w-5 text-gray-600 rotate-90" />
                                    </div>

                                    <div className="p-4 bg-success/10 rounded-xl border border-success/20">
                                        <div className="text-gray-400 mb-2">Payout</div>
                                        <div className="text-success font-bold flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" />
                                            CLAIM PAID: 5.0 ETH
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-24 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:shadow-[0_0_50px_-10px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300"
                        >
                            Start Protecting Your Assets <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
};

export default LandingPage;
