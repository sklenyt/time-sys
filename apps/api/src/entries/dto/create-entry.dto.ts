import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Pohlavi } from "@depo/shared";

/**
 * Trasa je dána cestou (POST /routes/:routeId/entries), kategorie je zde
 * povinná (F03) — auto-návrh z /categories/navrh se v UI musí explicitně
 * potvrdit, endpoint nikdy neuloží přihlášku bez kategorie.
 */
export class CreateEntryDto {
  @IsInt()
  startovniCislo!: number;

  @IsString()
  @IsNotEmpty()
  prijmeni!: string;

  @IsString()
  @IsNotEmpty()
  jmeno!: string;

  @IsOptional()
  @IsInt()
  rocnik?: number;

  @IsOptional()
  @IsEnum(Pohlavi)
  pohlavi?: Pohlavi;

  @IsOptional()
  @IsString()
  klub?: string;

  @IsUUID()
  kategorieId!: string;

  @IsOptional()
  @IsUUID()
  startVlnaId?: string;

  @IsOptional()
  @IsString()
  nouzovyKontakt?: string;

  @IsOptional()
  @IsString()
  zdravotniPoznamka?: string;
}
