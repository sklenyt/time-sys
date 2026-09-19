import { Injectable, NotFoundException } from "@nestjs/common";
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

  /** Zahájení startu vlny — server uloží aktuální čas jako cas_startu (UC5). */
  async start(trasaId: string, startVlnaId: string | undefined) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    return this.prisma.startVlna.update({ where: { id: vlna.id }, data: { casStartu: new Date() } });
  }

  /** Zrušení startu — vlna zůstává, jen se smaže cas_startu. */
  async cancel(trasaId: string, startVlnaId: string | undefined) {
    const vlna = startVlnaId
      ? await this.getVlnaNaTrati(trasaId, startVlnaId)
      : await this.findOrCreateDefault(trasaId);

    return this.prisma.startVlna.update({ where: { id: vlna.id }, data: { casStartu: null } });
  }

  private async getVlnaNaTrati(trasaId: string, startVlnaId: string) {
    const vlna = await this.prisma.startVlna.findFirst({ where: { id: startVlnaId, trasaId } });
    if (!vlna) {
      throw new NotFoundException("Startovní vlna nenalezena na této trati");
    }
    return vlna;
  }
}
