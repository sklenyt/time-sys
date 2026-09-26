import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
        registraceUzavrena: dto.registraceUzavrena,
        // Prázdný řetězec = pole se ve formuláři smazalo → uložit jako
        // null (na rozdíl od chybějícího klíče v DTO, který pole nechává
        // beze změny — Prisma `undefined` hodnoty v update() ignoruje).
        potvrzovaciEmailText: dto.potvrzovaciEmailText !== undefined ? dto.potvrzovaciEmailText || null : undefined,
        platbaUcet: dto.platbaUcet !== undefined ? dto.platbaUcet || null : undefined,
        platbaCastka: dto.platbaCastka,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.trasa.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException(
          "Trasu nelze smazat — obsahuje startovní listinu nebo záznamy měření. Smažte je nejdřív."
        );
      }
      throw err;
    }
  }
}
