import { ContactService } from "./contact.service";

const dto = { jmeno: "Jana", email: "jana@example.cz", zprava: "Chci Depo na náš závod." };

function sluzba(ok = true) {
  const posliKontakt = jest.fn().mockResolvedValue(ok);
  return { s: new ContactService({ posliKontakt } as never), posliKontakt };
}

describe("ContactService", () => {
  it("pošle zprávu", async () => {
    const { s, posliKontakt } = sluzba();
    await s.odeslat(dto, "1.1.1.1");
    expect(posliKontakt).toHaveBeenCalledWith(dto);
  });

  it("vyplněné skryté pole nic neposílá", async () => {
    const { s, posliKontakt } = sluzba();
    await s.odeslat({ ...dto, web: "http://spam" }, "1.1.1.1");
    expect(posliKontakt).not.toHaveBeenCalled();
  });

  it("po třech zprávách z jedné adresy za hodinu odmítne, po hodině znovu povolí", async () => {
    const { s } = sluzba();
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) await s.odeslat(dto, "2.2.2.2", t + i);
    await expect(s.odeslat(dto, "2.2.2.2", t + 10)).rejects.toThrow(/příliš mnoho/);
    await expect(s.odeslat(dto, "3.3.3.3", t + 10)).resolves.toBeUndefined();
    await expect(s.odeslat(dto, "2.2.2.2", t + 61 * 60 * 1000)).resolves.toBeUndefined();
  });

  it("když se e-mail neodešle, vrátí chybu", async () => {
    const { s } = sluzba(false);
    await expect(s.odeslat(dto, "4.4.4.4")).rejects.toThrow(/nepodařilo/);
  });
});
