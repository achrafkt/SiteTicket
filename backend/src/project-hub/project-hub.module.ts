import { Module } from '@nestjs/common';
import { ProjectHubController } from './project-hub.controller';
import { ProjectHubAccessService } from './project-hub-access.service';
import { ProjectHubService } from './project-hub.service';

@Module({
  controllers: [ProjectHubController],
  providers: [ProjectHubService, ProjectHubAccessService],
  exports: [ProjectHubService],
})
export class ProjectHubModule {}
