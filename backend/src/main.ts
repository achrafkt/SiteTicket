import { mkdirSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AVATAR_UPLOADS_DIR, UPLOADS_DIR } from './common/uploads.constants';

async function bootstrap() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  mkdirSync(AVATAR_UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  await app.listen(Number(process.env.PORT ?? 3001));
}
bootstrap();
