import { sestavPotvrzeniRegistrace } from "@depo/shared";

const zaklad = { jmeno: "Jan", prijmeni: "Novák", trasaNazev: "20km", udalostNazev: "Podzimní běh" };

describe("sestavPotvrzeniRegistrace — platba převodem", () => {
  it("lists account, amount, message and the payment terms (no IBAN), and mentions the QR code when present", () => {
    const r = sestavPotvrzeniRegistrace({
      ...zaklad,
      platba: { castkaKc: 400, ucet: "19-2000145399/0800", podminky: "Splatnost do 14 dnů.\nStartovné se nevrací.", sQr: true },
    });
    expect(r.text).toContain("Číslo účtu: 19-2000145399/0800");
    expect(r.text).not.toContain("IBAN");
    expect(r.html).not.toContain("IBAN");
    expect(r.text).toContain("Zpráva pro příjemce: Startovne Jan Novak");
    expect(r.text).toContain("Splatnost do 14 dnů.");
    expect(r.html).toContain("cid:qr-platba");
    expect(r.html).toContain("Splatnost do 14 dnů.<br>Startovné se nevrací.");
  });

  it("still gives the transfer details without a QR code, and keeps a badly formatted account as typed", () => {
    const bezQr = sestavPotvrzeniRegistrace({ ...zaklad, platba: { castkaKc: 300, ucet: "2000145399/0800", sQr: false } });
    expect(bezQr.html).not.toContain("cid:qr-platba");
    expect(bezQr.text).toContain("Číslo účtu: 2000145399/0800");

    const spatny = sestavPotvrzeniRegistrace({ ...zaklad, platba: { castkaKc: 300, ucet: "špatně", sQr: false } });
    expect(spatny.text).toContain("Číslo účtu: špatně");
  });

  it("has no payment section when the route has no account and amount", () => {
    const r = sestavPotvrzeniRegistrace(zaklad);
    expect(r.text).not.toContain("Startovné");
    expect(r.html).not.toContain("Platba převodem");
  });

  it("uses the event's own sign-off instead of the default one when it is set", () => {
    const vychozi = sestavPotvrzeniRegistrace(zaklad);
    expect(vychozi.text).toContain("Pořadatelé akce Podzimní běh");

    const vlastni = sestavPotvrzeniRegistrace({ ...zaklad, podpis: "Sportu zdar,\nTým Jarního půlmaratonu" });
    expect(vlastni.text).toContain("Tým Jarního půlmaratonu");
    expect(vlastni.text).not.toContain("Pořadatelé akce");
    expect(vlastni.html).toContain("Sportu zdar,<br>Tým Jarního půlmaratonu");
  });
});
