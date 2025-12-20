import { useEffect, useRef, MutableRefObject } from 'react';
import { SeiBuffer, SeiMetadata } from '../services/SeiParser';

export function useSeiSync(
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    seiBuffer: SeiBuffer | null
) {
    const currentMetadataRef = useRef<SeiMetadata | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !seiBuffer) return;

        const handleTimeUpdate = () => {
            const currentTimeMs = video.currentTime * 1000;
            const closest = seiBuffer.findClosest(currentTimeMs);

            if (closest) {
                currentMetadataRef.current = closest;
                // Mission requirement: print steering_wheel_angle to console
                console.log(`[SEI Sync] Time: ${video.currentTime.toFixed(3)}s | Steering Angle: ${closest.steeringWheelAngle.toFixed(2)}°`);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        // Also use requestAnimationFrame for smoother "every frame" updates if needed
        let rafId: number;
        const syncOnFrame = () => {
            handleTimeUpdate();
            rafId = requestAnimationFrame(syncOnFrame);
        };
        rafId = requestAnimationFrame(syncOnFrame);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            cancelAnimationFrame(rafId);
        };
    }, [videoRef, seiBuffer]);

    return currentMetadataRef;
}
