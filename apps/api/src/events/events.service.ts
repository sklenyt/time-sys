import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

const SALT_ROUNDS = 10;

/** Nikdy neposílat hash hesla klientovi — ani vlastníkovi události. */
function bezHesla<T extends { hesloVysledkuHash?: string | null }>(udalost: T): Omit<T, "hesloVysledkuHash"> {
  const { hesloVysledkuHash: _hesloVysledkuHash, ...rest } = udalost;
  return rest;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, uzivatelOrganizaceId: string | null) {
    if (dto.organizaceId !== uzivatelOrganizaceId) {
      throw new ForbiddenException("Událost lze založit jen ve vlastní organizaci");
    }
    const udalost = await this.prisma.udalost.create({
      data: {
        organizaceId: dto.organizaceId,
        nazev: dto.nazev,
        datum: new Date(dto.datum),
      },
    });
    return bezHesla(udalost);
  }

  async findAllForOrganizace(organizaceId: string | null) {
    if (!organizaceId) {
      return [];
    }
    const udalosti = await this.prisma.udalost.findMany({ where: { organizaceId }, orderBy: { datum: "desc" } });
    return udalosti.map(bezHesla);
  }

  /** Interní — vrací i hesloVysledkuHash, používat jen uvnitř servisu (update, overitHesloUdalosti). */
  private async najdiSHeslem(id: string) {
    const udalost = await this.prisma.udalost.findUnique({
      where: { id },
      include: { trasy: true },
    });
    if (!udalost) {
      throw new NotFoundException(`Událost ${id} nenalezena`);
    }
    return udalost;
  }

  async findOne(id: string) {
    return bezHesla(await this.najdiSHeslem(id));
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.najdiSHeslem(id);
    const hesloVysledkuHash = dto.heslo
      ? await bcrypt.hash(dto.heslo, SALT_ROUNDS)
      : dto.odebratHesloVysledku
        ? null
        : undefined;
    const udalost = await this.prisma.udalost.update({
      where: { id },
      data: {
        nazev: dto.nazev,
        datum: dto.datum ? new Date(dto.datum) : undefined,
        htmlHlavicka: dto.htmlHlavicka,
        logoUrl: dto.logoUrl,
        verejnyVypis: dto.verejnyVypis,
        hesloVysledkuHash,
      },
    });
    return bezHesla(udalost);
  }

  /**
   * Veřejný adresář na vysledky.depotime.cz (F-nový, viz chat) — jen jméno,
   * datum a jestli je potřeba heslo. Žádná jména závodníků ani jiná citlivá
   * data tady nejsou, ty jsou až za ověřením hesla v overitHesloUdalosti.
   */
  async najitVerejneUdalosti() {
    const udalosti = await this.prisma.udalost.findMany({
      where: { verejnyVypis: true },
      orderBy: { datum: "desc" },
      select: { id: true, nazev: true, datum: true, hesloVysledkuHash: true, trasy: { select: { id: true, nazev: true } } },
    });
    return udalosti.map((u) => ({
      id: u.id,
      nazev: u.nazev,
      datum: u.datum,
      vyzadujeHeslo: u.hesloVysledkuHash !== null,
      trasy: u.trasy,
    }));
  }

  /**
   * Ověření hesla pro přístup k výsledkům přes veřejný adresář. Bez
   * nastaveného hesla (hesloVysledkuHash null — výchozí stav) projde
   * kdokoliv, stejně jako dnešní přímý odkaz na výsledky.
   */
  async overitHesloUdalosti(id: string, heslo: string) {
    const udalost = await this.najdiSHeslem(id);
    if (udalost.hesloVysledkuHash) {
      const platne = await bcrypt.compare(heslo, udalost.hesloVysledkuHash);
      if (!platne) {
        throw new UnauthorizedException("Nesprávné heslo");
      }
    }
    return { trasy: udalost.trasy.map((t) => ({ id: t.id, nazev: t.nazev })) };
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
