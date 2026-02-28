import { z } from "zod";

export const signupSchema = z.object({
  brandName: z.string().min(1),
  brandSlug: z.string().min(1).regex(/^[a-z0-9-]+$/i),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
