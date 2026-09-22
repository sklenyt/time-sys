import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService.updateMenuOrder", () => {
  let service: AuthService;
  let prisma: { uzivatel: { update: jest.Mock } };

  beforeEach(async () => {
    prisma = { uzivatel: { update: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("persists the given order on the user's row and echoes it back", async () => {
    prisma.uzivatel.update.mockResolvedValue({ poradiMenu: ["sprava", "prehled"] });

    const vysledek = await service.updateMenuOrder("user-1", ["sprava", "prehled"]);

    expect(prisma.uzivatel.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { poradiMenu: ["sprava", "prehled"] },
    });
    expect(vysledek).toEqual({ poradiMenu: ["sprava", "prehled"] });
  });
});
