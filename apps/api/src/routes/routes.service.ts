import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRouteDto } from "./dto/create-route.dto";

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  create(udalostId: string, dto: CreateRouteDto) {
    return this.prisma.trasa.create({
      data: {
        udalostId,
        nazev: dto.nazev,
        delkaKm: dto.delkaKm,
        pocetKol: dto.pocetKol,
        typStartu: dto.typStartu,
      },
    });
  }

  findAllForEvent(udalostId: string) {
    return this.prisma.trasa.findMany({ where: { udalostId } });
  }

  async findOne(id: string) {
    const trasa = await this.prisma.trasa.findUnique({
      where: { id },
      include: { kategorie: true, startVlny: true },
    });
    if (!trasa) {
      throw new NotFoundException(`Trasa ${id} nenalezena`);
    }
    return trasa;
  }
}
