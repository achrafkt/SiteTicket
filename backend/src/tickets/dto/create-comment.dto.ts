import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  commentText: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = true;
}
