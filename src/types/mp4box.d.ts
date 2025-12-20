declare module 'mp4box' {
  export interface MP4File {
    onReady: (info: any) => void;
    onError: (e: string) => void;
    onSamples: (id: number, user: any, samples: any[]) => void;
    onFlush: () => void;
    appendBuffer: (data: any) => void;
    flush: () => void;
    setExtractionOptions: (id: number, user: any, config: any) => void;
    start: () => void;
    stop: () => void;
  }

  export function createFile(): MP4File;
}
