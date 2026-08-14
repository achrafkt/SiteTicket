import { ProjectStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProjectHubDto {
  @IsString({ message: 'Le nom du chantier est requis.' })
  @IsNotEmpty({ message: 'Le nom du chantier est requis.' })
  name!: string;

  @IsString({ message: 'Le code du chantier est requis.' })
  @IsNotEmpty({ message: 'Le code du chantier est requis.' })
  code!: string;

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
