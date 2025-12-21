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

        let lastMediaTime = -1;

        const updateSync = (mediaTime: number) => {
            const currentTimeMs = mediaTime * 1000;
            const surrounding = seiBuffer.findSurrounding(currentTimeMs);

            if (surrounding.prev && surrounding.next) {
                if (surrounding.prev === surrounding.next) {
                    currentMetadataRef.current = surrounding.prev;
                } else {
                    const alpha = (currentTimeMs - surrounding.prev.timestampMs) /
                        (surrounding.next.timestampMs - surrounding.prev.timestampMs);

                    // Linear interpolation for numeric telemetry fields
                    const lerp = (a: number, b: number) => a + (b - a) * alpha;

                    currentMetadataRef.current = {
                        ...surrounding.prev,
                        vehicleSpeedMps: lerp(surrounding.prev.vehicleSpeedMps, surrounding.next.vehicleSpeedMps),
                        acceleratorPedalPosition: lerp(surrounding.prev.acceleratorPedalPosition, surrounding.next.acceleratorPedalPosition),
                        steeringWheelAngle: lerp(surrounding.prev.steeringWheelAngle, surrounding.next.steeringWheelAngle),
                        latitudeDeg: lerp(surrounding.prev.latitudeDeg, surrounding.next.latitudeDeg),
                        longitudeDeg: lerp(surrounding.prev.longitudeDeg, surrounding.next.longitudeDeg),
                        headingDeg: lerp(surrounding.prev.headingDeg, surrounding.next.headingDeg),
                        linearAccelerationMps2X: lerp(surrounding.prev.linearAccelerationMps2X, surrounding.next.linearAccelerationMps2X),
                        linearAccelerationMps2Y: lerp(surrounding.prev.linearAccelerationMps2Y, surrounding.next.linearAccelerationMps2Y),
                        linearAccelerationMps2Z: lerp(surrounding.prev.linearAccelerationMps2Z, surrounding.next.linearAccelerationMps2Z),
                        timestampMs: currentTimeMs
                    };
                }
            } else if (surrounding.prev) {
                currentMetadataRef.current = surrounding.prev;
            } else if (surrounding.next) {
                currentMetadataRef.current = surrounding.next;
            }

            if (currentMetadataRef.current) {
                // Mission requirement: print steering_wheel_angle to console
                console.log(`[SEI Sync] Time: ${mediaTime.toFixed(3)}s | Steering Angle: ${currentMetadataRef.current.steeringWheelAngle.toFixed(2)}°`);
            }
        };

        // requestVideoFrameCallback provides high-precision media time
        let rvfcId: number | undefined;
        const onVideoFrame = (_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
            updateSync(metadata.mediaTime);
            rvfcId = (video as any).requestVideoFrameCallback(onVideoFrame);
        };

        // Fallback for browsers without requestVideoFrameCallback
        let rafId: number | undefined;
        const onFrame = () => {
            const v = video as HTMLVideoElement;
            // Only update if currentTime actually changed to avoid redundant interpolation
            if (v.currentTime !== lastMediaTime) {
                lastMediaTime = v.currentTime;
                updateSync(v.currentTime);
            }
            rafId = requestAnimationFrame(onFrame);
        };

        if ('requestVideoFrameCallback' in video) {
            rvfcId = (video as any).requestVideoFrameCallback(onVideoFrame);
        } else {
            rafId = requestAnimationFrame(onFrame);
        }

        const handleTimeUpdate = () => {
            // Only use timeupdate if requestVideoFrameCallback is not available
            // This ensures updates even if the tab is in the background and raf doesn't run
            const v = video as HTMLVideoElement;
            if (!('requestVideoFrameCallback' in v)) {
                updateSync(v.currentTime);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            if (rvfcId) (video as any).cancelVideoFrameCallback(rvfcId);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [videoRef, seiBuffer]);

    return currentMetadataRef;
}
