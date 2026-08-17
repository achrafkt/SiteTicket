import { Module } from '@nestjs/common';
import { ProjectHubModule } from '../project-hub/project-hub.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [ProjectHubModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
