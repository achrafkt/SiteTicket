import { join } from 'path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads';
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const AVATAR_UPLOADS_DIR = join(UPLOADS_DIR, 'avatars');
export const AVATAR_URL_PREFIX = `${UPLOADS_URL_PREFIX}/avatars`;
export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
