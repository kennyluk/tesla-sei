import React, { useMemo } from 'react';

interface CompassProps {
    headingDeg: number;
}

const Compass: React.FC<CompassProps> = ({ headingDeg }) => {
    const MARK_WIDTH = 60; // pixel width of each 15-degree mark
    const PIXELS_PER_DEGREE = MARK_WIDTH / 15;
    const TAPE_SET_WIDTH = (360 / 15) * MARK_WIDTH; // Width of one full 360-degree set (1440px)

    // Generate the tape content once
    const marks = useMemo(() => {
        const items = [];
        // Create 3 sets for seamless looping (-360 to 0, 0 to 360, 360 to 720)
        for (let i = -1; i <= 1; i++) {
            for (let deg = 0; deg < 360; deg += 15) {
                let text = deg.toString();
                let isCardinal = false;
                if (deg === 0) { text = 'N'; isCardinal = true; }
                else if (deg === 90) { text = 'E'; isCardinal = true; }
                else if (deg === 180) { text = 'S'; isCardinal = true; }
                else if (deg === 270) { text = 'W'; isCardinal = true; }

                items.push({
                    deg,
                    text,
                    isCardinal,
                    key: `${i}-${deg}`
                });
            }
        }
        return items;
    }, []);

    // Normalize heading to 0-360
    const normalizedHeading = ((headingDeg % 360) + 360) % 360;

    // Calculate translateX
    // 1. We start at the middle set (index 0), which is offset by TAPE_SET_WIDTH.
    // 2. We shift by normalizedHeading * PIXELS_PER_DEGREE.
    // 3. We shift by MARK_WIDTH / 2 to center the mark itself (since its left edge would be at 50% otherwise).
    const translateX = -(TAPE_SET_WIDTH + (normalizedHeading * PIXELS_PER_DEGREE) - (MARK_WIDTH / 2));

    return (
        <div className="compass-wrapper">
            <div className="compass-degree-top">{Math.round(normalizedHeading)}°</div>
            <div className="compass-window">
                <div className="compass-center-marker" />
                <div
                    className="compass-tape"
                    style={{ transform: `translateX(${translateX}px)` }}
                >
                    {marks.map((mark) => (
                        <div key={mark.key} className="tape-mark">
                            <span className={`mark-text ${mark.isCardinal ? 'mark-cardinal' : ''}`}>
                                {mark.text}
                            </span>
                            <div className="mark-line" />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .compass-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            position: relative;
            transform: scale(0.9); /* Subtle scale down to fit better */
        }

        .compass-degree-top {
            font-size: 14px;
            font-weight: 800;
            color: #4df3ff;
            font-family: 'Outfit', sans-serif;
            text-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
            letter-spacing: 0.5px;
        }

        .compass-window {
            width: 220px;
            height: 42px;
            background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
        }

        .compass-center-marker {
            position: absolute;
            top: 0;
            left: 50%;
            width: 2px;
            height: 100%;
            background: #ff3b30;
            transform: translateX(-50%);
            z-index: 10;
            box-shadow: 0 0 10px rgba(255, 59, 48, 0.8);
        }

        .compass-tape {
            display: flex;
            height: 100%;
            position: absolute;
            left: 50%;
            transition: transform 0.1s cubic-bezier(0.1, 0, 0.1, 1);
            will-change: transform;
        }

        .tape-mark {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            min-width: 60px;
            height: 100%;
            padding-bottom: 6px;
        }

        .mark-line {
            width: 1px;
            height: 8px;
            background: rgba(255, 255, 255, 0.3);
            margin-top: 4px;
        }

        .mark-text {
            font-size: 11px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.7);
            font-family: 'Inter', sans-serif;
        }

        .mark-cardinal {
            color: #ff3b30;
            font-weight: 900;
            font-size: 13px;
            text-shadow: 0 0 5px rgba(255, 59, 48, 0.3);
        }
      `}</style>
        </div>
    );
};

export default Compass;
