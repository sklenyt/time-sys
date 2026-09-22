import { IsDateString, IsOptional, IsUUID } from "class-validator";

/** Bez startVlnaId se použije/vytvoří výchozí vlna trati (stejně jako StartActionDto). */
export class PlanStartDto {
  @IsOptional()
  @IsUUID()
  startVlnaId?: string;

  @IsDateString()
  planovanyStart!: string;
}
