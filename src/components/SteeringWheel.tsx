import React from 'react';

interface SteeringWheelProps {
    angle: number;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({ angle }) => {
    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className="w-9 h-9 border-2 border-white rounded-full relative opacity-80 flex justify-center items-center transition-transform duration-75 ease-linear"
                style={{ transform: `rotate(${angle}deg)` }}
            >
                {/* Horizontal bar */}
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white -translate-y-1/2" />
                {/* Vertical bottom bar */}
                <div className="absolute bottom-0 left-1/2 w-[2px] h-1/2 bg-white -translate-x-1/2" />
            </div>
            <span className="text-[10px] font-semibold text-tesla-blue font-outfit drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">
                {Math.round(angle)}°
            </span>
        </div>
    );
};

export default SteeringWheel;
