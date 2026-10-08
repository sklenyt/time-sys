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

  const SPRAVCE: AuthenticatedUser = { id: "admin", email: "a@x.cz", jmeno: "A", organizaceId: "org-1", poradiMenu: [] };

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
