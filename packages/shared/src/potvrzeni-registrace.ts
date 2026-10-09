import { zpravaProPrijemce } from "./platba";

/** Údaje, které registrant zadal do formuláře — shrnutí v e-mailu. Zdravotní poznámku e-mail nikdy neobsahuje, jen informaci, že byla uvedena. */
export interface UdajeRegistrace {
  rocnik?: number | null;
  pohlavi?: "M" | "Z" | null;
  kategorie?: string | null;
  klub?: string | null;
  email?: string | null;
  telefon?: string | null;
  nouzovyKontakt?: string | null;
  zdravotniPoznamkaUvedena?: boolean;
  clenoveDruzstva?: string[];
}

/** Platba startovného: vždy převodem na účet, volitelně i QR kódem. */
export interface PlatbaPrevodem {
  castkaKc: number;
  /** Číslo účtu ve tvaru "[předčíslí-]číslo/kódBanky". */
  ucet: string;
  /** Platební podmínky organizátora (splatnost, storno apod.), volný text. */
  podminky?: string | null;
  /** True, pokud e-mail obsahuje i QR kód (`cid:qr-platba`). */
  sQr: boolean;
}

/** Závěrečný pozdrav: vlastní text akce, nebo výchozí „Těšíme se na vás na startu. / Pořadatelé akce …". */
function podpisText(v: { udalostNazev: string; podpis?: string | null }): string[] {
  const vlastni = v.podpis?.trim();
  return vlastni ? vlastni.split(/\r?\n/) : ["Těšíme se na vás na startu.", "", `Pořadatelé akce ${v.udalostNazev}`];
}

function podpisHtml(v: { udalostNazev: string; podpis?: string | null }): string {
  const vlastni = v.podpis?.trim();
  if (vlastni) return `<p style="margin:0 0 20px">${escapeHtml(vlastni).replace(/\n/g, "<br>")}</p>`;
  return (
    `<p style="margin:0 0 4px">Těšíme se na vás na startu.</p>` +
    `<p style="margin:0 0 20px">Pořadatelé akce ${escapeHtml(v.udalostNazev)}</p>`
  );
}

export interface PotvrzeniRegistraceVstup {
  jmeno: string;
  prijmeni: string;
  trasaNazev: string;
  udalostNazev: string;
  vlastniText?: string | null;
  platba?: PlatbaPrevodem | null;
  /** Vlastní závěrečný pozdrav akce (jinak výchozí). */
  podpis?: string | null;
  udaje?: UdajeRegistrace;
}

