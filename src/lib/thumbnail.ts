import sharp from 'sharp';

export async function createThumbnail(source: string, destination: string): Promise<void> {
  await sharp(source)
    .rotate()
    .resize({ width: 480, height: 480, fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toFile(destination);
}
