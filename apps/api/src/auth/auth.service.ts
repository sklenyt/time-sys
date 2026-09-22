import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";
import type { AuthTokensDto } from "@depo/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../notifications/email.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UserCacheService } from "./user-cache.service";

const SALT_ROUNDS = 12;
const RESET_TOKEN_PLATNOST_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly userCache: UserCacheService
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

  /**
   * Vždy vrací úspěch bez ohledu na to, jestli e-mail existuje — jinak by
   * odpověď prozrazovala, které účty v systému existují (account enumeration).
   */
  async forgotPassword(email: string): Promise<void> {
    const uzivatel = await this.prisma.uzivatel.findUnique({ where: { email } });
    if (!uzivatel) return;

    const token = randomBytes(32).toString("hex");
    const resetTokenHash = createHash("sha256").update(token).digest("hex");
    await this.prisma.uzivatel.update({
      where: { id: uzivatel.id },
      data: {
        resetTokenHash,
        resetTokenExpiruje: new Date(Date.now() + RESET_TOKEN_PLATNOST_MS),
      },
    });

    const webUrl = process.env.WEB_APP_URL ?? "http://localhost:5173";
    await this.email.posliOdkazNaResetHesla({
      komu: uzivatel.email,
      jmeno: uzivatel.jmeno,
      odkaz: `${webUrl}/reset-heslo?token=${token}`,
    });
  }

  async resetPassword(token: string, noveHeslo: string): Promise<void> {
    const resetTokenHash = createHash("sha256").update(token).digest("hex");
    const uzivatel = await this.prisma.uzivatel.findFirst({ where: { resetTokenHash } });
    if (!uzivatel || !uzivatel.resetTokenExpiruje || uzivatel.resetTokenExpiruje < new Date()) {
      throw new UnauthorizedException("Odkaz pro reset hesla je neplatný nebo vypršel");
    }

    const hesloHash = await bcrypt.hash(noveHeslo, SALT_ROUNDS);
    await this.prisma.uzivatel.update({
      where: { id: uzivatel.id },
      data: { hesloHash, resetTokenHash: null, resetTokenExpiruje: null },
    });
  }

  /** Vlastní pořadí položek postranního menu (přetahování v UI) — ukládá se k účtu napříč zařízeními. */
  async updateMenuOrder(uzivatelId: string, poradiMenu: string[]) {
    const uzivatel = await this.prisma.uzivatel.update({
      where: { id: uzivatelId },
      data: { poradiMenu },
    });
    this.userCache.invalidate(uzivatelId);
    return { poradiMenu: uzivatel.poradiMenu };
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
