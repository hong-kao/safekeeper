import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { BuyInsurance } from './components/pages/BuyInsurance';
import { PoolStatus } from './components/pages/PoolStatus';
import { RiskSimulator } from './components/pages/RiskSimulator';
import { useWallet } from './hooks/useWallet';
import { Button } from './components/shared/Button';

export default function App() {
    const [currentPage, setCurrentPage] = useState('buy');
    const { address, isConnected, connect, disconnect, loading } = useWallet();

    return (
        <div style={{ padding: '20px' }}>
            <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

            <div style={{ marginBottom: '20px' }}>
                {isConnected ? (
                    <div>
                        <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        <Button onClick={disconnect}>Disconnect</Button>
                    </div>
                ) : (
                    <Button onClick={connect} disabled={loading}>
                        {loading ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                )}
            </div>

            <main>
                {currentPage === 'buy' && <BuyInsurance />}
                {currentPage === 'pool' && <PoolStatus />}
                {currentPage === 'risk' && <RiskSimulator />}
            </main>
        </div>
    );
}
