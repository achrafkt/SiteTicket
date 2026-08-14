import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProjectExpenseDto {
  @IsString({ message: 'Le libellé de la dépense est requis.' })
  @IsNotEmpty({ message: 'Le libellé de la dépense est requis.' })
  label!: string;

  @IsNumber({}, { message: 'Le montant doit être un nombre.' })
  @Min(0, { message: 'Le montant doit être positif.' })
  amount!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de dépense est invalide.' })
  expenseDate?: string;
}
