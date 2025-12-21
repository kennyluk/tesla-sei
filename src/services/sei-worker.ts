import * as MP4Box from 'mp4box';
import { parseSeiPayload } from './SeiDecoder';

self.onmessage = async (e: MessageEvent) => {
    const { buffer } = e.data;
    if (!buffer) return;

    const mp4box = (MP4Box as any).createFile ? MP4Box : (MP4Box as any).default;
    const mp4boxfile = mp4box.createFile();

    const results: any[] = [];
    let processedSamples = 0;
    const trackMetadata = new Map<number, { isHevc: boolean, naluLengthSize: number }>();
    let totalSamplesToProcess = 0;

    mp4boxfile.onReady = (info: any) => {
        console.log(`[Worker] File Ready. Found ${info.tracks.length} tracks.`);

        info.tracks.forEach((track: any) => {
            const isVideo = track.video || track.type === 'video';
            const isMetadata = track.type === 'meta' || track.handler === 'meta';
            // HEVC codecs usually start with 'hvc1' or 'hev1'
            const isHevc = !!(track.codec && (track.codec.startsWith('hvc1') || track.codec.startsWith('hev1')));

            // We scan video and metadata tracks
            if (isVideo || isMetadata) {
                const naluLengthSize = (track.video && track.video.nalu_length_size) || 4;
                trackMetadata.set(track.id, { isHevc, naluLengthSize });
                totalSamplesToProcess += track.nb_samples;

                console.log(`[Worker] Tracking Track ID ${track.id}: ${track.codec} (${track.handler}), Samples: ${track.nb_samples}, NALU Size: ${naluLengthSize}`);
                mp4boxfile.setExtractionOptions(track.id, null, { nbSamples: track.nb_samples });
            }
        });

        if (trackMetadata.size > 0) {
            mp4boxfile.start();
        } else {
            self.postMessage({ type: 'error', message: 'No suitable tracks found for telemetry extraction' });
        }
    };
    mp4boxfile.onSamples = (id: number, user: any, samples: any[]) => {
        processedSamples += samples.length;
        const metadata = trackMetadata.get(id);
        if (!metadata) return;

        for (const sample of samples) {
            const data = new Uint8Array(sample.data);
            let offset = 0;
            const resultsBeforeSample = results.length;

            // Attempt 1: Standard NAL Unit Loop
            while (offset < data.length) {
                if (offset + metadata.naluLengthSize > data.length) break;

                let nalLength = 0;
                if (metadata.naluLengthSize === 4) {
                    nalLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                } else if (metadata.naluLengthSize === 1) {
                    nalLength = data[offset];
                } else if (metadata.naluLengthSize === 2) {
                    nalLength = (data[offset] << 8) | data[offset + 1];
                }

                if (nalLength <= 0 || offset + metadata.naluLengthSize + nalLength > data.length) {
                    break;
                }

                offset += metadata.naluLengthSize;

                let isSei = false;
                if (metadata.isHevc) {
                    // HEVC SEI: Type 39 (Prefix) or 40 (Suffix)
                    // H.265 NAL unit header is 2 bytes: [Forbidden(1), Type(6), LayerId(6), Tid(3)]
                    const nalType = (data[offset] >> 1) & 0x3F;
                    isSei = (nalType === 39 || nalType === 40);
                } else {
                    // AVC SEI: Type 6
                    const nalType = data[offset] & 0x1F;
                    isSei = (nalType === 6);
                }

                if (isSei) {
                    // Grab payload. Skip the NAL header (1 byte for AVC, 2 bytes for HEVC)
                    const headerSize = metadata.isHevc ? 2 : 1;
                    const seiPayload = data.slice(offset + headerSize, offset + nalLength);
                    const parsed = parseSeiPayload(seiPayload, sample.cts, sample.timescale);
                    if (parsed.length > 0) {
                        results.push(...parsed);
                    }
                }

                offset += nalLength;
            }

            // Attempt 2: Surgical Fallback Magic Scan
            if (results.length === resultsBeforeSample) {
                for (let i = 0; i < data.length - 20; i++) {
                    let isMatch = false;
                    if (data[i] === 0x42 && data[i + 1] === 0x42 && data[i + 2] === 0x42 && data[i + 3] === 0x69) {
                        isMatch = true;
                    }
                    else if (data[i] === 0x54 && data[i + 1] === 0x45 && data[i + 2] === 0x53 && data[i + 3] === 0x4c) {
                        const UUID = [0x54, 0x45, 0x53, 0x4c, 0x41, 0x2d, 0x53, 0x45, 0x49, 0x2d, 0x44, 0x41, 0x54, 0x41, 0x2d, 0x30];
                        isMatch = UUID.every((v, idx) => data[i + idx] === v);
                    }

                    if (isMatch) {
                        // Scan back for SEI header (payload type 5)
                        for (let startOffset = Math.max(0, i - 24); startOffset < i; startOffset++) {
                            if (data[startOffset] === 5) {
                                const possiblePayload = data.slice(startOffset, i + 512);
                                const parsed = parseSeiPayload(possiblePayload, sample.cts, sample.timescale);
                                if (parsed.length > 0) {
                                    results.push(...parsed);
                                    break;
                                }
                            }
                        }
                        if (results.length > resultsBeforeSample) break;
                    }
                }
            }
        }

        if (processedSamples % 500 === 0 || processedSamples >= totalSamplesToProcess) {
            self.postMessage({ type: 'progress', count: results.length });
        }

        if (processedSamples >= totalSamplesToProcess) {
            console.log(`[Worker] Extraction complete. Parsed ${results.length} SEI messages from ${processedSamples} samples across multiple tracks.`);
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
