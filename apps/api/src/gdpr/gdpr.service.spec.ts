import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { GdprService } from "./gdpr.service";
import { PrismaService } from "../prisma/prisma.service";

describe("GdprService", () => {
  let service: GdprService;
  let prisma: {
    prihlaska: { findFirst: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
    zaznamUdalosti: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      prihlaska: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
      zaznamUdalosti: { updateMany: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [GdprService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(GdprService);
  });

  describe("anonymizovatPrihlasku", () => {
    it("throws NotFoundException when the entry doesn't exist on this route", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue(null);
      await expect(service.anonymizovatPrihlasku("trasa-1", "chybi", "user-1")).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("runs the detach+delete+audit-log as a single atomic transaction", async () => {
      prisma.prihlaska.findFirst.mockResolvedValue({ id: "p1", startovniCislo: 5 });
      await service.anonymizovatPrihlasku("trasa-1", "p1", "user-1");
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(3);
    });
  });

  describe("retenceDni (přes anonymizovatStareUdalosti)", () => {
    const ORIGINAL_ENV = process.env.GDPR_RETENCE_DNI;
    afterEach(() => {
      process.env.GDPR_RETENCE_DNI = ORIGINAL_ENV;
    });

    it("uses the default of 730 days when GDPR_RETENCE_DNI is unset", async () => {
      delete process.env.GDPR_RETENCE_DNI;
      await service.anonymizovatStareUdalosti();
      const [{ where }] = prisma.prihlaska.findMany.mock.calls[0];
      const hranice: Date = where.trasa.udalost.datum.lt;
      const ocekavano = Date.now() - 730 * 24 * 60 * 60 * 1000;
      expect(Math.abs(hranice.getTime() - ocekavano)).toBeLessThan(5_000);
    });

    it("falls back to the default when GDPR_RETENCE_DNI is not a valid positive number", async () => {
      process.env.GDPR_RETENCE_DNI = "not-a-number";
      await service.anonymizovatStareUdalosti();
      const [{ where }] = prisma.prihlaska.findMany.mock.calls[0];
      const hranice: Date = where.trasa.udalost.datum.lt;
      const ocekavano = Date.now() - 730 * 24 * 60 * 60 * 1000;
      expect(Math.abs(hranice.getTime() - ocekavano)).toBeLessThan(5_000);
    });

    it("honors a custom GDPR_RETENCE_DNI", async () => {
      process.env.GDPR_RETENCE_DNI = "30";
      await service.anonymizovatStareUdalosti();
      const [{ where }] = prisma.prihlaska.findMany.mock.calls[0];
      const hranice: Date = where.trasa.udalost.datum.lt;
      const ocekavano = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(Math.abs(hranice.getTime() - ocekavano)).toBeLessThan(5_000);
    });
  });
});
