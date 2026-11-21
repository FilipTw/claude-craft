# ADR 0002: Bramki jakości jako kod

Status: przyjęta, 2026-11-21

## Kontekst

Do tej pory jedynymi bramkami były testy i build. Review był ręczny, test mutacyjny był jednorazowym skryptem, a wersja Node nie była przypięta. Lokalnie działał Node 26, a w CI Node 24, co raz zepsuło `npm test` w CI. Kodu jest około 300 linii, więc ścisłe reguły kosztują teraz najmniej.

## Decyzja

Każda reguła jakości jest kodem. `npm run check` uruchamia wszystkie bramki w tej samej postaci lokalnie, w hooku `pre-push` i w CI. Deploy rusza tylko po zielonym `check`.

| Bramka | Narzędzie | Co wymusza |
| --- | --- | --- |
| Wersja Node | `.nvmrc` (26), `engines` (`>=26`) | `.nvmrc` wybiera wersję dla nvm i CI. `engines` z `engine-strict` zatrzymuje `npm install` na starszym Node |
| Lint i format | Biome 2.6 | Funkcja do 40 linii, złożoność poznawcza do 10, brak nieużywanego kodu, jawne rozszerzenia importów |
| Typy | `astro check` z `checkJs`, TypeScript 6, preset `strictest` | Typy JSDoc dla modelu domeny i konfiguracji dependency-cruiser. Ostrzeżenia też blokują |
| Testy | `node --test` z pokryciem | Linie 95%, gałęzie 90%, funkcje 100% |
| Architektura | dependency-cruiser, `cmp` | Biała lista warstw: `structure.mjs` to rdzeń, `scaffold.mjs` i `freshness.mjs` nie importują siebie nawzajem. `docs/architecture.mmd` zgadza się z grafem z kodu |
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

Zmierzone 2026-11-21, po audycie:

- `npm run check` trwa około 5 s na rozgrzanej maszynie. Mediana z 5 przebiegów to 5,0 s, rozrzut od 4,9 do 5,8 s. Ten sam pomiar przed audytem dał 4,4 s. Krok `arch` trwa 0,76 s zamiast 0,41 s, bo drugi przebieg depcruise buduje graf do porównania. Pozostałe kroki trwają tyle samo. Pomiar szedł przy obciążeniu około 30 na 8 rdzeniach, więc rozrzut jest duży. Hook `pre-commit` trwa poniżej 1 s.
- Stryker bez `incremental` trwa około 17 s i daje 97,55% (478 zabitych z 490 ocenianych mutantów). 10 z 12 niewykrytych mutantów leży w blokach `if (process.argv[1] === ...)`, które uruchamiają CLI. Dwa pozostałe są równoważne z oryginałem: kotwica `^` przy BOM w `classify` i opcjonalny dwukropek w wyrażeniu, które skraca komunikat błędu YAML.
- `npm test` nie zostawia folderów tymczasowych. Przed audytem jeden przebieg zostawiał 22 foldery `cc-`.
- Nowy skrypt w `scripts/` musi mieć wpis na białej liście dependency-cruiser, testy i typy JSDoc.

## Wyjątki i odstępstwa od planu

