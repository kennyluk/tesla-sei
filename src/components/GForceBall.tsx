import React, { useMemo, useState, useEffect } from 'react';

interface GForceBallProps {
    x: number; // m/s2
    y: number; // m/s2
    z: number; // m/s2
}

const GForceBall: React.FC<GForceBallProps> = ({ x, y, z }) => {
    // 1G is approximately 9.81 m/s2
    const G_CONSTANT = 9.81;

    // Scale for visualization: How many pixels per G
    // The container is 64px wide (32px radius).
    // Extreme Sensitivity: 0.3G = 28px offset (near edge)
    const SCALE = 94;
    const MAX_OFFSET = 28; // Clamping to stay inside circle (32px radius - 4px ball half)

    const gX = x / G_CONSTANT;
    const gY = y / G_CONSTANT;
    const gZ = z / G_CONSTANT;

    const ballTranslateX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, gX * SCALE));
    const ballTranslateY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, -gY * SCALE));

    // Maintain a history of positions for the 'tail'
    const [history, setHistory] = useState<{ x: number, y: number }[]>([]);

    useEffect(() => {
        setHistory((prev: { x: number, y: number }[]) => [{ x: ballTranslateX, y: ballTranslateY }, ...prev].slice(0, 20));
    }, [x, y, ballTranslateX, ballTranslateY]);

    return (
        <div className="gball-wrapper">
            <div className="gball-container">
                {/* Reference Rings */}
                <div className="gball-ring ring-01" style={{ width: `${0.05 * SCALE * 2}px`, height: `${0.05 * SCALE * 2}px` }}></div>
                <div className="gball-ring ring-025" style={{ width: `${0.15 * SCALE * 2}px`, height: `${0.15 * SCALE * 2}px` }}></div>

                <div className="gball-crosshair-x"></div>
                <div className="gball-crosshair-y"></div>

                {/* Trail dots */}
                {history.slice(1).map((pos: { x: number, y: number }, i: number) => (
                    <div
                        key={i}
                        className="gball-trail-dot"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                            opacity: Math.max(0, 0.9 - (i * 0.045)),
                            width: `${Math.max(2, 6 - i * 0.2)}px`,
                            height: `${Math.max(2, 6 - i * 0.2)}px`,
                            boxShadow: `0 0 ${Math.max(2, 12 - i * 0.5)}px rgba(255, 59, 48, ${Math.max(0, 0.5 - i * 0.025)})`
                        }}
                    />
                ))}

                <div
                    className="gball-ball"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${ballTranslateX}px), calc(-50% + ${ballTranslateY}px))`
                    }}
                ></div>
            </div>
            <div className="gball-values">
                <div className="gball-header">G-Forces</div>
                <div className="gball-val-row">X: <span className={gX >= 0.05 ? 'text-green-500' : gX <= -0.05 ? 'text-red-500' : ''}>{Math.abs(gX) < 0.05 ? '0.0' : gX.toFixed(1)}</span></div>
                <div className="gball-val-row">Y: <span className={gY >= 0.05 ? 'text-green-500' : gY <= -0.05 ? 'text-red-500' : ''}>{Math.abs(gY) < 0.05 ? '0.0' : gY.toFixed(1)}</span></div>
                <div className="gball-val-row">Z: <span className={gZ >= 0.05 ? 'text-green-500' : gZ <= -0.05 ? 'text-red-500' : ''}>{Math.abs(gZ) < 0.05 ? '0.0' : gZ.toFixed(1)}</span></div>
            </div>

            <style>{`
                .gball-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    pointer-events: none;
                }

                .gball-container {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.02);
                }

                .gball-crosshair-x,
                .gball-crosshair-y {
                    position: absolute;
                    background: rgba(255, 255, 255, 0.1);
                }

                .gball-crosshair-x {
                    width: 100%;
                    height: 1px;
                    top: 50%;
                    left: 0;
                }

                .gball-crosshair-y {
                    height: 100%;
                    width: 1px;
                    left: 50%;
                    top: 0;
                }

                .gball-ring {
                    position: absolute;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }

                .ring-01 { border-style: dashed; opacity: 0.5; }
                .ring-025 { border-style: solid; opacity: 0.3; }

                .gball-trail-dot {
                    position: absolute;
                    background: #ff3b30;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 4;
                }

                .gball-ball {
                    width: 8px;
                    height: 8px;
                    background: #ff3b30;
                    border-radius: 50%;
                    position: absolute;
                    box-shadow: 0 0 12px #ff3b30;
                    z-index: 5;
                }

                .gball-values {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5px;
                    align-items: flex-start;
                    min-width: 50px;
                }

                .gball-val-row {
                    font-size: 9px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.3);
                    font-family: 'Outfit', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    line-height: 1.2;
                }
                
                .gball-val-row span {
                    margin-left: 2px;
                    transition: color 0.15s ease;
                }

                .gball-val-row .text-green-500 { color: #4caf50; }
                .gball-val-row .text-red-500 { color: #ff3b30; }

                .gball-header {
                    font-size: 8px;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.4);
                    font-family: 'Inter', sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 2px;
                }
            `}</style>
        </div>
    );
};

export default GForceBall;
