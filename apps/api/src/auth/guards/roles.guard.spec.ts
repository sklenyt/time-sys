import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@depo/shared";
import { RolesGuard } from "./roles.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

function buildContext(user: AuthenticatedUser | undefined, params: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: {
    udalost: { findUnique: jest.Mock };
    trasa: { findUnique: jest.Mock };
    publikacniCil: { findUnique: jest.Mock };
    uzivatelRole: { findFirst: jest.Mock };
  };

  const USER: AuthenticatedUser = { id: "user-1", email: "u@example.com", jmeno: "Uživatel", organizaceId: "org-1" };
  const EVENT_ID = "event-1";
  const EVENT = { id: EVENT_ID, organizaceId: "org-1" };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = {
      udalost: { findUnique: jest.fn().mockResolvedValue(EVENT) },
      trasa: { findUnique: jest.fn() },
      publikacniCil: { findUnique: jest.fn() },
      uzivatelRole: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    guard = new RolesGuard(reflector as unknown as Reflector, prisma as unknown as PrismaService);
  });

  it("allows the request through when no @Roles() decorator is present", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const allowed = await guard.canActivate(buildContext(USER, { eventId: EVENT_ID }));
    expect(allowed).toBe(true);
    expect(prisma.udalost.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request when roles are required", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    await expect(guard.canActivate(buildContext(undefined, { eventId: EVENT_ID }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("rejects when the target event cannot be resolved from any param", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    await expect(guard.canActivate(buildContext(USER, {}))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("resolves the event via routeId → trasa.udalostId", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.trasa.findUnique.mockResolvedValue({ udalostId: EVENT_ID });
    prisma.uzivatelRole.findFirst.mockResolvedValue({ role: Role.ORGANIZATOR });

    const allowed = await guard.canActivate(buildContext(USER, { routeId: "route-1" }));
    expect(allowed).toBe(true);
    expect(prisma.trasa.findUnique).toHaveBeenCalledWith({ where: { id: "route-1" } });
  });

  it("resolves the event via cilId → publikacniCil.udalostId", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.publikacniCil.findUnique.mockResolvedValue({ udalostId: EVENT_ID });
    prisma.uzivatelRole.findFirst.mockResolvedValue({ role: Role.ORGANIZATOR });

    const allowed = await guard.canActivate(buildContext(USER, { cilId: "cil-1" }));
    expect(allowed).toBe(true);
  });

  it("rejects when routeId doesn't resolve to a real route", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.trasa.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(buildContext(USER, { routeId: "missing" }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("rejects when the resolved event no longer exists", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.udalost.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(buildContext(USER, { eventId: EVENT_ID }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("allows a user with a direct matching role on the event", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR, Role.CASOMERIC]);
    prisma.uzivatelRole.findFirst.mockResolvedValue({ role: Role.CASOMERIC });
    const allowed = await guard.canActivate(buildContext(USER, { eventId: EVENT_ID }));
    expect(allowed).toBe(true);
  });

  it("falls back to org-wide ADMIN when the endpoint does not itself require ADMIN", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.uzivatelRole.findFirst
      .mockResolvedValueOnce(null) // žádná přímá role ORGANIZATOR na této události
      .mockResolvedValueOnce({ role: Role.ADMIN }); // ale je ADMIN jinde v téže organizaci

    const allowed = await guard.canActivate(buildContext(USER, { eventId: EVENT_ID }));
    expect(allowed).toBe(true);
  });

  it("does NOT fall back to org-wide ADMIN when the endpoint itself requires ADMIN", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    prisma.uzivatelRole.findFirst.mockResolvedValue(null);

    // Vrací false (ne vyhozenou výjimku) — Nest z toho udělá obecný 403.
    const allowed = await guard.canActivate(buildContext(USER, { eventId: EVENT_ID }));
    expect(allowed).toBe(false);
    // Nesmí ani zkusit dohledat org-wide admina — endpoint vyžaduje ADMIN přímo na této události.
    expect(prisma.uzivatelRole.findFirst).toHaveBeenCalledTimes(1);
  });

  it("rejects a user with no matching role and no org-wide admin fallback", async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZATOR]);
    prisma.uzivatelRole.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(buildContext(USER, { eventId: EVENT_ID }))).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
