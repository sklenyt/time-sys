import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Pohlavi, StavUkonceni, TypAnomalie, TypUdalosti } from "@depo/shared";
import { ResultsService } from "./results.service";
import { PrismaService } from "../prisma/prisma.service";

const TRASA_ID = "trasa-1";
const START_CAS = new Date("2024-01-01T10:00:00.000Z");

function minutyOdStartu(min: number): Date {
  return new Date(START_CAS.getTime() + min * 60_000);
}

const startVlna = { id: "vlna-1", trasaId: TRASA_ID, nazev: "Hromadný start", casStartu: START_CAS, odkladSekund: null };

const kategorieMuz = { id: "kat-muz", trasaId: TRASA_ID, kod: "MUZ", nazev: "Muži", pohlavi: Pohlavi.M, rocnikOd: null, rocnikDo: null };
const kategorieZeny = { id: "kat-zeny", trasaId: TRASA_ID, kod: "ZENY", nazev: "Ženy", pohlavi: Pohlavi.Z, rocnikOd: null, rocnikDo: null };

function prihlaska(over: Partial<Record<string, unknown>> & { id: string; startovniCislo: number }) {
  return {
    trasaId: TRASA_ID,
    prijmeni: "Příjmení",
    jmeno: "Jméno",
    rocnik: null,
    pohlavi: null,
    klub: null,
    email: null,
    telefon: null,
    oznamovaciEmail: null,
    kategorieId: kategorieMuz.id,
    kategorie: kategorieMuz,
    startVlnaId: startVlna.id,
    startVlna,
    registrovan: true,
    nouzovyKontakt: null,
    zdravotniPoznamka: null,
    stavUkonceni: null,
    casovaPenalizace: null,
    clenoveDruzstva: null,
    ...over,
  };
}

function zaznam(over: Partial<Record<string, unknown>> & { id: string; prihlaskaId: string; cas: Date }) {
  return {
    trasaId: TRASA_ID,
    startovniCisloRaw: null,
    typUdalosti: TypUdalosti.DOJEZD,
    zarizeniId: "zarizeni-1",
    uzivatelId: null,
    typOpravy: "ORIGINAL",
    nahrazujeZaznamId: null,
    stav: "OK",
    vytvorenoKlientAt: over.cas,
    prijatoServerAt: over.cas,
    klientEventId: `evt-${over.id}`,
    fotoSouborNazev: null,
    ...over,
  };
}

