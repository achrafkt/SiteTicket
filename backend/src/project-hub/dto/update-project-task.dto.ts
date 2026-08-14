import { ProjectTaskStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateProjectTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectTaskStatus, { message: 'Le statut de la tâche est invalide.' })
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsDateString({}, { message: "La date d'échéance est invalide." })
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}
