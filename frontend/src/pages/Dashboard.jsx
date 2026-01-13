import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import MarketTab from '../components/dashboard/MarketTab';
import LiquidityTab from '../components/dashboard/LiquidityTab';
import InsuranceTab from '../components/dashboard/InsuranceTab';
import ProfileTab from '../components/dashboard/ProfileTab';
import ChainDebug from '../components/shared/ChainDebug';

const Dashboard = () => {
    const location = useLocation();

    // Helper to determine if a tab is active
    const isActive = (path) => {
        return location.pathname.includes(path);
    };

    const tabs = [
        { name: 'Market', path: '/dashboard/market' },
        { name: 'Liquidity', path: '/dashboard/liquidity' },
        { name: 'Insurance', path: '/dashboard/insurance' },
        { name: 'Your Profile', path: '/dashboard/profile' },
    ];

    return (
        <MainLayout>
            {/* Chain Debug Panel */}
            <ChainDebug />
            <div className="bg-surface border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.name}
                                to={tab.path}
                                className={`
                                    py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 transition-colors duration-200
                                    ${isActive(tab.path)
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                                    }
                                `}
                            >
                                {tab.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                    <Route path="/" element={<Navigate to="market" replace />} />
                    <Route path="market" element={<MarketTab />} />
                    <Route path="liquidity" element={<LiquidityTab />} />
                    <Route path="insurance" element={<InsuranceTab />} />
                    <Route path="profile" element={<ProfileTab />} />
                </Routes>
            </div>
        </MainLayout >
    );
};

export default Dashboard;
