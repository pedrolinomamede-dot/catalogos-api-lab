import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { optimizeImage } from "@/lib/image-optimizer";
import { getStorage } from "@/lib/storage";
import { jsonError } from "@/lib/utils/errors";

const MAX_FILES = 10;
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const resolveMaxSize = () => {
  const raw = process.env.LOCAL_UPLOAD_MAX_SIZE;
  if (!raw) {
    return DEFAULT_MAX_SIZE_BYTES;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? DEFAULT_MAX_SIZE_BYTES : parsed;
};

const toFileArray = (formData: FormData) => {
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);
  const single = formData.get("file");
  if (single instanceof File) {
    files.unshift(single);
  }
  return files;
};

export async function handleImageUpload(request: Request, brandId: string) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "invalid_form", "Invalid multipart payload");
  }

  const files = toFileArray(formData);
  if (files.length === 0) {
    return jsonError(400, "invalid_file", "File is required");
  }

  if (files.length > MAX_FILES) {
    return jsonError(400, "too_many_files", "Maximum 10 files allowed");
  }

  const maxSize = resolveMaxSize();
  const storage = getStorage();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const results = [];

  for (const file of files) {
    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return jsonError(400, "invalid_file_type", "Unsupported file type");
    }

    if (file.size === 0 || file.size > maxSize) {
      return jsonError(400, "invalid_file_size", "File size exceeds limit");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { optimized, thumbnail } = await optimizeImage(buffer);

    const keyBase = `${brandId}/${year}/${month}/${randomUUID()}`;
    const imageKey = `${keyBase}.webp`;
    const thumbKey = `${keyBase}-thumb.webp`;

    const [imageResult, thumbResult] = await Promise.all([
      storage.putObject({
        key: imageKey,
        buffer: optimized,
        contentType: "image/webp",
      }),
      storage.putObject({
        key: thumbKey,
        buffer: thumbnail,
        contentType: "image/webp",
      }),
    ]);

    results.push({
      imageUrl: imageResult.url,
      thumbnailUrl: thumbResult.url,
      contentType: "image/webp",
      size: optimized.length,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      data: results,
    },
    { status: 201 },
  );
}
