import * as MP4Box from 'mp4box';
import protobuf from 'protobufjs';

// Tesla dashcam.proto schema as a string for worker compatibility
const protoSchema = `
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

const TESLA_UUID = new Uint8Array([
    0x54, 0x45, 0x53, 0x4c, 0x41, 0x2d, 0x53, 0x45, 0x49, 0x2d, 0x44, 0x41, 0x54, 0x41, 0x2d, 0x30
]);

let SeiMetadataType: protobuf.Type | null = null;

// Initialize Protobuf
const root = protobuf.parse(protoSchema).root;
SeiMetadataType = root.lookupType('SeiMetadata');

self.onmessage = async (e: MessageEvent) => {
    const { buffer } = e.data;
    if (!buffer) return;

    const mp4box = (MP4Box as any).createFile ? MP4Box : (MP4Box as any).default;
    const mp4boxfile = mp4box.createFile();

    const results: any[] = [];
    let videoTrackId: number | null = null;

    let totalSamples = 0;
    let processedSamples = 0;

    const TESLA_MAGIC = new Uint8Array([0x42, 0x42, 0x42, 0x69]);

    const parseSei = (payload: Uint8Array, cts: number, timescale: number) => {
        let p = 0;
        while (p < payload.length) {
            const payloadType = payload[p++];
            let payloadSize = 0;
            while (payload[p] === 0xFF) {
                payloadSize += 255;
                p++;
            }
            payloadSize += payload[p++];

            let isTesla = false;
            let protobufOffset = 0;

            // Type 5 is User Data Unregistered
            if (payloadType === 5 && payloadSize >= 16) {
                const uuid = payload.slice(p, p + 16);

                isTesla = uuid.every((v, i) => v === TESLA_UUID[i]);
                if (isTesla) {
                    protobufOffset = 16;
                } else {
                    // Check for 4-byte magic at the start of the "UUID"
                    if (payloadSize >= 4) { // Ensure there's enough data for the magic
                        const magic = payload.slice(p, p + 4);
                        if (magic.every((v, i) => v === TESLA_MAGIC[i])) {
                            isTesla = true;
                            protobufOffset = 4; // Data starts right after magic
                        }
                    }
                }
            }

            if (isTesla) {
                const protobufData = payload.slice(p + protobufOffset, p + payloadSize);
                try {
                    if (SeiMetadataType) {
                        const decoded = SeiMetadataType.decode(protobufData);
                        const metadata = SeiMetadataType.toObject(decoded, {
                            enums: String,
                            longs: Number,
                            defaults: true,
                        });

                        results.push({
                            ...metadata,
                            timestampMs: (cts / timescale) * 1000
                        });
                    }
                } catch (err) {
                    console.error('[Worker] Protobuf decode error:', err);
                    // If it failed, maybe the offset was wrong? Try offset 0?
                    if (SeiMetadataType && protobufOffset !== 0) {
                        try {
                            const decoded = SeiMetadataType.decode(payload.slice(p, p + payloadSize));
                            const metadata = SeiMetadataType.toObject(decoded, { enums: String, longs: Number, defaults: true });
                            results.push({ ...metadata, timestampMs: (cts / timescale) * 1000 });
                            console.log('[Worker] Protobuf decode succeeded with offset 0');
                        } catch (e) {
                            // console.error('[Worker] Protobuf decode error with offset 0:', e); // Keep silent for fallback
                        }
                    }
                }
            }
            p += payloadSize;
        }
    };

    mp4boxfile.onReady = (info: any) => {
        const videoTrack = info.tracks.find((t: any) => t.video);
        if (videoTrack) {
            videoTrackId = videoTrack.id;
            totalSamples = videoTrack.nb_samples;
            mp4boxfile.setExtractionOptions(videoTrackId!, null, { nbSamples: 1000 });
            mp4boxfile.start();
        } else {
            self.postMessage({ type: 'error', message: 'No video track found' });
        }
    };

    mp4boxfile.onSamples = (id: number, user: any, samples: any[]) => {
        processedSamples += samples.length;

        if (id !== videoTrackId) return;

        for (const sample of samples) {
            const data = new Uint8Array(sample.data);
            let offset = 0;

            while (offset < data.length) {
                if (offset + 4 > data.length) break;
                const nalLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                offset += 4;

                if (offset + nalLength > data.length) break;
                const nalType = data[offset] & 0x1F;

                if (nalType === 6) {
                    const seiPayload = data.slice(offset + 1, offset + nalLength);
                    parseSei(seiPayload, sample.cts, sample.timescale);
                }

                offset += nalLength;
            }
        }

        self.postMessage({ type: 'progress', count: results.length });

        if (processedSamples >= totalSamples) {
            self.postMessage({ type: 'done', results });
        }
    };

    mp4boxfile.onFlush = () => {
        self.postMessage({ type: 'done', results });
    };

    try {
        (buffer as any).fileStart = 0;
        mp4boxfile.appendBuffer(buffer);
        mp4boxfile.flush();
    } catch (err) {
        self.postMessage({ type: 'error', message: String(err) });
    }
};
