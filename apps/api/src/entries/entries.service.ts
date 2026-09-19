import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TypStartu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEntryDto } from "./dto/create-entry.dto";
import { StartVlnyService } from "../start-vlny/start-vlny.service";

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly startVlny: StartVlnyService
  ) {}

  async create(trasaId: string, dto: CreateEntryDto) {
    const startVlnaId = dto.startVlnaId ?? (await this.vychoziVlnaProHromadnyStart(trasaId));

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
          startVlnaId,
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

  /**
   * U hromadného startu je vlna implicitní — přihláška se automaticky
   * naváže na jedinou vlnu trati (založí se, pokud ještě neexistuje), aby
   * organizátor nemusel před startovní listinou zvlášť zakládat vlnu ručně.
   * U vlnového/intervalového startu musí vlnu vybrat explicitně (startVlnaId).
   */
  private async vychoziVlnaProHromadnyStart(trasaId: string): Promise<string | undefined> {
    const trasa = await this.prisma.trasa.findUnique({ where: { id: trasaId } });
    if (trasa?.typStartu !== TypStartu.HROMADNY) {
      return undefined;
    }
    const vlna = await this.startVlny.findOrCreateDefault(trasaId);
    return vlna.id;
  }
}
