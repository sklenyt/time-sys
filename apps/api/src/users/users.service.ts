import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UserCacheService } from "../auth/user-cache.service";
import { AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";

/**
 * Správa uživatelských účtů organizace — hlavně oprava špatně zadaného e-mailu
 * nebo jména. Smí správce organizace (role ADMIN na některé akci organizace)
 * u lidí své organizace a super admin u všech.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCache: UserCacheService
  ) {}

  private async jeSpravceOrganizace(uzivatelId: string, organizaceId: string): Promise<boolean> {
    const role = await this.prisma.uzivatelRole.findFirst({
      where: { uzivatelId, role: Role.ADMIN, udalost: { organizaceId } },
    });
    return !!role;
  }

  /** Člen organizace = má ji nastavenou u účtu, nebo má roli na některé její akci (pozvaní kolegové). */
  private clenOrganizace(organizaceId: string) {
    return {
      OR: [{ organizaceId }, { clenstvi: { some: { organizaceId } } }, { role: { some: { udalost: { organizaceId } } } }],
    };
  }

  async seznam(pozadujici: AuthenticatedUser) {
    const vyber = {
      id: true,
      email: true,
      jmeno: true,
      vytvorenoAt: true,
      organizace: { select: { nazev: true } },
      role: { select: { role: true, udalost: { select: { nazev: true } } } },
    } as const;

    let uzivatele;
    if (pozadujici.superAdmin) {
      uzivatele = await this.prisma.uzivatel.findMany({ select: vyber, orderBy: { jmeno: "asc" } });
    } else {
      if (!pozadujici.organizaceId || !(await this.jeSpravceOrganizace(pozadujici.id, pozadujici.organizaceId))) {
        throw new ForbiddenException("Seznam uživatelů smí vidět správce organizace");
      }
      uzivatele = await this.prisma.uzivatel.findMany({
        where: this.clenOrganizace(pozadujici.organizaceId),
        select: vyber,
        orderBy: { jmeno: "asc" },
      });
    }

    return uzivatele.map((u) => ({
      id: u.id,
      email: u.email,
      jmeno: u.jmeno,
      vytvorenoAt: u.vytvorenoAt.toISOString(),
      organizaceNazev: u.organizace?.nazev ?? null,
      role: u.role.map((r) => ({ role: r.role, akce: r.udalost.nazev })),
    }));
  }

  async upravit(pozadujici: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    if (dto.email === undefined && dto.jmeno === undefined) {
      throw new BadRequestException("Není co měnit");
    }
    const cil = await this.prisma.uzivatel.findUnique({ where: { id } });
    if (!cil) {
      throw new NotFoundException("Uživatel nenalezen");
    }

    if (!pozadujici.superAdmin) {
      const org = pozadujici.organizaceId;
      const smi =
        !!org &&
        (await this.jeSpravceOrganizace(pozadujici.id, org)) &&
        !!(await this.prisma.uzivatel.findFirst({ where: { id, ...this.clenOrganizace(org) } }));
      if (!smi) {
        throw new ForbiddenException("Tohoto uživatele nemůžete upravovat");
      }
    }

    const novyEmail = dto.email?.trim();
    if (novyEmail && novyEmail.toLowerCase() !== cil.email.toLowerCase()) {
      const obsazeny = await this.prisma.uzivatel.findFirst({
        where: { email: { equals: novyEmail, mode: "insensitive" }, NOT: { id } },
      });
      if (obsazeny) {
        throw new ConflictException("Účet s tímto e-mailem už existuje");
      }
    }

    const upraven = await this.prisma.uzivatel.update({
      where: { id },
      data: { email: novyEmail || undefined, jmeno: dto.jmeno?.trim() || undefined },
      select: { id: true, email: true, jmeno: true },
    });
    this.userCache.invalidate(id);
    return upraven;
  }

  /**
   * Smazání vlastního účtu (právo na výmaz). Vyžaduje heslo. Účet nelze smazat,
   * dokud je jediným správcem neukončené akce — akce by zůstala bez správce.
   * Role a členství se smažou, u časových záznamů a auditu se autor anonymizuje.
   */
  async smazatVlastniUcet(pozadujici: AuthenticatedUser, heslo: string) {
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: pozadujici.id } });
    if (!uzivatel) {
      throw new NotFoundException("Účet nenalezen");
    }
    if (!(await bcrypt.compare(heslo, uzivatel.hesloHash))) {
      throw new ForbiddenException("Nesprávné heslo");
    }
    const spravuje = await this.prisma.uzivatelRole.findMany({
      where: { uzivatelId: pozadujici.id, role: Role.ADMIN, udalost: { ukoncena: false } },
      select: { udalostId: true, udalost: { select: { nazev: true } } },
    });
    const osamele: string[] = [];
    for (const r of spravuje) {
      const dalsi = await this.prisma.uzivatelRole.count({
        where: { udalostId: r.udalostId, role: Role.ADMIN, uzivatelId: { not: pozadujici.id } },
      });
      if (dalsi === 0) osamele.push(r.udalost.nazev);
    }
    if (osamele.length > 0) {
      throw new ConflictException(
        `Jste jediným správcem akce: ${osamele.join(", ")}. Nejdřív přidejte dalšího správce (Správa akcí → Lidé s přístupem) nebo akci ukončete.`
      );
    }
    await this.prisma.uzivatel.delete({ where: { id: pozadujici.id } });
    this.userCache.invalidate(pozadujici.id);
    return { ok: true };
  }

  /** Smazání cizího účtu — jen super admin. Vlastní účet se maže přes `smazatVlastniUcet` (s heslem). */
  async smazat(pozadujici: AuthenticatedUser, id: string) {
    if (!pozadujici.superAdmin) {
      throw new ForbiddenException("Cizí účty smí mazat jen super admin");
    }
    if (id === pozadujici.id) {
      throw new BadRequestException("Vlastní účet smažete v sekci Můj účet");
    }
    const cil = await this.prisma.uzivatel.findUnique({ where: { id } });
    if (!cil) {
      throw new NotFoundException("Uživatel nenalezen");
    }
    await this.prisma.uzivatel.delete({ where: { id } });
    this.userCache.invalidate(id);
    return { ok: true };
  }
}
