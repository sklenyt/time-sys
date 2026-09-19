import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEventDto, uzivatelOrganizaceId: string | null) {
    if (dto.organizaceId !== uzivatelOrganizaceId) {
      throw new ForbiddenException("Událost lze založit jen ve vlastní organizaci");
    }
    return this.prisma.udalost.create({
      data: {
        organizaceId: dto.organizaceId,
        nazev: dto.nazev,
        datum: new Date(dto.datum),
      },
    });
  }

  findAllForOrganizace(organizaceId: string | null) {
    if (!organizaceId) {
      return [];
    }
    return this.prisma.udalost.findMany({ where: { organizaceId }, orderBy: { datum: "desc" } });
  }

  async findOne(id: string) {
    const udalost = await this.prisma.udalost.findUnique({
      where: { id },
      include: { trasy: true },
    });
    if (!udalost) {
      throw new NotFoundException(`Událost ${id} nenalezena`);
    }
    return udalost;
  }
}
