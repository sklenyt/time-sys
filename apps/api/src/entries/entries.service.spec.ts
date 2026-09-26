import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
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
    registrace: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
    kategorie: { findMany: jest.Mock };
    trasa: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let categories: { navrhniKategorii: jest.Mock };
  let email: { posliPotvrzeniRegistrace: jest.Mock };

  beforeEach(async () => {
    prisma = {
      prihlaska: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      registrace: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
      kategorie: { findMany: jest.fn().mockResolvedValue([]) },
      trasa: { findUnique: jest.fn().mockResolvedValue({ typStartu: "VLNOVY" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    categories = { navrhniKategorii: jest.fn() };
    email = { posliPotvrzeniRegistrace: jest.fn() };

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
        expect.objectContaining({ komu: "petr@example.com", jmeno: "Petr", prijmeni: "Novák" })
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
});
