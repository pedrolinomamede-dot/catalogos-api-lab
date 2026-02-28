import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { PutObjectInput, PutObjectResult, StorageDriver } from "./storage";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

type S3Config = {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function getS3Config(): S3Config {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  if (!accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error("Missing S3 configuration");
  }

  return {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "auto",
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  };
}

export class S3Storage implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const config = getS3Config();

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.publicBaseUrl = config.publicBaseUrl;
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    return {
      key: input.key,
      url: `${trimTrailingSlash(this.publicBaseUrl)}/${input.key}`,
    };
  }

  async deleteObject(input: { key: string }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
      }),
    );
  }
}
