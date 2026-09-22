import sharp from 'sharp';

const MAX_UPLOAD_PIXELS = 24_000_000;
const allowedFormats = new Set(['jpeg', 'png', 'webp']);

export async function normalizeUploadImage(source: Buffer): Promise<Buffer> {
  try {
    const input = sharp(source, { limitInputPixels: MAX_UPLOAD_PIXELS, failOn: 'error' });
    const metadata = await input.metadata();
    if (!metadata.format || !allowedFormats.has(metadata.format)) throw new Error('unsupported format');
    return input.rotate().jpeg({ quality: 88, progressive: true }).toBuffer();
  } catch {
    throw new Error('Es sind nur JPEG-, PNG- oder WebP-Bilder erlaubt.');
  }
}

export async function createThumbnail(source: string, destination: string): Promise<void> {
  await sharp(source, { limitInputPixels: MAX_UPLOAD_PIXELS, failOn: 'error' })
    .rotate()
    .resize({ width: 480, height: 480, fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toFile(destination);
}
