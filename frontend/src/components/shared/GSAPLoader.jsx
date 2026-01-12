import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const GSAPLoader = ({ className = "" }) => {
    const containerRef = useRef(null);
    const barsRef = useRef([]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Equalizer/Digital Wave animation
            gsap.to(barsRef.current, {
                scaleY: "random(0.3, 1.5)",
                backgroundColor: "random(['#3B82F6', '#10B981', '#6366F1'])", // Blue, Emerald, Indigo to match theme
                ease: "power2.inOut",
                duration: 0.4,
                stagger: {
                    amount: 0.5,
                    from: "center",
                    yoyo: true,
                    repeat: -1
                }
            });

            // Fade in effect for container
            gsap.fromTo(containerRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.5 }
            );

        }, containerRef);

        return () => ctx.revert();
    }, []);

    const addToRefs = (el) => {
        if (el && !barsRef.current.includes(el)) {
            barsRef.current.push(el);
        }
    };

    return (
        <div ref={containerRef} className={`flex items-center justify-center gap-1.5 h-16 ${className}`}>
            {[...Array(7)].map((_, i) => (
                <div
                    key={i}
                    ref={addToRefs}
                    className="w-1.5 h-8 bg-primary rounded-full origin-bottom"
                />
            ))}
        </div>
    );
};

export default GSAPLoader;
