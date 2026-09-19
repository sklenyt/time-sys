import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
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
  email?: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  @IsOptional()
  @IsString()
  nouzovyKontakt?: string;

  @IsOptional()
  @IsString()
  zdravotniPoznamka?: string;

  /** F32 — e-mail rodině/blízké osobě, na který přijde oznámení o doběhu do cíle. */
  @IsOptional()
  @IsEmail()
  oznamovaciEmail?: string;
}
