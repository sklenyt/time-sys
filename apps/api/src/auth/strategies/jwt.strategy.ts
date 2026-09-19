import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../decorators/current-user.decorator";

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: payload.sub } });
    if (!uzivatel) {
      throw new UnauthorizedException("Uživatel neexistuje");
    }
    return {
      id: uzivatel.id,
      email: uzivatel.email,
      jmeno: uzivatel.jmeno,
      organizaceId: uzivatel.organizaceId,
    };
  }
}
