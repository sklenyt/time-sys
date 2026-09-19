import { Injectable, NotFoundException } from "@nestjs/common";
import type { Kategorie, Prihlaska, StartVlna, ZaznamUdalosti } from "@prisma/client";
import { StavUkonceni, TypUdalosti, VysledekPolozka, VysledkyResponseDto } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { formatDuration } from "../common/format-duration";

type PrihlaskaSPrislusenstvim = Prihlaska & { kategorie: Kategorie; startVlna: StartVlna | null };

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Výpočet výsledků on-the-fly z zaznam_udalosti (F12), viz
   * 04-data-model.md §4.5 (vysledky_view) — žádná zvlášť udržovaná
   * tabulka výsledků, jen odvozený pohled nad append-only logem.
   */
  async getResults(trasaId: string): Promise<VysledkyResponseDto> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }

    const prihlasky = await this.prisma.prihlaska.findMany({
      where: { trasaId },
      include: { kategorie: true, startVlna: true },
    });

    const zaznamy = await this.prisma.zaznamUdalosti.findMany({
      where: { trasaId, typUdalosti: { in: [TypUdalosti.DOJEZD, TypUdalosti.OPRAVA] } },
    });

    const nahrazeneIds = new Set(
      zaznamy.map((z) => z.nahrazujeZaznamId).filter((id): id is string => id !== null)
    );
    const aktualniZaznamy = zaznamy.filter((z) => !nahrazeneIds.has(z.id));

    // Za normální situace má běžec jen jeden nesuperseded záznam. Pokud by
    // oprava přiřadila přihlášce druhý nezávislý záznam (dvojí zachycení
    // stejného doběhu), bere se jako platný ten s pozdějším `cas` — sporné
    // duplicity nad rámec MVP řeší organizátor ručně v audit logu.
    const posledniZaznamPodlePrihlasce = new Map<string, ZaznamUdalosti>();
    for (const z of aktualniZaznamy) {
      if (!z.prihlaskaId) continue;
      const stavajici = posledniZaznamPodlePrihlasce.get(z.prihlaskaId);
      if (!stavajici || z.cas > stavajici.cas) {
        posledniZaznamPodlePrihlasce.set(z.prihlaskaId, z);
      }
    }

    const polozky: VysledekPolozka[] = prihlasky.map((prihlaska) =>
      this.toPolozka(prihlaska, posledniZaznamPodlePrihlasce.get(prihlaska.id))
    );

    const klasifikovani = polozky
      .filter((p) => p.casCelkemMs !== null)
      .sort((a, b) => a.casCelkemMs! - b.casCelkemMs!);

    klasifikovani.forEach((p, i) => {
      p.poradiCelkove = i + 1;
    });

    const podleKategorie = new Map<string, VysledekPolozka[]>();
    for (const p of klasifikovani) {
      const skupina = podleKategorie.get(p.kategorieId) ?? [];
      skupina.push(p);
      podleKategorie.set(p.kategorieId, skupina);
    }
    for (const skupina of podleKategorie.values()) {
      skupina.forEach((p, i) => {
        p.poradiKategorie = i + 1;
      });
    }

    const neklasifikovani = polozky.filter((p) => p.casCelkemMs === null);

    return { trasaId, klasifikovani, neklasifikovani };
  }

  private toPolozka(
    prihlaska: PrihlaskaSPrislusenstvim,
    zaznam: ZaznamUdalosti | undefined
  ): VysledekPolozka {
    const zakladPolozky = {
      prihlaskaId: prihlaska.id,
      startovniCislo: prihlaska.startovniCislo,
      prijmeni: prihlaska.prijmeni,
      jmeno: prihlaska.jmeno,
      klub: prihlaska.klub,
      kategorieId: prihlaska.kategorieId,
      kategorieKod: prihlaska.kategorie.kod,
      kategorieNazev: prihlaska.kategorie.nazev,
      stavUkonceni: prihlaska.stavUkonceni as StavUkonceni | null,
    };

    if (prihlaska.stavUkonceni || !zaznam || !prihlaska.startVlna?.casStartu) {
      return { ...zakladPolozky, casCelkem: null, casCelkemMs: null, poradiCelkove: null, poradiKategorie: null };
    }

    const penalizaceMs = (prihlaska.casovaPenalizace ?? 0) * 1000;
    const casCelkemMs = zaznam.cas.getTime() - prihlaska.startVlna.casStartu.getTime() + penalizaceMs;

    return {
      ...zakladPolozky,
      casCelkem: formatDuration(casCelkemMs),
      casCelkemMs,
      poradiCelkove: null,
      poradiKategorie: null,
    };
  }
}
