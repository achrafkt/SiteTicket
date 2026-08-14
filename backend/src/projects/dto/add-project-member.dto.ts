import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  roleOnProject?: string;
}
