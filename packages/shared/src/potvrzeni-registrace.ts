export interface PotvrzeniRegistraceVstup {
  jmeno: string;
  prijmeni: string;
  trasaNazev: string;
  udalostNazev: string;
  vlastniText?: string | null;
  platbaCastkaKc?: number | null;
}

export interface PotvrzeniRegistrace {
  predmet: string;
  text: string;
  html: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Jediný zdroj textu potvrzovacího e-mailu — používá ho API při odesílání i náhled ve Správě. QR platba je v HTML jako `cid:qr-platba`. */
export function sestavPotvrzeniRegistrace(v: PotvrzeniRegistraceVstup): PotvrzeniRegistrace {
  const radkyText = [
    `Ahoj ${v.jmeno} ${v.prijmeni},`,
    "",
    `zaregistrovali jste se na trať "${v.trasaNazev}" (${v.udalostNazev}). Startovní číslo vám přidělí pořadatel, dozvíte se ho na místě nebo v další zprávě.`,
  ];
  let html = `<p>Ahoj ${escapeHtml(v.jmeno)} ${escapeHtml(v.prijmeni)},</p><p>zaregistrovali jste se na trať „${escapeHtml(v.trasaNazev)}“ (${escapeHtml(v.udalostNazev)}). Startovní číslo vám přidělí pořadatel, dozvíte se ho na místě nebo v další zprávě.</p>`;

  const vlastni = v.vlastniText?.trim();
  if (vlastni) {
    radkyText.push("", vlastni);
    html += `<p>${escapeHtml(vlastni).replace(/\n/g, "<br>")}</p>`;
  }

  if (v.platbaCastkaKc) {
    radkyText.push("", `Startovné: ${v.platbaCastkaKc} Kč — QR platbu najdete v příloze tohoto e-mailu.`);
    html += `<p><strong>Startovné: ${v.platbaCastkaKc} Kč</strong></p><p><img src="cid:qr-platba" alt="QR platba" width="220" height="220"></p>`;
  }

  return { predmet: `Registrace přijata — ${v.trasaNazev}`, text: radkyText.join("\n"), html };
}
