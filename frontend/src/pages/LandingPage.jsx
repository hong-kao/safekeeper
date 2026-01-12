import { Link } from 'react-router-dom';
import { Shield, TrendingUp, Users, ArrowRight } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';

const LandingPage = () => {
    return (
        <MainLayout>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 sm:py-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Your Insurance Against Liquidation
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">
                            Sleep soundly while trading leverage. SafeKeeper protects your position on Hyperliquid.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                to="/login"
                                className="group relative rounded-full bg-white px-8 py-3 text-sm font-semibold text-black hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
                            >
                                Get Protected
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Abstract Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[100px] rounded-full -z-10" />
            </section>

            {/* Info Sections */}
            <section className="py-24 bg-surface/30">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
                                What is SafeKeeper?
                            </h2>
                            <p className="text-lg text-gray-400 leading-relaxed">
                                SafeKeeper is a decentralized insurance protocol designed specifically for perps traders on Hyperliquid.
                                We monitor your position health in real-time and provide automatic payouts if you get liquidated,
                                softening the blow and helping you stay in the game.
                            </p>
                        </div>
                        <div className="bg-surface border border-border p-8 rounded-2xl shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-sm font-medium text-gray-300">Real-time Position Monitoring</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                                    <span className="text-sm font-medium text-gray-300">Instant Payout on Liquidation</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="h-2 w-2 rounded-full bg-secondary animate-pulse delay-150" />
                                    <span className="text-sm font-medium text-gray-300">Transparent On-Chain Logic</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Who is this for?
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors">
                            <TrendingUp className="h-8 w-8 text-primary mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">High Leverage Traders</h3>
                            <p className="text-gray-400">
                                You trade with 10x+ leverage and want a safety net against wicks and volatility.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-surface border border-border hover:border-secondary/50 transition-colors">
                            <Users className="h-8 w-8 text-secondary mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Risk Managers</h3>
                            <p className="text-gray-400">
                                You want to hedge your positions without closing them prematurely.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-surface border border-border hover:border-accent/50 transition-colors">
                            <Shield className="h-8 w-8 text-accent mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">DeFi Natives</h3>
                            <p className="text-gray-400">
                                You prefer non-custodial solutions and trust code over centralized assurances.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
                        >
                            Start Protecting Your Assets <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
};

export default LandingPage;
