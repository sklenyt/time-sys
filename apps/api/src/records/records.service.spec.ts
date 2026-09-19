import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { StavCipu, StavZaznamu, TypUdalosti } from "@depo/shared";
import { RecordsService } from "./records.service";
import { PrismaService } from "../prisma/prisma.service";
import { PublishTargetsService } from "../publish-targets/publish-targets.service";
import { ResultsEventsService } from "../results/results-events.service";
import { EmailService } from "../notifications/email.service";

const TRASA_ID = "trasa-1";
const START_CAS = new Date("2024-01-01T10:00:00.000Z");

function iso(minutyOdStartu: number): string {
  return new Date(START_CAS.getTime() + minutyOdStartu * 60_000).toISOString();
}

describe("RecordsService", () => {
  let service: RecordsService;
  let prisma: {
    zaznamUdalosti: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    zarizeni: { upsert: jest.Mock };
    prihlaska: { findFirst: jest.Mock };
    trasa: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
    cip: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      zaznamUdalosti: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      zarizeni: { upsert: jest.fn().mockResolvedValue({}) },
      prihlaska: { findFirst: jest.fn().mockResolvedValue(null) },
      trasa: { findUnique: jest.fn().mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa" }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      cip: { findFirst: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublishTargetsService, useValue: { exportPoZaznamuProTrasu: jest.fn().mockResolvedValue(undefined) } },
        { provide: ResultsEventsService, useValue: { oznamZmenu: jest.fn() } },
        { provide: EmailService, useValue: { posliOznameniODobehu: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = moduleRef.get(RecordsService);
  });

  // create() persistuje přes prisma.zaznamUdalosti.create — id/cas apod. se
  // vrací tak, jak by je vrátila skutečná DB (echo zpátky vstupních dat).
  function mockCreateEcho() {
    prisma.zaznamUdalosti.create.mockImplementation(async ({ data }) => ({
      id: `zaznam-${prisma.zaznamUdalosti.create.mock.calls.length}`,
      ...data,
      // Skutečná Postgres vrátí NULL pro nevyplněný nepovinný sloupec, ne undefined.
      prihlaskaId: data.prihlaskaId ?? null,
      fotoSouborNazev: null,
    }));
  }

  describe("create — idempotence", () => {
    it("returns the existing record without creating a duplicate when klientEventId repeats", async () => {
      const existing = {
        id: "existing",
        trasaId: TRASA_ID,
        startovniCisloRaw: 1,
        prihlaskaId: null,
        typUdalosti: TypUdalosti.DOJEZD,
        cas: new Date(iso(10)),
        stav: StavZaznamu.OK,
        fotoSouborNazev: null,
      };
      prisma.zaznamUdalosti.findUnique.mockResolvedValue(existing);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 1,
        zarizeniId: "zarizeni-1",
        klientCas: iso(10),
        klientEventId: "evt-1",
      });

      expect(result.id).toBe("existing");
      expect(prisma.zaznamUdalosti.create).not.toHaveBeenCalled();
    });
  });

  describe("create — kolize stanovišť", () => {
    beforeEach(() => {
      mockCreateEcho();
      prisma.prihlaska.findFirst.mockResolvedValue({
        id: "prihlaska-1",
        startovniCislo: 1,
        prijmeni: "Novák",
        jmeno: "Petr",
        oznamovaciEmail: null,
        startVlna: { casStartu: START_CAS },
      });
    });

    it("flags a second DOJEZD from a DIFFERENT device within the 15-minute window as NEEDS_REVIEW", async () => {
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        { id: "prvni", zarizeniId: "zarizeni-A", cas: new Date(iso(40)), typUdalosti: TypUdalosti.DOJEZD },
      ]);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 1,
        zarizeniId: "zarizeni-B",
        klientCas: iso(40.2), // 12 s po prvním záznamu
        klientEventId: "evt-2",
      });

      expect(result.stav).toBe(StavZaznamu.NEEDS_REVIEW);
    });

    it("keeps OK for a second DOJEZD from the SAME device (multi-lap race)", async () => {
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        { id: "prvni", zarizeniId: "zarizeni-A", cas: new Date(iso(40)), typUdalosti: TypUdalosti.DOJEZD },
      ]);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 1,
        zarizeniId: "zarizeni-A",
        klientCas: iso(40.2),
        klientEventId: "evt-2",
      });

      expect(result.stav).toBe(StavZaznamu.OK);
    });

    it("keeps OK when the other device's record is outside the 15-minute window", async () => {
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        { id: "prvni", zarizeniId: "zarizeni-A", cas: new Date(iso(40)), typUdalosti: TypUdalosti.DOJEZD },
      ]);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 1,
        zarizeniId: "zarizeni-B",
        klientCas: iso(56), // 16 min po prvním záznamu
        klientEventId: "evt-2",
      });

      expect(result.stav).toBe(StavZaznamu.OK);
    });

    it("never flags MEZICAS as a collision, even from a different device in-window", async () => {
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        { id: "prvni", zarizeniId: "zarizeni-A", cas: new Date(iso(20)), typUdalosti: TypUdalosti.DOJEZD },
      ]);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 1,
        zarizeniId: "zarizeni-B",
        klientCas: iso(20.1),
        klientEventId: "evt-2",
        typUdalosti: TypUdalosti.MEZICAS,
      });

      expect(result.stav).toBe(StavZaznamu.OK);
    });
  });

  describe("create — unrecognized bib number", () => {
    it("still creates a record with a null prihlaskaId and no computed time", async () => {
      mockCreateEcho();
      prisma.prihlaska.findFirst.mockResolvedValue(null);

      const result = await service.create(TRASA_ID, {
        startovniCislo: 999,
        zarizeniId: "zarizeni-1",
        klientCas: iso(10),
        klientEventId: "evt-1",
      });

      expect(result.prihlaskaId).toBeNull();
      expect(result.casCelkem).toBeNull();
      expect(result.stav).toBe(StavZaznamu.OK);
    });
  });

  describe("createFromChip", () => {
    beforeEach(() => mockCreateEcho());

    it("resolves the chip to a bib number and creates the same record as manual entry", async () => {
      prisma.cip.findFirst.mockResolvedValue({
        kodCipu: "CHIP-1",
        stav: StavCipu.PRIREZEN,
        prihlaska: { id: "prihlaska-1", startovniCislo: 7 },
      });
      prisma.prihlaska.findFirst.mockResolvedValue({
        id: "prihlaska-1",
        startovniCislo: 7,
        oznamovaciEmail: null,
        startVlna: { casStartu: START_CAS },
      });

      const result = await service.createFromChip(TRASA_ID, {
        kodCipu: "CHIP-1",
        zarizeniId: "zarizeni-1",
        klientCas: iso(30),
        klientEventId: "evt-rfid-1",
      });

      expect(result.startovniCisloRaw).toBe(7);
      expect(prisma.zaznamUdalosti.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ startovniCisloRaw: 7 }) })
      );
    });

    it("throws NotFoundException for an unknown or unpaired chip", async () => {
      prisma.cip.findFirst.mockResolvedValue(null);

      await expect(
        service.createFromChip(TRASA_ID, {
          kodCipu: "UNKNOWN",
          zarizeniId: "zarizeni-1",
          klientCas: iso(30),
          klientEventId: "evt-rfid-2",
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.zaznamUdalosti.create).not.toHaveBeenCalled();
    });
  });

  describe("correct", () => {
    it("creates a new OPRAVA record referencing the original and writes an audit log entry", async () => {
      const original = {
        id: "original",
        trasaId: TRASA_ID,
        startovniCisloRaw: 5,
        prihlaskaId: "old-prihlaska",
        cas: new Date(iso(40)),
        zarizeniId: "zarizeni-1",
        vytvorenoKlientAt: new Date(iso(40)),
        stav: StavZaznamu.OK,
        fotoSouborNazev: null,
      };
      prisma.zaznamUdalosti.findFirst.mockResolvedValue(original);
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "new-prihlaska", startovniCislo: 6 });
      mockCreateEcho();

      const result = await service.correct(TRASA_ID, "original", { noveStartovniCislo: 6, typOpravy: "OMYL" as never }, "user-1");

      expect(prisma.zaznamUdalosti.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            typUdalosti: TypUdalosti.OPRAVA,
            nahrazujeZaznamId: "original",
            prihlaskaId: "new-prihlaska",
            cas: original.cas, // čas se při opravě NIKDY nemění
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(result.typUdalosti).toBe(TypUdalosti.OPRAVA);
    });

    it("throws NotFoundException when the original record does not exist on this route", async () => {
      prisma.zaznamUdalosti.findFirst.mockResolvedValue(null);
      await expect(
        service.correct(TRASA_ID, "missing", { noveStartovniCislo: 6, typOpravy: "OMYL" as never }, "user-1")
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
