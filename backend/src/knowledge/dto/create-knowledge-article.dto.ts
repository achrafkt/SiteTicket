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

export class CreateKnowledgeArticleDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;

  @IsArray()
  @IsEnum(RoleCode, { each: true })
  @IsOptional()
  visibleRoles?: RoleCode[];

  @IsBoolean()
  @IsOptional()
  needsReview?: boolean;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  // Set when the article is created from a ticket reply — the service looks
  // the ticket up server-side and derives the denormalized reference itself,
  // so the client only needs to pass the id.
  @IsUUID()
  @IsOptional()
  sourceTicketId?: string;
}
