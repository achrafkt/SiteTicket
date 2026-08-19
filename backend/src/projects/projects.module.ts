import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectHubAccessService } from '../project-hub/project-hub-access.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectHubAccessService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
