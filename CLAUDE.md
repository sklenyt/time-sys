# Pokyny pro práci v tomto repozitáři

## Uživatelská nápověda musí sedět s appkou

`apps/web/src/napoveda/clanky/*.md` je uživatelská dokumentace (stránka `/napoveda`), psaná podle skutečného chování appky — ne podle toho, co appka podle popisu/komentářů dělat má.

**Při každé změně, která ovlivní, jak appku používá organizátor nebo divák** (nová funkce, změna existujícího chování, nové pole ve formuláři, nové tlačítko, oprava chování, na kterém byl postavený popis v nápovědě), **rovnou uprav i odpovídající článek(y) v `apps/web/src/napoveda/clanky/`** — ve stejném PR/commitu, ne jako samostatný úkol later. Platí to i pro drobné UX opravy (např. tlačítko, které předtím nic nedělalo, teď funguje).

Kdy naopak nápovědu **needit** neupravovat:
- čistě interní refaktor beze změny chování,
- backendová změna bez viditelného dopadu na appku,
- oprava, která appku jen vrací k původně zamýšlenému/dokumentovanému chování.

**Nikdy nepiš do nápovědy funkci, která v UI reálně neexistuje** — pokud endpoint existuje jen na API bez tlačítka/pole v appce, buď to UI doplň (pokud je to malá, dobře ohraničená věc), nebo to v nápovědě popiš přesně tak, jak to je (žádný krok navíc, který uživatel nemůže v appce udělat).

Struktura článku: frontmatter (`titulek`, `sekce` — musí být jedna z `SEKCE` v `apps/web/src/napoveda/clanky.ts`, `poradi`, `popis`, `klicova` — synonyma pro fulltextové vyhledávání), pak Markdown s `##`/`###` nadpisy (fulltextové vyhledávání dělí obsah přesně podle nich). Odkazy mezi články: `[text](/napoveda/slug)`.
