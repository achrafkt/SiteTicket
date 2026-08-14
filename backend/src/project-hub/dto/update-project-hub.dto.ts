import { ProjectStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProjectHubDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Le statut du chantier est invalide.' })
  status?: ProjectStatus;

  @IsOptional()
  @IsNumber({}, { message: 'Le budget prévisionnel doit être un nombre.' })
  @Min(0, { message: 'Le budget prévisionnel doit être positif.' })
  budgetPlanned?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La date de début est invalide.' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin prévisionnelle est invalide.' })
  endDatePlanned?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin réelle est invalide.' })
  endDateActual?: string;
}
