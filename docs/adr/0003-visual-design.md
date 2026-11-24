# ADR 0003: Ciemny motyw z neonowym akcentem i strona startowa jako wejście do nauki

Status: przyjęta, 2026-11-24. Częściowo zastąpiona przez ADR 0005 (jasna paleta, reguła „Bez cieni” w jasnym motywie, reguła „Kapsuła”).

## Kontekst

Strona działa na domyślnym motywie Starlight 0.43. Nie ma własnego CSS, fontów ani nadpisanych komponentów. Strona startowa ma tylko frontmatter z szablonem `splash` i taglinem, więc wygląda na pustą: czytelnik widzi pole wyszukiwania i nie wie, od czego zacząć.

Autor chce profesjonalnego wyglądu w stylu wzorca: prawie czarne tło, akcent magenta i fiolet, duży geometryczny nagłówek z jednym słowem w kolorze akcentu, zaokrąglone panele z cienką ramką i sidebar z przyciskiem CTA.

## Kontrakt projektu

- **Zadanie strony startowej:** w jednym kliknięciu prowadzi do nauki. Pokazuje 7 części ścieżki i postęp weryfikacji każdej z nich.
- **Główna akcja:** „Zacznij naukę” prowadzi do pierwszej strony `01-foundations`. Akcja druga, „Ścieżka nauki”, prowadzi do `roadmap/`.
- **Stany:** karta części ma stan bez zweryfikowanych stron (pasek 0%). Lista ostatnio zweryfikowanych stron ma stan pusty z tekstem zamiast pustej siatki.
- **Responsywność:** mobile first. Szerokości kontrolne to 320, 768, 1024 i 1440 px. Strona nie przewija się w poziomie przy żadnej z nich ani przy powiększeniu 400%.
- **Odrzucone wzorce:** gradient jako tło strony lub sekcji, cienie zamiast ramek, tekst zastępczy, ten sam `border-radius` na każdym elemencie, kolor jako jedyny nośnik stanu, kopiowanie marki i układu wzorca.

## Decyzja

- Wygląd powstaje przez `customCss` i nadpisania komponentów Starlight (`ThemeProvider`, `Sidebar`, `Hero`). Własny motyw od zera wymagałby utrzymywania nawigacji, wyszukiwania i i18n, które Starlight już daje.
- Kolory, typografia, promienie i odstępy żyją tylko w `src/styles/tokens.css` jako zmienne `--cc-*`. Plik mapuje je na zmienne `--sl-*` Starlight. Pozostałe pliki CSS i komponenty używają tylko zmiennych.
- Domyślny motyw to ciemny. Jasny wariant zostaje, bo przy długim czytaniu część osób go woli. Przełącznik ma dwie opcje, bez „auto”, bo „auto” oddałoby wybór systemowi. Wybór czytelnika zapisuje się jak dotąd w `localStorage`.
- Neon jest tylko akcentem: słowo w nagłówku, ramka aktywnego elementu, przycisk CTA, focus. Reguła `frontend-ui-engineering` z addyosmani/agent-skills odradza fiolet jako domyślną estetykę. Tu fiolet to świadomy wybór autora, a ograniczenie go do akcentów zmniejsza ten koszt.
- Fonty: Outfit dla nagłówków, w wersji variable z `@fontsource-variable`. Przeglądarka pobiera tylko podzbiory `latin` i `latin-ext`, potrzebne dla polskich znaków. Treść używa fontu systemowego. Pierwsza wersja miała Inter dla treści, ale razem z Outfit fonty ważyły 177 KB przy budżecie 100 KB, a LCP strony treści wynosił 2,7 s.

| Token | Ciemny | Jasny | Użycie |
| --- | --- | --- | --- |
| Tło | `#0c0b10` | `#ffffff` | Strona |
| Powierzchnia | `#15131b`, `#1c1a24` | `#f6f5f9`, `#eeecf3` | Panele, karty, sidebar |
| Ramka | `#2a2733` | `#dddae4` | Granice paneli |
| Tekst | `#ececf1`, `#a19fae` | `#14121a`, `#55525f` | Treść i tekst drugorzędny |
| Akcent tekstowy | `#e639ff` | `#9d00c2` | Linki, słowo akcentu |
| Akcent UI | `#8b3dff` | `#7a2be0` | Tło przycisku z białym tekstem |

## Budżety

