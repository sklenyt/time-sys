import { Injectable, NotFoundException } from "@nestjs/common";
import type { Kategorie, Prihlaska, StartVlna, ZaznamUdalosti } from "@prisma/client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { join } from "path";
import {
  AnomaliePolozka,
  AnomaliesResponseDto,
  BezicPolozka,
  PersonalResultDto,
  RunningResponseDto,
  StavUkonceni,
  TypAnomalie,
  TypUdalosti,
  VysledekPolozka,
  VysledkyResponseDto,
} from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { formatDuration } from "../common/format-duration";

type PrihlaskaSPrislusenstvim = Prihlaska & { kategorie: Kategorie; startVlna: StartVlna | null };

/**
 * Sportovní pořadí (1, 1, 3) nad seznamem seřazeným podle času — shoda se
 * posuzuje na setiny, tj. na přesnost, kterou výsledky zobrazují
 * (formatDuration); rozdíl v milisekundách by divák neviděl.
 */
export function priraditPoradi(
  serazene: VysledekPolozka[],
  nastavit: (p: VysledekPolozka, poradi: number) => void
): void {
  let poradi = 0;
  let predchoziSetiny: number | null = null;
  serazene.forEach((p, i) => {
    const setiny = Math.round(p.casCelkemMs! / 10);
    if (setiny !== predchoziSetiny) {
      poradi = i + 1;
      predchoziSetiny = setiny;
    }
    nastavit(p, poradi);
  });
}