describe("ResultsService", () => {
  let service: ResultsService;
  let prisma: {
    trasa: { findUnique: jest.Mock };
    prihlaska: { findMany: jest.Mock };
    zaznamUdalosti: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      trasa: { findUnique: jest.fn() },
      prihlaska: { findMany: jest.fn() },
      zaznamUdalosti: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ResultsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ResultsService);
  });

  describe("getResults", () => {
    it("throws NotFoundException when the route does not exist", async () => {
      prisma.trasa.findUnique.mockResolvedValue(null);
      await expect(service.getResults(TRASA_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("ranks finishers overall and per category, applies time penalty, and separates DNF/still-running", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 1, udalost: { nazev: "Test akce" } });

      const runnerA = prihlaska({ id: "a", startovniCislo: 1, kategorieId: kategorieMuz.id, kategorie: kategorieMuz });
      const runnerB = prihlaska({ id: "b", startovniCislo: 2, kategorieId: kategorieMuz.id, kategorie: kategorieMuz });
      const runnerC = prihlaska({ id: "c", startovniCislo: 3, kategorieId: kategorieZeny.id, kategorie: kategorieZeny });
      const runnerPenalized = prihlaska({
        id: "penalized",
        startovniCislo: 4,
        kategorieId: kategorieMuz.id,
        kategorie: kategorieMuz,
        casovaPenalizace: 180, // +3 min
      });
      const runnerDnf = prihlaska({
        id: "dnf",
        startovniCislo: 5,
        kategorieId: kategorieMuz.id,
        kategorie: kategorieMuz,
        stavUkonceni: StavUkonceni.DNF,
      });
      const runnerStillRunning = prihlaska({
        id: "running",
        startovniCislo: 6,
        kategorieId: kategorieMuz.id,
        kategorie: kategorieMuz,
      });

      prisma.prihlaska.findMany.mockResolvedValue([
        runnerA,
        runnerB,
        runnerC,
        runnerPenalized,
        runnerDnf,
        runnerStillRunning,
      ]);

      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        zaznam({ id: "z-a", prihlaskaId: "a", cas: minutyOdStartu(40) }),
        zaznam({ id: "z-b", prihlaskaId: "b", cas: minutyOdStartu(45) }),
        zaznam({ id: "z-c", prihlaskaId: "c", cas: minutyOdStartu(42) }),
        // Bez penalizace by doběhla ve 41 min (mezi A a C), s +3 min penalizací je celkem 44 min.
        zaznam({ id: "z-p", prihlaskaId: "penalized", cas: minutyOdStartu(41) }),
      ]);

      const vysledky = await service.getResults(TRASA_ID);

      expect(vysledky.klasifikovani.map((p) => p.prihlaskaId)).toEqual(["a", "c", "penalized", "b"]);
      expect(vysledky.klasifikovani.map((p) => p.poradiCelkove)).toEqual([1, 2, 3, 4]);

      const muziPoradi = vysledky.klasifikovani
        .filter((p) => p.kategorieId === kategorieMuz.id)
        .map((p) => [p.prihlaskaId, p.poradiKategorie]);
      expect(muziPoradi).toEqual([
        ["a", 1],
        ["penalized", 2],
        ["b", 3],
      ]);

      const penalized = vysledky.klasifikovani.find((p) => p.prihlaskaId === "penalized")!;
      expect(penalized.casCelkemMs).toBe(44 * 60_000);

      expect(vysledky.neklasifikovani.map((p) => p.prihlaskaId).sort()).toEqual(["dnf", "running"]);
      const dnf = vysledky.neklasifikovani.find((p) => p.prihlaskaId === "dnf")!;
      expect(dnf.stavUkonceni).toBe(StavUkonceni.DNF);
      expect(dnf.casCelkem).toBeNull();
    });

    it("prefers the OPRAVA correction over the original DOJEZD it supersedes", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 1, udalost: { nazev: "Test akce" } });
      const runner = prihlaska({ id: "a", startovniCislo: 1 });
      prisma.prihlaska.findMany.mockResolvedValue([runner]);

      const original = zaznam({ id: "original", prihlaskaId: "a", cas: minutyOdStartu(40) });
      const oprava = zaznam({
        id: "oprava",
        prihlaskaId: "a",
        cas: minutyOdStartu(41),
        typUdalosti: TypUdalosti.OPRAVA,
        nahrazujeZaznamId: "original",
      });
      prisma.zaznamUdalosti.findMany.mockResolvedValue([original, oprava]);

      const vysledky = await service.getResults(TRASA_ID);
      expect(vysledky.klasifikovani[0].casCelkemMs).toBe(41 * 60_000);
    });

    it("víckolová trať (pocetKol=3): doběh počítá až 3. průjezd, dřívější zůstávají neklasifikovaní s číslem aktuálního kola", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 3, udalost: { nazev: "Test akce" } });

      const dokoncil = prihlaska({ id: "dokoncil", startovniCislo: 1 });
      const naDruhemKole = prihlaska({ id: "na-druhem-kole", startovniCislo: 2 });
      prisma.prihlaska.findMany.mockResolvedValue([dokoncil, naDruhemKole]);

      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        // "dokoncil" proběhl cílem 3x — teprve 3. průjezd je skutečný doběh.
        zaznam({ id: "d1", prihlaskaId: "dokoncil", cas: minutyOdStartu(10) }),
        zaznam({ id: "d2", prihlaskaId: "dokoncil", cas: minutyOdStartu(20) }),
        zaznam({ id: "d3", prihlaskaId: "dokoncil", cas: minutyOdStartu(30) }),
        // "na-druhem-kole" má zatím jen 2 z potřebných 3 průjezdů.
        zaznam({ id: "n1", prihlaskaId: "na-druhem-kole", cas: minutyOdStartu(11) }),
        zaznam({ id: "n2", prihlaskaId: "na-druhem-kole", cas: minutyOdStartu(22) }),
      ]);

      const vysledky = await service.getResults(TRASA_ID);

      expect(vysledky.klasifikovani.map((p) => p.prihlaskaId)).toEqual(["dokoncil"]);
      expect(vysledky.klasifikovani[0].casCelkemMs).toBe(30 * 60_000); // čas 3. (finálního) průjezdu, ne posledního zaznamenaného
      expect(vysledky.klasifikovani[0].pocetKol).toBe(3);
      expect(vysledky.klasifikovani[0].aktualniKolo).toBeNull();

      expect(vysledky.neklasifikovani.map((p) => p.prihlaskaId)).toEqual(["na-druhem-kole"]);
      expect(vysledky.neklasifikovani[0].aktualniKolo).toBe(2);
      expect(vysledky.neklasifikovani[0].pocetKol).toBe(3);
      expect(vysledky.neklasifikovani[0].casCelkem).toBeNull();
    });
  });

  describe("getRunning", () => {
    it("splits přihlášky into running / finished / DNS-DNF-DQ", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 1 });

      const finished = prihlaska({ id: "finished", startovniCislo: 1 });
      const dnf = prihlaska({ id: "dnf", startovniCislo: 2, stavUkonceni: StavUkonceni.DNF });
      const running = prihlaska({ id: "running", startovniCislo: 3 });
      const notStarted = prihlaska({ id: "not-started", startovniCislo: 4, startVlna: { ...startVlna, casStartu: null } });

      prisma.prihlaska.findMany.mockResolvedValue([finished, dnf, running, notStarted]);
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        zaznam({ id: "z-finished", prihlaskaId: "finished", cas: minutyOdStartu(30) }),
      ]);

      const vysledek = await service.getRunning(TRASA_ID);

      expect(vysledek.celkemPrihlasenych).toBe(4);
      expect(vysledek.dokonceniPocet).toBe(1);
      expect(vysledek.neukonceniPocet).toBe(1);
      expect(vysledek.bezi.map((b) => b.prihlaskaId)).toEqual(["running"]);
    });

    it("víckolová trať (pocetKol=3): běžec s neúplným počtem průjezdů zůstává v 'běží' s aktuálním kolem", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 3 });

      const naDruhemKole = prihlaska({ id: "na-druhem-kole", startovniCislo: 1 });
      prisma.prihlaska.findMany.mockResolvedValue([naDruhemKole]);
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        zaznam({ id: "n1", prihlaskaId: "na-druhem-kole", cas: minutyOdStartu(11) }),
        zaznam({ id: "n2", prihlaskaId: "na-druhem-kole", cas: minutyOdStartu(22) }),
      ]);

      const vysledek = await service.getRunning(TRASA_ID);

      expect(vysledek.dokonceniPocet).toBe(0);
      expect(vysledek.bezi.map((b) => b.prihlaskaId)).toEqual(["na-druhem-kole"]);
      expect(vysledek.bezi[0].aktualniKolo).toBe(2);
      expect(vysledek.bezi[0].pocetKol).toBe(3);
    });
  });

  describe("getAnomalies", () => {
    it("flags a runner far outside the category median as too fast, but not the rest", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 1, udalost: { nazev: "Test akce" } });

      const normal1 = prihlaska({ id: "n1", startovniCislo: 1 });
      const normal2 = prihlaska({ id: "n2", startovniCislo: 2 });
      const normal3 = prihlaska({ id: "n3", startovniCislo: 3 });
      const outlier = prihlaska({ id: "outlier", startovniCislo: 4 });

      prisma.prihlaska.findMany.mockResolvedValue([normal1, normal2, normal3, outlier]);
      prisma.zaznamUdalosti.findMany.mockImplementation(async ({ where }) => {
        if (where.typUdalosti === TypUdalosti.MEZICAS || where.typUdalosti?.in?.includes?.(TypUdalosti.MEZICAS)) {
          return [];
        }
        return [
          zaznam({ id: "z-n1", prihlaskaId: "n1", cas: minutyOdStartu(38) }),
          zaznam({ id: "z-n2", prihlaskaId: "n2", cas: minutyOdStartu(40) }),
          zaznam({ id: "z-n3", prihlaskaId: "n3", cas: minutyOdStartu(42) }),
          zaznam({ id: "z-outlier", prihlaskaId: "outlier", cas: minutyOdStartu(15) }),
        ];
      });

      const anomalie = await service.getAnomalies(TRASA_ID);

      expect(anomalie.polozky).toHaveLength(1);
      expect(anomalie.polozky[0].prihlaskaId).toBe("outlier");
      expect(anomalie.polozky[0].typAnomalie).toBe(TypAnomalie.PRILIS_RYCHLY);
      expect(anomalie.polozky[0].typUdalosti).toBe(TypUdalosti.DOJEZD);
    });

    it("does not flag anything when the category has fewer than 3 comparable runners", async () => {
      prisma.trasa.findUnique.mockResolvedValue({ id: TRASA_ID, nazev: "Test trasa", pocetKol: 1, udalost: { nazev: "Test akce" } });

      const a = prihlaska({ id: "a", startovniCislo: 1 });
      const b = prihlaska({ id: "b", startovniCislo: 2 });
      prisma.prihlaska.findMany.mockResolvedValue([a, b]);
      prisma.zaznamUdalosti.findMany.mockResolvedValue([
        zaznam({ id: "z-a", prihlaskaId: "a", cas: minutyOdStartu(20) }),
        zaznam({ id: "z-b", prihlaskaId: "b", cas: minutyOdStartu(60) }),
      ]);

      const anomalie = await service.getAnomalies(TRASA_ID);
      expect(anomalie.polozky).toHaveLength(0);
    });
  });
});
