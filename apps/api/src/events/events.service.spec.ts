import { Test } from "@nestjs/testing";
import { EventsService } from "./events.service";
import { PrismaService } from "../prisma/prisma.service";

describe("EventsService", () => {
  let service: EventsService;
  let prisma: { udalost: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { udalost: { findMany: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [EventsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(EventsService);
  });

  function udalost(over: Partial<Record<string, unknown>> & { id: string; datum: Date }) {
    return {
      nazev: "Test akce",
      hesloVysledkuHash: null,
      ukoncena: false,
      trasy: [],
      ...over,
    };
  }

  function vcerejsek() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function zitrek() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  describe("najitVerejneUdalosti — autodetekce ukončené akce (datum v minulosti + nikdo neodstartoval)", () => {
    it("akci s datem v minulosti a bez jakéhokoli startu označí jako ukončenou, i když ji organizátor ručně nezavřel", async () => {
      prisma.udalost.findMany.mockResolvedValue([
        udalost({
          id: "e1",
          datum: vcerejsek(),
          ukoncena: false,
          trasy: [{ id: "t1", nazev: "10 km", startVlny: [{ casStartu: null }] }],
        }),
      ]);

      const [v] = await service.najitVerejneUdalosti();

      expect(v.ukoncena).toBe(true);
    });

    it("akci s datem v minulosti, ale kde trať odstartovala, autodetekce jako ukončenou neoznačí", async () => {
      prisma.udalost.findMany.mockResolvedValue([
        udalost({
          id: "e2",
          datum: vcerejsek(),
          ukoncena: false,
          trasy: [{ id: "t1", nazev: "10 km", startVlny: [{ casStartu: new Date() }] }],
        }),
      ]);

      const [v] = await service.najitVerejneUdalosti();

      expect(v.ukoncena).toBe(false);
    });

    it("akci s datem v budoucnu nikdy autodetekcí neoznačí jako ukončenou, i bez jakéhokoli startu", async () => {
      prisma.udalost.findMany.mockResolvedValue([
        udalost({
          id: "e3",
          datum: zitrek(),
          ukoncena: false,
          trasy: [{ id: "t1", nazev: "10 km", startVlny: [{ casStartu: null }] }],
        }),
      ]);

      const [v] = await service.najitVerejneUdalosti();

      expect(v.ukoncena).toBe(false);
    });

    it("ručně ukončenou akci (organizátor klikl Ukončit akci) vrátí jako ukončenou bez ohledu na datum", async () => {
      prisma.udalost.findMany.mockResolvedValue([
        udalost({
          id: "e4",
          datum: zitrek(),
          ukoncena: true,
          trasy: [{ id: "t1", nazev: "10 km", startVlny: [{ casStartu: null }] }],
        }),
      ]);

      const [v] = await service.najitVerejneUdalosti();

      expect(v.ukoncena).toBe(true);
    });

    it("je dopočítané za běhu, ne trvalý zápis — stejná akce se změněným datem do budoucna se sama vrátí mezi probíhající", async () => {
      const zaklad = udalost({
        id: "e5",
        datum: vcerejsek(),
        ukoncena: false,
        trasy: [{ id: "t1", nazev: "10 km", startVlny: [{ casStartu: null }] }],
      });
      prisma.udalost.findMany.mockResolvedValue([zaklad]);
      expect((await service.najitVerejneUdalosti())[0].ukoncena).toBe(true);

      prisma.udalost.findMany.mockResolvedValue([{ ...zaklad, datum: zitrek() }]);
      expect((await service.najitVerejneUdalosti())[0].ukoncena).toBe(false);
    });
  });
});
