import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StartVlnyService } from "./start-vlny.service";
import { PrismaService } from "../prisma/prisma.service";

describe("StartVlnyService — plánovaný automatický start", () => {
  let service: StartVlnyService;
  let prisma: {
    startVlna: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const VLNA = { id: "vlna-1", trasaId: "trasa-1", nazev: "Hromadný start", casStartu: null, planovanyStart: null };

  beforeEach(async () => {
    prisma = {
      startVlna: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [StartVlnyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(StartVlnyService);
  });

  describe("naplanovatStart", () => {
    it("rejects a planned time in the past", async () => {
      prisma.startVlna.findFirst.mockResolvedValue(VLNA);
      const vPast = new Date(Date.now() - 1000);

      await expect(service.naplanovatStart("trasa-1", "vlna-1", vPast)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.startVlna.update).not.toHaveBeenCalled();
    });

    it("rejects planning a wave that already started", async () => {
      prisma.startVlna.findFirst.mockResolvedValue({ ...VLNA, casStartu: new Date() });
      const vBudoucnu = new Date(Date.now() + 60_000);

      await expect(service.naplanovatStart("trasa-1", "vlna-1", vBudoucnu)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("stores the planned time on the wave", async () => {
      prisma.startVlna.findFirst.mockResolvedValue(VLNA);
      prisma.startVlna.update.mockResolvedValue({ ...VLNA, planovanyStart: "future" });
      const vBudoucnu = new Date(Date.now() + 60_000);

      await service.naplanovatStart("trasa-1", "vlna-1", vBudoucnu);

      expect(prisma.startVlna.update).toHaveBeenCalledWith({
        where: { id: "vlna-1" },
        data: { planovanyStart: vBudoucnu },
      });
    });

    it("throws when the wave doesn't belong to the given trasa", async () => {
      prisma.startVlna.findFirst.mockResolvedValue(null);
      await expect(service.naplanovatStart("trasa-1", "cizi-vlna", new Date(Date.now() + 60_000))).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("start / cancel clear a pending plan", () => {
    it("start() clears planovanyStart so autostart can't re-fire a manually started wave", async () => {
      prisma.startVlna.findFirst.mockResolvedValue({ ...VLNA, planovanyStart: new Date() });
      prisma.startVlna.update.mockResolvedValue(VLNA);

      await service.start("trasa-1", "vlna-1");

      expect(prisma.startVlna.update).toHaveBeenCalledWith({
        where: { id: "vlna-1" },
        data: { casStartu: expect.any(Date), planovanyStart: null },
      });
    });

    it("cancel() clears planovanyStart too, not just casStartu", async () => {
      prisma.startVlna.findFirst.mockResolvedValue(VLNA);
      prisma.startVlna.update.mockResolvedValue(VLNA);

      await service.cancel("trasa-1", "vlna-1");

      expect(prisma.startVlna.update).toHaveBeenCalledWith({
        where: { id: "vlna-1" },
        data: { casStartu: null, planovanyStart: null },
      });
    });
  });

  describe("zrusitPlan", () => {
    it("clears only planovanyStart, leaving casStartu untouched", async () => {
      prisma.startVlna.findFirst.mockResolvedValue(VLNA);
      prisma.startVlna.update.mockResolvedValue(VLNA);

      await service.zrusitPlan("trasa-1", "vlna-1");

      expect(prisma.startVlna.update).toHaveBeenCalledWith({
        where: { id: "vlna-1" },
        data: { planovanyStart: null },
      });
    });
  });
});
