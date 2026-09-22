import { Test } from "@nestjs/testing";
import { StartAutostartService } from "./start-autostart.service";
import { PrismaService } from "../prisma/prisma.service";

describe("StartAutostartService.spustitNaplanovane", () => {
  let service: StartAutostartService;
  let prisma: { startVlna: { findMany: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = { startVlna: { findMany: jest.fn(), update: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [StartAutostartService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(StartAutostartService);
  });

  it("does nothing when no wave is due", async () => {
    prisma.startVlna.findMany.mockResolvedValue([]);
    await service.spustitNaplanovane();
    expect(prisma.startVlna.update).not.toHaveBeenCalled();
  });

  it("only queries waves whose plan is due and not yet started", async () => {
    prisma.startVlna.findMany.mockResolvedValue([]);
    await service.spustitNaplanovane();
    expect(prisma.startVlna.findMany).toHaveBeenCalledWith({
      where: { planovanyStart: { lte: expect.any(Date) }, casStartu: null },
    });
  });

  it("sets casStartu to the planned time itself, not to 'now' — polling delay must not shift elapsed times", async () => {
    const planovanyStart = new Date("2026-04-18T09:00:00Z");
    prisma.startVlna.findMany.mockResolvedValue([{ id: "vlna-1", nazev: "Hromadný start", planovanyStart }]);
    prisma.startVlna.update.mockResolvedValue({});

    await service.spustitNaplanovane();

    expect(prisma.startVlna.update).toHaveBeenCalledWith({
      where: { id: "vlna-1" },
      data: { casStartu: planovanyStart, planovanyStart: null },
    });
  });

  it("fires every due wave in the same tick", async () => {
    prisma.startVlna.findMany.mockResolvedValue([
      { id: "a", nazev: "A", planovanyStart: new Date() },
      { id: "b", nazev: "B", planovanyStart: new Date() },
    ]);
    prisma.startVlna.update.mockResolvedValue({});

    await service.spustitNaplanovane();

    expect(prisma.startVlna.update).toHaveBeenCalledTimes(2);
  });
});
