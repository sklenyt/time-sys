import { IsOptional, IsUUID } from "class-validator";

/** Bez startVlnaId se použije/vytvoří výchozí vlna trati (typicky hromadný start). */
export class StartActionDto {
  @IsOptional()
  @IsUUID()
  startVlnaId?: string;
}
