import {
  Pohlavi,
  ProtokolPublikace,
  Role,
  StavCipu,
  StavExportu,
  StavUkonceni,
  StavZaznamu,
  TypOpravy,
  TypStartu,
  TypUdalosti,
  TypZarizeni,
} from "./enums";

export interface Organizace {
  id: string;
  nazev: string;
  vytvorenoAt: string;
}

export interface Udalost {
  id: string;
  organizaceId: string;
  nazev: string;
  datum: string;
  htmlHlavicka?: string | null;
  logoUrl?: string | null;
  ukoncena: boolean;
}

export interface Trasa {
  id: string;
  udalostId: string;
  nazev: string;
  delkaKm?: number | null;
  pocetKol: number;
  typStartu: TypStartu;
  dokoncena: boolean;
  exportSouborNazev?: string | null;
  registraceUzavrena: boolean;
}

export interface Kategorie {
  id: string;
  trasaId: string;
  kod: string;
  nazev: string;
  pohlavi: Pohlavi;
  rocnikOd?: number | null;
  rocnikDo?: number | null;
}

export interface StartVlna {
  id: string;
  trasaId: string;
  nazev: string;
  casStartu?: string | null;
  odkladSekund?: number | null;
  planovanyStart?: string | null;
}

/** Jeden člen štafety/družstva (`Prihlaska.clenoveDruzstva`) — legacy vzor 4× jméno/ročník/klub. */
export interface DruzstvoClen {
  prijmeni: string;
  jmeno: string;
  rocnik?: number | null;
  klub?: string | null;
}

export interface Prihlaska {
  id: string;
  trasaId: string;
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
  rocnik?: number | null;
  pohlavi?: Pohlavi | null;
  klub?: string | null;
  email?: string | null;
  telefon?: string | null;
  kategorieId: string;
  startVlnaId?: string | null;
  registrovan: boolean;
  nouzovyKontakt?: string | null;
  zdravotniPoznamka?: string | null;
  oznamovaciEmail?: string | null;
  stavUkonceni?: StavUkonceni | null;
  clenoveDruzstva?: DruzstvoClen[] | null;
}

/** PATCH /routes/:id/entries/:entryId — ruční stav ukončení (F11) a/nebo členové družstva. */
export interface UpdateEntryDto {
  stavUkonceni?: StavUkonceni | null;
  clenoveDruzstva?: DruzstvoClen[] | null;
}

/** POST /routes/:id/entries/import — CSV import startovní listiny (F04). */
export interface ImportEntriesRowError {
  radek: number;
  zprava: string;
}

export interface ImportEntriesResponseDto {
  importovano: number;
  chyby: ImportEntriesRowError[];
}

export interface Cip {
  id: string;
  prihlaskaId: string;
  kodCipu: string;
  stav: StavCipu;
  zalozni: boolean;
  vratnaZaloha?: number | null;
  vydanoAt?: string | null;
  vracenoAt?: string | null;
}

/** Řádek evidence čipů trati (F22/F29/F30) — Cip doplněný o identifikaci závodníka pro přehled ve stránce Čipy. */
export interface CipSListem extends Cip {
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
}

export interface Zarizeni {
  id: string;
  nazev: string;
  typ: TypZarizeni;
  posledniSyncAt?: string | null;
}

export interface ZaznamUdalosti {
  id: string;
  trasaId: string;
  prihlaskaId?: string | null;
  startovniCisloRaw?: number | null;
  typUdalosti: TypUdalosti;
  cas: string;
  zarizeniId: string;
  uzivatelId?: string | null;
  typOpravy: TypOpravy;
  nahrazujeZaznamId?: string | null;
  stav: StavZaznamu;
  vytvorenoKlientAt: string;
  prijatoServerAt: string;
}

export interface Uzivatel {
  id: string;
  organizaceId?: string | null;
  email: string;
  jmeno: string;
  vytvorenoAt: string;
}

export interface AuditLog {
  id: string;
  uzivatelId?: string | null;
  entita: string;
  entitaId: string;
  puvodniHodnota?: unknown;
  novaHodnota?: unknown;
  cas: string;
}

export interface RegisterDto {
  email: string;
  heslo: string;
  jmeno: string;
}

export interface LoginDto {
  email: string;
  heslo: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  jmeno: string;
  poradiMenu: string[];
}

export interface PublikacniCil {
  id: string;
  udalostId: string;
  protokol: ProtokolPublikace;
  server: string;
  port: number;
  cesta: string;
  uzivatel: string;
  intervalMinut: number;
  exportPoKazdemZaznamu: boolean;
  htmlSablona?: string | null;
  posledniExportAt?: string | null;
  posledniExportStav?: StavExportu | null;
}

