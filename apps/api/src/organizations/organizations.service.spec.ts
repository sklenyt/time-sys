import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { AuthenticatedUser } from "../auth/decorators/current-user.decorator";

describe("OrganizationsService", () => {
  let service: OrganizationsService;
  let prisma: any;
  let cache: { invalidate: jest.Mock };
  const SUPER: AuthenticatedUser = { id: "sa", email: "s@x.cz", jmeno: "S", organizaceId: "o1", poradiMenu: [], superAdmin: true, organizace: [] };
  const BEZNY: AuthenticatedUser = { ...SUPER, id: "u1", superAdmin: false };

  beforeEach(() => {
    prisma = {
      organizace: { create: jest.fn().mockResolvedValue({ id: "o2", nazev: "Klub" }), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      uzivatel: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      clenstviOrganizace: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), delete: jest.fn() },
    };
    cache = { invalidate: jest.fn() };
    service = new OrganizationsService(prisma, cache as never);
  });

  it("zakladatel se stane členem a první organizace mu je aktivní", async () => {
    prisma.uzivatel.findUnique.mockResolvedValue({ id: "u1", organizaceId: null });
    await service.create({ nazev: " Klub " }, "u1");
    expect(prisma.organizace.create).toHaveBeenCalledWith({ data: { nazev: "Klub" } });
    expect(prisma.clenstviOrganizace.create).toHaveBeenCalledWith({ data: { uzivatelId: "u1", organizaceId: "o2" } });
    expect(prisma.uzivatel.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { organizaceId: "o2" } });
  });

  it("další organizace nemění aktivní", async () => {
    prisma.uzivatel.findUnique.mockResolvedValue({ id: "u1", organizaceId: "o1" });
    await service.create({ nazev: "Klub" }, "u1");
    expect(prisma.uzivatel.update).not.toHaveBeenCalled();
  });

  it("findAllForUser dává aktivní organizaci na první místo", async () => {
    const user = { ...BEZNY, organizaceId: "o2", organizace: [{ id: "o1", nazev: "A" }, { id: "o2", nazev: "B" }] };
    const r = await service.findAllForUser(user);
    expect(r.map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("správu organizací smí jen super admin", async () => {
    await expect(service.prehled(BEZNY)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.pridatClena(BEZNY, "o1", "a@x.cz")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.odebratClena(BEZNY, "o1", "u2")).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe("pridatClena", () => {
    it("přidá existující účet a nastaví mu aktivní organizaci, jen když žádnou nemá", async () => {
      prisma.organizace.findUnique.mockResolvedValue({ id: "o1" });
      prisma.uzivatel.findFirst.mockResolvedValue({ id: "u2", organizaceId: null });
      prisma.clenstviOrganizace.findUnique.mockResolvedValue(null);
      await service.pridatClena(SUPER, "o1", " novy@x.cz ");
      expect(prisma.clenstviOrganizace.create).toHaveBeenCalledWith({ data: { uzivatelId: "u2", organizaceId: "o1" } });
      expect(prisma.uzivatel.update).toHaveBeenCalledWith({ where: { id: "u2" }, data: { organizaceId: "o1" } });
    });

    it("nepřepíše aktivní organizaci uživatele, který už nějakou má", async () => {
      prisma.organizace.findUnique.mockResolvedValue({ id: "o1" });
      prisma.uzivatel.findFirst.mockResolvedValue({ id: "u2", organizaceId: "o9" });
      prisma.clenstviOrganizace.findUnique.mockResolvedValue(null);
      await service.pridatClena(SUPER, "o1", "x@x.cz");
      expect(prisma.uzivatel.update).not.toHaveBeenCalled();
    });

    it("neznámý e-mail a duplicitní členství skončí chybou", async () => {
      prisma.organizace.findUnique.mockResolvedValue({ id: "o1" });
      prisma.uzivatel.findFirst.mockResolvedValue(null);
      await expect(service.pridatClena(SUPER, "o1", "nikdo@x.cz")).rejects.toBeInstanceOf(NotFoundException);
      prisma.uzivatel.findFirst.mockResolvedValue({ id: "u2", organizaceId: "o1" });
      prisma.clenstviOrganizace.findUnique.mockResolvedValue({ id: "c" });
      await expect(service.pridatClena(SUPER, "o1", "x@x.cz")).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("odebratClena", () => {
    it("když byla organizace aktivní, přepne uživatele na jinou", async () => {
      prisma.clenstviOrganizace.findUnique.mockResolvedValue({ id: "c1" });
      prisma.uzivatel.findUnique.mockResolvedValue({ id: "u2", organizaceId: "o1" });
      prisma.clenstviOrganizace.findFirst.mockResolvedValue({ organizaceId: "o2" });
      await service.odebratClena(SUPER, "o1", "u2");
      expect(prisma.uzivatel.update).toHaveBeenCalledWith({ where: { id: "u2" }, data: { organizaceId: "o2" } });
      expect(cache.invalidate).toHaveBeenCalledWith("u2");
    });

    it("když žádná jiná není, aktivní organizace zůstane prázdná", async () => {
      prisma.clenstviOrganizace.findUnique.mockResolvedValue({ id: "c1" });
      prisma.uzivatel.findUnique.mockResolvedValue({ id: "u2", organizaceId: "o1" });
      prisma.clenstviOrganizace.findFirst.mockResolvedValue(null);
      await service.odebratClena(SUPER, "o1", "u2");
      expect(prisma.uzivatel.update).toHaveBeenCalledWith({ where: { id: "u2" }, data: { organizaceId: null } });
    });
  });
});
