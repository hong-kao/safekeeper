import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './hooks/useAuth';

// Define Tenderly Virtual Testnet Chain
const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const chainId = Number(import.meta.env.VITE_CHAIN_ID) || 31337;

const tenderlyChain = defineChain({
    id: chainId,
    name: 'SafeKeeper Tenderly',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [rpcUrl] },
    },
});

const config = createConfig({
    chains: [tenderlyChain],
    connectors: [
        injected({
            shimDisconnect: true,
        }),
    ],
    transports: {
        [tenderlyChain.id]: http(rpcUrl),
    },
});

const queryClient = new QueryClient();

function App() {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <Router>
                    <AuthProvider>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/dashboard/*" element={<Dashboard />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AuthProvider>
                </Router>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default App;
