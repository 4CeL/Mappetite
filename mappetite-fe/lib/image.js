/**
 * Shrinks a photo in the browser before upload: longest side 1200 px, WebP (JPEG where the browser
 * cannot encode WebP). A phone photo of several MB ends up at roughly 150-300 KB.
 */

export const PHOTO_MAX_SIDE = 1200;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
// Must stay below the backend/bucket limit (PHOTO_MAX_BYTES = 1.5 MB).
const MAX_OUTPUT_BYTES = 1_400_000;
const QUALITIES = [0.8, 0.7, 0.6, 0.5];

/** `key` is an i18n key (photos.*) the UI can show as-is. */
export class ImageError extends Error {
  constructor(key) {
    super(key);
    this.name = "ImageError";
    this.key = key;
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older browsers reject the options object; they already apply EXIF rotation by default.
    return createImageBitmap(file);
  }
}

/** Returns { blob, width, height } or throws ImageError. */
export async function compressImage(file) {
  if (!file || (file.type && !file.type.startsWith("image/"))) throw new ImageError("photos.unreadable");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("photos.tooLarge");

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch {
    // e.g. HEIC outside Safari
    throw new ImageError("photos.unreadable");
  }

  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close?.();
    throw new ImageError("photos.unreadable");
  }
  // White behind transparent PNGs, so the JPEG fallback does not turn them black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let blob = await toBlob(canvas, "image/webp", QUALITIES[0]);
  let type = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    type = "image/jpeg";
    blob = await toBlob(canvas, type, QUALITIES[0]);
  }
  for (let i = 1; blob && blob.size > MAX_OUTPUT_BYTES && i < QUALITIES.length; i += 1) {
    blob = await toBlob(canvas, type, QUALITIES[i]);
  }
  if (!blob || blob.size > MAX_OUTPUT_BYTES) throw new ImageError("photos.tooLarge");

  return { blob, width, height };
}
