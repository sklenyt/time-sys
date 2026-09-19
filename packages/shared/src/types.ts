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
  stavUkonceni?: StavUkonceni | null;
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
}

export interface VysledkyResponseDto {
  trasaId: string;
  klasifikovani: VysledekPolozka[];
  neklasifikovani: VysledekPolozka[];
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
  startovniCisloRaw: number;
  prihlaskaId: string | null;
  typUdalosti: TypUdalosti;
  cas: string;
  stav: StavZaznamu;
  casKola?: string | null;
  casCelkem?: string | null;
}

export interface CorrectRecordDto {
  noveStartovniCislo: number;
  typOpravy: TypOpravy;
}

export interface SyncEventsRequestDto {
  zarizeniId: string;
  events: ZaznamUdalosti[];
}

export interface SyncEventsResponseDto {
  prijato: number;
  noveUdalosti: ZaznamUdalosti[];
  cursor: string;
}