- Dostępność: WCAG 2.2 AA. Tekst ma kontrast co najmniej 4,5:1, elementy UI co najmniej 3:1, focus jest zawsze widoczny, a animacje respektują `prefers-reduced-motion`. Cel dotyku ma co najmniej 24×24 px, na telefonie 44×44 px. Bramki to `@axe-core/cli` i `pa11y` bez błędów oraz ręczne przejście klawiaturą.
- Wydajność: CSS do 50 KB po gzip, fonty do 100 KB, Lighthouse Performance co najmniej 90, CLS do 0,1.
- Rozmiar CSS i fontów sprawdza CI po każdym buildzie (ADR 0004). Dostępność, Lighthouse i CLS mierzymy ręcznie przy każdej rundzie projektu.

## Konsekwencje

- Aktualizacja Starlight może zmienić strukturę komponentów, które nadpisujemy. Nadpisania renderują domyślny komponent i tylko go uzupełniają, więc ryzyko dotyczy głównie selektorów w `theme.css`.
- Komponenty strony startowej czytają dane z `Astro.locals.starlightRoute.sidebar` i `getCollection('docs')`. Nie importują `scripts/`, więc reguła z `scripts/architecture.test.mjs` zostaje bez zmian.
- Nowe komponenty używane w MDX trafiają na listę `MD033` w `.markdownlint-cli2.jsonc`.
- Wewnętrzne linki w treści MDX i we frontmatterze piszemy z prefiksem `/claude-craft/`, bo `starlight-links-validator` odrzuca linki względne.

Zmierzone 2026-11-24 na buildzie produkcyjnym (`astro preview`), strona startowa, strona treści i strona testowa ze wszystkimi elementami treści:

- Lighthouse 12.8.2, profil mobilny: Performance od 98 do 99, Accessibility, Best Practices i SEO po 100. LCP od 1,6 do 2,0 s, CLS do 0,003. Fonty ważą 47 KB, CSS od 15 do 19 KB.
- `@axe-core/cli` 4.13.0 z tagami WCAG 2.2 AA: 0 naruszeń na stronie startowej i stronie treści. Na stronie testowej axe zgłosił `scrollable-region-focusable` dla przewijanego bloku kodu. Expressive Code dodaje `tabindex="0"` w `requestIdleCallback`, a axe sprawdził stronę wcześniej. `pa11y` 9.1.1 z opóźnieniem 1,5 s nie zgłosił błędów na tych stronach w obu motywach.
- Brak poziomego przewijania strony startowej, strony treści i `roadmap/` przy szerokościach 320, 375, 667, 768, 1024 i 1440 px. Szerokość 320 px odpowiada powiększeniu 400% przy oknie 1280 px.
- Kolejność fokusu na stronie startowej: skip link, logo, wyszukiwanie, dwa przyciski hero, karty części, karty szybkiego startu. Przyciski hero mają 44 px wysokości na telefonie.
- Czytnika ekranu nie testowano. Ten punkt pozostaje ręczny i niesprawdzony.

## Zmiany 2026-11-24

Po przeglądzie pierwszej wersji autor wskazał siedem słabych miejsc. Kontrakt dostaje te reguły:

- **Stany interakcji:** każdy link i przycisk ma hover, `:active` i `:focus-visible`. Hover działa tylko pod `@media (hover: hover)`, a ruch tylko pod `prefers-reduced-motion: no-preference`.
- **Nagłówek sekcji:** sekcja strony startowej ma etykietę w akcencie, tytuł `h2` i lead do 46 znaków szerokości. Od 64rem tytuł i lead stoją obok siebie.
- **Sidebar:** trzy poziomy, każdy w jednym rozmiarze na telefonie i komputerze. Część to mała etykieta wersalikami, sekcja to wiersz z chevronem, strona to tekst drugorzędny. Aktywna strona ma kolor akcentu i kropkę zamiast wypełnionej pigułki.
- **Postęp w sidebarze:** zwarta karta ze stanem weryfikacji całej ścieżki zastępuje duży przycisk i zdublowany link do `roadmap/`.
- **Wyszukiwanie:** okno ma zaokrąglone pole i podpowiedzi, gdy pole jest puste: popularne frazy i trzy strony na start.
- **Nawigacja na dole strony:** poprzednia i następna strona to zwarte karty w tym samym stylu co karty strony startowej.
- **Ścieżka nauki:** lista części to oś czasu. Tabela postępu wyrównuje liczby do prawej.

Konsekwencje zmian:

- Link do `roadmap/` zniknął z drzewa sidebara, więc pierwsza strona Fundamentów nie ma już poprzedniej strony w nawigacji na dole.
- Komunikaty Pagefind są po polsku dzięki kolekcji `i18n` (`src/content/i18n/pl.json`). Liczba wyników stoi po dwukropku („Wyniki dla „Hooki”: 6”), bo Pagefind zna tylko formy „one” i „many”, a polski potrzebuje trzech.
- `MarkdownContent` dodaje `data-cc-page` z identyfikatorem strony. Styl osi czasu działa tylko na `roadmap/`, a sam plik zostaje zwykłym Markdownem dla `scripts/freshness.mjs`.

