---
titulek: Můj účet, organizace a smazání účtu
sekce: Správa a bezpečnost
poradi: 5
popis: Jak přepínat mezi organizacemi, jak spravovat organizace a členy a jak smazat svůj účet.
klicova: ucet smazat smazani zrusit ucet gdpr vymaz organizace prepnout clen clenove super admin
---

## Můj účet

V levém menu dole je položka **Můj účet**. Najdete na ní:

- nahoře čtyři karty: jméno a e-mail, počet organizací, aktivní organizace a oprávnění,
- tabulku **Moje organizace** s počtem akcí a členů a tlačítkem **Přepnout** u těch, které nejsou aktivní,
- kartu **Smazání účtu**.

## Organizace a přepínání

Organizace je klub nebo pořadatel, který má vlastní akce, tratě, čipy a lidi. **Jeden člověk může být členem víc organizací** (třeba časoměřič, který dělá pro dva kluby).

Vždycky je ale jedna organizace **aktivní** a podle ní se řídí, jaké akce vidíte a kam zakládáte nové. Pokud jste členem víc organizací, je v levém horním rohu menu přepínač organizace. Po přepnutí se appka znovu načte a ukáže akce vybrané organizace. Stejné přepnutí je na stránce Můj účet.

## Správa organizací (super admin)

Super admin má v menu navíc položku **Organizace**:

1. **Založit organizaci**: napište název a klikněte na **Založit organizaci**.
2. **Přejmenovat**: tlačítko u organizace.
3. **Členové**: rozbalí seznam lidí a políčko **Přidat do organizace**. Zadejte e-mail existujícího účtu (člověk se musí v Depu nejdřív zaregistrovat). Člověk se přidá k organizacím, ve kterých už je, a mezi nimi se přepíná v menu.
4. **Odebrat** člena z organizace. Pokud to byla jeho aktivní organizace, přepne se na jinou, nebo na žádnou.

U každé organizace vidíte počet akcí, členů a čipů ve skladu. Sklad čipů je popsaný v článku [RFID čipy](/napoveda/rfid-cipy).

## Smazání vlastního účtu

Na stránce **Můj účet** v sekci **Smazat účet**:

1. Klikněte na **Smazat účet…**.
2. Zadejte své **heslo** a pro potvrzení napište svůj **e-mail**.
3. Klikněte na **Smazat účet navždy**.

Smazání **nejde vrátit**. Zmizí vaše přihlášení, členství v organizacích a role na akcích. Akce, výsledky a časy závodníků zůstanou, jen u časových zápisů a v auditním logu nebude vaše jméno jako autora.

**Kdy účet smazat nejde:** pokud jste **jediným správcem (rolí ADMIN) neukončené akce**. Akce by pak zůstala bez správce. Appka vypíše názvy takových akcí. Nejdřív přidejte u akce dalšího správce (Správa akcí → **Lidé s přístupem**) nebo akci ukončete.

Smazaný účet se dá znovu založit stejným e-mailem běžnou registrací, ale už bude úplně prázdný, bez dřívějších organizací a rolí.

## Smazání cizího účtu (super admin)

Super admin najde v menu **Uživatelé** u každého účtu (kromě svého) tlačítko **Smazat**. Pro potvrzení musí napsat e-mail mazaného účtu. Účet se smaže se stejnými důsledky jako při smazání vlastního účtu, jen bez zadání hesla. Vlastní účet smaže super admin na stránce Můj účet.

Pokud člověk požádá o výmaz svých osobních údajů, může si účet smazat sám, nebo to za něj udělá super admin. Údaje závodníků (registrace) se mažou podle pravidel uchovávání, viz [Ochrana osobních údajů](/napoveda/ochrana-udaju).
