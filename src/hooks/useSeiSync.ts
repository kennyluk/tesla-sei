import { useEffect, useRef, MutableRefObject, useCallback } from 'react';
import { SeiBuffer } from '../services/SeiParser';
import { SeiMetadata } from '../types';

export function useSeiSync(
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    seiBuffer: SeiBuffer | null
) {
    const currentMetadataRef = useRef<SeiMetadata | null>(null);

    const updateSync = useCallback((mediaTime: number) => {
        if (!seiBuffer) return;
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
    }, [seiBuffer]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !seiBuffer) return;

        // requestVideoFrameCallback provides high-precision media time
        let rvfcId: number | undefined;
        const onVideoFrame = (_now: DOMHighResTimeStamp, metadata: any) => {
            updateSync(metadata.mediaTime);
            rvfcId = (video as any).requestVideoFrameCallback(onVideoFrame);
        };

        // Fallback for browsers without requestVideoFrameCallback
        let rafId: number | undefined;
        let lastMediaTime = -1;
        const onFrame = () => {
            const v = video as HTMLVideoElement;
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
            if (!('requestVideoFrameCallback' in video)) {
                updateSync((video as HTMLVideoElement).currentTime);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            if (rvfcId) (video as any).cancelVideoFrameCallback(rvfcId);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [videoRef, seiBuffer, updateSync]);

    return { metadataRef: currentMetadataRef, updateSync };
}
