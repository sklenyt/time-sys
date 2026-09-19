import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEntryDto } from "./dto/create-entry.dto";

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(trasaId: string, dto: CreateEntryDto) {
    try {
      return await this.prisma.prihlaska.create({
        data: {
          trasaId,
          startovniCislo: dto.startovniCislo,
          prijmeni: dto.prijmeni,
          jmeno: dto.jmeno,
          rocnik: dto.rocnik,
          pohlavi: dto.pohlavi,
          klub: dto.klub,
          kategorieId: dto.kategorieId,
          startVlnaId: dto.startVlnaId,
          nouzovyKontakt: dto.nouzovyKontakt,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(
          `Startovní číslo ${dto.startovniCislo} už je na této trati obsazené`
        );
      }
      throw err;
    }
  }

  findAllForRoute(trasaId: string, search?: string) {
    return this.prisma.prihlaska.findMany({
      where: {
        trasaId,
        ...(search
          ? {
              OR: [
                { prijmeni: { contains: search, mode: "insensitive" } },
                { jmeno: { contains: search, mode: "insensitive" } },
                { klub: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { kategorie: true },
      orderBy: { startovniCislo: "asc" },
    });
  }
}
