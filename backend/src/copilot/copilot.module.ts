import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProjectHubModule } from '../project-hub/project-hub.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CopilotController } from './copilot.controller';
import { CopilotConversationsController } from './copilot-conversations.controller';
import { CopilotConversationsService } from './copilot-conversations.service';
import { CopilotToolsService } from './copilot-tools.service';
import { CopilotService } from './copilot.service';

@Module({
  imports: [ProjectHubModule, TicketsModule, AnalyticsModule, KnowledgeModule],
  controllers: [CopilotController, CopilotConversationsController],
  providers: [CopilotService, CopilotToolsService, CopilotConversationsService],
})
export class CopilotModule {}
