import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  ticketTypeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.medium;

  @IsBoolean()
  @IsOptional()
  isBlocking?: boolean = false;

  @IsString()
  @IsOptional()
  locationZone?: string;

  @IsString()
  @IsOptional()
  trade?: string;

  @IsString()
  @IsOptional()
  externalParty?: string;

  @IsNumber()
  @IsOptional()
  costImpactAmount?: number;

  @IsInt()
  @IsOptional()
  scheduleImpactDays?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsNumber()
  @IsOptional()
  planX?: number;

  @IsNumber()
  @IsOptional()
  planY?: number;

  @IsInt()
  @IsOptional()
  planPage?: number;
}
