import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Role } from "@depo/shared";
import { EventRolesService } from "./event-roles.service";
import { PrismaService } from "../prisma/prisma.service";

describe("EventRolesService", () => {
  let service: EventRolesService;
  let prisma: {
    udalost: { findUnique: jest.Mock };
    uzivatel: { findUnique: jest.Mock };
    uzivatelRole: { findFirst: jest.Mock; count: jest.Mock; upsert: jest.Mock; delete: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      udalost: { findUnique: jest.fn().mockResolvedValue({ id: "u1", organizaceId: "org-1" }) },
      uzivatel: { findUnique: jest.fn() },
      uzivatelRole: { findFirst: jest.fn(), count: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [EventRolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EventRolesService);
  });

  describe("invite (pozvání kolegy podle e-mailu)", () => {
    it("throws NotFoundException when no user has that e-mail yet", async () => {
      prisma.uzivatelRole.findFirst.mockResolvedValue({ id: "role-admin" });
      prisma.uzivatel.findUnique.mockResolvedValue(null);

      await expect(
        service.invite("u1", { email: "chybi@example.com", role: Role.ORGANIZATOR }, "requester-1")
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException when the requester isn't an ADMIN of the event's organization", async () => {
      prisma.uzivatelRole.findFirst.mockResolvedValue(null);

      await expect(
        service.invite("u1", { email: "kolega@example.com", role: Role.ORGANIZATOR }, "requester-1")
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("upserts the role for the invited user's id once found", async () => {
      prisma.uzivatelRole.findFirst.mockResolvedValue({ id: "role-admin" });
      prisma.uzivatel.findUnique.mockResolvedValue({ id: "kolega-1", email: "kolega@example.com" });
      prisma.uzivatelRole.upsert.mockResolvedValue({ id: "role-2" });

      await service.invite("u1", { email: "kolega@example.com", role: Role.ORGANIZATOR }, "requester-1");

      expect(prisma.uzivatelRole.upsert).toHaveBeenCalledWith({
        where: { uzivatelId_udalostId_role: { uzivatelId: "kolega-1", udalostId: "u1", role: Role.ORGANIZATOR } },
        create: { uzivatelId: "kolega-1", udalostId: "u1", role: Role.ORGANIZATOR },
        update: {},
      });
    });
  });

  describe("remove", () => {
    it("throws NotFoundException when the role doesn't exist on this event", async () => {
      prisma.uzivatelRole.findFirst
        .mockResolvedValueOnce({ id: "role-admin" }) // admin check
        .mockResolvedValueOnce(null); // role lookup

      await expect(service.remove("u1", "role-x", "requester-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("deletes the role when the requester is ADMIN and the role exists", async () => {
      prisma.uzivatelRole.findFirst
        .mockResolvedValueOnce({ id: "role-admin" })
        .mockResolvedValueOnce({ id: "role-x" });

      await service.remove("u1", "role-x", "requester-1");

      expect(prisma.uzivatelRole.delete).toHaveBeenCalledWith({ where: { id: "role-x" } });
    });
  });
});
