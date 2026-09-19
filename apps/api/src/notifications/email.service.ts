import { Injectable, Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";

/**
 * F32 — automatický e-mail rodině/blízké osobě při doběhu závodníka do
 * cíle (viz docs/12-rfid-a-doporuceni.md §12.5). SMTP je volitelný — bez
 * `SMTP_HOST` v prostředí se e-maily jen tiše nepošlou (dev/test bez
 * poštovního serveru), ať to neshodí zápis doběhu, který je kritickou
 * cestou systému.
 */
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
    casCelkem: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.debug(`SMTP nenakonfigurováno — přeskakuji oznámení pro ${params.komu}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "vysledky@depo.app",
        to: params.komu,
        subject: `${params.prijmeni} ${params.jmeno} doběhl/a do cíle — ${params.trasaNazev}`,
        text: `${params.prijmeni} ${params.jmeno} (startovní číslo ${params.startovniCislo}) právě doběhl/a do cíle na trati "${params.trasaNazev}" s časem ${params.casCelkem}.`,
      });
    } catch (err) {
      // Nedoručený e-mail nesmí shodit zápis doběhu (F06 je kritická cesta) — jen se zaloguje.
      this.logger.warn(`Odeslání oznámení o doběhu na ${params.komu} selhalo: ${err}`);
    }
  }
}
