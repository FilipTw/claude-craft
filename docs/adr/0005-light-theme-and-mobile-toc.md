# ADR 0005: Jasny motyw na równi z ciemnym, kapsuły CTA i mobilny spis treści

Status: przyjęta, 2026-11-24. Zastępuje z ADR 0003: kolumnę „Jasny” w tabeli tokenów, regułę „Bez cieni” dla jasnego motywu i regułę „Kapsuła” (trzecia i czwarta runda).

## Kontekst

Autor wskazał trzy grupy problemów.

1. **Mobilny spis treści.** Na telefonie lista „Na tej stronie” wyglądała na przezroczystą, a treść strony leżała na niej. Przyczyna: `src/styles/transitions.css` nadawał `.right-sidebar` nazwę `view-transition-name: cc-toc`. Element z tą nazwą tworzy własny kontekst nakładania (stacking context). Poniżej 72rem `.right-sidebar` zawiera stały pasek Starlight (`mobile-starlight-toc nav`), więc jego `z-index` działał tylko w środku tego kontekstu. `.main-pane` stoi później w DOM i ma własną nazwę przejścia, więc malował się nad listą. Lista miała też domyślny wygląd Starlight.
2. **Wyblakły jasny motyw.** Ciemny motyw bierze kolor z poświaty `--cc-glow`, która na czarnym tle świeci, a na białym znika. Jasny motyw dziedziczył te reguły, więc panele były białe na białym, etykiety szare, a hover zmieniał tylko ramkę 1px. Akcent tekstowy `#9d00c2` gryzł się z fioletem przycisków `#7a2be0`.
3. **Słabe akcenty w obu motywach.** Tabele były szare. Kapsuły „Szybki start” i paginacji nie wyglądały na przyciski. Linia 2px w nagłówkach sekcji strony startowej ginęła przy dużym numerze i etykiecie.

## Decyzja

### Mobilny spis treści

- Nazwa `cc-toc` stoi na `.right-sidebar` tylko od 72rem. Poniżej nazwę `cc-mobile-toc` ma sam pasek, bez animacji, tak jak header i sidebar.
- Pasek ma nieprzezroczyste tło `--cc-bg-chrome`. Przełącznik to pigułka. W hover i w stanie otwartym ma ramkę i tekst w akcencie. Obok stoi bieżący nagłówek.
- Dolną krawędź paska wypełnia linia postępu czytania, 2px. To odpowiednik pierścienia z komputera, na tej samej osi przewijania, bez JS.
- Lista otwiera się jako karta z pełnym tłem `--cc-surface`, odsunięta od krawędzi ekranu, nad stroną przyciemnioną przez `--cc-backdrop`. Wiersze mają co najmniej 44px wysokości. Bieżący nagłówek ma tło `--cc-accent-soft` i świecącą kropkę na szynie.
- Zmiana jest tylko w CSS. Komponent `MobileTableOfContents` zostaje domyślny.

### Paleta jasnego motywu

Akcent zostaje w rodzinie fioletu z ciemnego motywu. Autor odrzucił indygo z referencji, bo motywy różniłyby się kolorem marki. Tło strony to lawendowa biel. Header, sidebary, panele i karty stoją na bieli.

| Token | Jasny | Kontrast |
| --- | --- | --- |
| `--cc-bg` | `#f7f6fb` | Tło strony |
| `--cc-bg-chrome`, `--cc-surface` | `#ffffff` | Header, sidebary, panele, karty |
| `--cc-surface-raised` | `#f1eff8` | Kod w linii, `kbd` |
| `--cc-border`, `--cc-border-strong` | `#e4e1ee`, `#cdc8dc` | Ramki dekoracyjne |
| `--cc-text`, `--cc-text-muted` | `#1b1830`, `#5b5770` | 16:1 i 6,4:1 na tle |
| `--cc-heading` | `#0f0c1f` | 17,9:1 na tle |
| `--cc-accent-text` | `#9333ea` | 5,0:1 na tle, 4,6:1 na `--cc-accent-soft` |
| `--cc-accent-ui`, hover | `#7c3aed`, `#6d28d9` | Biały tekst 5,7:1 i 7,1:1 |
| `--cc-accent-soft` | `#f1eafe` | Tło bieżącego elementu i nagłówka tabeli |

