import { z } from "zod";

export const imageUploadMetaSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  contentType: z.string().min(1),
  size: z.number().int().min(1),
});
