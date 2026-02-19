import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Lottie from 'lottie-react';
import catAnimation from '../assets/cat.json';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface CatPosition {
    side: Side;
    offset: number; // Percentage 0-100 along the edge
}

interface PeekabooCatProps {
    isSidebarOpen: boolean;
}

export const PeekabooCat: React.FC<PeekabooCatProps> = ({ isSidebarOpen }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<CatPosition>({ side: 'bottom', offset: 50 });
    const [rotation, setRotation] = useState(0);
    const sideIndexRef = React.useRef(0); // Track which side to show next

    const triggerCat = useCallback(() => {
        const sides: Side[] = ['bottom', 'right', 'top', 'left'];
        // Use sequential side to ensure all get shown
        const side = sides[sideIndexRef.current];
        sideIndexRef.current = (sideIndexRef.current + 1) % sides.length;

        // Ensure offset doesn't put it too close to corners
        const randomOffset = Math.random() * 60 + 20; // 20% to 80%
        
        let rot = 0;
        switch (side) {
            case 'bottom': rot = 0; break;
            case 'top': rot = 180; break;
            case 'left': rot = 90; break;
            case 'right': rot = -90; break;
        }

        setPosition({ side, offset: randomOffset });
        setRotation(rot);
        
        // Small delay to ensure position is set before sliding in
        requestAnimationFrame(() => {
            setIsVisible(true);
        });

        // Hide after animation plays
        setTimeout(() => {
            setIsVisible(false);
        }, 4000); 
    }, []);

    useEffect(() => {
        // Initial delay
        const initialTimer = setTimeout(triggerCat, 2000);

        // Loop
        const interval = setInterval(() => {
            // Remove randomness to guarantee showing up
            triggerCat();
        }, 5000); // More frequent for verification 

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [triggerCat]);

    // Calculate sidebar offset
    const sidebarWidth = isSidebarOpen ? 256 : 72; 

    // Calculate styles based on position
    const getStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy spring
            width: '150px',
            height: '150px',
            pointerEvents: 'none',
            willChange: 'transform',
        };

        const hiddenOffset = '100%'; 
        const visibleOffset = '0%';

        switch (position.side) {
            case 'bottom':
                return {
                    ...base,
                    bottom: 0,
                    left: `${position.offset}%`,
                    transform: `translate(-50%, ${isVisible ? visibleOffset : hiddenOffset}) rotate(${rotation}deg)`,
                };
            case 'top':
                 return {
                    ...base,
                    top: 0,
                    left: `${position.offset}%`,
                    // Use slightly adjusted translate to ensure head is fully visible
                    transform: `translate(-50%, ${isVisible ? '10%' : '-100%'}) rotate(${rotation}deg)`,
                };
            case 'left':
                return {
                    ...base,
                    left: sidebarWidth, // Start from sidebar edge
                    top: `${position.offset}%`,
                    transform: `translate(${isVisible ? '-50%' : '-150%'}, -50%) rotate(${rotation}deg)`,
                };
            case 'right':
                return {
                    ...base,
                    right: 0,
                    top: `${position.offset}%`,
                    // Less aggressive translate for right side to show more cat
                    transform: `translate(${isVisible ? '40%' : '150%'}, -50%) rotate(${rotation}deg)`,
                };
        }
    };

    return createPortal(
        <div style={getStyles()}>
            <Lottie 
                animationData={catAnimation} 
                loop={true}
                style={{ width: '100%', height: '100%' }}
            />
        </div>,
        document.body
    );
};
