import QRCode from "qrcode";

/**
 * QR platba pro potvrzovací e-mail po registraci (chat 2026-09-26) —
 * organizátor zadá běžný český účet ("předčíslí-číslo/kódBanky" nebo
 * "číslo/kódBanky"), appka si sama spočítá IBAN (žádná banka v ČR
 * nepoužívá jiný formát QR platby než český standard "QR Platba", který
 * IBAN vyžaduje) a vygeneruje SPAYD řetězec zakódovaný jako QR PNG.
 */

export class NeplatnyUcetError extends Error {}

/**
 * ISO 13616 kontrolní číslice IBAN (mod 97-10) — BBAN + zemní kód "CZ" +
 * "00" se přesune na konec, písmena se převedou na čísla (A=10…Z=35) a
 * spočítá se zbytek po dělení 97; kontrolní číslice = 98 − zbytek.
 */
function ibanKontrolniCislice(bban: string): string {
  const preskupene = `${bban}CZ00`;
  const cisly = preskupene.replace(/[A-Z]/g, (pismeno) => String(pismeno.charCodeAt(0) - 55));
  let zbytek = 0;
  for (const cifra of cisly) {
    zbytek = (zbytek * 10 + Number(cifra)) % 97;
  }
  return String(98 - zbytek).padStart(2, "0");
}

/**
 * Převede český účet ve tvaru "[předčíslí-]číslo/kódBanky" na IBAN.
 * Vyhazuje NeplatnyUcetError s lidsky čitelnou zprávou u nesprávného
 * formátu, ať appka může organizátorovi rovnou ukázat, co má opravit.
 */
export function ucetNaIban(ucet: string): string {
  const shoda = ucet.trim().match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!shoda) {
    throw new NeplatnyUcetError(
      `Neplatný formát čísla účtu "${ucet}" — očekává se např. "19-2000145399/0800" nebo "2000145399/0800"`
    );
  }
  const [, predcisli, cislo, kodBanky] = shoda;
  // BBAN pořadí pro CZ je kód banky (4) + předčíslí (6) + číslo účtu (10) —
  // ne naopak; ověřeno proti referenčnímu IBAN CZ65 0800 0000 1920 0014
  // 5399 pro účet 19-2000145399/0800 (viz cz-qr-platba.spec.ts).
  const bban = `${kodBanky}${(predcisli ?? "").padStart(6, "0")}${cislo.padStart(10, "0")}`;
  return `CZ${ibanKontrolniCislice(bban)}${bban}`;
}

/** Diakritika a `*` v SPAYD poli MSG dělá potíže některým bankovním appkám — bezpečnější je čistá ASCII transliterace. */
function bezDiakritiky(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, " ");
}

export interface QrPlatbaParams {
  ucet: string;
  castkaKc: number;
  zprava: string;
}

/** SPAYD 1.0 (česká/slovenská "QR Platba" specifikace) jako obyčejný text — pro PNG viz vygenerujQrPlatbuPng. */
export function vygenerujSpayd({ ucet, castkaKc, zprava }: QrPlatbaParams): string {
  const iban = ucetNaIban(ucet);
  const castka = castkaKc.toFixed(2);
  return `SPD*1.0*ACC:${iban}*AM:${castka}*CC:CZK*MSG:${bezDiakritiky(zprava).slice(0, 60)}`;
}

export function vygenerujQrPlatbuPng(params: QrPlatbaParams): Promise<Buffer> {
  return QRCode.toBuffer(vygenerujSpayd(params), { type: "png", margin: 1, width: 280 });
}
