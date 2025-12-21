import React from 'react';

interface SteeringWheelProps {
    angle: number;
    blinkerOnLeft?: boolean;
    blinkerOnRight?: boolean;
    brakeApplied?: boolean;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({
    angle,
    blinkerOnLeft = false,
    blinkerOnRight = false,
    brakeApplied = false
}) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-4 mb-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${blinkerOnLeft ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-white/10'}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${brakeApplied ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/10'}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${blinkerOnRight ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-white/10'}`} />
            </div>

            <div className="relative">
                <div
                    className="w-16 h-16 border-2 border-white/40 rounded-full relative flex justify-center items-center transition-transform duration-75 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    style={{ transform: `rotate(${angle}deg)` }}
                >
                    {/* Horizontal bar */}
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/60 -translate-y-1/2" />
                    {/* Vertical bottom bar */}
                    <div className="absolute bottom-0 left-1/2 w-[2px] h-1/2 bg-white/60 -translate-x-1/2" />

                    {/* Center cap */}
                    <div className="w-4 h-4 bg-white/20 rounded-full border border-white/40 z-10" />
                </div>
            </div>

            <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-[#00E5FF] font-outfit drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
                    {Math.round(angle)}°
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                    Steering
                </span>
            </div>
        </div>
    );
};

export default SteeringWheel;
