import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CopilotHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  // Generous enough to hold a max_tokens: 4096 assistant reply (~16k chars
  // worst case) once it re-enters as history on the next turn.
  @MaxLength(20000)
  content: string;
}

export class SendCopilotMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => CopilotHistoryMessageDto)
  history: CopilotHistoryMessageDto[] = [];
}
