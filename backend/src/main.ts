import { mkdirSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AVATAR_UPLOADS_DIR, UPLOADS_DIR } from './common/uploads.constants';
import { validateEnv } from './config/env-validation';

async function bootstrap() {
  const env = validateEnv();

  // Local-disk fallback dirs — only used when no R2_* config is present
  // (see StorageService), but harmless to create either way.
  mkdirSync(UPLOADS_DIR, { recursive: true });
  mkdirSync(AVATAR_UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: env.FRONTEND_URL.split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(env.PORT);
}

bootstrap().catch((error) => {
  console.error(
    'Fatal error during startup:\n',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
