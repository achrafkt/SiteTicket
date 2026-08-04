import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsUUID('4', { message: 'Le rôle sélectionné est invalide.' })
  roleId?: string;

  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères.' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Veuillez saisir une adresse e-mail valide.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  password?: string;

  @IsOptional()
  @IsBoolean({ message: 'Le statut actif doit être un booléen.' })
  isActive?: boolean;
}