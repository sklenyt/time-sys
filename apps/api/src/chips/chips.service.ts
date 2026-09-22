import { Injectable, NotFoundException } from "@nestjs/common";
import { StavCipu } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateChipDto } from "./dto/update-chip.dto";

/**
 * Evidence čipů dané trati (F22/F29/F30, docs/04-data-model.md §4.9) —
 * samotné přiřazení čipu závodníkovi žije u přihlášky (EntriesController
 * `POST/DELETE :entryId/chip`), tady je jen přehled nad životním cyklem
 * (stav, záloha, výdej/vrácení) napříč celou startovní listinou.
 */
@Injectable()
export class ChipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForRoute(trasaId: string) {
    const cipy = await this.prisma.cip.findMany({
      where: { prihlaska: { trasaId } },
      include: { prihlaska: { select: { startovniCislo: true, prijmeni: true, jmeno: true } } },
      orderBy: { prihlaska: { startovniCislo: "asc" } },
    });
    return cipy.map((c) => ({
      id: c.id,
      prihlaskaId: c.prihlaskaId,
      kodCipu: c.kodCipu,
      stav: c.stav,
      zalozni: c.zalozni,
      vratnaZaloha: c.vratnaZaloha ? Number(c.vratnaZaloha) : null,
      vydanoAt: c.vydanoAt,
      vracenoAt: c.vracenoAt,
      startovniCislo: c.prihlaska.startovniCislo,
      prijmeni: c.prihlaska.prijmeni,
      jmeno: c.prihlaska.jmeno,
    }));
  }

  async update(trasaId: string, cipId: string, dto: UpdateChipDto) {
    const cip = await this.prisma.cip.findFirst({ where: { id: cipId, prihlaska: { trasaId } } });
    if (!cip) {
      throw new NotFoundException("Čip nenalezen na této trati");
    }
    const vracenoAt =
      dto.stav === StavCipu.VRACEN && cip.stav !== StavCipu.VRACEN
        ? new Date()
        : dto.stav !== undefined && dto.stav !== StavCipu.VRACEN
          ? null
          : undefined;
    await this.prisma.cip.update({
      where: { id: cipId },
      data: { stav: dto.stav, zalozni: dto.zalozni, vratnaZaloha: dto.vratnaZaloha, vracenoAt },
    });
    return this.findOne(cipId);
  }

  private async findOne(cipId: string) {
    const c = await this.prisma.cip.findUniqueOrThrow({
      where: { id: cipId },
      include: { prihlaska: { select: { startovniCislo: true, prijmeni: true, jmeno: true } } },
    });
    return {
      id: c.id,
      prihlaskaId: c.prihlaskaId,
      kodCipu: c.kodCipu,
      stav: c.stav,
      zalozni: c.zalozni,
      vratnaZaloha: c.vratnaZaloha ? Number(c.vratnaZaloha) : null,
      vydanoAt: c.vydanoAt,
      vracenoAt: c.vracenoAt,
      startovniCislo: c.prihlaska.startovniCislo,
      prijmeni: c.prihlaska.prijmeni,
      jmeno: c.prihlaska.jmeno,
    };
  }
}
