/**
 * Pomocné funkce pro platbu startovného převodem / QR platbou — sdílené mezi
 * API (generování QR a e-mail) a webem (náhled e-mailu ve Správě).
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
export function bezDiakritiky(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, " ");
}


/** Zpráva pro příjemce platby — stejná v QR kódu i v textu e-mailu (bez diakritiky, ať ji banky nekomolí). */
export function zpravaProPrijemce(jmeno: string, prijmeni: string): string {
  return bezDiakritiky(`Startovne ${jmeno} ${prijmeni}`).trim();
}