Zmierzone 2026-11-24 po zmianach, na `astro preview`:

- Lighthouse 12.8.2: Performance od 98 do 100, pozostałe kategorie po 100. LCP od 1,7 do 2,0 s, CLS do 0,004, fonty 47 KB, CSS 16 KB.
- axe 4.13.0: 0 naruszeń na stronie startowej, `roadmap/` i stronie treści. pa11y 9.1.1: brak błędów na tych trzech stronach w obu motywach i w otwartym oknie wyszukiwania z wynikami w obu motywach.
- Brak poziomego przewijania czterech stron przy 320, 375, 667, 768, 1024 i 1440 px.
- Stryker: `home.mjs` i `search.mjs` po 100%, całość 98,10%.

## Zmiany 2026-11-24, trzecia runda

Autor wskazał kolejne siedem miejsc i dał referencje. Proces szedł według addyosmani/agent-skills: delta spec, kontrakt projektu z referencji, zadania z kryteriami akceptacji, test przed implementacją i przegląd w pięciu osiach. Spec, plan i przegląd zostały lokalnie w `tasks/`, poza repozytorium.

Nowe reguły kontraktu:

- **Hierarchia promieni:** pigułka dla akcji i kapsuł, 16px dla paneli, 8px dla wierszy sidebara. Skill odradza „zaokrąglone wszystko”, a hierarchia zostawia pigułkę tylko tam, gdzie oznacza akcję.
- **Poświata tylko na nawigacji:** kapsuły, kafel postępu, pierścień, aktywna kropka. Nigdy pod tekstem ciągłym.
- **Bez cieni:** głębię daje ramka 1px i lokalna poświata.
- **Nagłówek sekcji:** dekoracyjny konturowy numer w lewej kolumnie, rysowany przez `::before` z `data-index`. To czysta dekoracja (WCAG 1.4.3), a numer nie jest tekstem DOM, więc nie myli narzędzi kontrastu.
- **Kapsuła:** wspólny wzorzec linku nawigacyjnego z etykietą nad tytułem. Ramka z gradientem to dwie warstwy tła z `background-clip`, bo `border-image` ignoruje promień.
- **Sidebar:** sekcja w foncie systemowym 600, bo Outfit przy tym samym rozmiarze wyglądał na mniejszy od stron. Wiersze z odstępem 2px. Aktywna strona bez tła, z kropką i łukiem od linii prowadzącej, a linia w aktywnej sekcji ma gradient.
- **Paginacja:** kapsuła „Poprzednia”, pigułka z pozycją strony w całej ścieżce i kapsuła „Następna”. Na telefonie pigułka na górze i „Następna” pierwsza. Bez poprzedniej i następnej strony nawigacja się nie renderuje.
- **Spis treści:** panel z pierścieniem postępu czytania. Pierścień to animacja CSS na osi przewijania, bez JS. Reguła używa longhandów bez czasu trwania, bo minifikator składał je w skrót `animation`, który nie przyjmuje `scroll(root)`.

Zmierzone 2026-11-24 na `astro preview`:

- Lighthouse 12.8.2: Performance od 98 do 99, pozostałe kategorie po 100, LCP do 2,0 s, CLS do 0,002, CSS 18 KB, fonty 47 KB.
- axe 4.13.0: 0 naruszeń na trzech stronach. pa11y 9.1.1: 0 błędów na trzech stronach w obu motywach.
- Brak poziomego przewijania pięciu stron przy 320, 375, 667, 768, 1024 i 1440 px.
- Stryker: `home.mjs`, `search.mjs` i `quick-links.mjs` po 100%, całość 98,17%.
- Czytnika ekranu nie testowano.

## Zmiany 2026-11-24, czwarta runda

Autor wskazał cztery miejsca: nagłówek sekcji zlewał się z hero, a konturowy numer psuł kształt „1” w foncie Outfit. Karta postępu i spis treści były zbyt kwadratowe i szare. Paginacja była za duża, a pełna fioletowa pigułka nie pasowała do kapsuł.

Te reguły zastępują reguły trzeciej rundy:

