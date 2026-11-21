# claude-craft

Baza wiedzy do nauki Claude Code i pracy z agentami AI na poziomie Senior Dev. Strona: <https://filiptw.github.io/claude-craft/>

Każda strona ma źródła i datę ostatniej weryfikacji. Skrypt `npm run freshness` pokazuje strony starsze niż 90 dni.

## Ścieżka nauki

| Część | Sekcje |
| --- | --- |
| I. Fundamenty | Instalacja, sposób działania agenta, pierwsza sesja |
| II. Codzienna praca | Tryb interaktywny, kontekst, pamięć, przepływy pracy |
| III. Konfiguracja i kontrola | Ustawienia, uprawnienia, modele, koszty |
| IV. Rozszerzanie | Skille, subagenci, hooki, MCP, pluginy |
| V. Automatyzacja | Git i code review, headless, Agent SDK, chmura |
| VI. Ekosystem | Skille społeczności (Pocock, Osmani, gstack, pstack, superpowers), T3 Code i inne narzędzia |
| VII. Praktyka seniora | Bezpieczeństwo, praktyki, rozwiązywanie problemów |

Do tego referencja, laby i materiały.

## Uruchomienie lokalne

Wymaga Node 26 lub nowszego. Wersję podaje `.nvmrc`.

```sh
npm install
npm run dev
```

## Struktura repo

| Ścieżka | Zawartość |
| --- | --- |
| `src/content/docs/` | Strony w Markdown |
| `scripts/structure.yaml` | Drzewo stron i sidebar |
| `scripts/page-templates/` | Szablony stron dla czterech typów Diátaxis |
| `templates/` | Szablony konfiguracji Claude Code z labów |

Zasady pisania i komendy są w `CLAUDE.md`.
