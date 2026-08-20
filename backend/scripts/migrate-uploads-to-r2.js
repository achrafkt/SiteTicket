// One-shot migration: uploads local disk (backend/uploads/) -> Cloudflare R2.
// Uploads each file under the same relative key it already has on disk, so
// existing DB columns (avatar_url, file_url, ...) keep resolving correctly
// without any rewrite. Verifies each upload (size + MD5-vs-ETag) after PUT.
// Does NOT delete local files — that is a separate, explicit step.
require('dotenv').config();
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function guessMime(filePath) {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME } =
    process.env;

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
    console.error('Missing R2_* env vars in backend/.env — aborting.');
    process.exit(1);
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`No local uploads directory at ${UPLOADS_DIR} — nothing to migrate.`);
    return;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const files = walk(UPLOADS_DIR);
  console.log(`Found ${files.length} local file(s) under ${UPLOADS_DIR}\n`);

  let migrated = 0;
  let failed = 0;

  for (const filePath of files) {
    const key = path.relative(UPLOADS_DIR, filePath).split(path.sep).join('/');
    const buffer = fs.readFileSync(filePath);
    const localMd5 = crypto.createHash('md5').update(buffer).digest('hex');
    const contentType = guessMime(filePath);

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      const head = await client.send(
        new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
      );
      const remoteEtag = (head.ETag || '').replace(/"/g, '');
      const sizeMatches = head.ContentLength === buffer.length;
      const md5Matches = remoteEtag === localMd5;

      if (sizeMatches && md5Matches) {
        console.log(`OK        ${key} (${buffer.length} bytes)`);
        migrated++;
      } else {
        console.error(
          `MISMATCH  ${key} — size local=${buffer.length} remote=${head.ContentLength}, md5 local=${localMd5} remote=${remoteEtag}`,
        );
        failed++;
      }
    } catch (err) {
      console.error(`FAILED    ${key}:`, err.message);
      failed++;
    }
  }

  console.log(
    `\nDone. Verified on R2: ${migrated}/${files.length}. Failed: ${failed}.`,
  );
  console.log(
    'Local files were NOT deleted. Clean up backend/uploads/ manually once you confirm everything serves correctly from R2.',
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