- **Nagłówek sekcji:** jedna kolumna. Nad tytułem stoi rząd z numerem w kolorze akcentu, krótką linią i etykietą. Numer to zwykły tekst z `aria-hidden`, bo `--cc-accent-text` ma kontrast 5,1:1 i nie potrzebuje triku z `data-index`. Znika licznik „/ 03” i prop `total`. Pierwszy nagłówek ma większy odstęp od hero.
- **Panel glass:** klasa `.cc-glass` łączy półprzezroczyste tło (`--cc-glass-fill`), rozmycie tła (`--cc-glass-blur`), górny highlight i ramkę z gradientem. Ramkę rysuje `::before` wycięte maską (`mask-composite: exclude`), bo dwie warstwy tła z `background-clip` wymagały nieprzezroczystego wypełnienia. Komponent zmienia tylko `--cc-frame`, na przykład na `--cc-frame-active` przy hover. Klasę mają karta postępu, kapsuły, pigułka pozycji i spis treści. Bez wsparcia maski zostaje zwykła ramka 1px, a w `forced-colors` ramka `CanvasText`.
- **Hierarchia promieni:** panele glass mają `--cc-radius-xl` (28px). Pigułka zostaje dla akcji i kapsuł, 8px dla wierszy sidebara.
- **Karta postępu:** okrągły kafel 48px zamiast kwadratu 56px, mniejszy tytuł i chip, większy wewnętrzny odstęp.
- **Paginacja:** kapsuły mają 52px wysokości zamiast 72px, strzałkę 36px i tytuł w rozmiarze `sm`. Pigułka pozycji to ten sam panel glass co kapsuły, z numerem w kolorze akcentu i tej samej wysokości. Kapsuły „Szybki start” zostają w pełnym rozmiarze.

Zmierzone 2026-11-24:

- `npm run check` i `npm run build` przechodzą.
- Stryker: `home.mjs`, `search.mjs` i `quick-links.mjs` po 100%, całość 98,17%.
- Wygląd sprawdzony na zrzutach z headless Chrome przy 390 i 1440 px w ciemnym motywie. Jasnego motywu nie sprawdzono na zrzucie. Kontrast tekstu na `--cc-glass-fill` jest tam co najmniej taki jak na `--cc-surface`, bo wypełnienie jest jaśniejsze od niego.
- Lighthouse, axe i pa11y nie były uruchamiane w tej rundzie.

## Zmiany 2026-11-24, piąta runda

Autor wskazał pięć miejsc: eyebrow sekcji był mniejszy od tytułu i za blisko niego, w sidebarze część była mniejsza od swoich sekcji, przejścia między stronami były sztywne, promienie w hero były za cienkie, a karta postępu miała za mały odstęp w pionie.

Te reguły zastępują reguły czwartej rundy:

- **Nagłówek sekcji:** eyebrow to linia display (`clamp(2.25rem, …, 5rem)`, wersaliki), większa od `h2`. Tytuł `h2` ma od 1,5 do 2,25rem i kolor tekstu. Numer ma gradient od `--cc-accent-text` do `--cc-accent-ui`. Ciemniejszy koniec ma 3,9:1 na `--cc-bg`, a duży tekst potrzebuje 3:1.
- **Sidebar:** część jest największym wierszem: 0,875rem, 700, wersaliki, kolor nagłówka. Sekcja, grupa i strona mają 0,8125rem i różnią się kolorem, grubością i wcięciem.
- **Przejścia między stronami:** natywne przejścia między dokumentami (`@view-transition`) w `src/styles/transitions.css`, bez JS. Nagłówek i sidebar stoją w miejscu. Treść strony unosi się o 12px i wyostrza z rozmycia w 360ms, a spis treści się przenika. Przy `prefers-reduced-motion: reduce` i w przeglądarkach bez wsparcia strona ładuje się zwyczajnie. `prefetch` z `defaultStrategy: 'hover'` pobiera stronę, gdy kursor stoi na linku, więc przejście nie czeka na sieć. Strony są statyczne, więc nie ma skeletonów.
- **Promienie w hero:** każdy promień to zwężająca się wiązka (5px przy źródle, 0,5px na końcu) z gradientem radialnym. Pod spodem leży rozmyta kopia jako poświata, a źródło ma świecący punkt. Poświata wolno pulsuje tylko bez `prefers-reduced-motion`. Geometrię liczy `src/lib/hero.mjs`. W `forced-colors` promienie znikają.
- **Karta postępu:** wewnętrzny odstęp 16px.

Zmierzone 2026-11-24:

- `npm run check` i `npm run build` przechodzą. Reguły przejść są w zbudowanym CSS.
- Stryker: `hero.mjs`, `home.mjs`, `search.mjs` i `quick-links.mjs` po 100%, całość 98,26%.
- Wygląd sprawdzony na zrzutach z headless Chrome przy 1440 px w ciemnym motywie. Samych przejść nie da się sprawdzić na zrzucie. Lighthouse, axe i pa11y nie były uruchamiane.
