import { Module } from '@nestjs/common';
import { ProjectHubAccessService } from '../project-hub/project-hub-access.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ProjectHubAccessService],
})
export class AnalyticsModule {}
