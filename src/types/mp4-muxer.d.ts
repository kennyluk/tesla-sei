declare module 'mp4-muxer' {
    export interface MuxerOptions {
        target: Target;
        video?: {
            codec: string;
            width: number;
            height: number;
        };
        audio?: {
            codec: string;
            numberOfChannels: number;
            sampleRate: number;
        };
        fastStart: 'in-memory' | false;
        firstTimestampBehavior?: 'offset';
    }

    export abstract class Target {
        buffer: ArrayBuffer;
    }

    export class ArrayBufferTarget extends Target {
        constructor();
    }

    export class Muxer<T extends Target> {
        constructor(options: MuxerOptions);
        target: T;
        addVideoChunk(chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata): void;
        finalize(): void;
    }
}
