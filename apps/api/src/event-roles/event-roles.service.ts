import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { InviteRoleDto } from "./dto/invite-role.dto";

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
      await this.overitAdmina(udalost.organizaceId, requesterId);
    }

    return this.prisma.uzivatelRole.upsert({
      where: { uzivatelId_udalostId_role: { uzivatelId: dto.uzivatelId, udalostId, role: dto.role } },
      create: { uzivatelId: dto.uzivatelId, udalostId, role: dto.role },
      update: {},
    });
  }

  /**
   * Pozvání dalšího člena k akci podle e-mailu (F19, chat 2026-09-26) —
   * na rozdíl od `assign` (které čeká hotové `uzivatelId`) tady organizátor
   * zadává e-mail kolegy; ten musí mít v appce už účet, appka žádné
   * "pozvánkové" e-maily zatím nerozesílá.
   */
  async invite(udalostId: string, dto: InviteRoleDto, requesterId: string) {
    const udalost = await this.prisma.udalost.findUnique({ where: { id: udalostId } });
    if (!udalost) {
      throw new NotFoundException("Událost nenalezena");
    }
    await this.overitAdmina(udalost.organizaceId, requesterId);

    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { email: dto.email } });
    if (!uzivatel) {
      throw new NotFoundException(`Uživatel s e-mailem ${dto.email} v appce ještě nemá účet — musí se nejdřív zaregistrovat`);
    }

    return this.prisma.uzivatelRole.upsert({
      where: { uzivatelId_udalostId_role: { uzivatelId: uzivatel.id, udalostId, role: dto.role } },
      create: { uzivatelId: uzivatel.id, udalostId, role: dto.role },
      update: {},
    });
  }

  /** Odebrání přístupu (F19) — jen ADMIN stejné organizace, stejně jako přiřazení. */
  async remove(udalostId: string, roleId: string, requesterId: string) {
    const udalost = await this.prisma.udalost.findUnique({ where: { id: udalostId } });
    if (!udalost) {
      throw new NotFoundException("Událost nenalezena");
    }
    await this.overitAdmina(udalost.organizaceId, requesterId);

    const role = await this.prisma.uzivatelRole.findFirst({ where: { id: roleId, udalostId } });
    if (!role) {
      throw new NotFoundException("Role nenalezena na této události");
    }
    await this.prisma.uzivatelRole.delete({ where: { id: roleId } });
  }

  private async overitAdmina(organizaceId: string, requesterId: string): Promise<void> {
    const requesterIsAdmin = await this.prisma.uzivatelRole.findFirst({
      where: {
        uzivatelId: requesterId,
        role: Role.ADMIN,
        udalost: { organizaceId },
      },
    });
    if (!requesterIsAdmin) {
      throw new ForbiddenException("Jen ADMIN může přiřazovat nebo odebírat role");
    }
  }
}
