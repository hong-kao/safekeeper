import { createContext, useContext, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const wallet = useWallet();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If connected and on login page, redirect to dashboard
        if (wallet.isConnected && location.pathname === '/login') {
            navigate('/dashboard');
        }
    }, [wallet.isConnected, location.pathname, navigate]);

    return (
        <AuthContext.Provider value={wallet}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
