# ADR 0003: Ciemny motyw z neonowym akcentem i strona startowa jako wejście do nauki

Status: proponowana, 2026-11-23

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
- Domyślny motyw to ciemny. Jasny wariant zostaje, bo przy długim czytaniu część osób go woli. Wybór czytelnika zapisuje się jak dotąd w `localStorage`.
- Neon jest tylko akcentem: słowo w nagłówku, ramka aktywnego elementu, przycisk CTA, focus. Reguła `frontend-ui-engineering` z addyosmani/agent-skills odradza fiolet jako domyślną estetykę. Tu fiolet to świadomy wybór autora, a ograniczenie go do akcentów zmniejsza ten koszt.
- Fonty: Outfit dla nagłówków i Inter dla treści, w wersji variable z `@fontsource-variable`. Ładujemy tylko podzbiory `latin` i `latin-ext`, bo treść jest po polsku.

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

## Konsekwencje

- Aktualizacja Starlight może zmienić strukturę komponentów, które nadpisujemy. Nadpisania renderują domyślny komponent i tylko go uzupełniają, więc ryzyko dotyczy głównie selektorów w `theme.css`.
- Komponenty strony startowej czytają dane z `Astro.locals.starlightRoute.sidebar` i `getCollection('docs')`. Nie importują `scripts/`, więc reguła z `scripts/architecture.test.mjs` zostaje bez zmian.
- Nowe komponenty używane w MDX trafiają na listę `MD033` w `.markdownlint-cli2.jsonc`.
