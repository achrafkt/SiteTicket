import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le prénom ne peut pas être vide.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide.' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Veuillez saisir une adresse e-mail valide.' })
  email?: string;
}