export interface PotvrzeniRegistrace {
  predmet: string;
  text: string;
  html: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Adresa loga pro e-maily (PNG, protože e-mailoví klienti SVG nezobrazují). */
const LOGO_URL = "https://depotime.cz/icon-192.png";

/** Hlavička e-mailu v grafické identitě Depo: značka, název a oranžová cílová páska (Tape 500). */
function znackovaHlavicka(): string {
  return (
    `<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 20px"><tr>` +
    `<td style="padding:0 0 12px;border-bottom:3px solid #ff4a17">` +
    `<img src="${LOGO_URL}" alt="" width="30" height="30" style="vertical-align:middle;border-radius:8px;border:0">` +
    `<span style="vertical-align:middle;margin-left:10px;font-size:19px;font-weight:800;color:#0b1220;letter-spacing:-0.01em">Depo</span>` +
    `<span style="vertical-align:middle;margin-left:10px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#8c97a6">časomíra závodů</span>` +
    `</td></tr></table>`
  );
}

function radkyUdaju(v: PotvrzeniRegistraceVstup): [string, string][] {
  const u = v.udaje;
  if (!u) return [];
  const r: [string, string][] = [["Jméno a příjmení", `${v.jmeno} ${v.prijmeni}`]];
  if (u.rocnik) r.push(["Ročník narození", String(u.rocnik)]);
  if (u.pohlavi) r.push(["Pohlaví", u.pohlavi === "M" ? "Muž" : "Žena"]);
  if (u.kategorie) r.push(["Kategorie", u.kategorie]);
  if (u.klub?.trim()) r.push(["Klub", u.klub.trim()]);
  if (u.email?.trim()) r.push(["E-mail", u.email.trim()]);
  if (u.telefon?.trim()) r.push(["Telefon", u.telefon.trim()]);
  if (u.nouzovyKontakt?.trim()) r.push(["Nouzový kontakt", u.nouzovyKontakt.trim()]);
  if (u.zdravotniPoznamkaUvedena) r.push(["Zdravotní poznámka", "uvedena (z důvodu ochrany údajů ji v e-mailu neuvádíme)"]);
  if (u.clenoveDruzstva?.length) r.push(["Členové družstva", u.clenoveDruzstva.join(", ")]);
  return r;
}

/** Jediný zdroj textu potvrzovacího e-mailu — používá ho API při odesílání i náhled ve Správě. QR platba je v HTML jako `cid:qr-platba`. */
export function sestavPotvrzeniRegistrace(v: PotvrzeniRegistraceVstup): PotvrzeniRegistrace {
  const vlastni = v.vlastniText?.trim();

  const radky = radkyUdaju(v);
  const text = [
    `Dobrý den, ${v.jmeno} ${v.prijmeni},`,
    "",
    `děkujeme za registraci. Vaši přihlášku jsme přijali.`,
    "",
    `Akce: ${v.udalostNazev}`,
    `Trať: ${v.trasaNazev}`,
    "",
    "Registrace čeká na potvrzení pořadatelem. Startovní číslo vám přidělí pořadatel.",
  ];
  if (radky.length > 0) {
    text.push("", "Údaje, které jste uvedli:", ...radky.map(([k, h]) => `  ${k}: ${h}`));
  }
  if (vlastni) text.push("", vlastni);
  const platba = v.platba ?? null;
  const zprava = zpravaProPrijemce(v.jmeno, v.prijmeni);
  if (platba) {
    text.push(
      "",
      `Startovné: ${platba.castkaKc} Kč`,
      "Platba převodem:",
      `  Číslo účtu: ${platba.ucet}`,
      `  Částka: ${platba.castkaKc} Kč`,
      `  Zpráva pro příjemce: ${zprava}`
    );
    if (platba.podminky?.trim()) text.push("", "Platební podmínky:", platba.podminky.trim());
    if (platba.sQr) text.push("", "Platbu můžete také zaplatit QR kódem, najdete ho v příloze tohoto e-mailu.");
  }
  text.push("", ...podpisText(v), "", "—", "Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.");

  const td = "padding:4px 16px 4px 0;vertical-align:top";
  let html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2233;max-width:560px">` +
    znackovaHlavicka() +
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(v.jmeno)} ${escapeHtml(v.prijmeni)},</p>` +
    `<p style="margin:0 0 14px">děkujeme za registraci. Vaši přihlášku jsme přijali.</p>` +
    `<table style="border-collapse:collapse;margin:0 0 14px;font-size:15px">` +
    `<tr><td style="${td};color:#667085">Akce</td><td style="${td}"><strong>${escapeHtml(v.udalostNazev)}</strong></td></tr>` +
    `<tr><td style="${td};color:#667085">Trať</td><td style="${td}"><strong>${escapeHtml(v.trasaNazev)}</strong></td></tr>` +
    `</table>` +
    `<p style="margin:0 0 14px">Registrace čeká na potvrzení pořadatelem. Startovní číslo vám přidělí pořadatel.</p>`;

  if (radky.length > 0) {
    html +=
      `<p style="margin:0 0 6px"><strong>Údaje, které jste uvedli</strong></p>` +
      `<table style="border-collapse:collapse;margin:0 0 14px;font-size:14px">` +
      radky.map(([k, h]) => `<tr><td style="${td};color:#667085">${escapeHtml(k)}</td><td style="${td}">${escapeHtml(h)}</td></tr>`).join("") +
      `</table>`;
  }
  if (vlastni) {
    html += `<p style="margin:0 0 14px">${escapeHtml(vlastni).replace(/\n/g, "<br>")}</p>`;
  }
  if (platba) {
    const radek = (k: string, h: string, mono = false) =>
      `<tr><td style="${td};color:#667085;white-space:nowrap">${k}</td><td style="${td};font-weight:700${mono ? ";font-family:'JetBrains Mono','Courier New',monospace;font-size:13px" : ""}">${escapeHtml(h)}</td></tr>`;
    html +=
      `<div style="margin:0 0 14px;padding:16px;border:1px solid #d9dee7;border-radius:8px;max-width:440px">` +
      `<p style="margin:0 0 10px;font-size:17px"><strong>Startovné: ${platba.castkaKc} Kč</strong></p>` +
      `<p style="margin:0 0 6px;color:#667085;font-size:13px">Platba převodem na účet</p>` +
      `<table style="border-collapse:collapse;font-size:14px;margin:0 0 4px">` +
      radek("Číslo účtu", platba.ucet, true) +
      radek("Částka", `${platba.castkaKc} Kč`, true) +
      radek("Zpráva pro příjemce", zprava) +
      `</table>` +
      (platba.podminky?.trim()
        ? `<p style="margin:10px 0 0;font-size:13.5px"><strong>Platební podmínky</strong><br>${escapeHtml(platba.podminky.trim()).replace(/\n/g, "<br>")}</p>`
        : "") +
      (platba.sQr
        ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #e4e7ec;text-align:center">` +
          `<p style="margin:0 0 10px;color:#667085;font-size:13px">Nebo zaplaťte QR kódem v bankovní aplikaci</p>` +
          `<img src="cid:qr-platba" alt="QR platba" width="200" height="200" style="display:block;margin:0 auto;width:200px;height:200px"></div>`
        : "") +
      `</div>`;
  }
  html +=
    podpisHtml(v) +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.</p>` +
    `</div>`;

  return { predmet: `Potvrzení registrace — ${v.udalostNazev} (${v.trasaNazev})`, text: text.join("\n"), html };
}

export interface PotvrzeniPlatbyVstup {
  /** Vlastní závěrečný pozdrav akce (jinak výchozí). */
  podpis?: string | null;
  jmeno: string;
  prijmeni: string;
  startovniCislo: number;
  trasaNazev: string;
  udalostNazev: string;
  platbaCastkaKc?: number | null;
}

/** E-mail po zaškrtnutí „Zaplaceno" ve Startovní listině: platba je evidována a závodník dostává startovní číslo. */
export function sestavPotvrzeniPlatby(v: PotvrzeniPlatbyVstup): PotvrzeniRegistrace {
  const castka = v.platbaCastkaKc ? `${v.platbaCastkaKc} Kč` : null;
  const text = [
    `Dobrý den, ${v.jmeno} ${v.prijmeni},`,
    "",
    `${castka ? `platbu startovného (${castka}) jsme v pořádku evidovali` : "vaši platbu jsme v pořádku evidovali"} a vaše registrace je tím potvrzená.`,
    "",
    `Akce: ${v.udalostNazev}`,
    `Trať: ${v.trasaNazev}`,
    `Startovní číslo: ${v.startovniCislo}`,
    "",
    "Další pokyny k závodu vám případně sdělí pořadatel.",
    "",
    ...podpisText(v),
    "",
    "—",
    "Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.",
  ];

  const td = "padding:4px 16px 4px 0;vertical-align:top";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2233;max-width:560px">` +
    znackovaHlavicka() +
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(v.jmeno)} ${escapeHtml(v.prijmeni)},</p>` +
    `<p style="margin:0 0 14px">${castka ? `platbu startovného (<strong>${castka}</strong>) jsme v pořádku evidovali` : "vaši platbu jsme v pořádku evidovali"} a vaše registrace je tím potvrzená.</p>` +
    `<div style="margin:0 0 14px;padding:14px 16px;border:1px solid #d9dee7;border-radius:8px;text-align:center">` +
    `<div style="color:#667085;font-size:13px">Vaše startovní číslo</div>` +
    `<div style="font-size:42px;font-weight:700;line-height:1.2;font-family:'JetBrains Mono','Courier New',monospace">${v.startovniCislo}</div></div>` +
    `<table style="border-collapse:collapse;margin:0 0 14px;font-size:15px">` +
    `<tr><td style="${td};color:#667085">Akce</td><td style="${td}"><strong>${escapeHtml(v.udalostNazev)}</strong></td></tr>` +
    `<tr><td style="${td};color:#667085">Trať</td><td style="${td}"><strong>${escapeHtml(v.trasaNazev)}</strong></td></tr>` +
    `</table>` +
    `<p style="margin:0 0 14px">Další pokyny k závodu vám případně sdělí pořadatel.</p>` +
    podpisHtml(v) +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.</p>` +
    `</div>`;

  return { predmet: `Platba přijata — ${v.udalostNazev} (${v.trasaNazev})`, text: text.join("\n"), html };
}

