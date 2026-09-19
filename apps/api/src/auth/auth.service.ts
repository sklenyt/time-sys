import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { AuthTokensDto } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.prisma.uzivatel.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Účet s tímto e-mailem už existuje");
    }

    const hesloHash = await bcrypt.hash(dto.heslo, SALT_ROUNDS);
    const uzivatel = await this.prisma.uzivatel.create({
      data: {
        email: dto.email,
        jmeno: dto.jmeno,
        hesloHash,
        organizaceId: dto.organizaceId,
      },
    });

    return this.issueTokens(uzivatel.id, uzivatel.email);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { email: dto.email } });
    if (!uzivatel) {
      throw new UnauthorizedException("Nesprávný e-mail nebo heslo");
    }

    const platneHeslo = await bcrypt.compare(dto.heslo, uzivatel.hesloHash);
    if (!platneHeslo) {
      throw new UnauthorizedException("Nesprávný e-mail nebo heslo");
    }

    return this.issueTokens(uzivatel.id, uzivatel.email);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let payload: { sub: string; email: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Neplatný nebo vypršelý refresh token");
    }

    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { id: payload.sub } });
    if (!uzivatel) {
      throw new UnauthorizedException("Uživatel neexistuje");
    }

    return this.issueTokens(uzivatel.id, uzivatel.email);
  }

  private async issueTokens(uzivatelId: string, email: string): Promise<AuthTokensDto> {
    const payload = { sub: uzivatelId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_TTL") ?? "15m",
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_TTL") ?? "30d",
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
