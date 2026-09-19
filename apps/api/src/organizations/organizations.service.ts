import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Zakladatel se stává členem nové organizace (pokud ještě žádnou nemá) —
   * bez toho by nikdy nesplnil kontrolu členství v EventsController.create.
   */
  async create(dto: CreateOrganizationDto, uzivatelId: string) {
    const organizace = await this.prisma.organizace.create({ data: { nazev: dto.nazev } });

    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: uzivatelId } });
    if (!uzivatel?.organizaceId) {
      await this.prisma.uzivatel.update({
        where: { id: uzivatelId },
        data: { organizaceId: organizace.id },
      });
    }

    return organizace;
  }

  /** Multi-tenancy zatím bez RLS (viz 04-data-model.md §4.6) — omezeno aspoň na organizaci uživatele. */
  async findAllForUser(uzivatelId: string) {
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: uzivatelId } });
    if (!uzivatel?.organizaceId) {
      return [];
    }
    const organizace = await this.prisma.organizace.findUnique({ where: { id: uzivatel.organizaceId } });
    return organizace ? [organizace] : [];
  }
}
