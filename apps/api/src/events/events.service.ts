import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEventDto) {
    return this.prisma.udalost.create({
      data: {
        organizaceId: dto.organizaceId,
        nazev: dto.nazev,
        datum: new Date(dto.datum),
      },
    });
  }

  findAll() {
    return this.prisma.udalost.findMany({ orderBy: { datum: "desc" } });
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
