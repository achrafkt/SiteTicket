import { ProjectTaskStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProjectTaskDto {
  @IsString({ message: 'Le titre de la tâche est requis.' })
  @IsNotEmpty({ message: 'Le titre de la tâche est requis.' })
  title!: string;

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
  assigneeId?: string;
}