### Tokeny ról

Komponenty nie rozróżniają motywów. Czytają tokeny ról, które w ciemnym motywie mają dokładnie wartość używaną tam wcześniej, a w jasnym dają kolor i głębię zamiast poświaty.

| Token | Rola | Jasny |
| --- | --- | --- |
| `--cc-shadow-panel`, `--cc-shadow-panel-hover` | Głębia paneli | Trzy warstwy cienia z fioletowym odcieniem. W ciemnym brak cienia i poświata 1,25rem w hover |
| `--cc-shadow-card-hover`, `--cc-shadow-link-hover` | Hover kart strony startowej i kart Starlight | Jak cień panelu. W ciemnym poświata 2rem i 1,5rem |
| `--cc-panel-wash` | Plamy koloru w tle `.cc-glass` | Fiolet z lewej, magenta z prawej, pod nimi półprzezroczyste `--cc-glass-fill` |
| `--cc-frame-rest`, `--cc-frame-hover` | Ramka panelu glass | Ukośny gradient magenta → fiolet |
| `--cc-lift` | Uniesienie kart w hover | `-3px`, w ciemnym `0px` |
| `--cc-label` | Etykiety nad tytułami | `--cc-accent-text` |
| `--cc-track`, `--cc-track-hairline`, `--cc-progress-fill` | Paski postępu | Tor `#ece3ff`, wypełnienie gradientem magenta → fiolet |
| `--cc-art-*` | Okładka karty części | Lawendowa baza z plamą magenty i fioletu |
| `--cc-tile-*`, `--cc-chip-*`, `--cc-ring-track` | Kafel, chip i pierścienie postępu | Kafel z gradientem fioletu i białym tekstem, pierścień postępu wokół |
| `--cc-rail`, `--cc-toc-current-bg` | Spis treści | Szyna w gradiencie, bieżący nagłówek na `--cc-accent-soft` |
| `--cc-accent-word` | Słowo w hero i numer części | Gradient `--cc-accent-text` → `--cc-accent-ui`, oba końce co najmniej 4,5:1 |

- Token z `var()` rozwiązuje się tam, gdzie jest zadeklarowany. Pierścień kafla potrzebuje `--cc-progress` z karty, więc gradient stoi w `theme.css`, a token `--cc-tile-ring-display` tylko go włącza. `Sidebar.astro` ustawia `--cc-progress` na całej karcie. Pierścień jest rysowany tylko pod `@supports (mask-composite: exclude)`, bo bez maski zasłoniłby procent.
- Uniesienie w hover przesuwa obszar trafienia. Pasek 4px pod kartą (`::before` kart, `::after` karty postępu, przezroczysta dolna ramka `::before` kapsuły) wypełnia lukę, więc hover nie miga przy dolnej krawędzi.

### Kapsuły CTA

„Szybki start”, „Poprzednia”, „Następna” i pigułka pozycji to przyciski, a nie panele glass. Wyglądają tak samo w obu motywach. Za tłem strony podążają tylko pierścień i cień.

- Pełna pigułka z gradientem `#7c3aed → #5b21b6`, ramka 1px z bieli, pierścień 5px `--cc-cta-ring`, górny połysk, wewnętrzny cień dołu i jasna poświata spod dolnej krawędzi. Przy tekście stoją dwie iskierki, rysowane maską SVG w `::after`.
- Hover: uniesienie o 2px, pierścień 7px, mocniejsza poświata przez przenikanie `::before`, białe kółko strzałki z fioletową strzałką i migotanie iskierek. Migotanie działa tylko przy `prefers-reduced-motion: no-preference`. Reguła `:active` stoi po regułach hover, więc wciśnięcie wygrywa z uniesieniem.
- Poświata w hover ma środek pod dolną krawędzią, żeby nie wchodziła pod tytuł. Obrys fokusu stoi 8px od kapsuły, poza pierścieniem. Sąsiednie kapsuły dzieli 16px, żeby pierścienie się nie stykały.

