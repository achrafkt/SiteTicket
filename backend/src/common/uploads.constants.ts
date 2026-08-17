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

// Knowledge base articles (procedures, safety sheets, document templates,
// equipment sheets) commonly attach an office document rather than a photo.
export const ALLOWED_KNOWLEDGE_FILE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MAX_KNOWLEDGE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Site plans (drawings) attached to a chantier: photos of printed plans or
// exported PDF drawings, same shape as ticket attachments.
export const ALLOWED_PLAN_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const MAX_PLAN_SIZE_BYTES = 20 * 1024 * 1024;
