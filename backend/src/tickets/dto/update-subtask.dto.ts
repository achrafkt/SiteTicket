import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSubtaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
