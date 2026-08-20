import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from './storage.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('*splat')
  async serve(
    @Param('splat') splat: string | string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = Array.isArray(splat) ? splat.join('/') : splat;
    const object = await this.storage.getObject(key);
    if (!object) {
      throw new NotFoundException('Fichier introuvable.');
    }

    res.set({
      'Content-Type': object.contentType ?? 'application/octet-stream',
      // Keys are UUID-named and never overwritten in place (a re-upload gets
      // a new key) — safe to cache indefinitely without revalidation.
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Helmet's default CORP (same-origin) blocks <img>/<link> no-cors
      // cross-origin loads — the frontend (a different origin/port) needs
      // to embed these files directly, so relax it for this route only.
      'Cross-Origin-Resource-Policy': 'cross-origin',
      ...(object.etag ? { ETag: `"${object.etag}"` } : {}),
      ...(object.lastModified
        ? { 'Last-Modified': object.lastModified.toUTCString() }
        : {}),
      ...(object.contentLength
        ? { 'Content-Length': String(object.contentLength) }
        : {}),
    });

    return new StreamableFile(object.stream);
  }
}
