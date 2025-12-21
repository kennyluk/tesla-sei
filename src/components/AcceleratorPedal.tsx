import React from 'react';

interface AcceleratorPedalProps {
    value: number | undefined; // 0 to 100
}

const AcceleratorPedal: React.FC<AcceleratorPedalProps> = ({ value = 0 }) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className="flex flex-col items-center">
            {/* Top Zone - Standardized 24px (h-6) + 8px (mb-2) */}
            <div className="h-6 mb-2 invisible" />

            {/* Visual Body - Fixed 64px */}
            <div className="w-16 h-16 flex items-center justify-center">
                <svg
                    viewBox="0 0 48 48"
                    className={`w-full h-full transition-all duration-200 ${clampedValue > 0 ? 'drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'opacity-50'}`}
                >
                    <defs>
                        <mask id="accelRodMask">
                            <rect width="48" height="48" fill="white" />
                            <rect x="19" y="18.5" width="12" height="25" rx="4.5" fill="black" />
                        </mask>
                        <linearGradient id="accelFillGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#00e5ff" />
                            <stop offset="100%" stopColor="#80deea" />
                        </linearGradient>
                    </defs>

                    {/* Rod (masked) */}
                    <path
                        d="M28.5 6
                           C27.5 10.5, 25.5 13.8, 24 16.5
                           C22.3 19.6, 21.5 22.1, 21.1 24.3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/30"
                        mask="url(#accelRodMask)"
                    />

                    {/* Pedal Body Background (Empty State) */}
                    <rect
                        x="19"
                        y="18.5"
                        width="12"
                        height="25"
                        rx="4.5"
                        fill="currentColor"
                        className="text-white/10"
                    />

                    {/* Pedal Body Fill (Active State) */}
                    <rect
                        x="19"
                        y="18.5"
                        width="12"
                        height="25"
                        rx="4.5"
                        fill="url(#accelFillGradient)"
                        className="transition-transform duration-75 origin-bottom"
                        style={{ transform: `scaleY(${clampedValue / 100})` }}
                    />

                    {/* Border for definition */}
                    <rect
                        x="19"
                        y="18.5"
                        width="12"
                        height="25"
                        rx="4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={`transition-colors duration-200 ${clampedValue > 0 ? 'text-white/80' : 'text-white/20'}`}
                    />
                </svg>
            </div>

            {/* Bottom Spacer to match Steering reading */}
            <div className="mt-2 h-5 invisible" />
        </div>
    );
};

export default AcceleratorPedal;