### Tabele i nagłówki sekcji

- Tabela w treści to karta z ramką `--cc-table-border` i cieniem panelu. Nagłówek ma tło `--cc-accent-soft`, tekst `--cc-accent-text` i dolną krawędź 2px `--cc-accent-ui`. Wiersze mają fioletowe paski, a pierwsza kolumna jest w kolorze nagłówka. Styl obejmuje wszystkie tabele w treści.
- Linia między numerem a etykietą w nagłówku sekcji ma wysokość `clamp(4px, 0.09em, 8px)`, zaokrąglone końce, gradient akcentu wygaszany do przezroczystości, połysk u góry i poświatę `--cc-glow`.

## Konsekwencje

- Reguła „Bez cieni” z ADR 0003 obowiązuje dalej w ciemnym motywie. W jasnym cień zastępuje poświatę, bo poświata na jasnym tle nie odcina panelu.
- Nowy element z głębią albo kolorem zależnym od motywu używa tokenu roli, a nie własnej wartości ani selektora `[data-theme]`.
- Kolejny element, który trafi do `.right-sidebar` na telefonie, nie może dostać `view-transition-name` na rodzicu stałego paska.
- Ciemny motyw zmienia się tylko w trzech miejscach, które autor wskazał wprost: kapsuły CTA, tabele i linia w nagłówkach sekcji.

## Pomiary

Zmierzone 2026-11-24 na `astro preview`:

- `npm run check`, `npm run build` i `npm run build:check` przechodzą: 35 z 35 klas Starlight i Pagefind w buildzie, CSS 23 KB z 50 KB, fonty 46 KB.
- Ciemny motyw po wprowadzeniu tokenów ról: zrzuty w spoczynku przed zmianą i po niej różnią się o najwyżej 10/255. Dwa zrzuty tego samego buildu różnią się o 60/255 przez rozmycie szkła, więc różnica mieści się w szumie.
- Kontrast zmierzony na pikselach tła ze zrzutów: etykiety w akcencie od 4,6:1 do 5,4:1, tekst drugorzędny na panelach co najmniej 5,9:1. Pod tekstem kapsuły CTA biały ma co najmniej 6,0:1, a etykiety `#f3ecff` co najmniej 5,2:1, także w hover. Nagłówek tabeli: 4,6:1 w jasnym motywie, 5,2:1 w ciemnym.
- Sonda przez CDP: kapsuła w hover ma `translateY(-2px)`, a po wciśnięciu `translateY(1px)`. Kursor 1px nad dolną krawędzią kapsuły i karty części utrzymuje hover przez 720 ms bez przerwy.
- axe-core z tagami WCAG 2.2 AA, wstrzyknięty przez CDP: 0 naruszeń na stronie startowej, stronie treści i `roadmap/` w obu motywach przy 1440 i 390 px, z otwartą listą na telefonie. Wyjątek to starsze zgłoszenie `scrollable-region-focusable` dla tabeli na `roadmap/` przy 390 px, w obu motywach.
- `pa11y` 9.1.1 zgłasza 19 problemów kontrastu w ciemnym motywie na stronie treści. Ten sam wynik daje build sprzed tych zmian, więc problem jest starszy. Jasnego motywu `pa11y` nie sprawdził, bo jego akcja `set field` nie wywołuje zdarzenia `change`, na które czeka przełącznik motywu.
- Brak poziomego przewijania trzech stron w obu motywach przy 320, 375, 768, 1024 i 1440 px.
- Czytnika ekranu i Lighthouse nie uruchamiano.
