import { ProjectStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Le nom du projet est requis.' })
  @IsNotEmpty({ message: 'Le nom du projet est requis.' })
  name!: string;

  @IsString({ message: 'Le code du projet est requis.' })
  @IsNotEmpty({ message: 'Le code du projet est requis.' })
  code!: string;

  @IsOptional()
  @IsString({ message: 'L’adresse doit être une chaîne de caractères.' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Le nom du client doit être une chaîne de caractères.' })
  clientName?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Le statut du projet est invalide.' })
  status?: ProjectStatus;

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