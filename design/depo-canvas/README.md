# Depo — zdrojové soubory z Claude Design

Toto jsou originální exportované soubory z Claude Design plátna (`claude.ai/design`), na kterém vznikla grafická identita a návrh obrazovek aplikace Depo. Zpracované screenshoty z těchto souborů jsou v [`docs/images/`](../../docs/images/) a popsané v [`docs/14-graficka-identita.md`](../../docs/14-graficka-identita.md) a [`docs/07-ui-mockups.md`](../../docs/07-ui-mockups.md).

## Soubory

- `Depo Identita.dc.html` — grafická identita (logo koncepty, finální lockup, PWA ikona, barevný systém, typografie, brand guideline).
- `Depo Aplikace.dc.html` — klíčové obrazovky aplikace (Měření na telefonu/iPadu/desktopu, Dashboard, Výsledky/Kdo běží/Startovní listina, Landing page, Onboarding + Publikace výsledků).
- `support.js` — runtime Claude Design pro `.dc.html` formát (generováno nástrojem, needitovat ručně).

## Jak soubory znovu otevřít/vykreslit

Soubory jsou standardní HTML a dají se otevřít v libovolném prohlížeči (`open "Depo Identita.dc.html"`), ale `support.js` za běhu stahuje React, ReactDOM a Babel z `unpkg.com` (viz konstanty `REACT_URL`/`REACT_DOM_URL`/`BABEL_URL` v `support.js`). Pokud prostředí nemá přístup k `unpkg.com` (např. firemní proxy, sandboxované CI), soubor se nevykreslí — v takovém případě před načtením `support.js` nastavte `window.__resources` na lokální kopie:

```html
<script>
window.__resources = {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js": "./vendor/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js": "./vendor/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js": "./vendor/babel.min.js"
};
</script>
<script src="./support.js"></script>
```

a do `./vendor/` dejte odpovídající verze balíčků (např. `npm install react@18.3.1 react-dom@18.3.1 @babel/standalone@7.29.0` a zkopírovat `umd/*.production.min.js`, resp. `babel.min.js`). Přesně takhle vznikly screenshoty v `docs/images/`.

## Nejnovější verze

Živé, editovatelné plátno (pokud k němu máte přístup) je na:
- https://claude.ai/design/p/1cde576f-5ad2-40a1-9845-06cd6133632e?file=Depo+Identita.dc.html
- https://claude.ai/design/p/1cde576f-5ad2-40a1-9845-06cd6133632e?file=Depo+Aplikace.dc.html

Soubory v tomto adresáři jsou snapshot k datu exportu — při další úpravě designu je potřeba znovu exportovat a nahradit.
