import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

/** Pojmenovaná startovní vlna/interval (VLNOVY/INTERVALOVY typ startu) — viz 06-api-design.md §6.4. */
export class CreateStartVlnaDto {
  @IsString()
  @IsNotEmpty()
  nazev!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  odkladSekund?: number;
}
