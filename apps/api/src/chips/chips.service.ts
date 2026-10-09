import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CipNalezenDto,
  CipSListem,
  CipSkladDto,
  OrganizaceCilDto,
  StavCipu,
  StavSkladuCipu,
  TypCipu,
} from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateChipDto } from "./dto/update-chip.dto";
import { PridatDoSkladuDto, UpravitSkladDto } from "./dto/sklad.dto";

const AKTIVNI_STAVY: StavCipu[] = [StavCipu.PRIREZEN, StavCipu.ZALOZNI];

/**
 * Čipy (F22/F29/F30, docs/04-data-model.md §4.9). Fyzický čip žije ve skladu
 * organizace (`cip_sklad`) a přežívá jednotlivé závody; vydání čipu přihlášce
 * je záznam `cip`. Tady je sklad, hledání čipu a přehled vydaných čipů trati.
 */
@Injectable()
export class ChipsService {
  constructor(private readonly prisma: PrismaService) {}

  private async organizaceTrasy(trasaId: string): Promise<string> {
    const trasa = await this.prisma.trasa.findUnique({
      where: { id: trasaId },
      select: { udalost: { select: { organizaceId: true } } },
    });
    if (!trasa) {
      throw new NotFoundException("Trať nenalezena");
    }
    return trasa.udalost.organizaceId;
  }

  // ---------------------------------------------------------------- vydané čipy trati

