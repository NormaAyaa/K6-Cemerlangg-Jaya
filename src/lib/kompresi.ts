import imageCompression from "browser-image-compression";

/**
 * Kompresi foto utama sesuai PRD 11.4:
 * - Sisi terpanjang maksimal 1600 px
 * - Format WebP, mutu 0,8
 * - Target ukuran di bawah 400 KB (maxSizeMB: 1)
 */
export async function kompresFoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const namaBaru = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedBlob], namaBaru, { type: "image/webp" });
  } catch (error) {
    console.error("Gagal kompres foto:", error);
    return file;
  }
}

/**
 * Pembuatan thumbnail foto sesuai PRD 11.4:
 * - Lebar maksimal 320 px
 * - Format WebP, mutu 0,8
 * - Disimpan pada subfolder thumb/
 */
export async function kompresThumbnail(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 320,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const namaBaru = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedBlob], namaBaru, { type: "image/webp" });
  } catch (error) {
    console.error("Gagal kompres thumbnail:", error);
    return file;
  }
}