// Vestavěné fonty PDFKitu (Helvetica) umí jen WinAnsi kódování bez české
// diakritiky (ř, č, ě, š, ž, ů…) — bez vlastního TTF fontu by výsledky
// vytiskly zkomolený text. Liberation Sans (SIL OFL, viz assets/fonts/LICENSE-LiberationSans.txt)
// pokrývá Latin Extended-A.
const FONT_REGULAR = join(__dirname, "..", "assets", "fonts", "LiberationSans-Regular.ttf");
const FONT_BOLD = join(__dirname, "..", "assets", "fonts", "LiberationSans-Bold.ttf");

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Výpočet výsledků on-the-fly z zaznam_udalosti (F12), viz
   * 04-data-model.md §4.5 (vysledky_view) — žádná zvlášť udržovaná
   * tabulka výsledků, jen odvozený pohled nad append-only logem.
   */
  async getResults(trasaId: string): Promise<VysledkyResponseDto> {
    const trasa = await this.prisma.trasa.findUnique({
      where: { id: trasaId },
      include: { udalost: { include: { trasy: { select: { id: true, nazev: true } } } } },
    });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }

    const prihlasky = await this.prisma.prihlaska.findMany({
      where: { trasaId },
      include: { kategorie: true, startVlna: true },
    });

    const projezdyPodlePrihlasce = await this.nacistProjezdyPodlePrihlasce(trasaId, trasa.pocetKol);

    const polozky: VysledekPolozka[] = prihlasky.map((prihlaska) =>
      this.toPolozka(prihlaska, projezdyPodlePrihlasce.get(prihlaska.id), trasa.pocetKol)
    );

    const klasifikovani = polozky
      .filter((p) => p.casCelkemMs !== null)
      .sort((a, b) => a.casCelkemMs! - b.casCelkemMs!);

    priraditPoradi(klasifikovani, (p, poradi) => {
      p.poradiCelkove = poradi;
    });

    const podleKategorie = new Map<string, VysledekPolozka[]>();
    for (const p of klasifikovani) {
      const skupina = podleKategorie.get(p.kategorieId) ?? [];
      skupina.push(p);
      podleKategorie.set(p.kategorieId, skupina);
    }
    for (const skupina of podleKategorie.values()) {
      priraditPoradi(skupina, (p, poradi) => {
        p.poradiKategorie = poradi;
      });
    }

    const neklasifikovani = polozky.filter((p) => p.casCelkemMs === null);

    return {
      trasaId,
      trasaNazev: trasa.nazev,
      udalostNazev: trasa.udalost.nazev,
      trasy: trasa.udalost.trasy,
      klasifikovani,
      neklasifikovani,
    };
  }

  /** Export výsledků do XLSX (F13) — stejná data jako getResults, jiný formát výstupu. */
  async buildResultsXlsx(trasaId: string): Promise<Buffer> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }
    const vysledky = await this.getResults(trasaId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(trasa.nazev.slice(0, 31));

    sheet.columns = [
      { header: "Poř. celkem", key: "poradiCelkove", width: 12 },
      { header: "Poř. kat.", key: "poradiKategorie", width: 10 },
      { header: "Číslo", key: "startovniCislo", width: 8 },
      { header: "Příjmení", key: "prijmeni", width: 20 },
      { header: "Jméno", key: "jmeno", width: 16 },
      { header: "Kategorie", key: "kategorieKod", width: 10 },
      { header: "Čas", key: "casCelkem", width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const p of vysledky.klasifikovani) {
      sheet.addRow(p);
    }

    if (vysledky.neklasifikovani.length > 0) {
      sheet.addRow({});
      sheet.addRow({ prijmeni: "Neklasifikovaní" }).font = { bold: true };
      for (const p of vysledky.neklasifikovani) {
        sheet.addRow({
          startovniCislo: p.startovniCislo,
          prijmeni: p.prijmeni,
          jmeno: p.jmeno,
          kategorieKod: p.kategorieKod,
          casCelkem: p.stavUkonceni ?? "v cíli zatím ne",
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Export výsledků do PDF (F13) — stejná data jako getResults, tisková sestava pro vyvěšení/tisk. */
  async buildResultsPdf(trasaId: string): Promise<Buffer> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }
    const vysledky = await this.getResults(trasaId);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    const sloupce = [
      { label: "Poř.", width: 35 },
      { label: "Kat.", width: 35 },
      { label: "Č.", width: 40 },
      { label: "Jméno", width: 190 },
      { label: "Kategorie", width: 90 },
      { label: "Čas", width: 90 },
    ];

    doc.fontSize(18).font(FONT_BOLD).text(`Výsledky — ${trasa.nazev}`, { align: "left" });
    doc.moveDown(1);

    const hlavickaRadku = () => {
      doc.fontSize(10).font(FONT_BOLD);
      let x = doc.page.margins.left;
      const y = doc.y;
      for (const s of sloupce) {
        doc.text(s.label, x, y, { width: s.width });
        x += s.width;
      }
      doc.moveDown(0.5);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.3);
    };

    const novaStrankaPokudTreba = () => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        hlavickaRadku();
      }
    };

    hlavickaRadku();
    doc.font(FONT_REGULAR).fontSize(10);
    for (const p of vysledky.klasifikovani) {
      novaStrankaPokudTreba();
      const y = doc.y;
      let x = doc.page.margins.left;
      const hodnoty = [
        String(p.poradiCelkove ?? ""),
        String(p.poradiKategorie ?? ""),
        String(p.startovniCislo),
        `${p.prijmeni} ${p.jmeno}`,
        p.kategorieKod,
        p.casCelkem ?? "",
      ];
      hodnoty.forEach((hodnota, i) => {
        doc.text(hodnota, x, y, { width: sloupce[i].width });
        x += sloupce[i].width;
      });
      doc.moveDown(0.4);
    }

    if (vysledky.neklasifikovani.length > 0) {
      doc.moveDown(0.8);
      novaStrankaPokudTreba();
      doc.font(FONT_BOLD).fontSize(13).text("Neklasifikovaní");
      doc.moveDown(0.3);
      doc.font(FONT_REGULAR).fontSize(10);
      for (const p of vysledky.neklasifikovani) {
        novaStrankaPokudTreba();
        const y = doc.y;
        let x = doc.page.margins.left;
        const hodnoty = [
          "",
          "",
          String(p.startovniCislo),
          `${p.prijmeni} ${p.jmeno}`,
          p.kategorieKod,
          p.stavUkonceni ?? "v cíli zatím ne",
        ];
        hodnoty.forEach((hodnota, i) => {
          doc.text(hodnota, x, y, { width: sloupce[i].width });
          x += sloupce[i].width;
        });
        doc.moveDown(0.4);
      }
    }

    doc.end();
    return done;
  }

  /**
   * "Kdo ještě běží / DNF" v reálném čase (F10, UC10) — přihlášení bez
   * DNS/DNF/DQ, kteří ještě nemají zaznamenaný doběh. U hromadného startu
   * bez odstartované vlny (`start_vlna.cas_startu` prázdné) ještě nikdo
   * neběží.
   */
  async getRunning(trasaId: string): Promise<RunningResponseDto> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }

    const prihlasky = await this.prisma.prihlaska.findMany({
      where: { trasaId },
      include: { kategorie: true, startVlna: true },
    });

    const projezdyPodlePrihlasce = await this.nacistProjezdyPodlePrihlasce(trasaId, trasa.pocetKol);
    const ted = Date.now();

    const bezi: BezicPolozka[] = [];
    let dokonceniPocet = 0;
    let neukonceniPocet = 0;

    for (const prihlaska of prihlasky) {
      if (prihlaska.stavUkonceni) {
        neukonceniPocet += 1;
        continue;
      }
      const projezd = projezdyPodlePrihlasce.get(prihlaska.id);
      if (projezd?.finisniZaznam) {
        dokonceniPocet += 1;
        continue;
      }
      if (!prihlaska.startVlna?.casStartu) {
        continue;
      }
      bezi.push({
        prihlaskaId: prihlaska.id,
        startovniCislo: prihlaska.startovniCislo,
        prijmeni: prihlaska.prijmeni,
        jmeno: prihlaska.jmeno,
        kategorieKod: prihlaska.kategorie.kod,
        casOdStartu: formatDuration(ted - prihlaska.startVlna.casStartu.getTime()),
        pocetKol: trasa.pocetKol,
        aktualniKolo: projezd?.aktualniKolo ?? 0,
      });
    }

    bezi.sort((a, b) => a.startovniCislo - b.startovniCislo);

    return { trasaId, bezi, celkemPrihlasenych: prihlasky.length, dokonceniPocet, neukonceniPocet };
  }

  /**
   * F33 — podezřele rychlý/pomalý čas oproti ostatním ve stejné kategorii.
   * Práh je statistický (medián + robustní odchylka přes MAD), ne pevné
   * číslo v minutách, viz docs/12-rfid-a-doporuceni.md §12.6/§12.8 — málo
   * porovnatelných běžců (< 3 v kategorii) se nevyhodnocuje, přílišný šum.
   */
  async getAnomalies(trasaId: string): Promise<AnomaliesResponseDto> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }

    const polozky: AnomaliePolozka[] = [];

    const vysledky = await this.getResults(trasaId);
    polozky.push(
      ...this.detekovatOdlehleHodnoty(
        vysledky.klasifikovani.map((p) => ({
          prihlaskaId: p.prihlaskaId,
          startovniCislo: p.startovniCislo,
          prijmeni: p.prijmeni,
          jmeno: p.jmeno,
          kategorieKod: p.kategorieKod,
          casMs: p.casCelkemMs!,
        })),
        TypUdalosti.DOJEZD
      )
    );

    const prihlasky = await this.prisma.prihlaska.findMany({
      where: { trasaId },
      include: { kategorie: true, startVlna: true },
    });
    const prihlaskaById = new Map(prihlasky.map((p) => [p.id, p]));

    const mezicasy = await this.prisma.zaznamUdalosti.findMany({
      where: { trasaId, typUdalosti: TypUdalosti.MEZICAS },
    });
    const posledniMezicasPodlePrihlasce = new Map<string, ZaznamUdalosti>();
    for (const z of mezicasy) {
      if (!z.prihlaskaId) continue;
      const stavajici = posledniMezicasPodlePrihlasce.get(z.prihlaskaId);
      if (!stavajici || z.cas > stavajici.cas) {
        posledniMezicasPodlePrihlasce.set(z.prihlaskaId, z);
      }
    }

    const mezicasoveHodnoty = Array.from(posledniMezicasPodlePrihlasce.entries())
      .map(([prihlaskaId, zaznam]) => {
        const prihlaska = prihlaskaById.get(prihlaskaId);
        if (!prihlaska?.startVlna?.casStartu) return null;
        return {
          prihlaskaId,
          startovniCislo: prihlaska.startovniCislo,
          prijmeni: prihlaska.prijmeni,
          jmeno: prihlaska.jmeno,
          kategorieKod: prihlaska.kategorie.kod,
          casMs: zaznam.cas.getTime() - prihlaska.startVlna.casStartu.getTime(),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    polozky.push(...this.detekovatOdlehleHodnoty(mezicasoveHodnoty, TypUdalosti.MEZICAS));

    return { trasaId, polozky };
  }

  private detekovatOdlehleHodnoty(
    hodnoty: { prihlaskaId: string; startovniCislo: number; prijmeni: string; jmeno: string; kategorieKod: string; casMs: number }[],
    typUdalosti: TypUdalosti.DOJEZD | TypUdalosti.MEZICAS
  ): AnomaliePolozka[] {
    const podleKategorie = new Map<string, typeof hodnoty>();
    for (const h of hodnoty) {
      const skupina = podleKategorie.get(h.kategorieKod) ?? [];
      skupina.push(h);
      podleKategorie.set(h.kategorieKod, skupina);
    }

    const vysledek: AnomaliePolozka[] = [];
    for (const skupina of podleKategorie.values()) {
      if (skupina.length < 3) continue;

      const casy = skupina.map((h) => h.casMs).sort((a, b) => a - b);
      const medianMs = median(casy);
      const odchylky = casy.map((c) => Math.abs(c - medianMs)).sort((a, b) => a - b);
      const mad = median(odchylky);
      const robustniSigma = mad > 0 ? mad * 1.4826 : medianMs * 0.1;
      if (robustniSigma === 0) continue;

      for (const h of skupina) {
        const z = (h.casMs - medianMs) / robustniSigma;
        if (Math.abs(z) <= 2.5) continue;
        vysledek.push({
          prihlaskaId: h.prihlaskaId,
          startovniCislo: h.startovniCislo,
          prijmeni: h.prijmeni,
          jmeno: h.jmeno,
          kategorieKod: h.kategorieKod,
          typUdalosti,
          cas: formatDuration(h.casMs),
          casMs: h.casMs,
          medianKategorieMs: medianMs,
          typAnomalie: z < 0 ? TypAnomalie.PRILIS_RYCHLY : TypAnomalie.PRILIS_POMALY,
        });
      }
    }
    return vysledek;
  }

  /**
   * Osobní výsledek jednoho závodníka — cíl skenování QR kódu ze
   * startovního čísla (viz docs/12-rfid-a-doporuceni.md §12.6), aby divák
   * nemusel hledat jméno v celé (často dlouhé) tabulce výsledků.
   */
  async getPersonalResult(trasaId: string, prihlaskaId: string): Promise<PersonalResultDto> {
    const prihlaska = await this.prisma.prihlaska.findFirst({
      where: { id: prihlaskaId, trasaId },
      include: { kategorie: true, startVlna: true },
    });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }

    const vysledky = await this.getResults(trasaId);
    const polozka =
      vysledky.klasifikovani.find((p) => p.prihlaskaId === prihlaskaId) ??
      vysledky.neklasifikovani.find((p) => p.prihlaskaId === prihlaskaId)!;

    let mezicas: string | null = null;
    if (prihlaska.startVlna?.casStartu) {
      const posledniMezicas = await this.prisma.zaznamUdalosti.findFirst({
        where: { trasaId, prihlaskaId, typUdalosti: TypUdalosti.MEZICAS },
        orderBy: { cas: "desc" },
      });
      if (posledniMezicas) {
        mezicas = formatDuration(posledniMezicas.cas.getTime() - prihlaska.startVlna.casStartu.getTime());
      }
    }

    return {
      prihlaskaId: prihlaska.id,
      startovniCislo: prihlaska.startovniCislo,
      prijmeni: prihlaska.prijmeni,
      jmeno: prihlaska.jmeno,
      kategorieKod: prihlaska.kategorie.kod,
      kategorieNazev: prihlaska.kategorie.nazev,
      casCelkem: polozka.casCelkem,
      poradiCelkove: polozka.poradiCelkove,
      poradiKategorie: polozka.poradiKategorie,
      mezicas,
      stavUkonceni: polozka.stavUkonceni,
      clenoveDruzstva: prihlaska.clenoveDruzstva as PersonalResultDto["clenoveDruzstva"],
    };
  }

  /** QR kód (PNG) kódující odkaz na osobní výsledkovou stránku (viz getPersonalResult). */
  async buildPersonalResultQrCode(trasaId: string, prihlaskaId: string): Promise<Buffer> {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }
    const webUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";
    const url = `${webUrl}/vysledky/${trasaId}/bezec/${prihlaskaId}`;
    return QRCode.toBuffer(url, { type: "png", margin: 1, width: 240 });
  }

  /**
   * Kolikátý ne-nahrazený průjezd cílem (DOJEZD/OPRAVA) má která přihláška
   * a jestli je to už finálních `pocetKol` průjezdů (vícekolové tratě,
   * viz Trasa.pocetKol). U běžné jednokolové tratě (pocetKol<=1) je to
   * přesně dřívější chování — bere se nejpozdější záznam jako doběh.
   *
   * OPRAVA nahrazuje konkrétní DOJEZD (přes nahrazujeZaznamId) — je to
   * korekce téhož průjezdu, ne nový, takže se do počtu kol počítá stejně
   * jako ten, co nahrazuje, jen s opraveným časem/číslem.
   */
  private async nacistProjezdyPodlePrihlasce(
    trasaId: string,
    pocetKol: number
  ): Promise<Map<string, { finisniZaznam: ZaznamUdalosti | null; aktualniKolo: number }>> {
    const zaznamy = await this.prisma.zaznamUdalosti.findMany({
      where: { trasaId, typUdalosti: { in: [TypUdalosti.DOJEZD, TypUdalosti.OPRAVA] } },
    });

    const nahrazeneIds = new Set(
      zaznamy.map((z) => z.nahrazujeZaznamId).filter((id): id is string => id !== null)
    );
    const aktualniZaznamy = zaznamy.filter((z) => !nahrazeneIds.has(z.id));

    const projezdyPodlePrihlasce = new Map<string, ZaznamUdalosti[]>();
    for (const z of aktualniZaznamy) {
      if (!z.prihlaskaId) continue;
      const seznam = projezdyPodlePrihlasce.get(z.prihlaskaId) ?? [];
      seznam.push(z);
      projezdyPodlePrihlasce.set(z.prihlaskaId, seznam);
    }

    const vysledek = new Map<string, { finisniZaznam: ZaznamUdalosti | null; aktualniKolo: number }>();
    for (const [prihlaskaId, seznam] of projezdyPodlePrihlasce) {
      if (pocetKol <= 1) {
        // Beze změny oproti dřívějšímu chování — sporné duplicity (dvojí
        // zachycení stejného doběhu) řeší organizátor ručně v audit logu,
        // do té doby platí ten s pozdějším `cas`.
        const posledni = seznam.reduce((a, b) => (b.cas > a.cas ? b : a));
        vysledek.set(prihlaskaId, { finisniZaznam: posledni, aktualniKolo: 1 });
        continue;
      }
      const serazene = [...seznam].sort((a, b) => a.cas.getTime() - b.cas.getTime());
      if (serazene.length >= pocetKol) {
        vysledek.set(prihlaskaId, { finisniZaznam: serazene[pocetKol - 1], aktualniKolo: pocetKol });
      } else {
        vysledek.set(prihlaskaId, { finisniZaznam: null, aktualniKolo: serazene.length });
      }
    }
    return vysledek;
  }

  private toPolozka(
    prihlaska: PrihlaskaSPrislusenstvim,
    projezd: { finisniZaznam: ZaznamUdalosti | null; aktualniKolo: number } | undefined,
    pocetKol: number
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
      clenoveDruzstva: prihlaska.clenoveDruzstva as VysledekPolozka["clenoveDruzstva"],
      pocetKol,
    };

    if (prihlaska.stavUkonceni || !projezd?.finisniZaznam || !prihlaska.startVlna?.casStartu) {
      return {
        ...zakladPolozky,
        casCelkem: null,
        casCelkemMs: null,
        poradiCelkove: null,
        poradiKategorie: null,
        aktualniKolo: prihlaska.stavUkonceni ? null : (projezd?.aktualniKolo ?? 0),
      };
    }

    const penalizaceMs = (prihlaska.casovaPenalizace ?? 0) * 1000;
    const casCelkemMs = projezd.finisniZaznam.cas.getTime() - prihlaska.startVlna.casStartu.getTime() + penalizaceMs;

    return {
      ...zakladPolozky,
      casCelkem: formatDuration(casCelkemMs),
      casCelkemMs,
      poradiCelkove: null,
      poradiKategorie: null,
      aktualniKolo: null,
    };
  }
}

/** Medián seřazeného pole — robustnější než průměr proti odlehlým hodnotám (F33). */
function median(serazeneHodnoty: number[]): number {
  const mid = Math.floor(serazeneHodnoty.length / 2);
  return serazeneHodnoty.length % 2 !== 0
    ? serazeneHodnoty[mid]
    : (serazeneHodnoty[mid - 1] + serazeneHodnoty[mid]) / 2;
}
