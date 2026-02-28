import sharp from "sharp";

export type OptimizedImageResult = {
  optimized: Buffer;
  thumbnail: Buffer;
};

export async function optimizeImage(buffer: Buffer): Promise<OptimizedImageResult> {
  const optimized = await sharp(buffer)
    .resize(1000, 1000, { fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .resize(300, 300, { fit: "cover" })
    .webp({ quality: 70 })
    .toBuffer();

  return { optimized, thumbnail };
}
