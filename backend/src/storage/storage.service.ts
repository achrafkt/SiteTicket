import { randomUUID } from 'crypto';
import { existsSync, createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { dirname, extname, join } from 'path';
import { Readable } from 'stream';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from '../common/uploads.constants';

export interface StoredObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket?: string;
  readonly isR2Enabled: boolean;

  constructor() {
    const {
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_ENDPOINT,
      R2_BUCKET_NAME,
    } = process.env;
    this.isR2Enabled = Boolean(
      R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT && R2_BUCKET_NAME,
    );

    if (this.isR2Enabled) {
      this.bucket = R2_BUCKET_NAME;
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID as string,
          secretAccessKey: R2_SECRET_ACCESS_KEY as string,
        },
      });
      this.logger.log(`File storage: Cloudflare R2 (bucket "${this.bucket}")`);
    } else {
      this.s3Client = null;
      this.logger.log(
        'File storage: local disk (./uploads) — no R2_* config found',
      );
    }
  }

  async onModuleInit() {
    // The R2 SDK client's first request pays a one-off TLS/connection-setup
    // cost (observed 10-20s+ on a cold client) — pay it here at boot instead
    // of on a real user's first file request.
    if (!this.isR2Enabled) {
      return;
    }

    try {
      await this.s3Client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log('R2 connection warmed up');
    } catch (error: unknown) {
      this.logger.warn(
        `R2 warm-up request failed (non-fatal): ${(error as Error)?.message ?? error}`,
      );
    }
  }

  async save(
    buffer: Buffer,
    contentType: string,
    originalName: string,
    subdir?: string,
  ): Promise<string> {
    const key = subdir
      ? `${subdir}/${randomUUID()}${extname(originalName)}`
      : `${randomUUID()}${extname(originalName)}`;

    if (this.isR2Enabled) {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } else {
      const destination = join(UPLOADS_DIR, key);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, buffer);
    }

    return `${UPLOADS_URL_PREFIX}/${key}`;
  }

  async remove(fileUrl: string): Promise<void> {
    const key = fileUrl.replace(`${UPLOADS_URL_PREFIX}/`, '');

    try {
      if (this.isR2Enabled) {
        await this.s3Client!.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
      } else {
        await unlink(join(UPLOADS_DIR, key));
      }
    } catch {
      // best-effort cleanup: file may already be missing
    }
  }

  async getObject(key: string): Promise<StoredObject | null> {
    if (this.isR2Enabled) {
      try {
        const result = await this.s3Client!.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return {
          stream: result.Body as Readable,
          contentType: result.ContentType,
          contentLength: result.ContentLength,
          etag: result.ETag?.replace(/"/g, ''),
          lastModified: result.LastModified,
        };
      } catch (error: unknown) {
        const name = (error as { name?: string })?.name;
        if (name === 'NoSuchKey' || name === 'NotFound') {
          return null;
        }
        throw error;
      }
    }

    const filePath = join(UPLOADS_DIR, key);
    if (!existsSync(filePath)) {
      return null;
    }

    const stats = await stat(filePath);
    return {
      stream: createReadStream(filePath),
      contentLength: stats.size,
      lastModified: stats.mtime,
      etag: `${stats.size}-${stats.mtimeMs}`,
    };
  }
}
