import protobuf from 'protobufjs';

export const protoSchema = `
syntax = "proto3";

message SeiMetadata {
  uint32 version = 1;

  enum Gear {
    GEAR_PARK = 0;
    GEAR_DRIVE = 1;
    GEAR_REVERSE = 2;
    GEAR_NEUTRAL = 3;
  }
  Gear gear_state = 2;

  uint64 frame_seq_no = 3;
  float vehicle_speed_mps = 4;
  float accelerator_pedal_position = 5;
  float steering_wheel_angle = 6;
  bool blinker_on_left = 7;
  bool blinker_on_right = 8;
  bool brake_applied = 9;
  
  enum AutopilotState {
    NONE = 0;
    SELF_DRIVING = 1;
    AUTOSTEER = 2;
    TACC = 3;
  }
  AutopilotState autopilot_state = 10;
  double latitude_deg = 11;
  double longitude_deg = 12;
  double heading_deg = 13;
  double linear_acceleration_mps2_x = 14;
  double linear_acceleration_mps2_y = 15;
  double linear_acceleration_mps2_z = 16;
}
`;

export const TESLA_UUID = new Uint8Array([
    0x54, 0x45, 0x53, 0x4c, 0x41, 0x2d, 0x53, 0x45, 0x49, 0x2d, 0x44, 0x41, 0x54, 0x41, 0x2d, 0x30
]);

export const TESLA_MAGIC = new Uint8Array([0x42, 0x42, 0x42, 0x69]);

let SeiMetadataType: protobuf.Type | null = null;

export function getSeiMetadataType() {
    if (!SeiMetadataType) {
        const root = protobuf.parse(protoSchema).root;
        SeiMetadataType = root.lookupType('SeiMetadata');
    }
    return SeiMetadataType;
}

export function parseSeiPayload(payload: Uint8Array, cts: number, timescale: number): any[] {
    const results: any[] = [];
    const type = getSeiMetadataType();
    let p = 0;

    while (p < payload.length) {
        const payloadType = payload[p++];
        let payloadSize = 0;
        while (p < payload.length && payload[p] === 0xFF) {
            payloadSize += 255;
            p++;
        }
        if (p >= payload.length) break;
        payloadSize += payload[p++];

        let isTesla = false;
        let protobufOffset = 0;

        // Type 5 is User Data Unregistered
        if (payloadType === 5) {
            if (payloadSize >= 16) {
                const uuid = payload.slice(p, p + 16);
                isTesla = uuid.every((v, i) => v === TESLA_UUID[i]);
                if (isTesla) protobufOffset = 16;
            }

            if (!isTesla && payloadSize >= 4) {
                const magic = payload.slice(p, p + 4);
                if (magic.every((v, i) => v === TESLA_MAGIC[i])) {
                    isTesla = true;
                    protobufOffset = 4;
                }
            }
        }

        if (isTesla && type) {
            const protobufData = payload.slice(p + protobufOffset, p + payloadSize);
            try {
                const decoded = type.decode(protobufData);
                const metadata = type.toObject(decoded, {
                    enums: String,
                    longs: Number,
                    defaults: true,
                });
                results.push({
                    ...metadata,
                    timestampMs: (cts / timescale) * 1000
                });
            } catch (err) {
                // Fallback for offset 0
                if (protobufOffset !== 0) {
                    try {
                        const decoded = type.decode(payload.slice(p, p + payloadSize));
                        const metadata = type.toObject(decoded, { enums: String, longs: Number, defaults: true });
                        results.push({ ...metadata, timestampMs: (cts / timescale) * 1000 });
                    } catch (e) {
                        // Silent fail
                    }
                }
            }
        }
        p += payloadSize;
    }
    return results;
}
