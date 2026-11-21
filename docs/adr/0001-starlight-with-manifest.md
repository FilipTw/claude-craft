# ADR 0001: Starlight z manifestem jako jedynym źródłem drzewa stron

Status: przyjęta, 2026-11-21

## Kontekst

Repo to baza wiedzy z około 190 stronami w 22 sekcjach. Strony mają być czytelne jako strona WWW, na GitHubie i w Obsidianie. Kolejność nauki musi być stała. Tematy Claude Code zmieniają się co kilka tygodni, więc każda strona musi pokazywać, kiedy ktoś ją ostatnio sprawdził.

## Decyzja

- Strona powstaje w Astro Starlight 0.43 i trafia na GitHub Pages.
- Drzewo stron, kolejność i polskie etykiety sidebara żyją tylko w `scripts/structure.yaml`. `scripts/structure.mjs` waliduje manifest raz, na wejściu, i buduje z niego sidebar.
- `scripts/scaffold.mjs` tworzy brakujące strony z szablonu typu i nigdy nie nadpisuje istniejących. Po utworzeniu strony jej frontmatter jest właścicielem `title` i `type`.
- Każda strona ma pole `type` z jednym trybem Diátaxis. Schemat w `src/content.config.ts` przerywa build przy złym typie albo dacie z przyszłości.
- Postęp liczy się z `lastVerified`. Nie ma osobnego pola `status`. `scripts/freshness.mjs` oznacza stronę jako do sprawdzenia po 90 dniach.
- Nazwy plików i folderów mają prefiks `NN-`, tak jak w repo `dock-ops` i `pg-atlas`. Prefiks trafia do adresu URL.

## Konsekwencje

- Nowa strona wymaga wpisu w manifeście. Test na prawdziwym drzewie nie przechodzi, gdy plik leży poza manifestem, więc CI blokuje taką stronę.
- Zmiana tytułu w manifeście po utworzeniu strony nic nie zmienia. Tytuł zmienia się we frontmatterze.
- Adresy mają postać `/10-hooks/02-events-lifecycle/`. Zmiana kolejności zmienia adres.

## Odrzucone alternatywy

- Material for MkDocs: tryb maintenance od listopada 2025. Zensical, jego następca, jest w becie.
- `autogenerate` w Starlight: zagnieżdżona grupa dostaje surową nazwę folderu jako etykietę, np. `03-matt-pocock`.
- Usunięcie prefiksów przez `docsLoader({ generateId })`: sidebar sortuje po identyfikatorze, więc każda strona potrzebowałaby `sidebar.order`. Kolejność byłaby wtedy zapisana w dwóch miejscach.
- Pole `status` we frontmatterze: drugie źródło prawdy obok `lastVerified`.
