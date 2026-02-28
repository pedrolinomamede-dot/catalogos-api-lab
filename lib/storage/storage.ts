export type PutObjectInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export type PutObjectResult = {
  key: string;
  url: string;
};

export type DeleteObjectInput = {
  key: string;
};

export interface StorageDriver {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
}
