import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { UpdateRouteDto } from "./dto/update-route.dto";

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

  async update(id: string, dto: UpdateRouteDto) {
    await this.findOne(id);
    return this.prisma.trasa.update({
      where: { id },
      data: {
        nazev: dto.nazev,
        delkaKm: dto.delkaKm,
        pocetKol: dto.pocetKol,
        typStartu: dto.typStartu,
        dokoncena: dto.dokoncena,
        exportSouborNazev: dto.exportSouborNazev,
      },
    });
  }
}