export interface OznameniODojezduVstup {
  jmeno: string;
  prijmeni: string;
  startovniCislo: number;
  trasaNazev: string;
  udalostNazev?: string | null;
  casCelkem: string;
  odkazNaVysledky: string;
}

/** E-mail závodníkovi po dojezdu (na jeho e-mail z registrace): gratulace, čas v cíli a odkaz na výsledky akce. */
export function sestavOznameniODojezdu(v: OznameniODojezduVstup): PotvrzeniRegistrace {
  const jmeno = `${v.jmeno} ${v.prijmeni}`;
  const akce = v.udalostNazev?.trim() || null;
  const patickaText = `Tento e-mail vám posíláme, protože jste se zaregistrovali${akce ? ` na akci ${akce}` : ""}. Odeslal ho automaticky systém Depo, neodpovídejte na něj.`;
  const text = [
    `Dobrý den, ${jmeno},`,
    "",
    "gratulujeme, jste v cíli.",
    "",
    ...(akce ? [`Akce: ${akce}`] : []),
    `Trať: ${v.trasaNazev}`,
    `Startovní číslo: ${v.startovniCislo}`,
    `Váš čas: ${v.casCelkem}`,
    "",
    `Výsledky akce najdete tady: ${v.odkazNaVysledky}`,
    "",
    "—",
    patickaText,
  ];

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2233;max-width:560px">` +
    znackovaHlavicka() +
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(jmeno)},</p>` +
    `<p style="margin:0 0 4px;font-size:22px;font-weight:700">Jste v cíli</p>` +
    `<p style="margin:0 0 16px;color:#667085">${akce ? `${escapeHtml(akce)} · ` : ""}${escapeHtml(v.trasaNazev)}</p>` +
    `<div style="margin:0 0 16px;padding:16px;border:1px solid #d9dee7;border-radius:8px;text-align:center">` +
    `<div style="color:#667085;font-size:13px">Váš čas</div>` +
    `<div style="font-size:40px;font-weight:700;line-height:1.2;font-family:'JetBrains Mono','Courier New',monospace">${escapeHtml(v.casCelkem)}</div>` +
    `<div style="color:#667085;font-size:13px;margin-top:4px">startovní číslo ${v.startovniCislo}</div></div>` +
    `<p style="margin:0 0 20px;text-align:center"><a href="${escapeHtml(v.odkazNaVysledky)}" style="display:inline-block;background:#0b1220;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">Zobrazit výsledky akce</a></p>` +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">${escapeHtml(patickaText)}</p>` +
    `</div>`;

  return { predmet: `Jste v cíli${akce ? ` — ${akce}` : ""} (${v.trasaNazev})`, text: text.join("\n"), html };
}
