import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Kontroluje každou vteřinu naplánované starty (F05 rozšíření) — vlna se
 * spustí sama v naplánovaný čas i bez otevřeného prohlížeče. cas_startu se
 * nastaví na přesný planovany_start, ne na okamžik tohoto tiku — jinak by
 * se čas doběhu všech závodníků posunul o (náhodnou) prodlevu pollingu.
 */
@Injectable()
export class StartAutostartService {
  private readonly logger = new Logger(StartAutostartService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Interval(1000)
  async spustitNaplanovane() {
    const kSpusteni = await this.prisma.startVlna.findMany({
      where: { planovanyStart: { lte: new Date() }, casStartu: null },
    });
    for (const vlna of kSpusteni) {
      await this.prisma.startVlna.update({
        where: { id: vlna.id },
        data: { casStartu: vlna.planovanyStart, planovanyStart: null },
      });
      this.logger.log(`Automatický start vlny ${vlna.id} (${vlna.nazev}) — naplánovaný čas dosažen.`);
    }
  }
}
