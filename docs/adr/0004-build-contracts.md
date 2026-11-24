# ADR 0004: Kontrakty zbudowanej strony

Status: przyjęta, 2026-11-24

## Kontekst

Przegląd kodu z 2026-11-24 znalazł trzy luki, których nie łapie żadna bramka z ADR 0002:

- Postęp na stronie startowej i w sidebarze liczył każdą stronę z `lastVerified`. Tabela w `roadmap.md` przenosi stronę po 90 dniach do kolumny „Do sprawdzenia”. Te same strony dawały więc dwie różne liczby.
- CSS i skrypty komponentów wybierają 32 klasy Starlight i Pagefind, na przykład `.sl-markdown-content`, `.dialog-frame` i `.pagefind-ui__search-input`. Dependabot podbija Starlight, a CI sprawdzał tylko, czy build przechodzi. Klasa, którą Starlight zmieni albo usunie, psuła wygląd bez żadnego błędu.
- ADR 0003 ustala budżety CSS i fontów, ale mierzyliśmy je tylko ręcznie.

## Decyzja

Regułę świeżości trzyma jeden moduł: `src/lib/verification.mjs`. Importują go `scripts/freshness.mjs` i `src/lib/home.mjs`, a dependency-cruiser pozwala tylko na te dwa importy. Moduł leży w `src/lib`, bo komponenty nie mogą importować `scripts/` (`scripts/architecture.test.mjs`).

`scripts/check-build.mjs` (`npm run build:check`) czyta `dist/` po buildzie. Job `build` w CI uruchamia go zaraz po `npm run build`. Skrypt sprawdza dwie rzeczy:

- Każda klasa bez prefiksu `cc-`, którą wybiera `src/styles/*.css`, blok `<style>` albo wywołanie `querySelector`, `querySelectorAll` lub `closest` w `src/components/*.astro`, istnieje w buildzie. Klasa istnieje, gdy występuje w atrybucie `class` w HTML, w bundlu Pagefind UI (`dist/pagefind/*.js`) albo w kodzie komponentów MDX Starlight (`user-components/*.astro`). Ostatnie źródło obejmuje `Aside` i `Card`, których żadna strona jeszcze nie używa.
- CSS z `dist/_astro` po gzip mieści się w 50 KB, a pliki woff2 w 100 KB.

`npm run check` nie uruchamia tego skryptu, bo skrypt potrzebuje builda. Lokalnie uruchamiasz `npm run build && npm run build:check`.

## Konsekwencje

- Strona sprawdzona ponad 90 dni temu znika z postępu w sidebarze i na stronie startowej przy pierwszym buildzie po przekroczeniu progu. Strona jest statyczna, więc wiek liczymy względem dnia builda, a nie dnia odwiedzin. Sekcja „Ostatnio zweryfikowane” dalej sortuje strony po dacie, bez względu na wiek.
- Skrypt nie sprawdza selektorów elementów i atrybutów, np. `site-search`. Nie widzi też klas, które JavaScript Starlight dodaje w przeglądarce, poza klasami Pagefind.
- Budżet CSS liczy wszystkie arkusze, także te, których dana strona nie ładuje. To górna granica.
- Dostępność (axe, pa11y), Lighthouse i CLS z ADR 0003 dalej mierzymy ręcznie. Automatyczny pomiar wymaga przeglądarki w CI i osobnej decyzji.

Zmierzone 2026-11-24: w buildzie jest 32 z 32 klas, CSS waży 21,1 KB z 50 KB, a fonty 46,0 KB ze 100 KB. Stryker daje dla `check-build.mjs` 98,88%. Jedyny niewykryty mutant to strażnik `if (process.argv[1] === ...)`, tak jak w pozostałych skryptach CLI.
