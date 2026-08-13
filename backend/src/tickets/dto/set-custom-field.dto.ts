import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetCustomFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  key: string;

  @IsString()
  @MaxLength(2000)
  value: string;
}
