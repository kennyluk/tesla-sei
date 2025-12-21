import React from 'react';

interface SteeringWheelProps {
    angle: number;
    blinkerOnLeft?: boolean;
    blinkerOnRight?: boolean;
    brakeApplied?: boolean;
    autopilotEnabled?: boolean;
    autopilotState?: string;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({
    angle,
    blinkerOnLeft = false,
    blinkerOnRight = false,
    brakeApplied = false,
    autopilotEnabled = false,
    autopilotState = 'NONE'
}) => {
    const getAutopilotLabel = () => {
        switch (autopilotState) {
            case 'TACC': return 'TACC';
            case 'SELF_DRIVING': return 'FSD';
            case 'AUTOSTEER': return 'Autosteer';
            default: return null;
        }
    };

    const label = getAutopilotLabel();
    return (
        <div className="flex flex-col items-center">
            {/* Top Zone - Standardized 24px (h-6) + 8px (mb-2) */}
            <div className="h-6 flex items-end justify-center mb-2">
                {label && (
                    <span className="text-[9px] font-bold text-[#2962FF] uppercase tracking-[0.2em] leading-none">
                        {label}
                    </span>
                )}
            </div>

            {/* Wheel Container - Fixed 64px (w-16) */}
            <div className="w-16 h-16 relative flex justify-center items-center">
                <div
                    className="w-full h-full relative transition-transform duration-75 ease-linear"
                    style={{ transform: `rotate(${angle}deg)` }}
                >
                    <svg viewBox="0 0 484 412" className={`w-full h-full drop-shadow-2xl transition-all duration-300 ${autopilotEnabled ? 'drop-shadow-[0_0_15px_rgba(41,98,255,0.5)]' : ''}`}>
                        {/* Outer Rim */}
                        <path
                            fill={autopilotEnabled ? "#2962FF" : "#c3c3c3"}
                            className="transition-colors duration-300"
                            d="M138 42.4244C126.123 44.0029 114.564 46.7537 104.424 53.5293C92.4822 61.5097 83.5709 74.7227 73.8148 85.0895C65.9497 93.447 56.2324 102.159 50.4784 112.184C37.3888 134.991 33.68 162.184 31.9105 188C29.9266 216.943 29.6519 247.828 37.5934 276C40.7348 287.144 46.4204 296.839 51.49 307.09C59.8749 324.043 68.355 343.509 82.0154 356.961C103.903 378.513 137.841 374 166 374L306 374C330.873 374 357.374 376.505 382 372.787C394.057 370.967 407.392 364.659 415.826 355.907C421.402 350.12 425.456 342.031 429.235 334.997C433.197 327.624 437.775 320.738 441.579 313.285C445.391 305.82 450.493 298.964 453.353 291C467.568 251.41 467.339 210.115 462.286 169C459.494 146.274 454.547 122.171 439.536 103.996C431.315 94.0419 422.194 84.8193 413.514 75.2847C403.195 63.9491 394.513 53.1978 380 47.1983C367.846 42.1739 353.933 42 341 42L299 42L193 42C175.038 42 155.805 40.0579 138 42.4244z"
                        />
                        {/* Inner Dark Parts */}
                        <path fill="#1d1d1d" d="M91 173C89.7215 189.2 84.1965 204.834 83.0895 221C82.5429 228.983 85.3199 236.2 86 244C76.2148 245.781 73.7997 255.179 75.8989 264C79.7445 280.159 89.9553 295.417 97.689 310C100.898 316.051 104.761 322.299 110.004 326.786C127.151 341.461 153.195 337 174 337C182.874 337 199.911 340.198 206.312 332.387C209.199 328.862 209.142 323.309 208.961 319C208.535 308.914 206.007 299.031 206 289L290 289C289.971 299.366 287.996 309.51 288 320C288.002 324.776 287.61 330.053 291.279 333.721C297.762 340.205 314.538 337 323 337C343.582 337 370.392 341.647 386.791 326.235C392.157 321.193 396.317 314.467 399.407 307.83C406.077 293.503 416.27 280.702 419.88 265C422.112 255.288 420.306 246.483 410 243C411.194 237.778 412.821 232.411 412.821 227C412.822 208.766 406.426 191.07 405 173C407.098 172.891 409.003 172.748 411.005 172.034C425.1 167.007 420.986 151.257 417.242 140.09C411.662 123.444 397.569 111.667 386.169 99C379.388 91.4659 372.495 82.3765 362.91 78.257C352.672 73.8562 341.887 74 331 74L294 74C247.012 74 199.984 73.4268 153 74.0038C128.95 74.2992 116.928 91.8721 101.91 108C95.0596 115.358 86.3941 122.797 82.1412 132.09C77.3352 142.59 67.9346 166.454 83.9992 172.272C86.2398 173.084 88.6578 172.979 91 173z" />
                        {/* Inner Details */}
                        <path
                            fill={autopilotEnabled ? "#2962FF" : "currentColor"}
                            className={`transition-colors duration-300 ${autopilotEnabled ? '' : 'text-white/30'}`}
                            d="M210 144.424C202.346 145.429 194.626 144.855 187 146.371C168.557 150.037 150.04 157.054 132 162.459C125.341 164.454 118.656 166.248 112 168.23C109.31 169.031 106.066 169.208 104.148 171.514C102.019 174.074 101.834 177.885 101.113 181C99.4225 188.301 97.9084 195.624 96.5756 203C94.7989 212.834 90.1578 230.821 96.9375 239.682C100.086 243.797 109.429 242 114 242C129.665 242 146.547 240.282 161.985 243.339C167.253 244.382 171.095 248.335 175 251.719C183.907 259.438 191.908 271.302 202.285 276.951C210.252 281.287 220.292 280 229 280C246.347 280 264.778 281.774 282 279.715C285.991 279.237 290.443 278.933 294 276.91C307.4 269.292 315.223 253.052 329 245.825C343.059 238.45 363.617 242 379 242C383.781 242 394.53 244.002 398.181 240.397C401.697 236.925 401.943 229.595 401.996 225C402.149 211.752 398.508 198.967 396.25 186C395.386 181.039 394.794 172.155 389.853 169.433C385.96 167.288 380.308 166.813 376 165.769C367.616 163.735 359.273 161.394 351 158.965C335.387 154.38 319.996 148.359 304 145.375C288.672 142.516 271.568 144 256 144C240.943 144 224.932 142.464 210 144.424z"
                        />
                    </svg>
                </div>
            </div>

            {/* Reading Container - Fixed spacing from top of wheel context */}
            <div className="flex flex-col items-center mt-2 h-5 justify-center">
                <span className="text-[14px] font-extrabold text-[#00E5FF] font-outfit drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">
                    {Math.round(angle)}°
                </span>
            </div>
        </div>
    );
};

export default SteeringWheel;
