import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsUUID('4', { message: 'Le rôle sélectionné est invalide.' })
  roleId!: string;

  @IsString({ message: 'Le prénom est requis.' })
  @IsNotEmpty({ message: 'Le prénom est requis.' })
  firstName!: string;

  @IsString({ message: 'Le nom est requis.' })
  @IsNotEmpty({ message: 'Le nom est requis.' })
  lastName!: string;

  @IsEmail({}, { message: 'Veuillez saisir une adresse e-mail valide.' })
  email!: string;

  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères.' })
  phone?: string;

  @IsString({ message: 'Le mot de passe est requis.' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  password!: string;

  @IsOptional()
  @IsBoolean({ message: 'Le statut actif doit être un booléen.' })
  isActive?: boolean;
}