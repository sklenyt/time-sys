import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Pohlavi } from "@depo/shared";
import { TeamMemberDto } from "./team-member.dto";

/**
 * Ruční zápis závodníka v UI (Startovní listina) — stejná povinná pole jako
 * veřejná registrace (jméno, příjmení, ročník, pohlaví, kategorie, e-mail).
 * Samostatná třída, ne potomek CreateEntryDto: zděděné @IsOptional by
 * povinnost zrušilo. CSV import a interní volání dál používají volnější
 * CreateEntryDto.
 */
export class CreateEntryManualDto {
  @IsInt()
  startovniCislo!: number;

  @IsString()
  @IsNotEmpty()
  prijmeni!: string;

  @IsString()
  @IsNotEmpty()
  jmeno!: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  rocnik!: number;

  @IsEnum(Pohlavi)
  pohlavi!: Pohlavi;

  @IsOptional()
  @IsString()
  klub?: string;

  @IsUUID()
  kategorieId!: string;

  @IsOptional()
  @IsUUID()
  startVlnaId?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  telefon?: string;

  @IsOptional()
  @IsString()
  nouzovyKontakt?: string;

  @IsOptional()
  @IsString()
  zdravotniPoznamka?: string;

  @IsOptional()
  @IsEmail()
  oznamovaciEmail?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  clenoveDruzstva?: TeamMemberDto[];
}

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

  /** Štafeta/družstvo (max 4 členové, legacy vzor viz TeamMemberDto) — nepovinné. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  clenoveDruzstva?: TeamMemberDto[];
}
