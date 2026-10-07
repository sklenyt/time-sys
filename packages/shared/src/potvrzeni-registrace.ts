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
  oznamovaciEmail?: string | null;
  clenoveDruzstva?: string[];
}

export interface PotvrzeniRegistraceVstup {
  jmeno: string;
  prijmeni: string;
  trasaNazev: string;
  udalostNazev: string;
  vlastniText?: string | null;
  platbaCastkaKc?: number | null;
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
  if (u.oznamovaciEmail?.trim()) r.push(["E-mail pro oznámení o dojezdu", u.oznamovaciEmail.trim()]);
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
    "Registrace čeká na potvrzení pořadatelem. Startovní číslo vám přidělí pořadatel, sdělí vám ho na místě nebo v další zprávě.",
  ];
  if (radky.length > 0) {
    text.push("", "Údaje, které jste uvedli:", ...radky.map(([k, h]) => `  ${k}: ${h}`));
  }
  if (vlastni) text.push("", vlastni);
  if (v.platbaCastkaKc) {
    text.push("", `Startovné: ${v.platbaCastkaKc} Kč`, "QR kód pro platbu najdete v příloze tohoto e-mailu.");
  }
  text.push("", "Těšíme se na vás na startu.", "", `Pořadatelé akce ${v.udalostNazev}`, "", "—", "Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.");

  const td = "padding:4px 16px 4px 0;vertical-align:top";
  let html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2233;max-width:560px">` +
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(v.jmeno)} ${escapeHtml(v.prijmeni)},</p>` +
    `<p style="margin:0 0 14px">děkujeme za registraci. Vaši přihlášku jsme přijali.</p>` +
    `<table style="border-collapse:collapse;margin:0 0 14px;font-size:15px">` +
    `<tr><td style="${td};color:#667085">Akce</td><td style="${td}"><strong>${escapeHtml(v.udalostNazev)}</strong></td></tr>` +
    `<tr><td style="${td};color:#667085">Trať</td><td style="${td}"><strong>${escapeHtml(v.trasaNazev)}</strong></td></tr>` +
    `</table>` +
    `<p style="margin:0 0 14px">Registrace čeká na potvrzení pořadatelem. Startovní číslo vám přidělí pořadatel, sdělí vám ho na místě nebo v další zprávě.</p>`;

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
  if (v.platbaCastkaKc) {
    html +=
      `<div style="margin:0 0 14px;padding:14px 16px;border:1px solid #d9dee7;border-radius:8px">` +
      `<p style="margin:0 0 8px"><strong>Startovné: ${v.platbaCastkaKc} Kč</strong></p>` +
      `<p style="margin:0 0 10px;color:#667085;font-size:14px">Pro platbu naskenujte QR kód v bankovní aplikaci.</p>` +
      `<img src="cid:qr-platba" alt="QR platba" width="220" height="220"></div>`;
  }
  html +=
    `<p style="margin:0 0 4px">Těšíme se na vás na startu.</p>` +
    `<p style="margin:0 0 20px">Pořadatelé akce ${escapeHtml(v.udalostNazev)}</p>` +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.</p>` +
    `</div>`;

  return { predmet: `Potvrzení registrace — ${v.udalostNazev} (${v.trasaNazev})`, text: text.join("\n"), html };
}

export interface PotvrzeniPlatbyVstup {
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
    "Startovní číslo si prosím uschovejte, budete ho potřebovat při prezenci a na trati. Další pokyny k závodu vám případně sdělí pořadatel.",
    "",
    "Těšíme se na vás na startu.",
    "",
    `Pořadatelé akce ${v.udalostNazev}`,
    "",
    "—",
    "Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.",
  ];

  const td = "padding:4px 16px 4px 0;vertical-align:top";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2233;max-width:560px">` +
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(v.jmeno)} ${escapeHtml(v.prijmeni)},</p>` +
    `<p style="margin:0 0 14px">${castka ? `platbu startovného (<strong>${castka}</strong>) jsme v pořádku evidovali` : "vaši platbu jsme v pořádku evidovali"} a vaše registrace je tím potvrzená.</p>` +
    `<div style="margin:0 0 14px;padding:14px 16px;border:1px solid #d9dee7;border-radius:8px;text-align:center">` +
    `<div style="color:#667085;font-size:13px">Vaše startovní číslo</div>` +
    `<div style="font-size:42px;font-weight:700;line-height:1.2">${v.startovniCislo}</div></div>` +
    `<table style="border-collapse:collapse;margin:0 0 14px;font-size:15px">` +
    `<tr><td style="${td};color:#667085">Akce</td><td style="${td}"><strong>${escapeHtml(v.udalostNazev)}</strong></td></tr>` +
    `<tr><td style="${td};color:#667085">Trať</td><td style="${td}"><strong>${escapeHtml(v.trasaNazev)}</strong></td></tr>` +
    `</table>` +
    `<p style="margin:0 0 14px">Startovní číslo si prosím uschovejte, budete ho potřebovat při prezenci a na trati. Další pokyny k závodu vám případně sdělí pořadatel.</p>` +
    `<p style="margin:0 0 4px">Těšíme se na vás na startu.</p>` +
    `<p style="margin:0 0 20px">Pořadatelé akce ${escapeHtml(v.udalostNazev)}</p>` +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">Tento e-mail byl odeslán automaticky systémem Depo, neodpovídejte na něj.</p>` +
    `</div>`;

  return { predmet: `Platba přijata, startovní číslo ${v.startovniCislo} — ${v.udalostNazev} (${v.trasaNazev})`, text: text.join("\n"), html };
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
    "gratulujeme, jste v cíli!",
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
    `<p style="margin:0 0 14px">Dobrý den, ${escapeHtml(jmeno)},</p>` +
    `<p style="margin:0 0 4px;font-size:22px;font-weight:700">Gratulujeme, jste v cíli!</p>` +
    `<p style="margin:0 0 16px;color:#667085">${akce ? `${escapeHtml(akce)} · ` : ""}${escapeHtml(v.trasaNazev)}</p>` +
    `<div style="margin:0 0 16px;padding:16px;border:1px solid #d9dee7;border-radius:8px;text-align:center">` +
    `<div style="color:#667085;font-size:13px">Váš čas</div>` +
    `<div style="font-size:40px;font-weight:700;line-height:1.2;font-family:'Courier New',monospace">${escapeHtml(v.casCelkem)}</div>` +
    `<div style="color:#667085;font-size:13px;margin-top:4px">startovní číslo ${v.startovniCislo}</div></div>` +
    `<p style="margin:0 0 20px;text-align:center"><a href="${escapeHtml(v.odkazNaVysledky)}" style="display:inline-block;background:#0b1220;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">Zobrazit výsledky akce</a></p>` +
    `<p style="margin:0;padding-top:12px;border-top:1px solid #e4e7ec;color:#98a2b3;font-size:12px">${escapeHtml(patickaText)}</p>` +
    `</div>`;

  return { predmet: `Jste v cíli${akce ? ` — ${akce}` : ""} (${v.trasaNazev})`, text: text.join("\n"), html };
}
