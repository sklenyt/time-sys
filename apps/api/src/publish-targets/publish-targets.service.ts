import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { PublikacniCil } from "@prisma/client";
import { Client as FtpClient } from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { Readable } from "stream";
import { ProtokolPublikace, StavExportu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ResultsService } from "../results/results.service";
import { CreatePublishTargetDto } from "./dto/create-publish-target.dto";
import { UpdatePublishTargetDto } from "./dto/update-publish-target.dto";
import { encryptSecret, decryptSecret } from "../common/secret-crypto";
import { renderResultsHtml } from "./render-results-html";

type Uploader = (nazevSouboru: string, obsah: string) => Promise<void>;

@Injectable()
export class PublishTargetsService {
  private readonly logger = new Logger(PublishTargetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly results: ResultsService
  ) {}

  async create(udalostId: string, dto: CreatePublishTargetDto) {
    const cil = await this.prisma.publikacniCil.create({
      data: {
        udalostId,
        protokol: dto.protokol,
        server: dto.server,
        port: dto.port,
        cesta: dto.cesta,
        uzivatel: dto.uzivatel,
        hesloSifrovane: encryptSecret(dto.heslo),
        intervalMinut: dto.intervalMinut ?? 5,
        exportPoKazdemZaznamu: dto.exportPoKazdemZaznamu ?? false,
        htmlSablona: dto.htmlSablona,
      },
    });
    return this.bezHesla(cil);
  }

  async findAllForEvent(udalostId: string) {
    const cile = await this.prisma.publikacniCil.findMany({ where: { udalostId } });
    return cile.map((c) => this.bezHesla(c));
  }

  async update(id: string, dto: UpdatePublishTargetDto) {
    await this.getOrThrow(id);
    const cil = await this.prisma.publikacniCil.update({
      where: { id },
      data: {
        protokol: dto.protokol,
        server: dto.server,
        port: dto.port,
        cesta: dto.cesta,
        uzivatel: dto.uzivatel,
        hesloSifrovane: dto.heslo ? encryptSecret(dto.heslo) : undefined,
        intervalMinut: dto.intervalMinut,
        exportPoKazdemZaznamu: dto.exportPoKazdemZaznamu,
        htmlSablona: dto.htmlSablona,
      },
    });
    return this.bezHesla(cil);
  }

  /** Otestuje připojení a přihlášení bez provedení skutečného exportu. */
  async testConnection(id: string) {
    const cil = await this.getOrThrow(id);
    try {
      await this.spustSPripojenim(cil, async () => {});
      return { ok: true, zprava: "Připojení a přihlášení proběhlo úspěšně" };
    } catch (err) {
      return { ok: false, zprava: err instanceof Error ? err.message : "Neznámá chyba připojení" };
    }
  }

  async exportNow(id: string) {
    const cil = await this.getOrThrow(id);
    return this.provestExport(cil);
  }

  /**
   * Voláno po každém zápisu měření (RecordsService) pro cíle s
   * `export_po_kazdem_zaznamu=true` — vždy fire-and-forget, chyba exportu
   * nesmí nijak ovlivnit odpověď na zápis měření (viz 03-architecture.md §3.10).
   */
  async exportPoZaznamuProTrasu(trasaId: string): Promise<void> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (!trasa) return;

    const cile = await this.prisma.publikacniCil.findMany({
      where: { udalostId: trasa.udalostId, exportPoKazdemZaznamu: true },
    });
    for (const cil of cile) {
      this.provestExport(cil).catch((err) =>
        this.logger.warn(`Export po zaznamu selhal pro cíl ${cil.id}: ${err}`)
      );
    }
  }

  /** Voláno plánovačem (PublishSchedulerService) pro cíle s uplynulým intervalem. */
  async exportPodleIntervalu(): Promise<void> {
    const cile = await this.prisma.publikacniCil.findMany();
    const ted = Date.now();
    for (const cil of cile) {
      const posledniMs = cil.posledniExportAt?.getTime() ?? 0;
      const uplynuloMinut = (ted - posledniMs) / 60_000;
      if (uplynuloMinut >= cil.intervalMinut) {
        this.provestExport(cil).catch((err) =>
          this.logger.warn(`Plánovaný export selhal pro cíl ${cil.id}: ${err}`)
        );
      }
    }
  }

  private async provestExport(cil: PublikacniCil): Promise<{ stav: StavExportu }> {
    const [trasy, udalost] = await Promise.all([
      this.prisma.trasa.findMany({ where: { udalostId: cil.udalostId } }),
      this.prisma.udalost.findUnique({ where: { id: cil.udalostId } }),
    ]);

    let stav: StavExportu = StavExportu.OK;
    try {
      await this.spustSPripojenim(cil, async (upload) => {
        for (const trasa of trasy) {
          const vysledky = await this.results.getResults(trasa.id);
          const html = renderResultsHtml(trasa.nazev, vysledky, cil.htmlSablona ?? udalost?.htmlHlavicka);
          const nazevSouboru = trasa.exportSouborNazev ?? `${trasa.id}.html`;
          await upload(nazevSouboru, html);
        }
      });
    } catch (err) {
      this.logger.warn(`Export pro cíl ${cil.id} selhal: ${err}`);
      stav = StavExportu.CHYBA;
    }

    await this.prisma.publikacniCil.update({
      where: { id: cil.id },
      data: { posledniExportAt: new Date(), posledniExportStav: stav },
    });
    return { stav };
  }

  private async spustSPripojenim(cil: PublikacniCil, akce: (upload: Uploader) => Promise<void>): Promise<void> {
    const heslo = decryptSecret(cil.hesloSifrovane);

    if (cil.protokol === ProtokolPublikace.SFTP) {
      const sftp = new SftpClient();
      await sftp.connect({ host: cil.server, port: cil.port, username: cil.uzivatel, password: heslo });
      try {
        await akce(async (nazevSouboru, obsah) => {
          await sftp.put(Buffer.from(obsah, "utf8"), `${cil.cesta}/${nazevSouboru}`);
        });
      } finally {
        await sftp.end();
      }
      return;
    }

    const client = new FtpClient();
    try {
      await client.access({
        host: cil.server,
        port: cil.port,
        user: cil.uzivatel,
        password: heslo,
        secure: cil.protokol === ProtokolPublikace.FTPS,
      });
      await akce(async (nazevSouboru, obsah) => {
        await client.uploadFrom(Readable.from(Buffer.from(obsah, "utf8")), `${cil.cesta}/${nazevSouboru}`);
      });
    } finally {
      client.close();
    }
  }

  private async getOrThrow(id: string): Promise<PublikacniCil> {
    const cil = await this.prisma.publikacniCil.findUnique({ where: { id } });
    if (!cil) {
      throw new NotFoundException("Publikační cíl nenalezen");
    }
    return cil;
  }

  private bezHesla(cil: PublikacniCil) {
    const { hesloSifrovane: _hesloSifrovane, ...bezpecne } = cil;
    return bezpecne;
  }
}
