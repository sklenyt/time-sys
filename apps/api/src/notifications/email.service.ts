import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";
import { sestavOznameniODojezdu, sestavPotvrzeniPlatby, sestavPotvrzeniRegistrace, type UdajeRegistrace } from "@depo/shared";

/**
 * F32 — automatický e-mail rodině/blízké osobě při doběhu závodníka do
 * cíle (viz docs/12-rfid-a-doporuceni.md §12.5). SMTP je volitelný — bez
 * `SMTP_HOST` v prostředí se e-maily jen tiše nepošlou (dev/test bez
 * poštovního serveru), ať to neshodí zápis doběhu, který je kritickou
 * cestou systému.
 */
export type TypEmailu = "REGISTRACE" | "PLATBA" | "DOJEZD" | "SYSTEM";

const OBECNY_ODESILATEL = "vysledky@depo.app";

/**
 * Odesílatel podle typu e-mailu — typ může mít vlastní adresu
 * (`SMTP_FROM_<TYP>`, např. `SMTP_FROM_DOJEZD` pro výsledky), jinak se použije
 * obecné `SMTP_FROM`. Adresy musí být u SMTP poskytovatele ověřené (SPF/DKIM),
 * jinak e-maily končí ve spamu. Kopii (CC, viditelná příjemci) určuje akce (`Udalost.emailKopie`).
 */
export function odesilatelAKopie(typ: TypEmailu, kopie?: string | null): { from: string; cc?: string } {
  const from = process.env[`SMTP_FROM_${typ}`]?.trim() || process.env.SMTP_FROM?.trim() || OBECNY_ODESILATEL;
  return { from, cc: kopie?.trim() || undefined };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    this.transporter = createTransport({
      host,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return this.transporter;
  }

  async posliOznameniODobehu(params: {
    komu: string;
    prijmeni: string;
    jmeno: string;
    startovniCislo: number;
    trasaNazev: string;
    udalostNazev?: string | null;
    casCelkem: string;
    odkazNaVysledky: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.debug(`SMTP nenakonfigurováno — přeskakuji oznámení pro ${params.komu}`);
      return;
    }

    const oznameni = sestavOznameniODojezdu(params);
    try {
      await transporter.sendMail({
        ...odesilatelAKopie("DOJEZD"),
        to: params.komu,
        subject: oznameni.predmet,
        text: oznameni.text,
        html: oznameni.html,
      });
    } catch (err) {
      // Nedoručený e-mail nesmí shodit zápis doběhu (F06 je kritická cesta) — jen se zaloguje.
      this.logger.warn(`Odeslání oznámení o doběhu na ${params.komu} selhalo: ${err}`);
    }
  }

  /**
   * Potvrzovací e-mail po veřejné registraci (chat 2026-09-26). Startovní
   * číslo se registrantovi ještě nepřiděluje (o tom rozhoduje ručně
   * organizátor, viz EntriesService.prideliCislo) — e-mail proto jen
   * potvrzuje přijetí registrace a případně přidá vlastní text organizátora
   * a QR platbu na startovné. Bez SMTP i bez e-mailu registranta (nepovinné
   * pole formuláře) se prostě nic neposílá — nekritická cesta, viz F32.
   */
  async posliPotvrzeniRegistrace(params: {
    komu: string;
    jmeno: string;
    prijmeni: string;
    trasaNazev: string;
    udalostNazev: string;
    vlastniText?: string | null;
    udaje?: UdajeRegistrace;
    kopie?: string | null;
    platba?: { castkaKc: number; qrPng: Buffer };
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.debug(`SMTP nenakonfigurováno — přeskakuji potvrzení registrace pro ${params.komu}`);
      return;
    }

    const potvrzeni = sestavPotvrzeniRegistrace({
      jmeno: params.jmeno,
      prijmeni: params.prijmeni,
      trasaNazev: params.trasaNazev,
      udalostNazev: params.udalostNazev,
      vlastniText: params.vlastniText,
      udaje: params.udaje,
      platbaCastkaKc: params.platba?.castkaKc,
    });
    const attachments: NonNullable<Parameters<Transporter["sendMail"]>[0]>["attachments"] = [];
    if (params.platba) {
      attachments.push({ filename: "qr-platba.png", content: params.platba.qrPng, cid: "qr-platba" });
    }

    try {
      await transporter.sendMail({
        ...odesilatelAKopie("REGISTRACE", params.kopie),
        to: params.komu,
        subject: potvrzeni.predmet,
        text: potvrzeni.text,
        html: potvrzeni.html,
        attachments,
      });
    } catch (err) {
      this.logger.warn(`Odeslání potvrzení registrace na ${params.komu} selhalo: ${err}`);
    }
  }

  /** E-mail s potvrzením platby a startovním číslem — odesílá ho organizátor tlačítkem ve Startovní listině. Vrací, zda se opravdu odeslal. */
  async posliPotvrzeniPlatby(params: {
    komu: string;
    jmeno: string;
    prijmeni: string;
    startovniCislo: number;
    trasaNazev: string;
    udalostNazev: string;
    platbaCastkaKc?: number | null;
    kopie?: string | null;
  }): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP nenakonfigurováno — potvrzení platby pro ${params.komu} nebylo odesláno`);
      return false;
    }
    const potvrzeni = sestavPotvrzeniPlatby(params);
    try {
      await transporter.sendMail({
        ...odesilatelAKopie("PLATBA", params.kopie),
        to: params.komu,
        subject: potvrzeni.predmet,
        text: potvrzeni.text,
        html: potvrzeni.html,
      });
      return true;
    } catch (err) {
      this.logger.warn(`Odeslání potvrzení platby na ${params.komu} selhalo: ${err}`);
      return false;
    }
  }

  async posliOdkazNaResetHesla(params: { komu: string; jmeno: string; odkaz: string }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      // Na rozdíl od oznámení o doběhu tady tiché selhání znamená, že se uživatel
      // nikdy nedostane zpět ke svému účtu — proto warn, ne debug.
      this.logger.warn(`SMTP nenakonfigurováno — odkaz na reset hesla pro ${params.komu} nebyl odeslán`);
      return;
    }

    try {
      await transporter.sendMail({
        ...odesilatelAKopie("SYSTEM"),
        to: params.komu,
        subject: "Reset hesla — Depo",
        text: `Ahoj ${params.jmeno},\n\npožádali jste o reset hesla k účtu Depo. Pro nastavení nového hesla klikněte na odkaz níže. Odkaz je platný 1 hodinu.\n\n${params.odkaz}\n\nPokud jste o reset hesla nežádali, tento e-mail ignorujte.`,
      });
    } catch (err) {
      this.logger.warn(`Odeslání odkazu na reset hesla na ${params.komu} selhalo: ${err}`);
    }
  }
}

/** Vlastní text organizátora jde do HTML e-mailu — musí se escapovat, ať v něm nejde propašovat značky. */
