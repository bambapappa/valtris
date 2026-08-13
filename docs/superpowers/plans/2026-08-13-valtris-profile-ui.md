# valtris — profil- och UI-iteration (iteration 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steg använder checkbox-syntax.

**Goal:** Ge valtris utlovats grafiska profil och fixa speltest-återkopplingen: synlig spelplan, partistämpel i husstilen, och en riktig game-over-ruta med löftet utskrivet.

**Architecture:** Samma stack (vanilla TS + Canvas + Vite). En delad profilkälla (`src/profile.ts` för canvas, `src/styles/tokens.css` för DOM) med utlovats tokens. Fonter kopieras (OFL) till `public/fonts/`. Renderern ritar ram + rutnät + partistämpel. En DOM-game-over-overlay i pappersstilen visar löftet. `GamePiece` utökas med `quote` + `source` så löftet kan skrivas ut.

**Tech Stack:** TypeScript, Vite, Vitest, HTML Canvas, ofl-fonter (Anton, IBM Plex Mono, Source Serif 4).

## Global Constraints ( från utlovats DESIGN-profil, hålls exakt )

- Färger: papper `#f6f3ec`, svarta `#111111`, signalfärg gul `#ffd600`, grafit `#3f3d38`, dis `#6e6a61`, linje-svag `#c9c3b6`. Partifärger ENDAST i dataviz (klossarna) via parties.json.
- Typografi: `Anton` versala rubriker (aldrig tal), `IBM Plex Mono` alla tal/etiketter/poäng/stämplar, `Source Serif 4` brödtext/citat. Självhostade woff2, inga externa anrop.
- Form: `border-radius: 0` överallt (kantigt). Hårlinjegrammatik. Stillat — inga animationer utom ev. subtil taxameter.
- Partimärkning: **färg (partiets `color`) + stämpel med förkortning i Mono, i partiets `color_text` för kontrast.** Inga logotyper.
- Neutralitet oförändrat: partiet är kosmetiskt; inget partival mekanik. Inget `verbatim`. Tester offline. `pnpm test` + `typecheck` + `build` gröna.

## Beslut tagna
- Partimärkning: färg + stämpel (utlovats sätt), inte logotyper.
- Stack: vanilla TS kvar, ingen Astro.
- `GamePiece` utökas med `quote: string` och `source: { url: string; domain: string }` så game-over kan visa löftet i löftessidans anda.

## Filstruktur (tillkommer/ändras)
| Sökväg | Ansvar |
|---|---|
| `src/profile.ts` (ny) | TS-färg-/fontkonstanter (spegla tokens) för canvas-renderarn |
| `src/styles/tokens.css` (ny) | CSS-variabler = utlovats tokens |
| `src/styles/base.css` (ny) | @font-face + grund (papper, svarta, radius 0) |
| `public/fonts/*.woff2` + `LICENSE-*.txt` (ny) | OFL-fonter kopierade från valflask |
| `src/types.ts` (ändras) | `PartyData.color_text`, `GamePiece.quote`, `GamePiece.source` |
| `src/api.ts` (ändras) | `validateParties` behåller `color_text`; `toGamePieces` sätter quote+source |
| `src/render.ts` (ändras) | ram 2px svarta runt bräde, svagt rutnät, partistämpel i Mono per cell |
| `src/ui.ts` (ändras) | game-over-overlay (papperskort) + HUD i profilen |
| `src/main.ts` (ändras) | injicera profile-färger, wire overlay, nästa-kloss i profil |
| `index.html` (ändras) | länka CSS, struktur för overlay, profilerad shell |
| `tests/api.test.ts`, `tests/mapping.test.ts` (ändras) | täck color_text + nya fält |

---

## UI-Task 1: Profilgrund — tokens, fonter, base CSS, profile.ts

**Files:** Create `src/profile.ts`, `src/styles/tokens.css`, `src/styles/base.css`; copy `public/fonts/*.woff2` + `LICENSE-*.txt`; modify `index.html` to link CSS.

**Interfaces:**
- Produces: `src/profile.ts` exporting `PAPPER, SVARTA, GUL, GRAFIT, DIS, LINJE_SVAG` (hex strings) and `FONT_DISPLAY, FONT_MONO, FONT_BROD` (font-family strings). CSS tokens at `:root` with identical values. Fonts registered via @font-face pointing at `/fonts/*.woff2`.

