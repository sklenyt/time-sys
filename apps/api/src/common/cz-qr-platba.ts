import QRCode from "qrcode";
import { NeplatnyUcetError, bezDiakritiky, ucetNaIban } from "@depo/shared";

/**
 * QR platba pro potvrzovací e-mail po registraci (chat 2026-09-26) —
 * organizátor zadá běžný český účet ("předčíslí-číslo/kódBanky" nebo
 * "číslo/kódBanky"), appka si sama spočítá IBAN (žádná banka v ČR
 * nepoužívá jiný formát QR platby než český standard "QR Platba", který
 * IBAN vyžaduje) a vygeneruje SPAYD řetězec zakódovaný jako QR PNG.
 */

export { NeplatnyUcetError, ucetNaIban };

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
