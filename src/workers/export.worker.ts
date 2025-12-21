import * as MP4Box from 'mp4box';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { SeiMetadata, RenderAssets } from '../types';
import { drawTelemetryFrame } from '../utils/telemetryRenderer';
import { SeiBuffer } from '../services/SeiParser';

// Workers don't have DOM types by default, need to ensure libs are included or ignore TS errors for simple things
// Assuming Vite worker setup handles imports correctly.

let stopped = false;

self.onmessage = async (e: MessageEvent) => {
    const { type, file, metadata, assets, config } = e.data;

    if (type === 'start') {
        stopped = false;
        try {
            await startExport(file, metadata, assets, config);
        } catch (err: any) {
            console.error('Export failed:', err);
            (self as any).postMessage({ type: 'error', error: err.message });
        }
    } else if (type === 'stop') {
        stopped = true;
    }
};

async function startExport(
    file: File,
    metadata: SeiMetadata[],
    assets: RenderAssets,
    config?: { bitrate?: number, showGps?: boolean }
) {
    const bitrate = config?.bitrate || 12_000_000; // 12 Mbps default

    console.log('Worker: Starting export process...');

    // 1. Setup SeiBuffer for lookups
    const seiBuffer = new SeiBuffer();
    seiBuffer.addEntries(metadata);

    // 2. Setup MP4Box
    const mp4box = MP4Box.createFile();
    let videoTrack: any = null;
    let totalSamples = 0;

    // Defer initialization of these until we have track info
    let muxer: any = null;
    let encoder: VideoEncoder | null = null;
    let decoder: VideoDecoder | null = null;
    let canvas: OffscreenCanvas | null = null;
    let ctx: OffscreenCanvasRenderingContext2D | null = null;
    let processedCount = 0;

    // Use a Promise to hold the processing chain until we're done
    const processingPromise = new Promise<void>((resolve, reject) => {
        mp4box.onError = (e: any) => {
            console.error('MP4Box error:', e);
            reject(new Error('MP4Box Parsing Error'));
        };

        mp4box.onReady = (info: any) => {
            console.log('Worker: Pass 1 Analysis Complete. Info:', info);

            videoTrack = info.videoTracks[0];
            if (!videoTrack) {
                reject(new Error('No video track found'));
                return;
            }
            totalSamples = videoTrack.nb_samples;

            // --- INITIALIZATION BLOCK ---

            // 3. Setup Muxer with correct dimensions
            muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                    codec: 'avc',
                    width: videoTrack.video.width,
                    height: videoTrack.video.height
                },
                fastStart: 'in-memory',
                firstTimestampBehavior: 'offset',
            });

            // 4. Setup Canvas
            canvas = new OffscreenCanvas(videoTrack.video.width, videoTrack.video.height);
            ctx = canvas.getContext('2d')!;

            // 5. Setup Encoder
            encoder = new VideoEncoder({
                output: (chunk, meta) => {
                    if (muxer) muxer.addVideoChunk(chunk, meta);
                },
                error: (e) => {
                    console.error('Encoder error:', e);
                    reject(e);
                }
            });

            encoder.configure({
                codec: 'avc1.640034', // High Profile
                width: videoTrack.video.width,
                height: videoTrack.video.height,
                bitrate: bitrate,
                framerate: (videoTrack.movie_timescale / videoTrack.movie_duration * videoTrack.nb_samples) || 30
            });

            // 6. Setup Decoder
            decoder = new VideoDecoder({
                output: (frame) => {
                    if (stopped) {
                        frame.close();
                        return;
                    }

                    // Draw & Render
                    if (ctx && canvas && muxer && encoder) { // Guards for TS
                        ctx.drawImage(frame, 0, 0);

                        const tsMs = frame.timestamp / 1000;

                        // Interpolation Logic
                        let drawMeta: SeiMetadata | null = seiBuffer.findClosest(tsMs);
                        const surrounding = seiBuffer.findSurrounding(tsMs);

                        if (surrounding.prev && surrounding.next && surrounding.prev !== surrounding.next) {
                            const alpha = (tsMs - surrounding.prev.timestampMs) / (surrounding.next.timestampMs - surrounding.prev.timestampMs);
                            const lerp = (a: number, b: number) => a + (b - a) * alpha;

                            drawMeta = {
                                ...surrounding.prev,
                                vehicleSpeedMps: lerp(surrounding.prev.vehicleSpeedMps, surrounding.next.vehicleSpeedMps),
                                acceleratorPedalPosition: lerp(surrounding.prev.acceleratorPedalPosition, surrounding.next.acceleratorPedalPosition),
                                steeringWheelAngle: lerp(surrounding.prev.steeringWheelAngle, surrounding.next.steeringWheelAngle),
                                linearAccelerationMps2X: lerp(surrounding.prev.linearAccelerationMps2X, surrounding.next.linearAccelerationMps2X),
                                linearAccelerationMps2Y: lerp(surrounding.prev.linearAccelerationMps2Y, surrounding.next.linearAccelerationMps2Y),
                                linearAccelerationMps2Z: lerp(surrounding.prev.linearAccelerationMps2Z, surrounding.next.linearAccelerationMps2Z),
                                headingDeg: lerp(surrounding.prev.headingDeg, surrounding.next.headingDeg),
                                timestampMs: tsMs
                            };
                        }

                        if (drawMeta) {
                            drawTelemetryFrame(ctx, drawMeta, canvas.width, canvas.height, assets, config?.showGps);
                        }

                        const newFrame = new VideoFrame(canvas, {
                            timestamp: frame.timestamp,
                            duration: frame.duration || undefined
                        });

                        // Encode
                        encoder!.encode(newFrame, { keyFrame: frame.timestamp === 0 || (frame.timestamp % 2000000 < 40000) });
                        newFrame.close();

                        processedCount++;
                        if (processedCount % 30 === 0) {
                            (self as any).postMessage({ type: 'progress', progress: processedCount / totalSamples });
                        }
                    }
                    frame.close();
                },
                error: (e) => {
                    console.error('Decoder error:', e);
                    reject(e);
                }
            });

            // Configure Decoder
            // Extract AVCC from track info
            // mp4box.js usually exposes the sample description entries in track.mdia.minf.stbl.stsd.entries
            // But 'videoTrack' here is a simplified info object from onReady.
            // We need to access the internal track or find the avcC from the info.
            // The info object has 'videoTracks[0]' which contains 'codec' allowing us to know it is AVC.
            // However, getting the raw avcC buffer is tricky from the simplistic 'info' object.

            // Safe fallback: MP4Box File object 'mp4box' has 'getTrackById'.
            // @ts-ignore
            const track = mp4box.getTrackById(videoTrack.id);
            // @ts-ignore
            const avccBox = track?.mdia?.minf?.stbl?.stsd?.entries[0]?.avcC;

            let description: ArrayBuffer | undefined = undefined;
            if (avccBox) {
                // avcCBox is a Box object. We need to serialize it to a buffer.
                // MP4Box boxes have a .write(stream) method.
                // @ts-ignore
                const stream = new (MP4Box as any).DataStream(undefined, 0, (MP4Box as any).DataStream.BIG_ENDIAN);
                avccBox.write(stream);
                // MP4Box.write() includes the 8-byte box header (size + 'avcC')
                // VideoDecoder expects only the AVCDecoderConfigurationRecord payload.
                // We strip the first 8 bytes.
                description = new Uint8Array(stream.buffer.slice(8, stream.position)).buffer;
                console.log('Worker: Extracted AVCC description (stripped header)', description);
            } else {
                console.warn('Worker: Could not find AVCC box. Decoder might fail.');
            }

            decoder.configure({
                codec: videoTrack.codec,
                description: description
            });

            console.log('Worker: Initialization done. Starting extraction.');

            // 7. Start Extraction
            mp4box.setExtractionOptions(videoTrack.id, null, { nbSamples: 1000000 });
            mp4box.start();
        };

        mp4box.onSamples = (id: number, user: any, samples: any[]) => {
            if (!decoder) return;
            // console.log(`Worker: Received ${samples.length} samples`);
            for (const sample of samples) {
                const type = sample.is_sync ? 'key' : 'delta';
                const chunk = new EncodedVideoChunk({
                    type,
                    timestamp: sample.cts * 1000000 / sample.timescale,
                    duration: sample.duration * 1000000 / sample.timescale,
                    data: sample.data
                });
                decoder.decode(chunk);
            }
        };
    }); // End processingPromise setup

    // Start parsing
    console.log('Worker: Reading file buffer...');
    const fileBuffer = await file.arrayBuffer();
    (fileBuffer as any).fileStart = 0;

    // Append buffer triggers onReady -> sets options -> triggers onSamples
    mp4box.appendBuffer(fileBuffer);
    mp4box.flush();

    // Wait for flushing? 
    // mp4box does NOT return a promise for onSamples completion.
    // However, onSamples is synchronous-ish for appendBuffer if data is available?
    // Not necessarily. 

    // We need a way to know when mp4box is DONE emitting samples.
    // Actually, mp4box doesn't easily tell us "no more samples".
    // But since we append the WHOLE buffer and call flush, mp4box should process everything.

    // We can wrap the codec flush in a timeout or check via a more robust method?
    // Or just trust that after appendBuffer+flush, all onSamples have fired?
    // In Browser JS with mp4box.js, looking at source, flush() processes remaining.
    // So after mp4box.flush() returns, all samples *should* have been emitted locally.

    console.log('Worker: File parsed. waiting for codecs to flush...');

    // If we rely on the implementation detail that onSamples is fired synchronously/immediately 
    // when we have the full buffer:

    // We can assume decoder has received all chunks.
    if (decoder && encoder && muxer) {
        await (decoder as any).flush();
        console.log('Worker: Decoder flushed.');
        await (encoder as any).flush();
        console.log('Worker: Encoder flushed.');
        (muxer as any).finalize();
        console.log('Worker: Muxer finalized.');

        const buffer = muxer.target.buffer;
        (self as any).postMessage({ type: 'done', buffer }, [buffer]);
    } else {
        throw new Error('Codecs were not initialized (onReady never fired?)');
    }
}
