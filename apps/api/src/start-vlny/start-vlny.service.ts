import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStartVlnaDto } from "./dto/create-start-vlna.dto";

const VYCHOZI_VLNA_NAZEV = "Hromadný start";

@Injectable()
export class StartVlnyService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForRoute(trasaId: string) {
    return this.prisma.startVlna.findMany({ where: { trasaId }, orderBy: { nazev: "asc" } });
  }

  create(trasaId: string, dto: CreateStartVlnaDto) {
    return this.prisma.startVlna.create({
      data: { trasaId, nazev: dto.nazev, odkladSekund: dto.odkladSekund },
    });
  }

  /**
   * Vrátí jedinou "výchozí" vlnu trati (typicky pro hromadný start), pokud
   * ještě neexistuje žádná vlna — vytvoří ji. Umožňuje startovní listinu i
   * zahájení startu bez nutnosti, aby organizátor ručně zakládal vlnu u
   * tratí s jedním hromadným startem.
   */
  async findOrCreateDefault(trasaId: string) {
    const existujici = await this.prisma.startVlna.findFirst({ where: { trasaId } });
    if (existujici) {
      return existujici;
    }
    return this.prisma.startVlna.create({ data: { trasaId, nazev: VYCHOZI_VLNA_NAZEV } });
  }

  /**
   * Zahájení startu vlny — server uloží aktuální čas jako cas_startu (UC5).
   * Ruční Start má přednost před čekajícím plánem, takže ho zároveň zruší —
   * jinak by AutostartService mohl vteřinu poté "přestartovat" vlnu na
   * původně naplánovaný čas.
   */
  async start(trasaId: string, startVlnaId: string | undefined) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    return this.prisma.startVlna.update({
      where: { id: vlna.id },
      data: { casStartu: new Date(), planovanyStart: null },
    });
  }

  /**
   * Zrušení startu — vlna zůstává, jen se smaže cas_startu. Zároveň se
   * zruší i případný plán, jinak by ho AutostartService na dalším ticku
   * znovu odpálil (plán v minulosti = "spustit hned" — viz spustitNaplanovane).
   */
  async cancel(trasaId: string, startVlnaId: string | undefined) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    return this.prisma.startVlna.update({
      where: { id: vlna.id },
      data: { casStartu: null, planovanyStart: null },
    });
  }

  /** Naplánování automatického startu (F05 rozšíření) — vlna se spustí sama v daný čas, viz StartAutostartService. */
  async naplanovatStart(trasaId: string, startVlnaId: string | undefined, planovanyStart: Date) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    if (vlna.casStartu) {
      throw new BadRequestException("Vlna už byla spuštěna — naplánovat lze jen dosud nespuštěný start.");
    }
    if (planovanyStart.getTime() <= Date.now()) {
      throw new BadRequestException("Naplánovaný start musí být v budoucnu.");
    }

    return this.prisma.startVlna.update({ where: { id: vlna.id }, data: { planovanyStart } });
  }

  /** Zrušení plánu — ruční Start zůstává dál možný, jen se přestane čekat na automatické spuštění. */
  async zrusitPlan(trasaId: string, startVlnaId: string | undefined) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    return this.prisma.startVlna.update({ where: { id: vlna.id }, data: { planovanyStart: null } });
  }

  private async getVlnaNaTrati(trasaId: string, startVlnaId: string) {
    const vlna = await this.prisma.startVlna.findFirst({ where: { id: startVlnaId, trasaId } });
    if (!vlna) {
      throw new NotFoundException("Startovní vlna nenalezena na této trati");
    }
    return vlna;
  }
}
