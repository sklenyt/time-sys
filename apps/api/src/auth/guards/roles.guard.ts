import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@depo/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

/**
 * Role se váže na konkrétní událost (uzivatel_role.udalost_id), viz
 * 08-security.md §8.3. Cílová událost se dohledá z `eventId` v route
 * parametrech, nebo z `routeId`/`id` přes vztah trasa -> událost.
 *
 * ADMIN přiřazený na libovolné události v rámci organizace má přístup
 * ke všem událostem té organizace (viz role ADMIN v 04-data-model.md §4.3).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException("Vyžadováno přihlášení");
    }

    const udalostId = await this.resolveEventId(request.params);
    if (!udalostId) {
      throw new ForbiddenException("Nelze určit událost pro kontrolu oprávnění");
    }

    const udalost = await this.prisma.udalost.findUnique({ where: { id: udalostId } });
    if (!udalost) {
      throw new ForbiddenException("Událost neexistuje");
    }

    const roleNaUdalosti = await this.prisma.uzivatelRole.findFirst({
      where: { uzivatelId: user.id, udalostId, role: { in: allowedRoles } },
    });
    if (roleNaUdalosti) {
      return true;
    }

    if (allowedRoles.includes(Role.ADMIN)) {
      return false;
    }

    const orgAdmin = await this.prisma.uzivatelRole.findFirst({
      where: {
        uzivatelId: user.id,
        role: Role.ADMIN,
        udalost: { organizaceId: udalost.organizaceId },
      },
    });
    if (orgAdmin) {
      return true;
    }

    throw new ForbiddenException("Nedostatečné oprávnění pro tuto akci");
  }

  private async resolveEventId(params: Record<string, string>): Promise<string | null> {
    if (params.eventId) {
      return params.eventId;
    }
    if (params.routeId) {
      const trasa = await this.prisma.trasa.findUnique({ where: { id: params.routeId } });
      return trasa?.udalostId ?? null;
    }
    return null;
  }
}
