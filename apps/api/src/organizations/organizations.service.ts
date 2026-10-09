import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ClenOrganizaceDto, MojeOrganizaceDto, OrganizacePrehledDto } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UserCacheService } from "../auth/user-cache.service";
import { AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCache: UserCacheService
  ) {}

  /**
   * Zakladatel se stává členem nové organizace; pokud ještě žádnou aktivní nemá,
   * nová se stane jeho aktivní — bez toho by nikdy nesplnil kontrolu členství
   * v EventsController.create.
   */
  async create(dto: CreateOrganizationDto, uzivatelId: string) {
    const organizace = await this.prisma.organizace.create({ data: { nazev: dto.nazev.trim() } });
    await this.prisma.clenstviOrganizace.create({ data: { uzivatelId, organizaceId: organizace.id } });

    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: uzivatelId } });
    if (!uzivatel?.organizaceId) {
      await this.prisma.uzivatel.update({ where: { id: uzivatelId }, data: { organizaceId: organizace.id } });
    }
    this.userCache.invalidate(uzivatelId);
    return organizace;
  }

  /** Organizace uživatele, aktivní první (kód, který zakládá akce, bere první položku). Super admin vidí všechny. */
  async findAllForUser(user: AuthenticatedUser): Promise<MojeOrganizaceDto[]> {
    const vsechny = user.organizace;
    if (vsechny.length === 0) return [];
    const aktivni = vsechny.find((o) => o.id === user.organizaceId);
    const ostatni = vsechny.filter((o) => o.id !== user.organizaceId);
    const serazene = aktivni ? [aktivni, ...ostatni] : ostatni;
    const pocty = await this.prisma.organizace.findMany({
      where: { id: { in: serazene.map((o) => o.id) } },
      select: { id: true, _count: { select: { udalosti: true, clenove: true } } },
    });
    const poctyPodleId = new Map(pocty.map((o) => [o.id, o._count]));
    return serazene.map((o) => ({
      id: o.id,
      nazev: o.nazev,
      aktivni: o.id === user.organizaceId,
      pocetAkci: poctyPodleId.get(o.id)?.udalosti ?? 0,
      pocetClenu: poctyPodleId.get(o.id)?.clenove ?? 0,
    }));
  }

  private overitSuperAdmina(user: AuthenticatedUser) {
    if (!user.superAdmin) {
      throw new ForbiddenException("Organizace spravuje jen super admin");
    }
  }

  async prehled(user: AuthenticatedUser): Promise<OrganizacePrehledDto[]> {
    this.overitSuperAdmina(user);
    const organizace = await this.prisma.organizace.findMany({
      orderBy: { nazev: "asc" },
      include: {
        _count: { select: { udalosti: true, cipySklad: true, clenove: true } },
        clenove: { include: { uzivatel: { select: { id: true, jmeno: true, email: true, organizaceId: true } } }, orderBy: { uzivatel: { jmeno: "asc" } } },
      },
    });
    return organizace.map((o) => ({
      id: o.id,
      nazev: o.nazev,
      pocetAkci: o._count.udalosti,
      pocetClenu: o._count.clenove,
      pocetCipu: o._count.cipySklad,
      clenove: o.clenove.map(
        (c): ClenOrganizaceDto => ({
          uzivatelId: c.uzivatel.id,
          jmeno: c.uzivatel.jmeno,
          email: c.uzivatel.email,
          aktivni: c.uzivatel.organizaceId === o.id,
        })
      ),
    }));
  }

  async prejmenovat(user: AuthenticatedUser, id: string, nazev: string) {
    this.overitSuperAdmina(user);
    const nove = nazev.trim();
    if (!nove) throw new BadRequestException("Název nesmí být prázdný");
    const existuje = await this.prisma.organizace.findUnique({ where: { id } });
    if (!existuje) throw new NotFoundException("Organizace nenalezena");
    const o = await this.prisma.organizace.update({ where: { id }, data: { nazev: nove } });
    for (const c of await this.prisma.clenstviOrganizace.findMany({ where: { organizaceId: id }, select: { uzivatelId: true } })) {
      this.userCache.invalidate(c.uzivatelId);
    }
    return o;
  }

  /** Přidá existující účet do organizace. Jeho aktivní organizace se změní jen tehdy, když žádnou nemá. */
  async pridatClena(user: AuthenticatedUser, organizaceId: string, email: string) {
    this.overitSuperAdmina(user);
    const organizace = await this.prisma.organizace.findUnique({ where: { id: organizaceId } });
    if (!organizace) throw new NotFoundException("Organizace nenalezena");
    const uzivatel = await this.prisma.uzivatel.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } });
    if (!uzivatel) {
      throw new NotFoundException("Účet s tímto e-mailem neexistuje. Člověk se nejdřív musí v Depu zaregistrovat.");
    }
    const uz = await this.prisma.clenstviOrganizace.findUnique({
      where: { uzivatelId_organizaceId: { uzivatelId: uzivatel.id, organizaceId } },
    });
    if (uz) throw new ConflictException("Tento uživatel už v organizaci je");
    await this.prisma.clenstviOrganizace.create({ data: { uzivatelId: uzivatel.id, organizaceId } });
    if (!uzivatel.organizaceId) {
      await this.prisma.uzivatel.update({ where: { id: uzivatel.id }, data: { organizaceId } });
    }
    this.userCache.invalidate(uzivatel.id);
    return { ok: true };
  }

  /** Odebere člena. Pokud byla organizace jeho aktivní, přepne ho na jinou, nebo na žádnou. */
  async odebratClena(user: AuthenticatedUser, organizaceId: string, uzivatelId: string) {
    this.overitSuperAdmina(user);
    const clenstvi = await this.prisma.clenstviOrganizace.findUnique({ where: { uzivatelId_organizaceId: { uzivatelId, organizaceId } } });
    if (!clenstvi) throw new NotFoundException("Uživatel není členem této organizace");
    await this.prisma.clenstviOrganizace.delete({ where: { id: clenstvi.id } });
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: uzivatelId } });
    if (uzivatel?.organizaceId === organizaceId) {
      const jina = await this.prisma.clenstviOrganizace.findFirst({ where: { uzivatelId }, orderBy: { vytvorenoAt: "asc" } });
      await this.prisma.uzivatel.update({ where: { id: uzivatelId }, data: { organizaceId: jina?.organizaceId ?? null } });
    }
    this.userCache.invalidate(uzivatelId);
    return { ok: true };
  }
}
