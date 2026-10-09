import { ConflictException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { UserCacheService } from "../auth/user-cache.service";

describe("UsersService.upravit", () => {
  let service: UsersService;
  let prisma: {
    uzivatel: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    uzivatelRole: { findFirst: jest.Mock };
  };
  let cache: { invalidate: jest.Mock };

  const SPRAVCE: AuthenticatedUser = { id: "admin", email: "a@x.cz", jmeno: "A", organizaceId: "org-1", poradiMenu: [], organizace: [] };

  beforeEach(() => {
    prisma = {
      uzivatel: {
        findUnique: jest.fn().mockResolvedValue({ id: "u1", email: "spatne@x.cz" }),
        findFirst: jest.fn().mockResolvedValue({ id: "u1" }),
        update: jest.fn().mockResolvedValue({ id: "u1", email: "spravne@x.cz", jmeno: "J" }),
      },
      uzivatelRole: { findFirst: jest.fn().mockResolvedValue({ id: "r" }) },
    };
    cache = { invalidate: jest.fn() };
    service = new UsersService(prisma as unknown as PrismaService, cache as unknown as UserCacheService);
  });

  it("lets an organization admin fix the e-mail of a member and clears the user cache", async () => {
    prisma.uzivatel.findFirst.mockResolvedValueOnce({ id: "u1" }).mockResolvedValueOnce(null);
    await service.upravit(SPRAVCE, "u1", { email: " spravne@x.cz " });
    expect(prisma.uzivatel.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" }, data: expect.objectContaining({ email: "spravne@x.cz" }) }));
    expect(cache.invalidate).toHaveBeenCalledWith("u1");
  });

  it("refuses someone who is not an admin of the organization", async () => {
    prisma.uzivatelRole.findFirst.mockResolvedValue(null);
    await expect(service.upravit(SPRAVCE, "u1", { email: "x@x.cz" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.uzivatel.update).not.toHaveBeenCalled();
  });

  it("refuses a user outside the organization", async () => {
    prisma.uzivatel.findFirst.mockResolvedValueOnce(null);
    await expect(service.upravit(SPRAVCE, "u1", { email: "x@x.cz" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an e-mail that is already used by another account", async () => {
    prisma.uzivatel.findFirst.mockResolvedValueOnce({ id: "u1" }).mockResolvedValueOnce({ id: "jiny" });
    await expect(service.upravit(SPRAVCE, "u1", { email: "obsazeny@x.cz" })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.uzivatel.update).not.toHaveBeenCalled();
  });

  it("lets a super admin edit anyone without any role check", async () => {
    await service.upravit({ ...SPRAVCE, organizaceId: null, superAdmin: true }, "u1", { jmeno: "Nové jméno" });
    expect(prisma.uzivatelRole.findFirst).not.toHaveBeenCalled();
    expect(prisma.uzivatel.update).toHaveBeenCalled();
  });
});

describe("UsersService — smazání účtu", () => {
  let service: UsersService;
  let prisma: any;
  let cache: { invalidate: jest.Mock };
  const bcrypt = require("bcrypt");
  const USER: AuthenticatedUser = { id: "u1", email: "u@x.cz", jmeno: "U", organizaceId: "org-1", poradiMenu: [], organizace: [] };
  const SUPER: AuthenticatedUser = { ...USER, id: "sa", superAdmin: true };

  beforeEach(async () => {
    const hash = await bcrypt.hash("tajne-heslo", 4);
    prisma = {
      uzivatel: { findUnique: jest.fn().mockResolvedValue({ id: "u1", hesloHash: hash }), delete: jest.fn() },
      uzivatelRole: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(1) },
    };
    cache = { invalidate: jest.fn() };
    service = new UsersService(prisma as unknown as PrismaService, cache as unknown as UserCacheService);
  });

  it("smaže vlastní účet se správným heslem a vyčistí cache", async () => {
    await service.smazatVlastniUcet(USER, "tajne-heslo");
    expect(prisma.uzivatel.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(cache.invalidate).toHaveBeenCalledWith("u1");
  });

  it("odmítne špatné heslo a nic nesmaže", async () => {
    await expect(service.smazatVlastniUcet(USER, "spatne")).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.uzivatel.delete).not.toHaveBeenCalled();
  });

  it("nedovolí smazat účet jedinému správci neukončené akce", async () => {
    prisma.uzivatelRole.findMany.mockResolvedValue([{ udalostId: "e1", udalost: { nazev: "Jarní běh" } }]);
    prisma.uzivatelRole.count.mockResolvedValue(0);
    await expect(service.smazatVlastniUcet(USER, "tajne-heslo")).rejects.toThrow(/jediným správcem.*Jarní běh/);
    expect(prisma.uzivatel.delete).not.toHaveBeenCalled();
  });

  it("účet smazat jde, když akci spravuje ještě někdo další", async () => {
    prisma.uzivatelRole.findMany.mockResolvedValue([{ udalostId: "e1", udalost: { nazev: "Jarní běh" } }]);
    prisma.uzivatelRole.count.mockResolvedValue(1);
    await service.smazatVlastniUcet(USER, "tajne-heslo");
    expect(prisma.uzivatel.delete).toHaveBeenCalled();
  });

  it("cizí účet smí smazat jen super admin", async () => {
    await expect(service.smazat(USER, "u2")).rejects.toBeInstanceOf(ForbiddenException);
    prisma.uzivatel.findUnique.mockResolvedValue({ id: "u2" });
    await service.smazat(SUPER, "u2");
    expect(prisma.uzivatel.delete).toHaveBeenCalledWith({ where: { id: "u2" } });
    expect(cache.invalidate).toHaveBeenCalledWith("u2");
  });

  it("super admin nesmaže sám sebe přes seznam uživatelů", async () => {
    await expect(service.smazat(SUPER, "sa")).rejects.toThrow(/Můj účet/);
  });
});
