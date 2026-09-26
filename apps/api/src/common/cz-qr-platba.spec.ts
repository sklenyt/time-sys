import { NeplatnyUcetError, ucetNaIban, vygenerujSpayd } from "./cz-qr-platba";

describe("ucetNaIban", () => {
  it("převede účet s předčíslím na správný IBAN (ověřeno nezávislým výpočtem mod-97, standardní ČNB/BIC příklad)", () => {
    expect(ucetNaIban("19-2000145399/0800")).toBe("CZ6508000000192000145399");
  });

  it("bez předčíslí dá jiný IBAN než s předčíslím 19 (BBAN se opravdu liší, ne jen kosmeticky)", () => {
    const bezPredcisli = ucetNaIban("2000145399/0800");
    const sPredcislim = ucetNaIban("19-2000145399/0800");
    expect(bezPredcisli).not.toBe(sPredcislim);
    // BBAN (bez CZ prefixu a kontrolních číslic) musí mít nuly místo "19" na pozici předčíslí.
    expect(bezPredcisli.slice(4)).toBe("08000000" + "00" + "2000145399");
  });

  it("skládá BBAN ve správném pořadí kód banky → předčíslí → číslo účtu (ne naopak)", () => {
    const iban = ucetNaIban("42-123456/0100");
    expect(iban.slice(4)).toBe("0100" + "000042" + "0000123456");
  });

  it("vyhodí NeplatnyUcetError na nesmyslný vstup", () => {
    expect(() => ucetNaIban("nesmysl")).toThrow(NeplatnyUcetError);
    expect(() => ucetNaIban("123456")).toThrow(NeplatnyUcetError);
    expect(() => ucetNaIban("123/45")).toThrow(NeplatnyUcetError);
  });
});

describe("vygenerujSpayd", () => {
  it("sestaví SPAYD řetězec s IBAN, částkou na dvě desetinná místa a zprávou", () => {
    const spayd = vygenerujSpayd({ ucet: "19-2000145399/0800", castkaKc: 350, zprava: "Startovne Novak Petr" });
    expect(spayd).toBe("SPD*1.0*ACC:CZ6508000000192000145399*AM:350.00*CC:CZK*MSG:Startovne Novak Petr");
  });

  it("odstraní diakritiku ze zprávy (kompatibilita s bankovními appkami)", () => {
    const spayd = vygenerujSpayd({ ucet: "2000145399/0800", castkaKc: 100, zprava: "Startovné Dvořák Šárka" });
    expect(spayd).toContain("MSG:Startovne Dvorak Sarka");
  });
});
