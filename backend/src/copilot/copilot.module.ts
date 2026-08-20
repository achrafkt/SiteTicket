import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProjectHubModule } from '../project-hub/project-hub.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CopilotController } from './copilot.controller';
import { CopilotToolsService } from './copilot-tools.service';
import { CopilotService } from './copilot.service';

@Module({
  imports: [ProjectHubModule, TicketsModule, AnalyticsModule, KnowledgeModule],
  controllers: [CopilotController],
  providers: [CopilotService, CopilotToolsService],
})
export class CopilotModule {}
