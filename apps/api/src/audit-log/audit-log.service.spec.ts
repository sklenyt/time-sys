import { Test } from "@nestjs/testing";
import { AuditLogService } from "./audit-log.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuditLogService.listForRoute", () => {
  let service: AuditLogService;
  let prisma: {
    zaznamUdalosti: { findMany: jest.Mock };
    auditLog: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      zaznamUdalosti: { findMany: jest.fn().mockResolvedValue([{ id: "z1" }]) },
      auditLog: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditLogService);
  });

  it("strips the internal trasaId bookkeeping key out of the returned diff", async () => {
    prisma.auditLog.findMany.mockImplementation(({ where }: { where: { entita: string } }) => {
      if (where.entita === "zaznam_udalosti") return Promise.resolve([]);
      return Promise.resolve([
        {
          id: "a1",
          cas: new Date("2026-01-01T00:00:00Z"),
          uzivatelId: "u1",
          uzivatel: { jmeno: "Petr", email: "petr@example.com" },
          entita: "prihlaska",
          entitaId: "p1",
          puvodniHodnota: { trasaId: "trasa-1", stavUkonceni: "DNF" },
          novaHodnota: { stavUkonceni: "DQ" },
        },
      ]);
    });

    const [polozka] = await service.listForRoute("trasa-1", {});

    expect(polozka.puvodniHodnota).toEqual({ stavUkonceni: "DNF" });
    expect(polozka.novaHodnota).toEqual({ stavUkonceni: "DQ" });
  });

  it("excludes entita=prihlaska rows belonging to a different trasa", async () => {
    prisma.auditLog.findMany.mockImplementation(({ where }: { where: { entita: string } }) => {
      if (where.entita === "zaznam_udalosti") return Promise.resolve([]);
      return Promise.resolve([
        {
          id: "a1",
          cas: new Date(),
          uzivatelId: "u1",
          uzivatel: null,
          entita: "prihlaska",
          entitaId: "p1",
          puvodniHodnota: { trasaId: "jina-trasa", stavUkonceni: "DNF" },
          novaHodnota: { stavUkonceni: "DQ" },
        },
      ]);
    });

    const vysledek = await service.listForRoute("trasa-1", {});
    expect(vysledek).toHaveLength(0);
  });
});
