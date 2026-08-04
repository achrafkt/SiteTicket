import { Global, Module } from '@nestjs/common';
import { PrismaSeedService } from './prisma-seed.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, PrismaSeedService],
  exports: [PrismaService],
})
export class PrismaModule {}