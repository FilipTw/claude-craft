# claude-craft

Baza wiedzy o Claude Code jako strona Astro Starlight. Treść po polsku, nazwy plików i folderów po angielsku w kebab-case z prefiksem `NN-`.

## Komendy

- `npm run dev`: serwer deweloperski. Uruchamiaj go w tle przez `astro dev --background` i zatrzymuj przez `astro dev stop`.
- `npm run build`: build z walidacją schematu i linków. Musi przejść przed każdym commitem.
- `npm test`: testy skryptów w `scripts/`.
- `npm run scaffold`: tworzy strony z `scripts/structure.yaml`, których jeszcze nie ma. Nigdy nie nadpisuje.
- `npm run check:fresh`: raport aktualności i tabela postępu w `src/content/docs/roadmap.md`.

## Dodawanie i zmiana stron

- Drzewo stron żyje tylko w `scripts/structure.yaml`. Nową stronę dodaj tam, potem uruchom `npm run scaffold`. Sidebar buduje się z manifestu.
- Po utworzeniu pliku jego frontmatter jest właścicielem `title` i `type`.
- Zmiana nazwy lub kolejności: zmień manifest i przenieś plik przez `git mv`. `npm run scaffold` wypisze pliki spoza manifestu.

## Pisanie treści

- Strona ma jeden tryb Diátaxis z pola `type`: `tutorial`, `how-to`, `reference` albo `explanation`. Nie mieszaj trybów. Podziel stronę i dodaj link.
- Temat ma jedno miejsce. Inne strony linkują do niego i nie powtarzają treści.
- Każdy fakt ma źródło w `sources`. Najpierw oficjalna dokumentacja (`code.claude.com/docs`), potem repo autora, potem blog eksperta.
- Po sprawdzeniu strony ze źródłami ustaw `lastVerified: RRRR-MM-DD`. Bez tego pola strona liczy się jako nienapisana.
- Pisz przez skille `pstack:technical-writing` i `pstack:unslop`.

## Commity

Conventional Commits, na przykład `docs(hooks): write events lifecycle page`. Bez linii `Co-Authored-By`.
