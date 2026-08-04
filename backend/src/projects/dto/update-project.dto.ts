import { ProjectStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Le nom du projet doit être une chaîne de caractères.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Le code du projet doit être une chaîne de caractères.' })
  code?: string;

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