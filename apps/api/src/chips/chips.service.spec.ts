import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { StavCipu, StavSkladuCipu, TypCipu } from "@depo/shared";
import { ChipsService } from "./chips.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ChipsService", () => {
  let service: ChipsService;
  let prisma: {
    cip: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; findUniqueOrThrow: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      cip: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ChipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ChipsService);
  });

  describe("findAllForRoute", () => {
    it("scopes the query to the route and flattens runner info onto each row", async () => {
      prisma.cip.findMany.mockResolvedValue([
        {
          id: "cip-1",
          prihlaskaId: "p-1",
          kodCipu: "A100",
          stav: StavCipu.PRIREZEN,
          zalozni: false,
          vratnaZaloha: { toString: () => "200" },
          vydanoAt: null,
          vracenoAt: null,
          prihlaska: { startovniCislo: 5, prijmeni: "Novák", jmeno: "Petr" },
        },
      ]);

      const vysledek = await service.findAllForRoute("trasa-1");

      expect(prisma.cip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { prihlaska: { trasaId: "trasa-1" } } })
      );
      expect(vysledek).toEqual([
        expect.objectContaining({
          id: "cip-1",
          kodCipu: "A100",
          startovniCislo: 5,
          prijmeni: "Novák",
          jmeno: "Petr",
          vratnaZaloha: 200,
        }),
      ]);
    });
  });

  describe("update", () => {
    it("throws when the chip does not belong to this route", async () => {
      prisma.cip.findFirst.mockResolvedValue(null);
      await expect(service.update("trasa-1", "cip-1", { stav: StavCipu.VRACEN })).rejects.toThrow(
        NotFoundException
      );
    });

    it("sets vracenoAt when transitioning into VRACEN", async () => {
      prisma.cip.findFirst.mockResolvedValue({ id: "cip-1", stav: StavCipu.PRIREZEN });
      prisma.cip.update.mockResolvedValue({});
      prisma.cip.findUniqueOrThrow.mockResolvedValue({
        id: "cip-1",
        prihlaskaId: "p-1",
        kodCipu: "A100",
        stav: StavCipu.VRACEN,
        zalozni: false,
        vratnaZaloha: null,
        vydanoAt: null,
        vracenoAt: new Date(),
        prihlaska: { startovniCislo: 5, prijmeni: "Novák", jmeno: "Petr" },
      });

      await service.update("trasa-1", "cip-1", { stav: StavCipu.VRACEN });

      expect(prisma.cip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cip-1" },
          data: expect.objectContaining({ stav: StavCipu.VRACEN, vracenoAt: expect.any(Date) }),
        })
      );
    });

    it("clears vracenoAt when moving away from VRACEN", async () => {
      prisma.cip.findFirst.mockResolvedValue({ id: "cip-1", stav: StavCipu.VRACEN });
      prisma.cip.update.mockResolvedValue({});
      prisma.cip.findUniqueOrThrow.mockResolvedValue({
        id: "cip-1",
        prihlaskaId: "p-1",
        kodCipu: "A100",
        stav: StavCipu.PRIREZEN,
        zalozni: false,
        vratnaZaloha: null,
        vydanoAt: null,
        vracenoAt: null,
        prihlaska: { startovniCislo: 5, prijmeni: "Novák", jmeno: "Petr" },
      });

      await service.update("trasa-1", "cip-1", { stav: StavCipu.PRIREZEN });

      expect(prisma.cip.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stav: StavCipu.PRIREZEN, vracenoAt: null }) })
      );
    });
  });
});

