import { Loader2 } from 'lucide-react';

const Loader = ({ className = "h-6 w-6" }) => {
    return (
        <Loader2 className={`animate-spin ${className}`} />
    );
};

export default Loader;
