import { Injectable } from "@nestjs/common";
import { Pohlavi } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(trasaId: string, dto: CreateCategoryDto) {
    return this.prisma.kategorie.create({
      data: {
        trasaId,
        kod: dto.kod,
        nazev: dto.nazev,
        pohlavi: dto.pohlavi,
        rocnikOd: dto.rocnikOd,
        rocnikDo: dto.rocnikDo,
      },
    });
  }

  findAllForRoute(trasaId: string) {
    return this.prisma.kategorie.findMany({ where: { trasaId } });
  }

  /**
   * Automatický návrh kategorie podle ročníku a pohlaví (F03) — organizátor ho
   * musí v UI vždy explicitně potvrdit, endpoint jen našeptává.
   */
  async navrhniKategorii(trasaId: string, rocnik: number, pohlavi: Pohlavi) {
    return this.prisma.kategorie.findFirst({
      where: {
        trasaId,
        pohlavi,
        AND: [
          { OR: [{ rocnikOd: null }, { rocnikOd: { lte: rocnik } }] },
          { OR: [{ rocnikDo: null }, { rocnikDo: { gte: rocnik } }] },
        ],
      },
    });
  }
}