describe("ChipsService — sklad čipů organizace", () => {
  let service: ChipsService;
  let prisma: any;
  const trasa = { udalost: { organizaceId: "org-1" } };

  beforeEach(async () => {
    prisma = {
      trasa: { findUnique: jest.fn().mockResolvedValue(trasa) },
      prihlaska: { findFirst: jest.fn().mockResolvedValue({ id: "p-1" }) },
      organizace: { findUnique: jest.fn(), findMany: jest.fn() },
      cip: { findFirst: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
      cipSklad: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    const moduleRef = await Test.createTestingModule({
      providers: [ChipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ChipsService);
  });

  describe("priraditCip", () => {
    it("neznámý kód založí ve skladu organizace a vydá ho přihlášce", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue(null);
      prisma.cipSklad.create.mockResolvedValue({ id: "s-1", kodCipu: "A1" });
      prisma.cip.findUnique.mockResolvedValue(null);
      prisma.cip.upsert.mockResolvedValue({ id: "c-1" });

      await service.priraditCip("t-1", "p-1", " A1 ", TypCipu.JEDNORAZOVY);

      expect(prisma.cipSklad.create).toHaveBeenCalledWith({
        data: { organizaceId: "org-1", kodCipu: "A1", typ: TypCipu.JEDNORAZOVY, stav: StavSkladuCipu.VYDAN },
      });
      expect(prisma.cip.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ skladId: "s-1", kodCipu: "A1" }) })
      );
    });

    it("čip skladem označí jako vydaný", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", kodCipu: "A1", stav: StavSkladuCipu.SKLADEM });
      prisma.cip.findFirst.mockResolvedValue(null);
      prisma.cip.findUnique.mockResolvedValue(null);
      prisma.cip.upsert.mockResolvedValue({ id: "c-1" });

      await service.priraditCip("t-1", "p-1", "A1");

      expect(prisma.cipSklad.update).toHaveBeenCalledWith({ where: { id: "s-1" }, data: { stav: StavSkladuCipu.VYDAN } });
    });

    it("odmítne ztracený nebo vyřazený čip", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", kodCipu: "A1", stav: StavSkladuCipu.ZTRACEN });
      await expect(service.priraditCip("t-1", "p-1", "A1")).rejects.toThrow(ConflictException);
      expect(prisma.cip.upsert).not.toHaveBeenCalled();
    });

    it("odmítne čip, který je právě vydaný jiné přihlášce", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", kodCipu: "A1", stav: StavSkladuCipu.VYDAN });
      prisma.cip.findFirst.mockResolvedValue({ id: "c-9" });
      await expect(service.priraditCip("t-1", "p-1", "A1")).rejects.toThrow(/jiné aktivní přihlášce/);
    });

    it("při výměně čipu vrátí předchozí čip do skladu", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-2", kodCipu: "B2", stav: StavSkladuCipu.SKLADEM });
      prisma.cip.findFirst.mockResolvedValue(null);
      prisma.cip.findUnique.mockResolvedValue({ id: "c-1", skladId: "s-1" });
      prisma.cip.upsert.mockResolvedValue({ id: "c-1" });

      await service.priraditCip("t-1", "p-1", "B2");

      expect(prisma.cipSklad.update).toHaveBeenCalledWith({ where: { id: "s-1" }, data: { stav: StavSkladuCipu.SKLADEM } });
    });
  });

  describe("uvolnitCip", () => {
    it("smaže výdej a čip vrátí do skladu", async () => {
      prisma.cip.findUnique.mockResolvedValue({ id: "c-1", skladId: "s-1" });
      await service.uvolnitCip("t-1", "p-1");
      expect(prisma.cip.delete).toHaveBeenCalledWith({ where: { id: "c-1" } });
      expect(prisma.cipSklad.update).toHaveBeenCalledWith({ where: { id: "s-1" }, data: { stav: StavSkladuCipu.SKLADEM } });
    });
  });

  describe("update", () => {
    it("vrácení čipu ho vrátí do skladu, ztráta ho označí jako ztracený", async () => {
      prisma.cip.findFirst.mockResolvedValue({ id: "c-1", stav: StavCipu.PRIREZEN, skladId: "s-1" });
      prisma.cip.update = jest.fn().mockResolvedValue({});
      prisma.cip.findUniqueOrThrow = jest.fn().mockResolvedValue({
        id: "c-1", prihlaskaId: "p-1", kodCipu: "A1", stav: StavCipu.VRACEN, zalozni: false, vratnaZaloha: null,
        vydanoAt: null, vracenoAt: null, sklad: { typ: "OPAKOVANY" }, prihlaska: { startovniCislo: 1, prijmeni: "A", jmeno: "B" },
      });
      await service.update("t-1", "c-1", { stav: StavCipu.VRACEN });
      expect(prisma.cipSklad.update).toHaveBeenCalledWith({ where: { id: "s-1" }, data: { stav: StavSkladuCipu.SKLADEM } });
      await service.update("t-1", "c-1", { stav: StavCipu.ZTRACEN });
      expect(prisma.cipSklad.update).toHaveBeenLastCalledWith({ where: { id: "s-1" }, data: { stav: StavSkladuCipu.ZTRACEN } });
    });
  });

  describe("pridatDoSkladu", () => {
    it("ořízne mezery, zahodí duplicity i čipy, které už ve skladu jsou", async () => {
      prisma.cipSklad.findMany.mockResolvedValue([{ kodCipu: "A2" }]);
      const r = await service.pridatDoSkladu("t-1", { kody: [" A1", "a1", "A2", "", "A3"] });
      expect(prisma.cipSklad.createMany).toHaveBeenCalledWith({
        data: [
          { organizaceId: "org-1", kodCipu: "A1", typ: TypCipu.OPAKOVANY },
          { organizaceId: "org-1", kodCipu: "A3", typ: TypCipu.OPAKOVANY },
        ],
        skipDuplicates: true,
      });
      expect(r).toEqual({ pridano: 2, preskoceno: 1 });
    });
  });

  describe("upravitSklad", () => {
    it("nedovolí měnit stav čipu, který je právě vydaný", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", stav: StavSkladuCipu.VYDAN });
      await expect(service.upravitSklad("t-1", "s-1", { stav: StavSkladuCipu.VYRAZEN })).rejects.toThrow(ConflictException);
    });

    it("stav „vydán“ nejde nastavit ručně", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", stav: StavSkladuCipu.SKLADEM });
      await expect(service.upravitSklad("t-1", "s-1", { stav: StavSkladuCipu.VYDAN })).rejects.toThrow(BadRequestException);
    });
  });

  describe("smazatZeSkladu", () => {
    it("čip s historií smazat nejde", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue({ id: "s-1", _count: { vydani: 2 } });
      await expect(service.smazatZeSkladu("t-1", "s-1")).rejects.toThrow(ConflictException);
      expect(prisma.cipSklad.delete).not.toHaveBeenCalled();
    });
  });

  describe("najit", () => {
    it("neznámý kód vrátí NEZNAMY", async () => {
      prisma.cipSklad.findFirst.mockResolvedValue(null);
      expect((await service.najit("t-1", "X")).vysledek).toBe("NEZNAMY");
    });

    it("čip skladem vrátí SKLADEM, čip vydaný na jiné trati VYDAN_JINDE", async () => {
      const radek = { id: "s-1", organizaceId: "org-1", kodCipu: "A1", stitek: null, poznamka: null, typ: "OPAKOVANY", stav: StavSkladuCipu.SKLADEM, vydani: [] };
      prisma.cipSklad.findFirst.mockResolvedValue(radek);
      prisma.cipSklad.findMany.mockResolvedValue([radek]);
      prisma.cip.findFirst.mockResolvedValue(null);
      expect((await service.najit("t-1", "a1")).vysledek).toBe("SKLADEM");

      prisma.cip.findFirst.mockResolvedValue({ id: "c-1", prihlaska: { trasaId: "jina" } });
      expect((await service.najit("t-1", "a1")).vysledek).toBe("VYDAN_JINDE");
    });

    it("ztracený čip je NEDOSTUPNY", async () => {
      const radek = { id: "s-1", organizaceId: "org-1", kodCipu: "A1", typ: "OPAKOVANY", stav: StavSkladuCipu.ZTRACEN, vydani: [] };
      prisma.cipSklad.findFirst.mockResolvedValue(radek);
      prisma.cipSklad.findMany.mockResolvedValue([radek]);
      expect((await service.najit("t-1", "A1")).vysledek).toBe("NEDOSTUPNY");
    });
  });

  describe("přesun mezi sklady", () => {
    it("jen super admin smí přesouvat", async () => {
      await expect(service.presunout("t-1", false, ["s-1"], "org-2")).rejects.toThrow(ForbiddenException);
      expect(await service.cileProPresun("t-1", false)).toEqual([]);
    });

    it("přesune jen čipy skladem, které cíl ještě nemá", async () => {
      prisma.organizace.findUnique.mockResolvedValue({ id: "org-2" });
      prisma.cipSklad.findMany
        .mockResolvedValueOnce([
          { id: "s-1", kodCipu: "A1", stav: StavSkladuCipu.SKLADEM },
          { id: "s-2", kodCipu: "A2", stav: StavSkladuCipu.VYDAN },
          { id: "s-3", kodCipu: "A3", stav: StavSkladuCipu.SKLADEM },
        ])
        .mockResolvedValueOnce([{ kodCipu: "A3" }]);

      const r = await service.presunout("t-1", true, ["s-1", "s-2", "s-3"], "org-2");

      expect(prisma.cipSklad.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["s-1"] } }, data: { organizaceId: "org-2" } });
      expect(r).toMatchObject({ presunuto: 1, preskoceno: 2 });
    });
  });
});
