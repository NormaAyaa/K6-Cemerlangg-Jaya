declare module "browser-image-compression" {
  export interface Options {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    maxIteration?: number;
    exifOrientation?: number;
    onProgress?: (progress: number) => void;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    signal?: AbortSignal;
  }
  export default function imageCompression(
    file: File | Blob,
    options: Options
  ): Promise<File | Blob>;
}
