import { IsUUID } from 'class-validator';

export class CreateLinkDto {
  @IsUUID()
  linkedTicketId: string;
}