- [ ] Step 1: Copy the 5 woff2 + their 3 LICENSE txt from `~/Dev/projects/valflask/site/public/fonts/` into `valtris/public/fonts/`.
- [ ] Step 2: Write `src/styles/tokens.css` mirroring utlovats `:root` tokens (papper, svarta, gul, grafít, dis, linje-svag, platta-text, font-*, steg-*, --radie:0, color-scheme: light).
- [ ] Step 3: Write `src/styles/base.css` with the 5 @font-face blocks (paths `/fonts/...`), global reset, `html{background:var(--papper);color:var(--svarta);font-family:var(--font-brod);font-variant-numeric:tabular-nums lining-nums}`, `border-radius:0` universal, headings `font-family:var(--font-display)` uppercase, import tokens first (`@import './tokens.css';`).
- [ ] Step 4: Write `src/profile.ts`:
```ts
export const PAPPER = '#f6f3ec';
export const SVARTA = '#111111';
export const GUL = '#ffd600';
export const GRAFIT = '#3f3d38';
export const DIS = '#6e6a61';
export const LINJE_SVAG = '#c9c3b6';
export const FONT_MONO = '"IBM Plex Mono", monospace';
```
- [ ] Step 5: In `index.html` add `<link rel="stylesheet" href="/src/styles/base.css" />` in `<head>` and keep the app shell (the detail/overlay markup is added in UI-Task 3).
- [ ] Step 6: `pnpm typecheck` + `pnpm build` green. Commit.

## UI-Task 2: Renderer — ram, rutnät, partistämpel

**Files:** Modify `src/render.ts`; consumes `profile.ts` + `colorOf`/`textColorOf` from main.

**Interfaces:**
- `drawScene(ctx, m, board, active, colorOf, textColorOf)` — now also draws a 2px SVARTA border around the board rect, faint LINJE_SVAG gridlines, and stamps each filled cell with the party abbreviation in FONT_MONO using `textColorOf(party)`.

- [ ] Step 1: In `drawScene`, after clearing, draw the board well: `ctx.strokeStyle = SVARTA; ctx.lineWidth = 2; strokeRect(boardX, boardY, COLS*cell, ROWS*cell)`.
- [ ] Step 2: Draw faint gridlines (LINJE_SVAG, 1px) every cell inside the well.
- [ ] Step 3: When filling a cell (locked or active), fill with `colorOf(party)`, then stamp the uppercase party abbreviation centered in the cell using `FONT_MONO`, fill `textColorOf(party)`, font size ~`cell*0.42`. Pass `textColorOf` through from main (maps party→`color_text`).
- [ ] Step 4: Keep the geometry helpers + their tests passing; update `tests/render.test.ts` call sites if `drawScene` signature changed (add a no-op `textColorOf` in tests).
- [ ] Step 5: `pnpm test` + `typecheck` + `build` green. Commit.

## UI-Task 3: Game-over-overlay + löftesvisning + HUD-profil

**Files:** Modify `src/types.ts` (GamePiece.quote/source, PartyData.color_text), `src/api.ts` (validateParties keeps color_text; toGamePieces sets quote+source), `src/ui.ts` (overlay + HUD restyle), `src/main.ts` (wire textColorOf, overlay, next-piece stamp), `index.html` (overlay markup); tests updated.

- [ ] Step 1: `src/types.ts` — add `color_text: string` to `PartyData`; add `quote: string` and `source: { url: string; domain: string }` to `GamePiece` and to `PromiseData` (the api already has quote; add source subset).
- [ ] Step 2: `src/api.ts` — `validateParties` keep `color_text`; `validatePromises` keep `quote` + `source:{url,domain}`; `toGamePieces` set `quote` + `source` on each piece.
- [ ] Step 3: `src/ui.ts` — replace `showGameOver`'s status-text with an overlay card: Anton heading "SPELET SLUT", Mono stats (poäng, rader, nivå, bästa), Source Serif promise block (rubrik, parti i färg, kategori, kostnad msek/år, citatet kursivt, källa/domain). Style via tokens (papper card, 2px svart ram, radius 0). Restyle `showNext`/`setStats`/`setMethodText` in the house style.
- [ ] Step 4: `index.html` — add `<div id="overlay" class="vt-overlay" hidden></div>` container; header in Anton; side panel mono; footer attribution; method `<details>`.
- [ ] Step 5: `src/main.ts` — define `textColorOf = (p)=> color_text of p`; pass both colorOf+textColorOf to drawScene; on game-over call showGameOver overlay; "Retur = spela igen" resets and hides overlay. `colorForParty` callers updated for color_text.
- [ ] Step 6: Update tests: `tests/mapping.test.ts`/`tests/api.test.ts` party fixtures include `color_text`; `tests/api.test.ts` assert quote+source survive toGamePieces. `pnpm test`+`typecheck`+`build` green. Commit.

## UI-Task 4: Verifiera + playbook-checklista

- [ ] `pnpm dev` — manuell visuell tillsyn avhandlas av människa; agenten kör `pnpm test/typecheck/build` grönt och beskriver i rapporten exakt vilka profilregler som implementerats ( färger, fonter, radius 0, ram, stämpel, overlay ).

## Self-Review
- Neutralitet orörd (parti kosmetiskt; stämpel visar bara förkortning, påverkar inget).
- Profiltokens konsekventa mellan `profile.ts` (canvas) och `tokens.css` (DOM) — samma hex.
- `color_text` används för stämpelkontrast så alla partifärger ger läslig text.
- Inga logotyper, inget `verbatim`, tester offline.
