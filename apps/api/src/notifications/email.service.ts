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
    odkazNaVysledky: string;
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
        text: `${params.prijmeni} ${params.jmeno} (startovní číslo ${params.startovniCislo}) právě doběhl/a do cíle na trati "${params.trasaNazev}" s časem ${params.casCelkem}.\n\nVýsledek: ${params.odkazNaVysledky}`,
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
    platba?: { castkaKc: number; qrPng: Buffer };
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.debug(`SMTP nenakonfigurováno — přeskakuji potvrzení registrace pro ${params.komu}`);
      return;
    }

    const radkyText = [
      `Ahoj ${params.jmeno} ${params.prijmeni},`,
      "",
      `zaregistrovali jste se na trať "${params.trasaNazev}" (${params.udalostNazev}). Startovní číslo vám přidělí pořadatel, dozvíte se ho na místě nebo v další zprávě.`,
    ];
    let radkyHtml = `<p>Ahoj ${escapeHtml(params.jmeno)} ${escapeHtml(params.prijmeni)},</p><p>zaregistrovali jste se na trať „${escapeHtml(params.trasaNazev)}“ (${escapeHtml(params.udalostNazev)}). Startovní číslo vám přidělí pořadatel, dozvíte se ho na místě nebo v další zprávě.</p>`;

    if (params.vlastniText?.trim()) {
      radkyText.push("", params.vlastniText.trim());
      radkyHtml += `<p>${escapeHtml(params.vlastniText.trim()).replace(/\n/g, "<br>")}</p>`;
    }

    const attachments: NonNullable<Parameters<Transporter["sendMail"]>[0]>["attachments"] = [];
    if (params.platba) {
      radkyText.push("", `Startovné: ${params.platba.castkaKc} Kč — QR platbu najdete v příloze tohoto e-mailu.`);
      radkyHtml += `<p><strong>Startovné: ${params.platba.castkaKc} Kč</strong></p><p><img src="cid:qr-platba" alt="QR platba" width="220" height="220"></p>`;
      attachments.push({ filename: "qr-platba.png", content: params.platba.qrPng, cid: "qr-platba" });
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? "vysledky@depo.app",
        to: params.komu,
        subject: `Registrace přijata — ${params.trasaNazev}`,
        text: radkyText.join("\n"),
        html: radkyHtml,
        attachments,
      });
    } catch (err) {
      this.logger.warn(`Odeslání potvrzení registrace na ${params.komu} selhalo: ${err}`);
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
        from: process.env.SMTP_FROM ?? "vysledky@depo.app",
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
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
