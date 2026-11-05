/**
 * Turns a chosen photo into a small square JPEG in the browser, so uploads are
 * quick and every avatar is the same shape. Portrait photos are cropped nearer
 * the top, where faces usually are.
 */

const OUTPUT_SIZE_PX = 512;
const JPEG_QUALITY = 0.85;
// In a portrait photo, how far down the crop starts, as a share of the spare height.
const PORTRAIT_CROP_FROM_TOP = 0.2;

/** Rejects if the browser can't read the image (e.g. an iPhone HEIC in most browsers). */
export async function toSquareJpeg(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  try {
    const side = Math.min(image.width, image.height);
    const x = (image.width - side) / 2;
    const y = image.height > image.width ? (image.height - side) * PORTRAIT_CROP_FROM_TOP : (image.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE_PX;
    canvas.height = OUTPUT_SIZE_PX;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(image, x, y, side, side, 0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("couldn't encode the photo"))), "image/jpeg", JPEG_QUALITY),
    );
  } finally {
    image.close();
  }
}
