import { promises as fs } from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveUploadRoot() {
  const raw = process.env.LOCAL_UPLOAD_DIR ?? "./public/uploads";
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function resolveContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  if (!Array.isArray(parts) || parts.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = resolveUploadRoot();
  const filePath = path.join(root, ...parts);
  const normalizedRoot = path.resolve(root);
  const normalizedFilePath = path.resolve(filePath);

  if (!normalizedFilePath.startsWith(normalizedRoot)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const file = await fs.readFile(normalizedFilePath);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": resolveContentType(normalizedFilePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("[uploads][GET] failed", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
