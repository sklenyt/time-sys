import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

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

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);
    return this.prisma.udalost.update({
      where: { id },
      data: {
        nazev: dto.nazev,
        datum: dto.datum ? new Date(dto.datum) : undefined,
        htmlHlavicka: dto.htmlHlavicka,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.udalost.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException(
          "Událost nelze smazat — některá z jejích tras obsahuje startovní listinu nebo záznamy měření. Smažte je nejdřív."
        );
      }
      throw err;
    }
  }
}