  async findAllForRoute(trasaId: string) {
    const cipy = await this.prisma.cip.findMany({
      where: { prihlaska: { trasaId } },
      include: {
        prihlaska: { select: { startovniCislo: true, prijmeni: true, jmeno: true } },
        sklad: { select: { typ: true } },
      },
      orderBy: { prihlaska: { startovniCislo: "asc" } },
    });
    return cipy.map((c) => ({
      id: c.id,
      prihlaskaId: c.prihlaskaId,
      kodCipu: c.kodCipu,
      stav: c.stav,
      zalozni: c.zalozni,
      typ: (c.sklad?.typ ?? TypCipu.OPAKOVANY) as TypCipu,
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
    if (dto.stav && cip.skladId) {
      await this.prisma.cipSklad.update({ where: { id: cip.skladId }, data: { stav: stavSkladuPodleVydeje(dto.stav) } });
    }
    return this.findOne(cipId);
  }

  private async findOne(cipId: string) {
    const c = await this.prisma.cip.findUniqueOrThrow({
      where: { id: cipId },
      include: {
        prihlaska: { select: { startovniCislo: true, prijmeni: true, jmeno: true } },
        sklad: { select: { typ: true } },
      },
    });
    return {
      id: c.id,
      prihlaskaId: c.prihlaskaId,
      kodCipu: c.kodCipu,
      stav: c.stav,
      zalozni: c.zalozni,
      typ: (c.sklad?.typ ?? TypCipu.OPAKOVANY) as TypCipu,
      vratnaZaloha: c.vratnaZaloha ? Number(c.vratnaZaloha) : null,
      vydanoAt: c.vydanoAt,
      vracenoAt: c.vracenoAt,
      startovniCislo: c.prihlaska.startovniCislo,
      prijmeni: c.prihlaska.prijmeni,
      jmeno: c.prihlaska.jmeno,
    };
  }

  // ---------------------------------------------------------------- přiřazení a uvolnění

  /**
   * Přiřadí čip přihlášce. Neznámý kód se sám založí ve skladu organizace
   * (zápis na prezenci se nesmí zdržovat), ztracený nebo vyřazený čip se odmítne.
   */
  async priraditCip(trasaId: string, prihlaskaId: string, kodCipu: string, typ?: TypCipu) {
    const kod = kodCipu.trim();
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }
    const organizaceId = await this.organizaceTrasy(trasaId);

    let sklad = await this.najitVeSkladu(organizaceId, kod);
    if (sklad && (sklad.stav === StavSkladuCipu.ZTRACEN || sklad.stav === StavSkladuCipu.VYRAZEN)) {
      throw new ConflictException(
        `Čip ${sklad.kodCipu} je ve skladu označený jako ${sklad.stav === StavSkladuCipu.ZTRACEN ? "ztracený" : "vyřazený"}. Nejdřív ho ve skladu vraťte mezi dostupné.`
      );
    }
    if (sklad) {
      const jineVydani = await this.prisma.cip.findFirst({
        where: { skladId: sklad.id, stav: { in: AKTIVNI_STAVY }, prihlaskaId: { not: prihlaskaId } },
      });
      if (jineVydani) {
        throw new ConflictException(`Čip ${sklad.kodCipu} je už přiřazený jiné aktivní přihlášce`);
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!sklad) {
          sklad = await tx.cipSklad.create({
            data: { organizaceId, kodCipu: kod, typ: typ ?? TypCipu.OPAKOVANY, stav: StavSkladuCipu.VYDAN },
          });
        } else {
          await tx.cipSklad.update({ where: { id: sklad.id }, data: { stav: StavSkladuCipu.VYDAN } });
        }
        const predchozi = await tx.cip.findUnique({ where: { prihlaskaId } });
        const cip = await tx.cip.upsert({
          where: { prihlaskaId },
          create: { prihlaskaId, skladId: sklad.id, kodCipu: sklad.kodCipu, stav: "PRIREZEN", vydanoAt: new Date() },
          update: { skladId: sklad.id, kodCipu: sklad.kodCipu, stav: "PRIREZEN", vydanoAt: new Date(), vracenoAt: null },
        });
        if (predchozi?.skladId && predchozi.skladId !== sklad.id) {
          await tx.cipSklad.update({ where: { id: predchozi.skladId }, data: { stav: StavSkladuCipu.SKLADEM } });
        }
        return cip;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException(`Čip ${kod} je už přiřazený jiné aktivní přihlášce`);
      }
      throw err;
    }
  }

  async uvolnitCip(trasaId: string, prihlaskaId: string): Promise<void> {
    const prihlaska = await this.prisma.prihlaska.findFirst({ where: { id: prihlaskaId, trasaId } });
    if (!prihlaska) {
      throw new NotFoundException("Přihláška nenalezena na této trati");
    }
    const cip = await this.prisma.cip.findUnique({ where: { prihlaskaId } });
    if (!cip) return;
    await this.prisma.cip.delete({ where: { id: cip.id } });
    if (cip.skladId) {
      await this.prisma.cipSklad.update({ where: { id: cip.skladId }, data: { stav: StavSkladuCipu.SKLADEM } });
    }
  }

  // ---------------------------------------------------------------- sklad

  private najitVeSkladu(organizaceId: string, kod: string) {
    return this.prisma.cipSklad.findFirst({
      where: { organizaceId, kodCipu: { equals: kod, mode: "insensitive" } },
    });
  }

  async seznamSkladu(trasaId: string): Promise<CipSkladDto[]> {
    const organizaceId = await this.organizaceTrasy(trasaId);
    const cipy = await this.prisma.cipSklad.findMany({
      where: { organizaceId },
      orderBy: { kodCipu: "asc" },
      include: {
        vydani: {
          where: { stav: { in: AKTIVNI_STAVY } },
          include: {
            prihlaska: {
              select: {
                startovniCislo: true,
                prijmeni: true,
                jmeno: true,
                trasa: { select: { nazev: true, udalost: { select: { nazev: true } } } },
              },
            },
          },
        },
      },
    });
    return cipy.map((c) => {
      const aktivni = c.vydani[0];
      return {
        id: c.id,
        organizaceId: c.organizaceId,
        kodCipu: c.kodCipu,
        stitek: c.stitek,
        poznamka: c.poznamka,
        typ: c.typ as TypCipu,
        stav: c.stav as StavSkladuCipu,
        vydanoKomu: aktivni
          ? {
              startovniCislo: aktivni.prihlaska.startovniCislo,
              prijmeni: aktivni.prihlaska.prijmeni,
              jmeno: aktivni.prihlaska.jmeno,
              trasaNazev: aktivni.prihlaska.trasa.nazev,
              udalostNazev: aktivni.prihlaska.trasa.udalost.nazev,
            }
          : null,
      };
    });
  }

  async pridatDoSkladu(trasaId: string, dto: PridatDoSkladuDto) {
    const organizaceId = await this.organizaceTrasy(trasaId);
    const videne = new Set<string>();
    const kody: string[] = [];
    for (const surovy of dto.kody) {
      const kod = surovy.trim();
      if (!kod || videne.has(kod.toLowerCase())) continue;
      videne.add(kod.toLowerCase());
      kody.push(kod);
    }
    if (kody.length === 0) {
      throw new BadRequestException("Zadejte aspoň jeden kód čipu");
    }
    const existujici = await this.prisma.cipSklad.findMany({
      where: { organizaceId, kodCipu: { in: kody, mode: "insensitive" } },
      select: { kodCipu: true },
    });
    const uzJe = new Set(existujici.map((c) => c.kodCipu.toLowerCase()));
    const nove = kody.filter((k) => !uzJe.has(k.toLowerCase()));
    if (nove.length > 0) {
      await this.prisma.cipSklad.createMany({
        data: nove.map((kodCipu) => ({ organizaceId, kodCipu, typ: dto.typ ?? TypCipu.OPAKOVANY })),
        skipDuplicates: true,
      });
    }
    return { pridano: nove.length, preskoceno: kody.length - nove.length };
  }

  async upravitSklad(trasaId: string, skladId: string, dto: UpravitSkladDto) {
    const organizaceId = await this.organizaceTrasy(trasaId);
    const cip = await this.prisma.cipSklad.findFirst({ where: { id: skladId, organizaceId } });
    if (!cip) {
      throw new NotFoundException("Čip nenalezen ve skladu");
    }
    if (dto.stav === StavSkladuCipu.VYDAN) {
      throw new BadRequestException("Stav „vydán“ vzniká přiřazením čipu závodníkovi");
    }
    if (dto.stav && cip.stav === StavSkladuCipu.VYDAN) {
      throw new ConflictException("Čip je právě vydaný. Nejdřív ho vraťte nebo odeberte závodníkovi.");
    }
    await this.prisma.cipSklad.update({
      where: { id: skladId },
      data: { typ: dto.typ, stav: dto.stav, stitek: dto.stitek, poznamka: dto.poznamka },
    });
    return { ok: true };
  }

  async smazatZeSkladu(trasaId: string, skladId: string) {
    const organizaceId = await this.organizaceTrasy(trasaId);
    const cip = await this.prisma.cipSklad.findFirst({ where: { id: skladId, organizaceId }, include: { _count: { select: { vydani: true } } } });
    if (!cip) {
      throw new NotFoundException("Čip nenalezen ve skladu");
    }
    if (cip._count.vydani > 0) {
      throw new ConflictException("Čip už byl vydaný a má historii. Místo smazání ho označte jako vyřazený.");
    }
    await this.prisma.cipSklad.delete({ where: { id: skladId } });
  }

  /** Kde je čip s daným kódem: vydaný na této trati, jinde, ve skladu, nedostupný, nebo neznámý. */
  async najit(trasaId: string, kodCipu: string): Promise<CipNalezenDto> {
    const kod = kodCipu.trim();
    const organizaceId = await this.organizaceTrasy(trasaId);
    const sklad = await this.najitVeSkladu(organizaceId, kod);
    if (!sklad) {
      return { vysledek: "NEZNAMY" };
    }
    const seznam = await this.seznamSkladu(trasaId);
    const dto = seznam.find((c) => c.id === sklad.id)!;
    if (sklad.stav === StavSkladuCipu.ZTRACEN || sklad.stav === StavSkladuCipu.VYRAZEN) {
      return { vysledek: "NEDOSTUPNY", sklad: dto };
    }
    const aktivni = await this.prisma.cip.findFirst({
      where: { skladId: sklad.id, stav: { in: AKTIVNI_STAVY } },
      include: { prihlaska: { select: { trasaId: true } } },
    });
    if (aktivni) {
      if (aktivni.prihlaska.trasaId === trasaId) {
        const cip = (await this.findAllForRoute(trasaId)).find((c) => c.id === aktivni.id);
        return { vysledek: "VYDAN_NA_TRATI", sklad: dto, cip: cip as CipSListem | undefined };
      }
      return { vysledek: "VYDAN_JINDE", sklad: dto };
    }
    return { vysledek: "SKLADEM", sklad: dto };
  }

  // ---------------------------------------------------------------- přesun mezi sklady organizací

  /** Přesun čipů do skladu jiné organizace smí jen super admin (jediný, kdo pracuje napříč organizacemi). */
  async cileProPresun(trasaId: string, superAdmin: boolean | undefined): Promise<OrganizaceCilDto[]> {
    if (!superAdmin) return [];
    const organizaceId = await this.organizaceTrasy(trasaId);
    const organizace = await this.prisma.organizace.findMany({ where: { id: { not: organizaceId } }, orderBy: { nazev: "asc" } });
    return organizace.map((o) => ({ id: o.id, nazev: o.nazev }));
  }

  async presunout(trasaId: string, superAdmin: boolean | undefined, ids: string[], cilOrganizaceId: string) {
    if (!superAdmin) {
      throw new ForbiddenException("Čipy do skladu jiné organizace může přesouvat jen super admin");
    }
    const organizaceId = await this.organizaceTrasy(trasaId);
    if (cilOrganizaceId === organizaceId) {
      throw new BadRequestException("Čipy už jsou ve skladu této organizace");
    }
    const cil = await this.prisma.organizace.findUnique({ where: { id: cilOrganizaceId } });
    if (!cil) {
      throw new NotFoundException("Cílová organizace nenalezena");
    }
    const cipy = await this.prisma.cipSklad.findMany({ where: { id: { in: ids }, organizaceId } });
    const dostupne = cipy.filter((c) => c.stav === StavSkladuCipu.SKLADEM);
    const vCili = await this.prisma.cipSklad.findMany({
      where: { organizaceId: cilOrganizaceId, kodCipu: { in: dostupne.map((c) => c.kodCipu) } },
      select: { kodCipu: true },
    });
    const kolize = new Set(vCili.map((c) => c.kodCipu));
    const kPresunu = dostupne.filter((c) => !kolize.has(c.kodCipu));
    if (kPresunu.length > 0) {
      await this.prisma.cipSklad.updateMany({ where: { id: { in: kPresunu.map((c) => c.id) } }, data: { organizaceId: cilOrganizaceId } });
    }
    return {
      presunuto: kPresunu.length,
      preskoceno: ids.length - kPresunu.length,
      duvod: "Přesouvají se jen čipy skladem, které cílová organizace ještě nemá.",
    };
  }
}

function stavSkladuPodleVydeje(stav: StavCipu): StavSkladuCipu {
  switch (stav) {
    case StavCipu.VRACEN:
      return StavSkladuCipu.SKLADEM;
    case StavCipu.ZTRACEN:
      return StavSkladuCipu.ZTRACEN;
    default:
      return StavSkladuCipu.VYDAN;
  }
}
