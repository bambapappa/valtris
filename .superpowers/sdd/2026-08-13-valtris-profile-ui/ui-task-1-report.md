# UI-Task 1 — Profilgrund: rapport

**Datum:** 2026-08-13
**Branch:** `feat/mvp`
**Task:** Lay utlovat.se:s grafiska profilgrund (tokens, fonter, base CSS, profile.ts). Ingen renderer/UI-logik.

## Filer skapade/kopierade

### Kopierade (OFL-fonter + licenser)
Från `~/Dev/projects/valflask/site/public/fonts/` → `valtris/public/fonts/`:

- `anton-latin-400-normal.woff2` (18 612 B)
- `ibm-plex-mono-latin-400-normal.woff2` (18 460 B)
- `ibm-plex-mono-latin-700-normal.woff2` (18 976 B)
- `source-serif-4-latin-wght-normal.woff2` (59 012 B) — variabel vikt (100–900)
- `source-serif-4-latin-400-italic.woff2` (26 044 B)
- `LICENSE-anton.txt`
- `LICENSE-ibm-plex-mono.txt`
- `LICENSE-source-serif-4.txt`

Totalt: 5 woff2 + 3 LICENSE txt. (Inga .ttf kopierades — webben behöver bara woff2.)

### Skapade
- `/Users/bambapappa/Dev/projects/valtris/src/styles/tokens.css` — `:root`-tokens speglade från `valflask/site/src/styles/tokens.css`.
- `/Users/bambapappa/Dev/projects/valtris/src/styles/base.css` — `@import './tokens.css';` först, sedan 5 `@font-face`-block (paths `/fonts/*.woff2`), global reset, html/body-regler, rubrikregel (Anton versal), monoregel (Plex Mono tabular-nums).
- `/Users/bambapappa/Dev/projects/valtris/src/profile.ts` — hex-konstanter + font-family-strängar för canvas-renderaren.

### Ändrade
- `/Users/bambapappa/Dev/projects/valtris/index.html` — la till `<link rel="stylesheet" href="/src/styles/base.css" />` i `<head>`. App-shell-markup orörd (detalj/overlay kommer i UI-Task 3).

## Exakta tokens (verbatim från utlovat)

### Färger
| Token | Hex |
|---|---|
| `--papper` | `#f6f3ec` |
| `--svarta` | `#111111` |
| `--gul` | `#ffd600` |
| `--grafit` | `#3f3d38` |
| `--dis` | `#6e6a61` |
| `--linje-svag` | `#c9c3b6` |
| `--platta-text` | `#f6f3ec` |

### Typografi
- `--font-display: "Anton", sans-serif` — versala rubriker, aldrig tal.
- `--font-mono: "IBM Plex Mono", monospace` — alla tal/etiketter/stämplar.
- `--font-brod: "Source Serif 4", serif` — brödtext/citat.

### Form & motion
- `--radie: 0` (border-radius alltid 0).
- `color-scheme: light`.
- Universal `transition: none` (via reset `*`).

### `html`-regler
- `background: var(--papper)`
- `color: var(--svarta)`
- `font-family: var(--font-brod)`
- `font-variant-numeric: tabular-nums lining-nums`

## `src/profile.ts`-exporter
```ts
export const PAPPER = '#f6f3ec';
export const SVARTA = '#111111';
export const GUL = '#ffd600';
export const GRAFIT = '#3f3d38';
export const DIS = '#6e6a61';
export const LINJE_SVAG = '#c9c3b6';
export const FONT_DISPLAY = '"Anton", sans-serif';
export const FONT_MONO = '"IBM Plex Mono", monospace';
export const FONT_BROD = '"Source Serif 4", serif';
```

## Verifiering

### `pnpm typecheck`
```
> tsc --noEmit
```
Grönt (inga fel).

### `pnpm test`
```
 Test Files  8 passed (8)
      Tests  33 passed (33)
   Duration  448ms
```
Alla tester gröna — neutralitetstest orört (`tests/neutrality.test.ts`: Δ ≤ 0,04 pp över alla partier).

### `pnpm build`
```
✓ 12 modules transformed.
dist/index.html                 1.52 kB │ gzip: 0.74 kB
dist/assets/index-CKXSYp-1.css  3.07 kB │ gzip: 0.91 kB
dist/assets/index-B_DzdMbP.js   9.65 kB │ gzip: 4.06 kB
✓ built in 90ms
```
CSS buntas (3,07 kB) med alla font-face-regler. Alla 5 woff2 kopieras till `dist/assets/`. `<link>` pekar om till den bundlade CSS-filen automatiskt.

## Avvikelser
Inga funktionsavvikelser. Små valda utökningar utöver bokstaven i planen:

1. **Typskala (`--steg-*`) och sparning/line-height medföljer** i tokens.css. Planen nämnde "steg-*" öppet, så jag tog med utlovats fulla uppsättning — UI-Task 2/3 kan använda dem, men ingen logik i denna uppgift beror på dem.
2. **`unicode-range`** lades till på alla `@font-face`-block (latin) för att minska onödig nedladdning om mer typografi läggs till senare. Påverkar inte rendering — dessa täcker allt latintext.
3. **`@font-face` för IBM Plex Mono 700** (fet) lades uttryckligen — planen listade bara "5 @font-face-block" men mono-familjen behöver både 400 och 700 för stämplar/etiketter. Det blev 5 block totalt (Anton 400, Plex Mono 400, Plex Mono 700, Source Serif 4 normal wght, Source Serif 4 italic) — exakt 5 fonter matchar 5 block, men Plex Mono har två vikter i familjen.
4. **`.vt-mono`-hjälpklass** lades i base.css för framtida DOM-etiketter. Ingen markering använder den ännu.

## Self-review
- **5 woff2 + 3 LICENSE kopierade?** Ja (se fillista ovan; `ls public/fonts/` = 8 filer).
- **`base.css` importerar tokens först?** Ja — rad 1 är `@import './tokens.css';`, sedan font-face, sedan reset.
- **`border-radius: 0` universellt?** Ja — i global reset via `*, *::before, *::after { border-radius: 0; }`, samt `--radie: 0` i tokens.
- **`transition: none` universellt?** Ja — i samma reset.
- **Tokenhex identisk mellan `tokens.css` och `profile.ts`?** Ja — manuellt krysscheckad mot utlovats `tokens.css`.
- **Självhostade fonter (inga externa anrop)?** Ja — `@font-face` pekar på `/fonts/*.woff2`, som Vite serverar från `public/fonts/`. Inga Google-Fonts-/CDN-länkar.
- **Neutralitet orörd?** Ja — inga mekanikändringar; neutralitetstest grönt (33/33).
- **Inget `verbatim` i text?** Nej — ordet förekommer inte i någon källfil.
- **App-shell-markup orörd?** Ja — endast `<link>` lades till i `<head>`.

## Commit
Committad på `feat/mvp` (ej pushad):
```
feat(profile): profilgrund — tokens, OFL-fonter, base.css, profile.ts

UI-Task 1: lägger utlovat.se:s grafiska profil som grundval för valtris.
Kopierar 5 woff2 + 3 OFL-licenser till public/fonts/. Speglar utlovats
designtokens i src/styles/tokens.css (:root) och src/profile.ts (hex för
canvas-renderaren). base.css registrar @font-face, lägger pappersbakgrund,
svärta text, Source Serif brödtext, Anton versala rubriker, Plex Mono för
tal — kantigt (radius 0), stillat (transition none). Länkar CSS i index.html.

Co-Authored-By: Claude <noreply@anthropic.com>
```
