import React from 'react';

interface BrakePedalProps {
    isApplied: boolean | undefined;
}

const BrakePedal: React.FC<BrakePedalProps> = ({ isApplied }) => {
    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            <svg
                viewBox="0 0 48 48"
                className={`w-full h-full transition-all duration-200 ${isApplied ? 'drop-shadow-[0_0_8px_rgba(255,61,0,0.6)]' : 'opacity-50'}`}
            >
                <defs>
                    <mask id="brakeRodMask">
                        <rect width="48" height="48" fill="white" />
                        <rect x="10" y="22" width="28" height="20" rx="5" fill="black" />
                    </mask>
                    <linearGradient id="brakeFillGradient" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#ff3d00" />
                        <stop offset="100%" stopColor="#ff7043" />
                    </linearGradient>
                </defs>

                {/* Rod */}
                <path
                    d="M30 5
                       C27 11, 22 15, 19.5 19.5
                       C18 22.2, 17.2 24.2, 16.6 26.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                    mask="url(#brakeRodMask)"
                />

                {/* Pedal Body Background (Empty State) */}
                <rect
                    x="10"
                    y="22"
                    width="28"
                    height="20"
                    rx="5"
                    fill="currentColor"
                    className="text-white/10"
                />

                {/* Pedal Body Fill (Active State) */}
                <rect
                    x="10"
                    y="22"
                    width="28"
                    height="20"
                    rx="5"
                    fill="url(#brakeFillGradient)"
                    className={`transition-all duration-150 origin-bottom ${isApplied ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}
                />

                {/* Border for definition */}
                <rect
                    x="10"
                    y="22"
                    width="28"
                    height="20"
                    rx="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`transition-colors duration-200 ${isApplied ? 'text-white/80' : 'text-white/20'}`}
                />
            </svg>
        </div>
    );
};

export default BrakePedal;