- Formatowanie Markdown w Biome jest wyłączone. Biome 2.6 zmieniał `{{title}}` w szablonach stron na `{ { title } }` i dodawał pustą linię we frontmatterze. Markdown sprawdza markdownlint.
- `noShadow` jest w grupie `suspicious`, a nie `nursery`. Biome 2.6 przeniósł tę regułę. Żadnej reguły z planu nie usunięto.
- W plikach `.astro` Biome ma wyłączone `noUnusedVariables`, `noUnusedImports`, `useConst` i `useImportType`. Biome 2.6 czyta tam tylko frontmatter i nie widzi użycia w szablonie, więc odrzucał destrukturyzację `Astro.props` i import komponentu. Tę listę podaje dokumentacja Biome (Language support, „Linting HTML-ish languages”) dla wyłączonego `html.experimentalFullSupportEnabled`. Nieużyty import lub zmienną w `.astro` nadal zgłasza `astro check` (TS 6133).
- `not-to-unresolvable` pomija moduły `astro:*`, bo to wirtualne moduły Vite.
- dependency-cruiser nie parsuje plików `.astro` i `.mdx`. Test `no .astro or .mdx file in src imports from scripts/` w `scripts/architecture.test.mjs` skanuje ich importy i odrzuca każdy, który prowadzi do `scripts/`.
- `sharp` usunięto z zależności zamiast dodawać wyjątek w knip. Nic go nie importuje, a Astro instaluje go jako swoją zależność opcjonalną.
- `MD013` dopuszcza 1000 znaków w prozie, bo akapit to jedna linia. Nagłówki mają limit 80 znaków, a bloki kodu 120.
- `MD033` dopuszcza w MDX komponenty Starlight: `Aside`, `Badge`, `Card`, `CardGrid`, `Code`, `FileTree`, `Icon`, `LinkButton`, `LinkCard`, `Steps`, `TabItem` i `Tabs`. Zwykły HTML, np. `<div>`, dalej odpada. markdownlint porównuje nazwy bez względu na wielkość liter, więc `<aside>` i `<code>` jako HTML też przechodzą.
- Raport lcov w CI powstaje przez `NODE_OPTIONS` w kroku workflow. Skrypt `test:ci` z tymi flagami powodował błędy knip.
- Żaden mutant nie jest wyłączony komentarzem. Ostatni wyjątek zniknął razem ze starym parserem manifestu.
- `forbid-trailers` odrzuca każdy trailer, którego nazwa kończy się na `-by` albo ma część `ai`, także `Signed-off-by`. Commity mają jednego autora. Przed sprawdzeniem linia przechodzi normalizację NFKC, a każdy myślnik Unicode zmienia się w `-`.
- Linia z podpisem odpada tylko wtedy, gdy cała jest czasownikiem, przyimkiem i nazwą narzędzia AI, np. `🤖 Generated with [Claude Code](...)`. Każde słowo po nazwie narzędzia oznacza prozę, więc `Generated by Claude Code hooks, ...` przechodzi.
- Force-push na `main` kończy krok `Check commit messages` błędem `Invalid revision range`. Poprzedniego SHA nie ma w klonie, a sprawdzenie samego `github.sha` mogłoby przepuścić złe commity.
- Hook `pre-push` sprawdza `HEAD`. Push innej gałęzi niż bieżąca, np. `git push origin inna:main`, sprawdza zły commit. Ten przypadek łapie dopiero job `check` w CI.

## Audyt 2026-11-21

- Parser manifestu w `scripts/structure.mjs` czyta YAML jako `unknown`. Każda funkcja zawęża jeden węzeł i zwraca wartość, którą sprawdziła. W parserze nie ma `any` ani rzutowania. Komunikaty błędów i ich kolejność się nie zmieniły. Potwierdził to test różnicowy starego i nowego parsera na 40 000 losowo zmienionych manifestach. Jedyna różnica to nazwa pliku zapisana jako lista YAML. Stary parser ją przepuszczał, nowy ją odrzuca.
- Nazwa folderu albo pliku, która nie jest tekstem, ma własny komunikat. `{ dir: [01-sec] }` daje `"[0]" needs a text "dir"`. `{ file: [01-intro] }` w folderze `01-basics` daje `"01-basics/[0]" needs a text "file"`. Wcześniej oba przypadki dawały mylący komunikat, np. `"01-sec" must look like 01-kebab-case`, choć wartość tak wygląda. Ten sam nowy komunikat dostaje liczba, wartość logiczna i mapa. Brak nazwy albo `~` dalej daje `must look like 01-kebab-case`.
- `runScaffold`, `runFreshness` i `runForbidTrailers` zwracają `0` albo `1`, a blok CLI ustawia `process.exitCode`. Brak strony, złe znaczniki postępu, błędny YAML we frontmatterze i każdy błąd w `scripts/structure.yaml` dają jedną linię ze ścieżką i problemem. Te błędy mają klasę `DocsProblem` z `structure.mjs`. Każdy inny błąd, np. `EISDIR`, kończy proces ze stosem wywołań.
- Komunikaty skryptów są po angielsku. Mają postać etykiety z liczbą, np. `Pages created: 2.`, więc żaden nie potrzebuje form liczby mnogiej. Tabela postępu w `roadmap.md` zostaje po polsku, bo jest treścią strony.
- `structure.mjs` eksportuje stałą `ROADMAP`. `PAGES_OUTSIDE_MANIFEST` i `freshness.mjs` biorą z niej nazwę pliku roadmapy. Szablony stron leżą w `scripts/page-templates/`, a szablony z labów w `templates/`. Skrypt `check:fresh` nazywa się teraz `freshness`, bo zapisuje tabelę w `roadmap.md`.
- Każdy plik testów tworzy jeden folder tymczasowy i usuwa go w hooku `after`. Skan importów `.astro` i `.mdx` ma własny plik `scripts/architecture.test.mjs`.
- `sources` przyjmuje tylko adresy `https` przez `z.url({ protocol: /^https$/ })`. `z.string().url()` jest w Zod 4.6 przestarzałe i przepuszczało `http://`.
- `package.json` ma `engines.node` `>=26` i `private: true`. Bez `engines` ustawienie `engine-strict` w `.npmrc` niczego nie blokowało. `.nvmrc` dalej wybiera wersję, a `engines` ją wymusza. To odwraca wcześniejszą decyzję, która odrzucała `engines` jako drugie źródło wersji.
- `prepare` uruchamia `lefthook install`. `allowScripts` blokuje skrypt instalacyjny pakietu `lefthook`, ale `prepare` to skrypt projektu, więc `npm ci` instaluje hooki. `fsevents` ma w `allowScripts` wartość `false`, bo ładuje się z gotowego pliku binarnego.
- `tsconfig.json` obejmuje `.dependency-cruiser.cjs`, bo wzorzec `**/*` pomija pliki z kropką. Konfiguracja ma typ przez stałą `config`, bo TypeScript nie sprawdza typu JSDoc przy `module.exports`.
- `npm run arch` porównuje `docs/architecture.mmd` z grafem z kodu przez `cmp` i kończy się błędem przy różnicy. Plik odświeża `npm run arch:graph`. Porównanie niczego nie zapisuje i nie zależy od indeksu gita.
- `npm audit fix` bez `--force` podniósł `qs` do 6.17.1. Stryker dostaje go przez `typed-rest-client` 2.3.0, bo wersja 2.3.1 przypina `qs` 6.15.1.

