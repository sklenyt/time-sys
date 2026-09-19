import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Pohlavi } from "@depo/shared";

/**
 * Vlastní veřejný registrační formulář (F23, Fáze 4) — na rozdíl od
 * CreateEntryDto (organizátorský zápis) si veřejnost NEVOLÍ startovní
 * číslo (přiřadí se automaticky) ani vlnu, aby nešlo zablokovat cizí
 * číslo nebo obejít pořadí přihlášek.
 */
export class PublicRegisterDto {
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
