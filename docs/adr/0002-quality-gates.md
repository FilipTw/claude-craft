# ADR 0002: Bramki jakości jako kod

Status: przyjęta, 2026-11-21

## Kontekst

Do tej pory jedynymi bramkami były testy i build. Review był ręczny, test mutacyjny był jednorazowym skryptem, a wersja Node nie była przypięta. Lokalnie działał Node 26, a w CI Node 24, co raz zepsuło `npm test` w CI. Kodu jest około 300 linii, więc ścisłe reguły kosztują teraz najmniej.

## Decyzja

Każda reguła jakości jest kodem. `npm run check` uruchamia wszystkie bramki w tej samej postaci lokalnie, w hooku `pre-push` i w CI. Deploy rusza tylko po zielonym `check`.

| Bramka | Narzędzie | Co wymusza |
| --- | --- | --- |
| Wersja Node | `.nvmrc` (26) | Jedno źródło wersji dla maszyny lokalnej i CI |
| Lint i format | Biome 2.6 | Funkcja do 40 linii, złożoność poznawcza do 10, brak nieużywanego kodu, jawne rozszerzenia importów |
| Typy | `astro check` z `checkJs`, TypeScript 6, preset `strictest` | Typy JSDoc dla modelu domeny. Ostrzeżenia też blokują |
| Testy | `node --test` z pokryciem | Linie 95%, gałęzie 90%, funkcje 100% |
| Architektura | dependency-cruiser | Biała lista warstw: `structure.mjs` to rdzeń, `scaffold.mjs` i `freshness.mjs` nie importują siebie nawzajem |
| Martwy kod | knip | Tryb domyślny i `--production --strict` |
| Markdown | markdownlint-cli2 | Jeden `h1` z frontmattera, spójne listy i tabele |
| Commity | lefthook, commitlint, `scripts/forbid-trailers.mjs`, krok `Check commit messages` w CI | Conventional Commits, brak trailerów `*-by:` i `AI-*:` oraz linii z podpisem narzędzia AI |
| Mutacje | Stryker 10 z tap-runnerem | Wynik co najmniej 90%. Uruchamiany co tydzień i ręcznie |
| Linki | lychee | Zewnętrzne źródła sprawdzane co tydzień |
| Łańcuch dostaw | Akcje przypięte do SHA, Dependabot, `npm audit` | Minimalne `permissions` dla każdego joba |

Zasady:

- Progi tylko rosną. Gdy kod nie przechodzi, naprawiasz kod albo dopisujesz test zachowania.
- Wyjątek od reguły to komentarz z regułą i powodem, np. `// biome-ignore <reguła>: <powód>` albo `// Stryker disable next-line <mutator>: <powód>`.
- `npm run check` czyta drzewo robocze, a nie wypychane commity. Dlatego hook `pre-push` najpierw wymaga czystego drzewa: `git status --porcelain` musi być pusty, z plikami nieśledzonymi włącznie. Pliki z `.gitignore` się nie liczą.
- Hook `commit-msg` można pominąć (`--no-verify`, `LEFTHOOK=0`, commit w interfejsie GitHuba). Dlatego job `check` w CI sprawdza commitlintem i `forbid-trailers` każdy commit pull requesta (`base.sha..head.sha`) albo pusha (`before..sha`). Gdy `before` to same zera, sprawdza tylko `github.sha`.

## Konsekwencje

Zmierzone 2026-11-21:

- `npm run check` trwa około 7 s na rozgrzanej maszynie. Hook `pre-commit` trwa poniżej 1 s.
- Stryker trwa około 32 s i daje 96,68% (378 zabitych z 394 mutantów). 11 z 13 niewykrytych mutantów leży w blokach CLI, które piszą do prawdziwego drzewa stron.
- Nowy skrypt w `scripts/` musi mieć wpis na białej liście dependency-cruiser, testy i typy JSDoc.

## Wyjątki i odstępstwa od planu

