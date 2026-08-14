import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RoleCode } from '@prisma/client';

export class UpdateKnowledgeArticleDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  @IsOptional()
  content?: string;

  @IsArray()
  @IsEnum(RoleCode, { each: true })
  @IsOptional()
  visibleRoles?: RoleCode[];

  @IsBoolean()
  @IsOptional()
  needsReview?: boolean;

  @IsDateString()
  @IsOptional()
  validUntil?: string | null;
}
