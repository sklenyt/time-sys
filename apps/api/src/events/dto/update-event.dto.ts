import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, IsUrl, MinLength, ValidateIf } from "class-validator";

/** organizaceId zde záměrně chybí — přesun události mezi organizacemi není podporovaná operace. */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nazev?: string;

  @IsOptional()
  @IsDateString()
  datum?: string;

  @IsOptional()
  @IsString()
  htmlHlavicka?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  verejnyVypis?: boolean;

  /** Plain text heslo pro veřejný adresář (vysledky.depotime.cz) — appka ho rovnou zahashuje, nikdy neukládá v čitelné podobě. */
  @IsOptional()
  @IsString()
  @MinLength(4)
  heslo?: string;

  /** Zruší existující heslo (výsledky pak jde otevřít bez hesla) — ignorováno, pokud je zároveň poslané `heslo`. */
  @IsOptional()
  @IsBoolean()
  odebratHesloVysledku?: boolean;

  /** Ukončená akce zmizí z Dashboardu a ve Správě se zešedí — beze změny dat, jen UI stav. */
  @IsOptional()
  @IsBoolean()
  ukoncena?: boolean;

  /** Kopie (CC, viditelná příjemci) potvrzení registrace a platby; prázdný řetězec nebo null kopii zruší. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== "" && v !== null)
  @IsEmail()
  emailKopie?: string | null;

  /** Vlastní závěrečný pozdrav e-mailů akce; prázdný řetězec vrátí výchozí. */
  @IsOptional()
  @IsString()
  emailPodpis?: string | null;

  /** Zobrazit akci v referencích na webu depotime.cz. */
  @IsOptional()
  @IsBoolean()
  verejnaReference?: boolean;

  /** Místo konání (město) pro mapu referencí; prázdný řetězec místo smaže. */
  @IsOptional()
  @IsString()
  misto?: string | null;
}
