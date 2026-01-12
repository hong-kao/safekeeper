import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Loader2, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const { connect, isConnected, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected) {
            navigate('/dashboard');
        }
    }, [isConnected, navigate]);

    return (
        <MainLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <div className="w-full max-w-md space-y-8 text-center">
                    <div>
                        <div className="mx-auto h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
                            <Wallet className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Connect your wallet
                        </h2>
                        <p className="mt-4 text-gray-400 text-lg">
                            Sign in with MetaMask to access SafeKeeper dashboard and protect your assets.
                        </p>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={connect}
                            disabled={loading || isConnected}
                            className="w-full group relative flex items-center justify-center py-4 px-8 border border-transparent text-lg font-semibold rounded-xl text-black bg-white hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-[#0a0a0a]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <span className="mr-2">Connect with MetaMask</span>
                                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-6" />
                                </>
                            )}
                        </button>
                        <p className="mt-6 text-sm text-gray-500">
                            By connecting, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default LoginPage;
