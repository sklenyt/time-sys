import { Injectable } from "@nestjs/common";
import { CourseRecordPolozka, CourseRecordsResponseDto, RunnerHistoryPolozka, RunnerHistoryResponseDto } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ResultsService } from "../results/results.service";

/**
 * F26 (Fáze 4) — pokročilé reporty nad historickými daty. Systém nemá
 * samostatnou entitu "trať napříč ročníky" (jen `trasa` patřící jedné
 * `udalost`), takže se ročníky stejné tratě spojují pragmaticky podle
 * shodného (case-insensitive) názvu trasy v rámci jedné organizace.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly results: ResultsService
  ) {}

  async courseRecords(organizaceId: string | null, nazev: string): Promise<CourseRecordsResponseDto> {
    if (!organizaceId) {
      return { nazev, pocetRocniku: 0, celkovyRekord: null, rekordyPodleKategorie: [] };
    }
    const trasy = await this.prisma.trasa.findMany({
      where: {
        nazev: { equals: nazev, mode: "insensitive" },
        udalost: { organizaceId },
      },
      include: { udalost: true },
      orderBy: { udalost: { datum: "asc" } },
    });

    const polozky: CourseRecordPolozka[] = [];
    for (const trasa of trasy) {
      const vysledky = await this.results.getResults(trasa.id);
      for (const p of vysledky.klasifikovani) {
        if (p.casCelkemMs === null) continue;
        polozky.push({
          udalostId: trasa.udalostId,
          udalostNazev: trasa.udalost.nazev,
          udalostDatum: trasa.udalost.datum.toISOString().slice(0, 10),
          trasaId: trasa.id,
          prihlaskaId: p.prihlaskaId,
          prijmeni: p.prijmeni,
          jmeno: p.jmeno,
          kategorieKod: p.kategorieKod,
          casCelkem: p.casCelkem!,
          casCelkemMs: p.casCelkemMs,
        });
      }
    }

    polozky.sort((a, b) => a.casCelkemMs - b.casCelkemMs);
    const celkovyRekord = polozky[0] ?? null;

    const podleKategorie = new Map<string, CourseRecordPolozka>();
    for (const p of polozky) {
      const stavajici = podleKategorie.get(p.kategorieKod);
      if (!stavajici || p.casCelkemMs < stavajici.casCelkemMs) {
        podleKategorie.set(p.kategorieKod, p);
      }
    }

    return {
      nazev,
      pocetRocniku: trasy.length,
      celkovyRekord,
      rekordyPodleKategorie: Array.from(podleKategorie.values()).sort((a, b) =>
        a.kategorieKod.localeCompare(b.kategorieKod)
      ),
    };
  }

  async runnerHistory(organizaceId: string | null, prijmeni: string, jmeno: string): Promise<RunnerHistoryResponseDto> {
    if (!organizaceId) {
      return { prijmeni, jmeno, zavody: [] };
    }
    const prihlasky = await this.prisma.prihlaska.findMany({
      where: {
        prijmeni: { equals: prijmeni, mode: "insensitive" },
        jmeno: { equals: jmeno, mode: "insensitive" },
        trasa: { udalost: { organizaceId } },
      },
      include: { trasa: { include: { udalost: true } }, kategorie: true },
      orderBy: { trasa: { udalost: { datum: "desc" } } },
    });

    const polozky: RunnerHistoryPolozka[] = [];
    for (const prihlaska of prihlasky) {
      const vysledky = await this.results.getResults(prihlaska.trasaId);
      const vysledek =
        vysledky.klasifikovani.find((p) => p.prihlaskaId === prihlaska.id) ??
        vysledky.neklasifikovani.find((p) => p.prihlaskaId === prihlaska.id) ??
        null;

      polozky.push({
        udalostNazev: prihlaska.trasa.udalost.nazev,
        udalostDatum: prihlaska.trasa.udalost.datum.toISOString().slice(0, 10),
        trasaNazev: prihlaska.trasa.nazev,
        kategorieKod: prihlaska.kategorie.kod,
        casCelkem: vysledek?.casCelkem ?? null,
        poradiCelkove: vysledek?.poradiCelkove ?? null,
        poradiKategorie: vysledek?.poradiKategorie ?? null,
        stavUkonceni: vysledek?.stavUkonceni ?? null,
      });
    }

    return { prijmeni, jmeno, zavody: polozky };
  }
}
