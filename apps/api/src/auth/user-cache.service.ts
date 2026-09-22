import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "./decorators/current-user.decorator";

interface CacheEntry {
  user: AuthenticatedUser;
  expiraceAt: number;
}

const TTL_MS = 30_000;

/**
 * JwtAuthGuard běží na každém autentizovaném requestu, takže jedna stránka
 * (Dashboard umí vystřelit i 15-20 API volání najednou) bez cache znamenala
 * stejný počet DB dotazů jen na ověření identity. Krátké TTL drží data dost
 * čerstvá — invalidate() se volá všude, kde se mění pole vracená v
 * AuthenticatedUser (poradiMenu, organizaceId), takže reálná neaktuálnost je
 * jen pro pole, která se nemění (email, jméno).
 */
@Injectable()
export class UserCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(id: string): AuthenticatedUser | null {
    const entry = this.cache.get(id);
    if (!entry) return null;
    if (entry.expiraceAt <= Date.now()) {
      this.cache.delete(id);
      return null;
    }
    return entry.user;
  }

  set(id: string, user: AuthenticatedUser): void {
    this.cache.set(id, { user, expiraceAt: Date.now() + TTL_MS });
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }
}
