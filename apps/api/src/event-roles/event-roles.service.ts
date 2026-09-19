import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AssignRoleDto } from "./dto/assign-role.dto";

@Injectable()
export class EventRolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForEvent(udalostId: string) {
    return this.prisma.uzivatelRole.findMany({
      where: { udalostId },
      include: { uzivatel: { select: { id: true, email: true, jmeno: true } } },
    });
  }

  /**
   * Přiřazení role na události (F18, F19). Kdo má už ADMIN roli na
   * této nebo jiné události stejné organizace, může přiřadit
   * libovolnou roli komukoli. Pokud událost ještě nemá žádnou roli
   * přiřazenou, může se přihlášený uživatel sám ustanovit ADMINem —
   * bootstrap první role bez nutnosti pozvánky od nikoho jiného.
   */
  async assign(udalostId: string, dto: AssignRoleDto, requesterId: string) {
    const udalost = await this.prisma.udalost.findUnique({ where: { id: udalostId } });
    if (!udalost) {
      throw new NotFoundException("Událost nenalezena");
    }

    const existingRolesCount = await this.prisma.uzivatelRole.count({ where: { udalostId } });

    if (existingRolesCount === 0) {
      if (dto.uzivatelId !== requesterId || dto.role !== Role.ADMIN) {
        throw new ForbiddenException(
          "Událost zatím nemá žádnou roli — prvním krokem musí být přiřazení role ADMIN sobě samému"
        );
      }
    } else {
      const requesterIsAdmin = await this.prisma.uzivatelRole.findFirst({
        where: {
          uzivatelId: requesterId,
          role: Role.ADMIN,
          udalost: { organizaceId: udalost.organizaceId },
        },
      });
      if (!requesterIsAdmin) {
        throw new ForbiddenException("Jen ADMIN může přiřazovat role");
      }
    }

    return this.prisma.uzivatelRole.upsert({
      where: { uzivatelId_udalostId_role: { uzivatelId: dto.uzivatelId, udalostId, role: dto.role } },
      create: { uzivatelId: dto.uzivatelId, udalostId, role: dto.role },
      update: {},
    });
  }
}
