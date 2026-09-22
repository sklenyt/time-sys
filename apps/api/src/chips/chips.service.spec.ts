import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { StavCipu } from "@depo/shared";
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