- Formatowanie Markdown w Biome jest wyłączone. Biome 2.6 zmieniał `{{title}}` w szablonach stron na `{ { title } }` i dodawał pustą linię we frontmatterze. Markdown sprawdza markdownlint.
- `noShadow` jest w grupie `suspicious`, a nie `nursery`. Biome 2.6 przeniósł tę regułę. Żadnej reguły z planu nie usunięto.
- W plikach `.astro` Biome ma wyłączone `noUnusedVariables`, `noUnusedImports`, `useConst` i `useImportType`. Biome 2.6 czyta tam tylko frontmatter i nie widzi użycia w szablonie, więc odrzucał destrukturyzację `Astro.props` i import komponentu. Tę listę podaje dokumentacja Biome (Language support, „Linting HTML-ish languages”) dla wyłączonego `html.experimentalFullSupportEnabled`. Nieużyty import lub zmienną w `.astro` nadal zgłasza `astro check` (TS 6133).
- `not-to-unresolvable` pomija moduły `astro:*`, bo to wirtualne moduły Vite.
- dependency-cruiser nie parsuje plików `.astro` i `.mdx`. Test `no .astro or .mdx file in src imports from scripts/` w `scripts/structure.test.mjs` skanuje ich importy i odrzuca każdy, który prowadzi do `scripts/`.
- `sharp` usunięto z zależności zamiast dodawać wyjątek w knip. Nic go nie importuje, a Astro instaluje go jako swoją zależność opcjonalną.
- `MD013` dopuszcza 1000 znaków w prozie, bo akapit to jedna linia. Nagłówki mają limit 80 znaków, a bloki kodu 120.
- `MD033` dopuszcza w MDX komponenty Starlight: `Aside`, `Badge`, `Card`, `CardGrid`, `Code`, `FileTree`, `Icon`, `LinkButton`, `LinkCard`, `Steps`, `TabItem` i `Tabs`. Zwykły HTML, np. `<div>`, dalej odpada. markdownlint porównuje nazwy bez względu na wielkość liter, więc `<aside>` i `<code>` jako HTML też przechodzą.
- Raport lcov w CI powstaje przez `NODE_OPTIONS` w kroku workflow. Skrypt `test:ci` z tymi flagami powodował błędy knip.
- Dwa mutanty `StringLiteral` są wyłączone komentarzem, bo są równoważne z oryginałem.
- `forbid-trailers` odrzuca każdy trailer, którego nazwa kończy się na `-by` albo ma część `ai`, także `Signed-off-by`. Commity mają jednego autora. Przed sprawdzeniem linia przechodzi normalizację NFKC, a każdy myślnik Unicode zmienia się w `-`.
- Linia z podpisem odpada tylko wtedy, gdy cała jest czasownikiem, przyimkiem i nazwą narzędzia AI, np. `🤖 Generated with [Claude Code](...)`. Każde słowo po nazwie narzędzia oznacza prozę, więc `Generated by Claude Code hooks, ...` przechodzi.
- Force-push na `main` kończy krok `Check commit messages` błędem `Invalid revision range`. Poprzedniego SHA nie ma w klonie, a sprawdzenie samego `github.sha` mogłoby przepuścić złe commity.
- Hook `pre-push` sprawdza `HEAD`. Push innej gałęzi niż bieżąca, np. `git push origin inna:main`, sprawdza zły commit. Ten przypadek łapie dopiero job `check` w CI.

## Odrzucone alternatywy

- ESLint i Prettier: dwa narzędzia i dwie konfiguracje zamiast jednego dla 4 skryptów.
- oxlint: szybki, ale nic nie dodaje obok Biome.
- TypeScript 7: `@astrojs/check` 0.9.12 obsługuje tylko wersje 5 i 6.
- SonarQube: koszt konfiguracji większy niż zysk przy jednym autorze.
- Pole `engines` w `package.json`: drugie źródło wersji Node obok `.nvmrc`.
- `withastro/action`: nie czyta `.nvmrc`.
