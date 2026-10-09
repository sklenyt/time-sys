import { Link } from "react-router-dom";

export function PrivacyPolicy() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <img src="/depo-mark.svg" alt="" width={68} height={68} />
          Depo
        </Link>
        <nav className="landing-nav-links">
          <Link to="/">Zpět na web</Link>
        </nav>
      </header>

      <section className="landing-section legal-page">
        <div className="legal-page-inner">
          <h1>Zásady ochrany osobních údajů</h1>
          <p className="legal-updated">Platnost od 25. 9. 2026</p>

          <h2>1. Kdo je správcem údajů</h2>
          <p>
            Provozovatelem služby Depo a správcem osobních údajů je Tomáš Sklenář, IČO 06755071. Ve věcech ochrany
            osobních údajů (přístup k údajům, oprava, výmaz, další dotazy) mě kontaktujte na{" "}
            <a href="mailto:gdpr@depotime.cz">gdpr@depotime.cz</a>.
          </p>

          <h2>2. Jaké údaje zpracováváme</h2>
          <p>Podle toho, v jaké roli Depo používáte:</p>
          <ul>
            <li>
              <strong>Organizátor (uživatel s účtem)</strong> — e-mail a heslo (heslo jen jako hash, nikdy v čitelné
              podobě).
            </li>
            <li>
              <strong>Závodník na startovní listině</strong> — jméno, příjmení, ročník narození, pohlaví, kategorie,
              klub/družstvo a nepovinně e-mail/telefon (pokud je organizátor při závodě vyžaduje, např. pro zaslání
              výsledků nebo nouzový kontakt).
            </li>
            <li>
              <strong>Naměřené časy a pořadí</strong> — vznikají při vlastním měření závodu a jsou spojené se
              startovním číslem/přihláškou.
            </li>
          </ul>

          <h2>3. Účel a právní základ zpracování</h2>
          <ul>
            <li>Organizace a vyhodnocení sportovního závodu — plnění smlouvy mezi vámi a pořadatelem závodu.</li>
            <li>
              Zveřejnění výsledků (jméno, klub, kategorie, čas) na veřejné výsledkové stránce — oprávněný zájem
              pořadatele na prezentaci výsledků závodu. E-mail a telefon se ve veřejných výsledcích nikdy nezobrazují.
            </li>
            <li>Provoz uživatelského účtu organizátora — plnění smlouvy (poskytnutí služby Depo).</li>
          </ul>

          <h2>4. Jak dlouho údaje uchováváme</h2>
          <p>
            Přihlášky u závodů starších než 2 roky se automaticky anonymizují (jméno, kontakt a zdravotní poznámka se
            smažou, samotný naměřený čas zůstává jako anonymní statistika, aby neztratil návaznost na výsledky
            závodu). Výmaz můžete vyžádat i dříve — viz níže.
          </p>

          <h2>5. Vaše práva</h2>
          <p>Máte právo na:</p>
          <ul>
            <li>přístup k vašim osobním údajům,</li>
            <li>opravu nepřesných údajů,</li>
            <li>výmaz (přihlášku na závod vám na vyžádání anonymizujeme),</li>
            <li>omezení zpracování a námitku proti zpracování,</li>
            <li>podání stížnosti u Úřadu pro ochranu osobních údajů (uoou.gov.cz), pokud se domníváte, že vaše údaje zpracováváme v rozporu se zákonem.</li>
          </ul>
          <p>
            Žádost stačí poslat na <a href="mailto:gdpr@depotime.cz">gdpr@depotime.cz</a>, vyřídíme ji bez zbytečného
            odkladu.
          </p>

          <h2>6. Cookies a lokální úložiště</h2>
          <p>
            Depo nepoužívá sledovací ani marketingové cookies a nemá zabudovanou žádnou analytiku třetích stran.
            Přihlášení organizátora funguje přes token uložený v prohlížeči (localStorage), který slouží výhradně k
            tomu, abyste zůstali přihlášení — nejde o sledování napříč weby.
          </p>

          <h2>7. Kdo se k údajům dostane (zpracovatelé)</h2>
          <p>
            Data zpracováváme u těchto poskytovatelů infrastruktury: Supabase (databáze), Fly.io (aplikační server) a
            Cloudflare (hosting webu a CDN). Žádnému dalšímu subjektu údaje neprodáváme ani nepředáváme k marketingovým
            účelům.
          </p>

          <h2>8. Dobrovolné příspěvky na vývoj</h2>
          <p>
            Příspěvek přes QR platbu na stránce Ceník je dobrovolný dar na další vývoj Depa, ne platba za poskytnutou
            službu — Depo zůstává používání zdarma bez ohledu na to, jestli přispějete. Údaje o platbě (kdo kolik
            poslal) nevidím ani nezpracovávám — platba jde přímo na bankovní účet mimo aplikaci Depo.
          </p>
        </div>
      </section>
    </div>
  );
}
