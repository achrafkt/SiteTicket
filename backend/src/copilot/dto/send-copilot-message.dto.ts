import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendCopilotMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  // Absent => start a new conversation. Present => continue an existing one;
  // ownership is verified server-side against the authenticated user before
  // any history is loaded (see CopilotConversationsService.getOwned).
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
