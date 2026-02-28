import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageDriver } from "./storage";

let storage: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (storage) {
    return storage;
  }

  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

  if (driver === "local") {
    storage = new LocalStorage();
    return storage;
  }

  if (driver === "s3") {
    storage = new S3Storage();
    return storage;
  }

  throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
}