/** POST /publish-targets/:id/test a .../export-now (F34–F37). */
export interface PublishTestResponseDto {
  ok: boolean;
  zprava: string;
}

export interface PublishExportResponseDto {
  stav: StavExportu;
}

export interface UzivatelRole {
  id: string;
  uzivatelId: string;
  udalostId: string;
  role: Role;
}

/** GET /routes/:id/results — jedna položka výsledků (F12). */
export interface VysledekPolozka {
  prihlaskaId: string;
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
  klub?: string | null;
  kategorieId: string;
  kategorieKod: string;
  kategorieNazev: string;
  casCelkem: string | null;
  casCelkemMs: number | null;
  poradiCelkove: number | null;
  poradiKategorie: number | null;
  stavUkonceni?: StavUkonceni | null;
  clenoveDruzstva?: DruzstvoClen[] | null;
  /** Kolik kol trať vyžaduje (víckolové závody) — vždy stejné pro celou trať. */
  pocetKol: number;
  /** Kolik kol má běžec/běžkyně za sebou — jen dokud není klasifikován/a (pak null), jinak je bezpředmětné. */
  aktualniKolo: number | null;
}

export interface VysledkyResponseDto {
  trasaId: string;
  trasaNazev: string;
  udalostNazev: string;
  /** Ostatní tratě téže akce — pro přepínač trati na stránce výsledků. */
  trasy: { id: string; nazev: string }[];
  /** Organizátor trať ručně označil jako dokončenou — štítek "ŽIVĚ" se pak nemá zobrazovat. */
  trasaDokoncena: boolean;
  /** Aspoň jedna startovní vlna trati už odstartovala — bez toho "ŽIVĚ" neplatí, závod ještě nezačal. */
  trasaOdstartovana: boolean;
  klasifikovani: VysledekPolozka[];
  neklasifikovani: VysledekPolozka[];
}

/** GET /routes/:id/running — "Kdo ještě běží / DNF" v reálném čase (F10). */
export interface BezicPolozka {
  prihlaskaId: string;
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
  kategorieKod: string;
  casOdStartu: string | null;
  /** Kolik kol trať vyžaduje a kolik jich běžec/běžkyně už má za sebou (víckolové závody). */
  pocetKol: number;
  aktualniKolo: number;
}

export interface RunningResponseDto {
  trasaId: string;
  bezi: BezicPolozka[];
  celkemPrihlasenych: number;
  dokonceniPocet: number;
  neukonceniPocet: number;
}

/** POST /routes/:id/records — jádro workflow "číslo + Enter". */
export interface CreateRecordDto {
  startovniCislo: number;
  zarizeniId: string;
  klientCas: string;
  /** UUID vygenerované na klientovi — idempotence při retry po výpadku spojení. */
  klientEventId: string;
}

export interface RecordResponseDto {
  id: string;
  trasaId: string;
  startovniCisloRaw: number | null;
  prihlaskaId: string | null;
  typUdalosti: TypUdalosti;
  cas: string;
  stav: StavZaznamu;
  casKola?: string | null;
  casCelkem?: string | null;
  /** F41 — má tento záznam přiložený fotodůkaz z cíle (viz docs/12-rfid-a-doporuceni.md §12.8). */
  maFotodukaz?: boolean;
  /** Kolikátý průjezd cílem tohle je a kolik jich trať vyžaduje (víckolové závody) — jen u DOJEZD, jinak null. */
  aktualniKolo?: number | null;
  pocetKol?: number | null;
}

export interface CorrectRecordDto {
  noveStartovniCislo: number;
  typOpravy: TypOpravy;
}

/**
 * Offline synchronizace (F15, 03-architecture.md §3.5) — dávkový zápis
 * eventů vzniklých lokálně na zařízení, zatímco bylo bez připojení.
 */
export interface SyncEventDto {
  klientEventId: string;
  startovniCislo: number;
  klientCas: string;
}

export interface SyncPushResultItem {
  klientEventId: string;
  stav: StavZaznamu | "CHYBA";
  zaznam?: RecordResponseDto;
  chyba?: string;
}

export interface SyncPushResponseDto {
  vysledky: SyncPushResultItem[];
}

export interface SyncPullResponseDto {
  cursor: string;
  eventy: RecordResponseDto[];
}

