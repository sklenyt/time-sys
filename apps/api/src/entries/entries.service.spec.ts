import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Pohlavi, StavUkonceni } from "@depo/shared";
import { EntriesService } from "./entries.service";
import { PrismaService } from "../prisma/prisma.service";
import { StartVlnyService } from "../start-vlny/start-vlny.service";
import { CategoriesService } from "../categories/categories.service";
import { EmailService } from "../notifications/email.service";

describe("EntriesService", () => {
  let service: EntriesService;
  let prisma: {
    prihlaska: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    registrace: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock; update: jest.Mock };
    kategorie: { findMany: jest.Mock; findUnique: jest.Mock };
    trasa: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
    zaznamUdalosti: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let categories: { navrhniKategorii: jest.Mock };
  let email: { posliPotvrzeniRegistrace: jest.Mock; posliPotvrzeniPlatby: jest.Mock };

  beforeEach(async () => {
    prisma = {
      prihlaska: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      registrace: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn(), update: jest.fn() },
      kategorie: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ kod: "MUZ", nazev: "Muži" }) },
      trasa: { findUnique: jest.fn().mockResolvedValue({ typStartu: "VLNOVY" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      zaznamUdalosti: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    categories = { navrhniKategorii: jest.fn() };
    email = { posliPotvrzeniRegistrace: jest.fn(), posliPotvrzeniPlatby: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EntriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StartVlnyService, useValue: {} },
        { provide: CategoriesService, useValue: categories },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(EntriesService);
  });

  describe("update (F11 — DNS/DNF/DQ, UC12)", () => {
    it("throws NotFoundException when the entry doesn't exist on this route", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue(null);
      await expect(service.update("trasa-1", "chybi", { stavUkonceni: StavUkonceni.DNF }, "user-1")).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("sets stavUkonceni and writes an audit log entry with the old and new value", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", stavUkonceni: null, clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1", stavUkonceni: StavUkonceni.DNF }, {}]);

      const vysledek = await service.update("trasa-1", "p1", { stavUkonceni: StavUkonceni.DNF }, "user-1");

      expect(vysledek.stavUkonceni).toBe(StavUkonceni.DNF);
      const zapisy = prisma.$transaction.mock.calls[0][0];
      expect(zapisy).toHaveLength(2);
      expect(prisma.prihlaska.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { stavUkonceni: StavUkonceni.DNF },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          uzivatelId: "user-1",
          entita: "prihlaska",
          entitaId: "p1",
          puvodniHodnota: { trasaId: "trasa-1", stavUkonceni: null },
          novaHodnota: { stavUkonceni: StavUkonceni.DNF },
        },
      });
    });

    it("clears stavUkonceni back to normal when set to null", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", stavUkonceni: StavUkonceni.DQ, clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1", stavUkonceni: null }, {}]);

      await service.update("trasa-1", "p1", { stavUkonceni: null }, "user-1");

      expect(prisma.prihlaska.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { stavUkonceni: null } });
    });

    it("always includes trasaId in the audit log's puvodniHodnota, so AuditLogService can find it (entita=prihlaska has no trasa_id column)", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", stavUkonceni: null, clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1" }, {}]);

      await service.update("trasa-42", "p1", { stavUkonceni: StavUkonceni.DQ }, "user-1");

      const [{ data }] = prisma.auditLog.create.mock.calls[0];
      expect(data.puvodniHodnota).toMatchObject({ trasaId: "trasa-42" });
    });

    it("does not e-mail anything when Zaplaceno is ticked (the e-mail is sent only by the explicit button)", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", zaplaceno: false, email: "a@b.cz", clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1", zaplaceno: true }, {}]);
      await service.update("trasa-1", "p1", { zaplaceno: true }, "user-1");
      expect(email.posliPotvrzeniPlatby).not.toHaveBeenCalled();
    });

    it("is a no-op (no transaction) when nothing actually changes", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", stavUkonceni: StavUkonceni.DNF, clenoveDruzstva: null });

      const vysledek = await service.update("trasa-1", "p1", { stavUkonceni: StavUkonceni.DNF }, "user-1");

      expect(vysledek.id).toBe("p1");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("updates the team roster (clenoveDruzstva) independently of stavUkonceni", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", stavUkonceni: null, clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1" }, {}]);

      await service.update(
        "trasa-1",
        "p1",
        { clenoveDruzstva: [{ prijmeni: "Novák", jmeno: "Petr" }] },
        "user-1"
      );

      const [{ data }] = prisma.prihlaska.update.mock.calls[0];
      expect(data.clenoveDruzstva).toEqual([{ prijmeni: "Novák", jmeno: "Petr", rocnik: null, klub: null }]);
    });
  });

  describe("importCsv — automatická kategorizace (F03) a štafety", () => {
    beforeEach(() => {
      prisma.kategorie.findMany.mockResolvedValue([{ id: "kat-muz", kod: "MUZ" }]);
      prisma.prihlaska.create.mockImplementation((args) => Promise.resolve({ id: "nova", ...args.data }));
    });

    it("uses the explicit kategorie column when present", async () => {
      const csv = "cislo,prijmeni,jmeno,kategorie\n1,Novák,Petr,MUZ\n";
      const vysledek = await service.importCsv("trasa-1", Buffer.from(csv));
      expect(vysledek.importovano).toBe(1);
      expect(categories.navrhniKategorii).not.toHaveBeenCalled();
    });

    it("falls back to an automatic category suggestion when the kategorie column is missing but rocnik+pohlavi are present", async () => {
      categories.navrhniKategorii.mockResolvedValue({ id: "kat-muz" });
      const csv = "cislo,prijmeni,jmeno,rocnik,pohlavi\n1,Novák,Petr,1990,M\n";

      const vysledek = await service.importCsv("trasa-1", Buffer.from(csv));

      expect(categories.navrhniKategorii).toHaveBeenCalledWith("trasa-1", 1990, Pohlavi.M);
      expect(vysledek.importovano).toBe(1);
      expect(vysledek.chyby).toHaveLength(0);
    });

    it("reports a clear error when the category is missing and can't be auto-suggested", async () => {
      const csv = "cislo,prijmeni,jmeno\n1,Novák,Petr\n";
      const vysledek = await service.importCsv("trasa-1", Buffer.from(csv));
      expect(vysledek.importovano).toBe(0);
      expect(vysledek.chyby[0].zprava).toMatch(/nešlo ji dopočítat/);
    });

    it("čte i středníkem oddělený CSV s UTF-8 BOM (výchozí export z českého Excelu)", async () => {
      const csv = "﻿cislo;prijmeni;jmeno;kategorie\n1;Novák;Petr;MUZ\n";
      const vysledek = await service.importCsv("trasa-1", Buffer.from(csv));
      expect(vysledek.importovano).toBe(1);
      expect(vysledek.chyby).toHaveLength(0);
    });

    it("parses up to 4 clenN_* columns into a team roster", async () => {
      const csv =
        "cislo,prijmeni,jmeno,kategorie,clen1_prijmeni,clen1_jmeno,clen1_rocnik,clen2_prijmeni,clen2_jmeno\n" +
        "1,Novák,Petr,MUZ,Svoboda,Jan,1985,Dvořák,Karel\n";

      await service.importCsv("trasa-1", Buffer.from(csv));

      const [{ data }] = prisma.prihlaska.create.mock.calls[0];
      expect(data.clenoveDruzstva).toEqual([
        { prijmeni: "Svoboda", jmeno: "Jan", rocnik: 1985, klub: null },
        { prijmeni: "Dvořák", jmeno: "Karel", rocnik: null, klub: null },
      ]);
    });
  });

  describe("registerPublic (F23 — od 2026-09-26 bez automatického čísla)", () => {
    it("creates a pending Registrace instead of a Prihlaska and doesn't return a startovniCislo", async () => {
      prisma.trasa.findUnique.mockResolvedValue({
        id: "trasa-1",
        dokoncena: false,
        registraceUzavrena: false,
        platbaUcet: null,
        platbaCastka: null,
        udalost: { nazev: "Podzimní běh" },
      });
      prisma.registrace.create.mockResolvedValue({ id: "reg-1", prijmeni: "Novák", jmeno: "Petr" });

      const vysledek = await service.registerPublic("trasa-1", {
        prijmeni: "Novák",
        jmeno: "Petr",
        kategorieId: "kat-1",
      } as never);

      expect(vysledek).toEqual({ prijmeni: "Novák", jmeno: "Petr" });
      expect(prisma.prihlaska.create).not.toHaveBeenCalled();
      expect(prisma.registrace.create).toHaveBeenCalled();
    });

    it("sends a confirmation e-mail when the registrant gave an address", async () => {
      prisma.trasa.findUnique.mockResolvedValue({
        id: "trasa-1",
        dokoncena: false,
        registraceUzavrena: false,
        platbaUcet: null,
        platbaCastka: null,
        potvrzovaciEmailText: null,
        nazev: "Trasa A",
        udalost: { nazev: "Podzimní běh" },
      });
      prisma.registrace.create.mockResolvedValue({ id: "reg-1", prijmeni: "Novák", jmeno: "Petr" });

      await service.registerPublic("trasa-1", {
        prijmeni: "Novák",
        jmeno: "Petr",
        kategorieId: "kat-1",
        email: "petr@example.com",
      } as never);

      expect(email.posliPotvrzeniRegistrace).toHaveBeenCalledWith(
        expect.objectContaining({
          komu: "petr@example.com",
          jmeno: "Petr",
          prijmeni: "Novák",
          udaje: expect.objectContaining({ kategorie: "MUZ — Muži", zdravotniPoznamkaUvedena: false }),
        })
      );
    });
  });

  describe("prideliCislo / zamitniRegistraci (organizátor rozhoduje o čekajících registracích)", () => {
    it("throws NotFoundException when the pending registration isn't on this route", async () => {
      prisma.registrace.findFirst.mockResolvedValue(null);
      await expect(service.prideliCislo("trasa-1", "reg-1", { startovniCislo: 5 })).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("creates a Prihlaska from the pending registration and deletes it on success", async () => {
      prisma.registrace.findFirst.mockResolvedValue({
        id: "reg-1",
        prijmeni: "Novák",
        jmeno: "Petr",
        rocnik: null,
        pohlavi: null,
        klub: null,
        kategorieId: "kat-1",
        email: null,
        telefon: null,
        oznamovaciEmail: null,
        nouzovyKontakt: null,
        zdravotniPoznamka: null,
        clenoveDruzstva: null,
      });
      prisma.prihlaska.create.mockResolvedValue({ id: "p1", startovniCislo: 5 });

      const vysledek = await service.prideliCislo("trasa-1", "reg-1", { startovniCislo: 5 });

      expect(vysledek.startovniCislo).toBe(5);
      expect(prisma.registrace.delete).toHaveBeenCalledWith({ where: { id: "reg-1" } });
    });

    it("zamitniRegistraci deletes the pending registration without creating a Prihlaska", async () => {
      prisma.registrace.findFirst.mockResolvedValue({ id: "reg-1" });

      await service.zamitniRegistraci("trasa-1", "reg-1");

      expect(prisma.registrace.delete).toHaveBeenCalledWith({ where: { id: "reg-1" } });
      expect(prisma.prihlaska.create).not.toHaveBeenCalled();
    });
  });

  describe("posliPotvrzeniPlatby (ruční odeslání potvrzení platby)", () => {
    const prihlaska = { id: "p1", zaplaceno: true, email: "petr@example.com", jmeno: "Petr", prijmeni: "Novák", startovniCislo: 42 };

    beforeEach(() => {
      prisma.trasa.findUnique.mockResolvedValue({ nazev: "Trasa A", platbaCastka: 300, udalost: { nazev: "Podzimní běh" } });
      prisma.prihlaska.update.mockResolvedValue({ ...prihlaska, potvrzeniPlatbyOdeslanoAt: new Date() });
    });

    it("sends the e-mail with the start number and stores the time of sending", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue(prihlaska);
      email.posliPotvrzeniPlatby.mockResolvedValue(true);

      await service.posliPotvrzeniPlatby("trasa-1", "p1");

      expect(email.posliPotvrzeniPlatby).toHaveBeenCalledWith(
        expect.objectContaining({ komu: "petr@example.com", startovniCislo: 42, platbaCastkaKc: 300 })
      );
      expect(prisma.prihlaska.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { potvrzeniPlatbyOdeslanoAt: expect.any(Date) },
      });
    });

    it("rejects an entry without e-mail or not marked as paid", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ ...prihlaska, email: null });
      await expect(service.posliPotvrzeniPlatby("trasa-1", "p1")).rejects.toBeInstanceOf(BadRequestException);
      prisma.prihlaska.findFirst.mockResolvedValue({ ...prihlaska, zaplaceno: false });
      await expect(service.posliPotvrzeniPlatby("trasa-1", "p1")).rejects.toBeInstanceOf(BadRequestException);
      expect(email.posliPotvrzeniPlatby).not.toHaveBeenCalled();
    });

    it("does not store a sending time when the e-mail could not be sent", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue(prihlaska);
      email.posliPotvrzeniPlatby.mockResolvedValue(false);

      await expect(service.posliPotvrzeniPlatby("trasa-1", "p1")).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(prisma.prihlaska.update).not.toHaveBeenCalled();
    });
  });

  describe("oprava e-mailu a opětovné odeslání potvrzení registrace", () => {
    const TRASA = { id: "trasa-1", nazev: "Trasa A", platbaUcet: null, platbaCastka: null, potvrzovaciEmailText: null, udalost: { nazev: "Podzimní běh", emailKopie: "info@x.cz" } };
    const PRIHLASKA = { id: "p1", trasaId: "trasa-1", email: "spatne@x.cz", jmeno: "Petr", prijmeni: "Novák", rocnik: 1990, pohlavi: "M", kategorieId: "kat-1", klub: null, telefon: null, nouzovyKontakt: null, zdravotniPoznamka: null, clenoveDruzstva: null };

    it("changes the e-mail of an entry through update() and writes it to the audit log", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", email: "spatne@x.cz", zaplaceno: false, clenoveDruzstva: null });
      prisma.$transaction.mockResolvedValue([{ id: "p1", email: "spravne@x.cz" }, {}]);

      await service.update("trasa-1", "p1", { email: " spravne@x.cz " }, "user-1");

      expect(prisma.prihlaska.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { email: "spravne@x.cz" } });
      const [{ data }] = prisma.auditLog.create.mock.calls[0];
      expect(data.novaHodnota).toMatchObject({ email: "spravne@x.cz" });
    });

    it("resends the registration confirmation to the corrected e-mail with the event copy", async () => {
      prisma.trasa.findUnique.mockResolvedValue(TRASA);
      prisma.prihlaska.findFirst.mockResolvedValue({ ...PRIHLASKA, email: "spravne@x.cz" });
      email.posliPotvrzeniRegistrace.mockResolvedValue(true);

      const vysledek = await service.posliPotvrzeniRegistraceZnovu("trasa-1", "p1", "prihlaska");

      expect(vysledek).toEqual({ odeslano: true });
      expect(email.posliPotvrzeniRegistrace).toHaveBeenCalledWith(
        expect.objectContaining({ komu: "spravne@x.cz", kopie: "info@x.cz", udaje: expect.objectContaining({ kategorie: "MUZ — Muži" }) })
      );
    });

    it("reports a failure when the e-mail could not be sent, and rejects an entry without e-mail", async () => {
      prisma.trasa.findUnique.mockResolvedValue(TRASA);
      prisma.prihlaska.findFirst.mockResolvedValue(PRIHLASKA);
      email.posliPotvrzeniRegistrace.mockResolvedValue(false);
      await expect(service.posliPotvrzeniRegistraceZnovu("trasa-1", "p1", "prihlaska")).rejects.toBeInstanceOf(ServiceUnavailableException);

      prisma.prihlaska.findFirst.mockResolvedValue({ ...PRIHLASKA, email: null });
      await expect(service.posliPotvrzeniRegistraceZnovu("trasa-1", "p1", "prihlaska")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("updates the e-mail of a pending registration", async () => {
      prisma.registrace.findFirst.mockResolvedValue({ id: "r1" });
      prisma.registrace.update.mockResolvedValue({ id: "r1", email: "spravne@x.cz" });
      await expect(service.upravitRegistraci("trasa-1", "r1", { email: " spravne@x.cz " })).resolves.toEqual({ id: "r1", email: "spravne@x.cz" });
      expect(prisma.registrace.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { email: "spravne@x.cz" } });
    });
  });

  describe("úprava startovního čísla, tratě a kategorie závodníka", () => {
    const PRIHLASKA = { id: "p1", trasaId: "trasa-1", startovniCislo: 5, kategorieId: "kat-1", email: "a@x.cz", zaplaceno: false, clenoveDruzstva: null };

    beforeEach(() => {
      prisma.prihlaska.findFirst.mockResolvedValue(PRIHLASKA);
      prisma.$transaction.mockResolvedValue([{ id: "p1" }, {}]);
    });

    it("changes the start number and logs both values", async () => {
      await service.update("trasa-1", "p1", { startovniCislo: 77 }, "user-1");
      expect(prisma.prihlaska.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { startovniCislo: 77 } });
      const [{ data }] = prisma.auditLog.create.mock.calls[0];
      expect(data.puvodniHodnota).toMatchObject({ startovniCislo: 5 });
      expect(data.novaHodnota).toMatchObject({ startovniCislo: 77 });
    });

    it("reports a taken start number as a conflict", async () => {
      prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }));
      await expect(service.update("trasa-1", "p1", { startovniCislo: 77 }, "user-1")).rejects.toBeInstanceOf(ConflictException);
    });

    it("moves a runner without measurements to another route of the same event with a category of that route", async () => {
      prisma.trasa.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
        where.id === "trasa-1" ? { id: "trasa-1", udalostId: "ev-1" } : { id: "trasa-2", udalostId: "ev-1", typStartu: "VLNOVY" }
      );
      prisma.kategorie.findUnique.mockResolvedValue({ id: "kat-2", trasaId: "trasa-2" });

      await service.update("trasa-1", "p1", { trasaId: "trasa-2", kategorieId: "kat-2" }, "user-1");

      expect(prisma.prihlaska.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: expect.objectContaining({ trasaId: "trasa-2", kategorieId: "kat-2" }),
      });
    });

    it("refuses a move to another event, without a category, or when the runner already has measurements", async () => {
      await expect(service.update("trasa-1", "p1", { trasaId: "trasa-2" }, "user-1")).rejects.toBeInstanceOf(BadRequestException);

      prisma.kategorie.findUnique.mockResolvedValue({ id: "kat-2", trasaId: "trasa-2" });
      prisma.trasa.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
        where.id === "trasa-1" ? { id: "trasa-1", udalostId: "ev-1" } : { id: "trasa-2", udalostId: "ev-JINA", typStartu: "VLNOVY" }
      );
      await expect(service.update("trasa-1", "p1", { trasaId: "trasa-2", kategorieId: "kat-2" }, "user-1")).rejects.toBeInstanceOf(BadRequestException);

      prisma.trasa.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id, udalostId: "ev-1", typStartu: "VLNOVY" }));
      prisma.zaznamUdalosti.count.mockResolvedValue(3);
      await expect(service.update("trasa-1", "p1", { trasaId: "trasa-2", kategorieId: "kat-2" }, "user-1")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.prihlaska.update).not.toHaveBeenCalled();
    });
  });
});
