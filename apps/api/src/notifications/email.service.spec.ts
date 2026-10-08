import { odesilatelAKopie } from "./email.service";

describe("odesilatelAKopie", () => {
  const puvodni = { ...process.env };

  afterEach(() => {
    process.env = { ...puvodni };
  });

  it("uses the type-specific sender when configured and the copy given by the event", () => {
    process.env.SMTP_FROM = "registrace@depotime.cz";
    process.env.SMTP_FROM_DOJEZD = "vysledky@depotime.cz";
    expect(odesilatelAKopie("DOJEZD")).toEqual({ from: "Depo <vysledky@depotime.cz>", cc: undefined });
    expect(odesilatelAKopie("REGISTRACE", "info@brezanskykostitras.cz")).toEqual({
      from: "Depo <registrace@depotime.cz>",
      cc: "info@brezanskykostitras.cz",
    });
  });

  it("falls back to SMTP_FROM, then to the built-in default, and treats a blank copy as none", () => {
    delete process.env.SMTP_FROM_PLATBA;
    process.env.SMTP_FROM = "obecny@example.cz";
    expect(odesilatelAKopie("PLATBA", "  ")).toEqual({ from: "Depo <obecny@example.cz>", cc: undefined });
    delete process.env.SMTP_FROM;
    expect(odesilatelAKopie("PLATBA", null).from).toBe("Depo <vysledky@depo.app>");
  });
});

describe("odesilatelAKopie — jméno odesílatele", () => {
  it("ponechá vlastní jméno z env a jinak doplní „Depo“", () => {
    process.env.SMTP_FROM = "Jiné Jméno <info@example.cz>";
    expect(odesilatelAKopie("SYSTEM").from).toBe("Jiné Jméno <info@example.cz>");
    delete process.env.SMTP_FROM;
  });
});
