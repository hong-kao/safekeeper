import { Link, useLocation } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/dashboard');

    return (
        <nav className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo/logo-no-bg.png" alt="SafeKeeper" className="h-10 w-auto" />
                            <span className="text-xl font-bold tracking-tight text-white">SafeKeeper</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isDashboard && (
                            <Link to="/login" className="btn btn-primary flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
                                Join Us
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                        {isDashboard && (
                            <div className="hidden md:block">
                                {/* Dashboard specific nav items can go here if needed, 
                      or they stay in the dashboard layout.
                      For now, keeping it clean. */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
