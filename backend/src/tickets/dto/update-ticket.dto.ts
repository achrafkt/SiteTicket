import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsBoolean()
  @IsOptional()
  isBlocking?: boolean;

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
  assignedTo?: string | null;

  @IsUUID()
  @IsOptional()
  statusId?: string;

  @IsUUID()
  @IsOptional()
  planId?: string | null;

  @IsNumber()
  @IsOptional()
  planX?: number | null;

  @IsNumber()
  @IsOptional()
  planY?: number | null;

  @IsInt()
  @IsOptional()
  planPage?: number | null;
}
