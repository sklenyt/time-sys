import { Test } from "@nestjs/testing";
import { Pohlavi } from "@depo/shared";
import { CategoriesService } from "./categories.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CategoriesService.navrhniKategorii (F03)", () => {
  let service: CategoriesService;
  let prisma: { kategorie: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { kategorie: { findFirst: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CategoriesService);
  });

  it("queries by trasa, pohlaví and a rocnik range that includes open-ended bounds", async () => {
    prisma.kategorie.findFirst.mockResolvedValue({ id: "kat-1" });

    const vysledek = await service.navrhniKategorii("trasa-1", 1990, Pohlavi.M);

    expect(vysledek).toEqual({ id: "kat-1" });
    expect(prisma.kategorie.findFirst).toHaveBeenCalledWith({
      where: {
        trasaId: "trasa-1",
        pohlavi: Pohlavi.M,
        AND: [
          { OR: [{ rocnikOd: null }, { rocnikOd: { lte: 1990 } }] },
          { OR: [{ rocnikDo: null }, { rocnikDo: { gte: 1990 } }] },
        ],
      },
    });
  });

  it("returns null when no category matches", async () => {
    prisma.kategorie.findFirst.mockResolvedValue(null);
    await expect(service.navrhniKategorii("trasa-1", 2015, Pohlavi.Z)).resolves.toBeNull();
  });
});
