/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { parseSeiPayload, getSeiMetadataType, TESLA_UUID, TESLA_MAGIC } from './SeiDecoder';

describe('SeiDecoder', () => {
    const SeiMetadataType = getSeiMetadataType()!;

    it('should decode valid Tesla SEI with UUID', () => {
        const mockData = {
            version: 1,
            vehicleSpeedMps: 15.5,
            steeringWheelAngle: 45,
            gearState: 1 // GEAR_DRIVE
        };
        const encoded = SeiMetadataType.encode(SeiMetadataType.fromObject(mockData)).finish();

        // Construct full SEI payload: [type 5] [size] [UUID (16 bytes)] [protobuf]
        const payload = new Uint8Array(2 + 16 + encoded.length);
        payload[0] = 5; // User Data Unregistered
        payload[1] = 16 + encoded.length;
        payload.set(TESLA_UUID, 2);
        payload.set(encoded, 18);

        const results = parseSeiPayload(payload, 1000, 1000);
        expect(results.length).toBe(1);
        expect(results[0].vehicleSpeedMps).toBeCloseTo(15.5);
        expect(results[0].steeringWheelAngle).toBe(45);
        expect(results[0].gearState).toBe('GEAR_DRIVE');
        expect(results[0].timestampMs).toBe(1000);
    });

    it('should decode valid Tesla SEI with magic (BBB i)', () => {
        const mockData = {
            version: 1,
            vehicleSpeedMps: 20
        };
        const encoded = SeiMetadataType.encode(SeiMetadataType.fromObject(mockData)).finish();

        // Construct full SEI payload: [type 5] [size] [Magic (4 bytes)] [protobuf]
        const payload = new Uint8Array(2 + 4 + encoded.length);
        payload[0] = 5;
        payload[1] = 4 + encoded.length;
        payload.set(TESLA_MAGIC, 2);
        payload.set(encoded, 6);

        const results = parseSeiPayload(payload, 2000, 1000);
        expect(results.length).toBe(1);
        expect(results[0].vehicleSpeedMps).toBe(20);
        expect(results[0].timestampMs).toBe(2000);
    });

    it('should skip non-Tesla SEI data', () => {
        const payload = new Uint8Array([5, 16, ...new Uint8Array(16).fill(0xAA)]);
        const results = parseSeiPayload(payload, 1000, 1000);
        expect(results.length).toBe(0);
    });

    it('should handle malformed payload sizes gracefully', () => {
        const payload = new Uint8Array([5, 255, 255]); // Infinite loop risk or out of bounds
        const results = parseSeiPayload(payload, 1000, 1000);
        expect(results.length).toBe(0);
    });

});
