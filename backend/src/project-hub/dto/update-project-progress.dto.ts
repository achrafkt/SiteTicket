import { IsInt, Max, Min } from 'class-validator';

export class UpdateProjectProgressDto {
  @IsInt({ message: "L'avancement doit être un nombre entier." })
  @Min(0, { message: "L'avancement ne peut pas être négatif." })
  @Max(100, { message: "L'avancement ne peut pas dépasser 100%." })
  progressPercent!: number;
}