/**
 * Kolize stanovišť k ručnímu rozhodnutí organizátora (03-architecture.md
 * §3.5 bod 5) — obě verze zůstávají v `zaznam_udalosti`, tohle je jen
 * pohled na ty se `stav=NEEDS_REVIEW`.
 */
export interface ConflictItemDto extends RecordResponseDto {
  zarizeniId: string;
  startovniCislo: number | null;
  prijmeni: string | null;
  jmeno: string | null;
}

/** Auditní log s filtrováním (Fáze 3, §7.6) — jeden řádek = jedna oprava zápisu měření (F09). */
export interface AuditLogPolozka {
  id: string;
  cas: string;
  uzivatelId: string | null;
  uzivatelJmeno: string | null;
  uzivatelEmail: string | null;
  entita: string;
  entitaId: string;
  puvodniHodnota: Record<string, unknown> | null;
  novaHodnota: Record<string, unknown> | null;
}

/** GET /routes/:id/register (veřejné) — vlastní registrační formulář (F23, Fáze 4). */
export interface RegistrationInfoDto {
  trasaNazev: string;
  udalostNazev: string;
  otevrena: boolean;
  kategorie: Kategorie[];
}

export interface RegistrationResponseDto {
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
}

/** GET /reports/course-records — rekord tratě napříč ročníky stejného názvu (F26, Fáze 4). */
export interface CourseRecordPolozka {
  udalostId: string;
  udalostNazev: string;
  udalostDatum: string;
  trasaId: string;
  prihlaskaId: string;
  prijmeni: string;
  jmeno: string;
  kategorieKod: string;
  casCelkem: string;
  casCelkemMs: number;
}

export interface CourseRecordsResponseDto {
  nazev: string;
  pocetRocniku: number;
  celkovyRekord: CourseRecordPolozka | null;
  rekordyPodleKategorie: CourseRecordPolozka[];
}

/** GET /reports/runner-history — historie výkonů běžce napříč ročníky (F26, Fáze 4). */
export interface RunnerHistoryPolozka {
  udalostNazev: string;
  udalostDatum: string;
  trasaNazev: string;
  kategorieKod: string;
  casCelkem: string | null;
  poradiCelkove: number | null;
  poradiKategorie: number | null;
  stavUkonceni?: StavUkonceni | null;
}

export interface RunnerHistoryResponseDto {
  prijmeni: string;
  jmeno: string;
  zavody: RunnerHistoryPolozka[];
}

/**
 * GET /routes/:id/anomalies — F33 (Fáze 4): podezřele rychlý/pomalý čas
 * oproti mediánu ostatních v téže kategorii (možné zkrácení trati nebo
 * naopak nouzová situace na trati), viz docs/12-rfid-a-doporuceni.md §12.6/§12.8.
 */
export enum TypAnomalie {
  PRILIS_RYCHLY = "PRILIS_RYCHLY",
  PRILIS_POMALY = "PRILIS_POMALY",
}

export interface AnomaliePolozka {
  prihlaskaId: string;
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
  kategorieKod: string;
  typUdalosti: TypUdalosti.DOJEZD | TypUdalosti.MEZICAS;
  cas: string;
  casMs: number;
  medianKategorieMs: number;
  typAnomalie: TypAnomalie;
}

export interface AnomaliesResponseDto {
  trasaId: string;
  polozky: AnomaliePolozka[];
}

/**
 * GET /routes/:id/results/bezec/:prihlaskaId — osobní výsledková stránka
 * pro QR kód na startovním čísle (viz docs/12-rfid-a-doporuceni.md §12.6/§12.9)
 * — naskenování odkáže přímo na výsledek konkrétního závodníka, ne na celou
 * (často dlouhou) tabulku.
 */
export interface PersonalResultDto {
  prihlaskaId: string;
  startovniCislo: number;
  prijmeni: string;
  jmeno: string;
  kategorieKod: string;
  kategorieNazev: string;
  casCelkem: string | null;
  poradiCelkove: number | null;
  poradiKategorie: number | null;
  mezicas: string | null;
  stavUkonceni?: StavUkonceni | null;
  clenoveDruzstva?: DruzstvoClen[] | null;
}

/** GET /events/verejne — veřejný adresář na vysledky.depotime.cz. */
export interface VerejnaUdalostDto {
  id: string;
  nazev: string;
  datum: string;
  vyzadujeHeslo: boolean;
  trasy: { id: string; nazev: string }[];
}

/** POST /events/:id/pristup — ověření hesla k veřejnému výpisu výsledků. */
export interface OveritPristupResponseDto {
  trasy: { id: string; nazev: string }[];
}
