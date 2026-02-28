import { promises as fs } from "node:fs";
import path from "node:path";

import type { PutObjectInput, PutObjectResult, StorageDriver } from "./storage";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export class LocalStorage implements StorageDriver {
  private uploadDir: string;
  private publicBaseUrl: string;

  constructor() {
    this.uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "./public/uploads";
    this.publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const rootDir = path.isAbsolute(this.uploadDir)
      ? this.uploadDir
      : path.join(process.cwd(), this.uploadDir);
    const filePath = path.join(rootDir, input.key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, input.buffer);

    const url = `${trimTrailingSlash(this.publicBaseUrl)}/uploads/${input.key}`;

    return {
      key: input.key,
      url,
    };
  }

  async deleteObject(input: { key: string }): Promise<void> {
    const rootDir = path.isAbsolute(this.uploadDir)
      ? this.uploadDir
      : path.join(process.cwd(), this.uploadDir);
    const filePath = path.join(rootDir, input.key);

    try {
      await fs.rm(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}
