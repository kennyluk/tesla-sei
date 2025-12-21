import * as MP4Box from 'mp4box';
import { parseSeiPayload } from './SeiDecoder';

self.onmessage = async (e: MessageEvent) => {
    const { buffer } = e.data;
    if (!buffer) return;

    const mp4box = (MP4Box as any).createFile ? MP4Box : (MP4Box as any).default;
    const mp4boxfile = mp4box.createFile();

    const results: any[] = [];
    let videoTrackId: number | null = null;

    let totalSamples = 0;
    let processedSamples = 0;

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
                    const parsed = parseSeiPayload(seiPayload, sample.cts, sample.timescale);
                    results.push(...parsed);
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
