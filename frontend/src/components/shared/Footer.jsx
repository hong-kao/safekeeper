const Footer = () => {
    return (
        <footer className="border-t border-border bg-surface py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-muted text-sm">
                    &copy; {new Date().getFullYear()} SafeKeeper. All rights reserved.
                </div>
                <div className="text-muted text-sm flex items-center gap-1">
                    Built by <span className="text-white font-medium">Team Baked</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
