/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SeiBuffer, SeiMetadata } from './SeiParser';

describe('SeiBuffer', () => {
    let buffer: SeiBuffer;

    beforeEach(() => {
        buffer = new SeiBuffer();
    });

    const mockMetadata = (timestampMs: number): SeiMetadata => ({
        version: 1,
        gearState: 'GEAR_DRIVE',
        frameSeqNo: 1,
        vehicleSpeedMps: 10,
        acceleratorPedalPosition: 0,
        steeringWheelAngle: 0,
        blinkerOnLeft: false,
        blinkerOnRight: false,
        brakeApplied: false,
        autopilotState: 'NONE',
        latitudeDeg: 0,
        longitudeDeg: 0,
        headingDeg: 0,
        linearAccelerationMps2X: 0,
        linearAccelerationMps2Y: 0,
        linearAccelerationMps2Z: 0,
        timestampMs,
    });

    it('should add and sort entries by timestamp', () => {
        const entries = [
            mockMetadata(200),
            mockMetadata(100),
            mockMetadata(300),
        ];
        buffer.addEntries(entries);

        const result = buffer.getEntries();
        expect(result[0].timestampMs).toBe(100);
        expect(result[1].timestampMs).toBe(200);
        expect(result[2].timestampMs).toBe(300);
    });

    it('should find exact match if it exists', () => {
        buffer.addEntries([mockMetadata(100), mockMetadata(200), mockMetadata(300)]);
        const result = buffer.findClosest(200);
        expect(result?.timestampMs).toBe(200);
    });

    it('should find closest match when between points', () => {
        buffer.addEntries([mockMetadata(100), mockMetadata(200), mockMetadata(300)]);

        // Closer to 100
        expect(buffer.findClosest(120)?.timestampMs).toBe(100);

        // Closer to 200
        expect(buffer.findClosest(180)?.timestampMs).toBe(200);

        // Exactly in the middle (usually takes the higher one in binary search implementation)
        // Our implementation: return lowDiff < highDiff ? entries[low] : entries[high]
        // low = 1 (200), high = 0 (100)
        // lowDiff = 50, highDiff = 50. 50 < 50 is false, returns entries[high] (100)
        expect(buffer.findClosest(150)?.timestampMs).toBe(100);
    });

    it('should handle boundary cases', () => {
        buffer.addEntries([mockMetadata(100), mockMetadata(200)]);

        // Before first
        expect(buffer.findClosest(50)?.timestampMs).toBe(100);

        // After last
        expect(buffer.findClosest(300)?.timestampMs).toBe(200);
    });

    it('should return null for empty buffer', () => {
        expect(buffer.findClosest(100)).toBeNull();
    });

    it('should clear entries', () => {
        buffer.addEntries([mockMetadata(100)]);
        buffer.clear();
        expect(buffer.getEntries().length).toBe(0);
    });

    describe('findSurrounding', () => {
        it('should return the same point for both prev and next if exact match found', () => {
            buffer.addEntries([mockMetadata(100), mockMetadata(200), mockMetadata(300)]);
            const { prev, next } = buffer.findSurrounding(200);
            expect(prev?.timestampMs).toBe(200);
            expect(next?.timestampMs).toBe(200);
        });

        it('should return surrounding points when timestamp is between points', () => {
            buffer.addEntries([mockMetadata(100), mockMetadata(200), mockMetadata(300)]);
            const { prev, next } = buffer.findSurrounding(150);
            expect(prev?.timestampMs).toBe(100);
            expect(next?.timestampMs).toBe(200);
        });

        it('should return null for prev if timestamp is before first point', () => {
            buffer.addEntries([mockMetadata(100), mockMetadata(200)]);
            const { prev, next } = buffer.findSurrounding(50);
            expect(prev).toBeNull();
            expect(next?.timestampMs).toBe(100);
        });

        it('should return null for next if timestamp is after last point', () => {
            buffer.addEntries([mockMetadata(100), mockMetadata(200)]);
            const { prev, next } = buffer.findSurrounding(300);
            expect(prev?.timestampMs).toBe(200);
            expect(next).toBeNull();
        });

        it('should return null for both if buffer is empty', () => {
            const { prev, next } = buffer.findSurrounding(100);
            expect(prev).toBeNull();
            expect(next).toBeNull();
        });
    });
});
