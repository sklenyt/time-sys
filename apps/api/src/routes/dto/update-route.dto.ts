import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { TypStartu } from "@depo/shared";

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nazev?: string;

  @IsOptional()
  @IsNumber()
  delkaKm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pocetKol?: number;

  @IsOptional()
  @IsEnum(TypStartu)
  typStartu?: TypStartu;

  @IsOptional()
  @IsBoolean()
  dokoncena?: boolean;

  /** Výstupní soubor pro FTP/SFTP export výsledků (F34–F37), např. "10km.html". */
  @IsOptional()
  @IsString()
  @MinLength(1)
  exportSouborNazev?: string;

  /** Uzavření veřejného registračního formuláře (F23), např. při naplnění kapacity. */
  @IsOptional()
  @IsBoolean()
  registraceUzavrena?: boolean;

  /** Vlastní text v potvrzovacím e-mailu po veřejné registraci (chat 2026-09-26) — prázdný řetězec pole vynuluje. */
  @IsOptional()
  @IsString()
  potvrzovaciEmailText?: string;

  /** Číslo účtu pro QR platbu startovného, český formát "předčíslí-číslo/kód banky" nebo "číslo/kód banky". */
  @IsOptional()
  @IsString()
  platbaUcet?: string;

  /** Výše startovného v Kč — bez tohoto pole se QR platba negeneruje, i kdyby platbaUcet byl vyplněný. */
  @IsOptional()
  @IsInt()
  @Min(0)
  platbaCastka?: number;
}
