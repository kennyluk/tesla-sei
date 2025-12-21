import * as MP4Box from 'mp4box';
import { SeiMetadata } from '../types';

export class SeiParser {
    static async validateMp4(buffer: ArrayBuffer): Promise<boolean> {
        return new Promise((resolve) => {
            const mp4box = (MP4Box as any).createFile ? MP4Box : (MP4Box as any).default;
            const mp4boxfile = mp4box.createFile();

            mp4boxfile.onReady = (info: any) => {
                console.log('[MP4Box] File Info:', info);
                const hasH264 = info.tracks.some((t: any) => t.video && t.codec.includes('avc1'));
                resolve(hasH264);
            };

            mp4boxfile.onError = (e: string) => {
                console.error('[MP4Box] Error:', e);
                resolve(false);
            };

            (buffer as any).fileStart = 0;
            mp4boxfile.appendBuffer(buffer);
            mp4boxfile.flush();
        });
    }

    static async parseSei(buffer: ArrayBuffer, onProgress?: (count: number) => void): Promise<SeiMetadata[]> {
        return new Promise((resolve, reject) => {
            // Vite handles worker imports with ?worker
            const worker = new Worker(new URL('./sei-worker.ts', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                const { type, results, count, message } = e.data;
                if (type === 'done') {
                    worker.terminate();
                    resolve(results);
                } else if (type === 'progress') {
                    onProgress?.(count);
                } else if (type === 'error') {
                    worker.terminate();
                    reject(new Error(message));
                }
            };

            worker.onerror = (err) => {
                worker.terminate();
                reject(err);
            };

            worker.postMessage({ buffer }, [buffer]);
        });
    }
}

export class SeiBuffer {
    private entries: SeiMetadata[] = [];

    addEntries(entries: SeiMetadata[]) {
        this.entries = [...this.entries, ...entries].sort((a, b) => a.timestampMs - b.timestampMs);
    }

    findClosest(timestampMs: number): SeiMetadata | null {
        const { prev, next } = this.findSurrounding(timestampMs);
        if (!prev) return next;
        if (!next) return prev;

        const prevDiff = Math.abs(prev.timestampMs - timestampMs);
        const nextDiff = Math.abs(next.timestampMs - timestampMs);

        return prevDiff <= nextDiff ? prev : next;
    }

    findSurrounding(timestampMs: number): { prev: SeiMetadata | null, next: SeiMetadata | null } {
        if (this.entries.length === 0) return { prev: null, next: null };

        let low = 0;
        let high = this.entries.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.entries[mid].timestampMs === timestampMs) {
                return { prev: this.entries[mid], next: this.entries[mid] };
            }
            if (this.entries[mid].timestampMs < timestampMs) low = mid + 1;
            else high = mid - 1;
        }

        const prev = high >= 0 ? this.entries[high] : null;
        const next = low < this.entries.length ? this.entries[low] : null;

        return { prev, next };
    }

    getEntries() {
        return this.entries;
    }

    clear() {
        this.entries = [];
    }
}
