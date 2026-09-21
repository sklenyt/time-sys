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
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) {
      throw new NotFoundException("Trasa nenalezena");
    }

    const prihlasky = await this.prisma.prihlaska.findMany({
      where: { trasaId },
      include: { kategorie: true, startVlna: true },
    });

    const posledniZaznamPodlePrihlasce = await this.nacistAktualniZaznamyPodlePrihlasce(trasaId);

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

    const posledniZaznamPodlePrihlasce = await this.nacistAktualniZaznamyPodlePrihlasce(trasaId);
    const ted = Date.now();

    const bezi: BezicPolozka[] = [];
    let dokonceniPocet = 0;
    let neukonceniPocet = 0;

    for (const prihlaska of prihlasky) {
      if (prihlaska.stavUkonceni) {
        neukonceniPocet += 1;
        continue;
      }
      if (posledniZaznamPodlePrihlasce.has(prihlaska.id)) {
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

  private async nacistAktualniZaznamyPodlePrihlasce(trasaId: string): Promise<Map<string, ZaznamUdalosti>> {
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
    return posledniZaznamPodlePrihlasce;
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
      clenoveDruzstva: prihlaska.clenoveDruzstva as VysledekPolozka["clenoveDruzstva"],
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

/** Medián seřazeného pole — robustnější než průměr proti odlehlým hodnotám (F33). */
function median(serazeneHodnoty: number[]): number {
  const mid = Math.floor(serazeneHodnoty.length / 2);
  return serazeneHodnoty.length % 2 !== 0
    ? serazeneHodnoty[mid]
    : (serazeneHodnoty[mid - 1] + serazeneHodnoty[mid]) / 2;
}
