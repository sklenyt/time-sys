import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../notifications/email.service";
import { UserCacheService } from "./user-cache.service";

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
        { provide: EmailService, useValue: {} },
        UserCacheService,
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

describe("AuthService.forgotPassword / resetPassword", () => {
  let service: AuthService;
  let prisma: {
    uzivatel: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let email: { posliOdkazNaResetHesla: jest.Mock };

  beforeEach(async () => {
    prisma = {
      uzivatel: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    email = { posliOdkazNaResetHesla: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService, useValue: email },
        UserCacheService,
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("forgotPassword: pro existující e-mail uloží hash tokenu a pošle odkaz", async () => {
    prisma.uzivatel.findUnique.mockResolvedValue({ id: "user-1", email: "a@b.cz", jmeno: "Adam" });
    prisma.uzivatel.update.mockResolvedValue({});

    await service.forgotPassword("a@b.cz");

    expect(prisma.uzivatel.update).toHaveBeenCalledTimes(1);
    const data = prisma.uzivatel.update.mock.calls[0][0].data;
    expect(data.resetTokenHash).toHaveLength(64);
    expect(data.resetTokenExpiruje).toBeInstanceOf(Date);
    expect(email.posliOdkazNaResetHesla).toHaveBeenCalledWith(
      expect.objectContaining({ komu: "a@b.cz", jmeno: "Adam" })
    );
  });

  it("forgotPassword: pro neexistující e-mail tiše skončí (žádný update, žádný e-mail)", async () => {
    prisma.uzivatel.findUnique.mockResolvedValue(null);

    await service.forgotPassword("neni@b.cz");

    expect(prisma.uzivatel.update).not.toHaveBeenCalled();
    expect(email.posliOdkazNaResetHesla).not.toHaveBeenCalled();
  });

  it("resetPassword: s platným tokenem nastaví nové heslo a token zneplatní", async () => {
    const token = "abc123";
    const hash = createHash("sha256").update(token).digest("hex");
    prisma.uzivatel.findFirst.mockResolvedValue({
      id: "user-1",
      resetTokenHash: hash,
      resetTokenExpiruje: new Date(Date.now() + 60_000),
    });
    prisma.uzivatel.update.mockResolvedValue({});

    await service.resetPassword(token, "noveHeslo123");

    expect(prisma.uzivatel.findFirst).toHaveBeenCalledWith({ where: { resetTokenHash: hash } });
    const data = prisma.uzivatel.update.mock.calls[0][0].data;
    expect(data.hesloHash).toBeDefined();
    expect(data.resetTokenHash).toBeNull();
    expect(data.resetTokenExpiruje).toBeNull();
  });

  it("resetPassword: s expirovaným tokenem vyhodí UnauthorizedException", async () => {
    const token = "expired-token";
    const hash = createHash("sha256").update(token).digest("hex");
    prisma.uzivatel.findFirst.mockResolvedValue({
      id: "user-1",
      resetTokenHash: hash,
      resetTokenExpiruje: new Date(Date.now() - 60_000),
    });

    await expect(service.resetPassword(token, "noveHeslo123")).rejects.toThrow(UnauthorizedException);
    expect(prisma.uzivatel.update).not.toHaveBeenCalled();
  });

  it("resetPassword: s neznámým tokenem vyhodí UnauthorizedException", async () => {
    prisma.uzivatel.findFirst.mockResolvedValue(null);

    await expect(service.resetPassword("neznamy-token", "noveHeslo123")).rejects.toThrow(
      UnauthorizedException
    );
  });
});
