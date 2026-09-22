import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";
import { UserCacheService } from "../user-cache.service";

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly userCache: UserCacheService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const cached = this.userCache.get(payload.sub);
    if (cached) {
      return cached;
    }

    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: payload.sub } });
    if (!uzivatel) {
      throw new UnauthorizedException("Uživatel neexistuje");
    }
    const user: AuthenticatedUser = {
      id: uzivatel.id,
      email: uzivatel.email,
      jmeno: uzivatel.jmeno,
      organizaceId: uzivatel.organizaceId,
      poradiMenu: uzivatel.poradiMenu,
    };
    this.userCache.set(payload.sub, user);
    return user;
  }
}