## Otwarte podatności

`npm audit` zgłasza 8 podatności w zależnościach deweloperskich, 4 niskie i 4 umiarkowane. Żadna nie ma poprawki bez zmiany wersji głównej. `npm audit --omit=dev` w CI nie zgłasza nic.

- `minimatch` (odmowa usługi przez złośliwy wzorzec) i `glob` (przeszukiwanie po przerwaniu przez `AbortSignal`) przychodzą ze Strykerem 10. Poprawki nie ma.
- `katex` przychodzi z `markdownlint-cli2` przez `markdownlint` i `micromark-extension-math`. `npm audit fix --force` cofnąłby `markdownlint-cli2` do 0.16.0.
- Oba narzędzia czytają tylko pliki z repo. Dependabot zaproponuje aktualizację, gdy pojawi się poprawka.

## Odrzucone alternatywy

- ESLint i Prettier: dwa narzędzia i dwie konfiguracje zamiast jednego dla 4 skryptów.
- oxlint: szybki, ale nic nie dodaje obok Biome.
- TypeScript 7: `@astrojs/check` 0.9.12 obsługuje tylko wersje 5 i 6.
- SonarQube: koszt konfiguracji większy niż zysk przy jednym autorze.
- `withastro/action`: nie czyta `.nvmrc`.
- Tabela `Kind` z generycznym typem wyniku w parserze manifestu: wymaga rzutowania w miejscu, gdzie TypeScript nie łączy pętli po tabeli z typem wyniku, oraz ręcznych predykatów typów w JSDoc.
- Podział `scripts/structure.mjs` na moduły: plik ma jednego właściciela danych, a podział dodałby warstwy, przez które czytelnik musi przejść.
- Separatory ścieżek Windows w `findOrphans`: repo działa na macOS i Linuksie.
- Usunięcie override'u Biome dla `.astro` i skanu importów w `scripts/architecture.test.mjs`: w `src/` nie ma jeszcze plików `.astro`, ale oba zabezpieczenia kosztują mało, a pierwszy komponent od razu trafiłby na znany fałszywy alarm Biome.
- Wyłączenie `cache` w `lychee.toml` i `incremental` w Strykerze: CI nie przechowuje cache między przebiegami, więc oba pomagają tylko lokalnie. Lokalnie skracają kolejne przebiegi, więc zostają.
- `git diff --exit-code` po regeneracji grafu: bramka zapisywałaby plik w czasie sprawdzania i odrzucałaby poprawny graf, którego nie dodano do indeksu.
- `diff -u` zamiast `cmp`: knip zgłasza `diff` jako niezadeklarowany program, a `cmp` zna. Wyjątek w `ignoreBinaries` byłby nową regułą do pilnowania.
