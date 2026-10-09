import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { EmailService } from "../notifications/email.service";
import { SendContactDto } from "./dto/send-contact.dto";

const OKNO_MS = 60 * 60 * 1000;
const LIMIT_NA_IP = 3;
const LIMIT_CELKEM = 60;

@Injectable()
export class ContactService {
  private readonly pokusyPodleIp = new Map<string, number[]>();
  private celkem: number[] = [];

  constructor(private readonly email: EmailService) {}

  /** Jednoduchý omezovač v paměti (API běží v jedné instanci) — chrání schránku před zahlcením. */
  private hlidejLimit(ip: string, ted: number): void {
    const od = ted - OKNO_MS;
    this.celkem = this.celkem.filter((t) => t > od);
    const pokusy = (this.pokusyPodleIp.get(ip) ?? []).filter((t) => t > od);
    if (pokusy.length >= LIMIT_NA_IP || this.celkem.length >= LIMIT_CELKEM) {
      throw new HttpException("Zpráv bylo odesláno příliš mnoho, zkuste to prosím později.", HttpStatus.TOO_MANY_REQUESTS);
    }
    pokusy.push(ted);
    this.celkem.push(ted);
    this.pokusyPodleIp.set(ip, pokusy);
  }

  async odeslat(dto: SendContactDto, ip: string, ted = Date.now()): Promise<void> {
    // Roboti vyplní skryté pole — tváříme se, že vše proběhlo, a nic neposíláme.
    if (dto.web?.trim()) return;
    this.hlidejLimit(ip, ted);
    const ok = await this.email.posliKontakt({ jmeno: dto.jmeno.trim(), email: dto.email.trim(), zprava: dto.zprava.trim() });
    if (!ok) throw new ServiceUnavailableException("Zprávu se nepodařilo odeslat. Napište nám prosím na info@depotime.cz.");
  }
}
