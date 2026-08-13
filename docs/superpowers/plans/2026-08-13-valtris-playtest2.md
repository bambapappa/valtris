# valtris — speltest-iteration 2 (stämpel, startskärm, layout)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Fixa spelteståterkopplingen: osynliga partistämplar, saknad startskärm, och en layout där inforutan är för stor och game-over blir oläslig över brädet.

**Architecture:** Samma stack. (A) En delad luminansbaserad stämpelfärg i `profile.ts` ersätter `color_text` (som är identisk med `color` för 5 av 8 partier → osynlig stämpel). (B) En startskärm med Starta-knapp + hur-man-spelar-legends (kategori→form, partifärger); ingen autostart. (C) Layouten görs om: liten kompakt inforuta, prominent bräde, och game-over som en fullskärmsmodal (papperskort över hela skärmen, inte bara över brädet).

**Tech Stack:** TypeScript, Vite, Vitest, HTML Canvas.

## Global Constraints ( oförändrade )
- Neutralitet: partiet kosmetiskt (färg+stämpel visar bara parti, styr inget). Kostnad = poängvikt, inte förlust. Ton torr/saklig. Inget `verbatim`. Tester offline. `pnpm test`+`typecheck`+`build` gröna.
- Profiltokens från `tokens.css`/`profile.ts` (papper #f6f3ec, svarta #111, gul #ffd600, etc.). radius 0. Fonter: Anton/IBM Plex Mono/Source Serif 4.

## Beslut tagna
- Stämpelfärg: luminansbaserad (svart på ljusa partifärger, papper på mörka) — inte `color_text`.
- Kategori = form (styrspelet); parti = färg (kosmetiskt). Legend visar båda tydligt åtskilda.
- Layout: inforuta liten, bräde stort, game-over = fullskärmsmodal.

## Filstruktur
| Sökväg | Ändras |
|---|---|
| `src/profile.ts` | ny `stampColorOn(bgHex)` (luminans → SVARTA/PAPPER) |
| `src/render.ts` | stämpel använder `stampColorOn(colorOf(party))` i stället för `textColorOf` |
| `src/ui.ts` | next-preview + overlay-partistämpel använder `stampColorOn`; ny startskärm + legends; `showGameOver`-modal |
| `src/main.ts` | ingen autostart; vänta på Starta-knapp; startskärmsflöde |
| `index.html` | startskärms-markup, modal-markup, legend-behållare |
| `src/styles/app.css` | layout: kompakt inforuta, prominent bräde, fullskärmsmodal |
| `tests/profile.test.ts` (ny) | `stampColorOn` kontrast (ljus→svart, mörk→papper) |

---

## I3-Task 1: Stämpelfärg via luminans

**Files:** `src/profile.ts` (add), `src/render.ts` + `src/ui.ts` (use), `tests/profile.test.ts` (new).

- [ ] Step 1: `src/profile.ts` — add:
```ts
export const STAMP_LIGHT = PAPPER; // #f6f3ec  (på mörk partifärg)
export const STAMP_DARK = SVARTA;  // #111     (på ljus partifärg)
export function stampColorOn(bg: string): string {
  const h = bg.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255; // ITU-R BT.601
  return lum > 0.55 ? STAMP_DARK : STAMP_LIGHT;
}
```
- [ ] Step 2: `tests/profile.test.ts` — assert: `stampColorOn('#DDDDDD')` (SD ljus) → SVARTA; `stampColorOn('#EE2020')` (S röd) → PAPPER; `stampColorOn('#1B5CB3')` (M mörkblå) → PAPPER; `stampColorOn('#111111')` → PAPPER.
- [ ] Step 3: `src/render.ts` — cellstämpel: i stället för `textColorOf(cell.party)`, använd `stampColorOn(cell.color || colorOf(cell.party))`. Behåll `textColorOf`-param om så önskas men använd inte color_text för stämpel.
- [ ] Step 4: `src/ui.ts` — next-preview (`showNext`) och overlay-partistämpel: använd `stampColorOn(party.color)` för förkortningens färg (inte `color_text`).
- [ ] Step 5: `pnpm test`+`typecheck`+`build` gröna. Commit.

## I3-Task 2: Startskärm + hur-man-spelar-legends

**Files:** `index.html`, `src/ui.ts`, `src/main.ts`.

- [ ] Step 1: `index.html` — lägg till `<section id="start-screen" class="vt-start">` överst i `#app`, innehållande: vt-eyebrow + Anton-titel, en kort instruktion (pek/radera rotera/flytta, mellanslag = snabbt ner, rader rensas, kostnad = poäng, tappa = slut), en **legend** med två tabeller: (1) kategori→form (välfärd&utbildning→I, skatter→L, klimat-miljö→T, rättsväsende→Z, migration→S, övrigt→O, försvar&infrastruktur→J — med en liten tetromino-glyph), (2) partifärger (8 rader: färgplupp + förkortning + namn), samt en `<button id="start-btn">Starta</button>`. Brädet/inforutan döljs initialt (CSS) tills spelet startar.
- [ ] Step 2: `src/main.ts` — **ingen autostart**. Vid load: hämta data i bakgrunden (så Starta är snabb) men starta INTE loopen; visa startskärmen. `start-btn` click → göm startskärm, visa spel, anropa `reset()`+`requestAnimationFrame(step)`. Game-over: behåll Retur=spela-igen, men lägg också en knapp som återvänder till startskärmen.
- [ ] Step 3: Legend bygger partilistan ur `parties` (rendera swatches från parties.json) så den är datadriven, inte hårdkodad. Kategori→form kan vara statisk (kartläggningen är fastställd).
- [ ] Step 4: `pnpm test`+`typecheck`+`build` gröna. Commit.

## I3-Task 3: Layout — kompakt inforuta + fullskärmsmodal game-over

**Files:** `src/styles/app.css`, `index.html`, `src/ui.ts` (showGameOver fyller modal).

- [ ] Step 1: `app.css` layout: `vt-game` som rad/kolumn så **brädet är det stora, centrala elementet** och `vt-side` (inforuta) är **liten och kompakt** (nästa-kloss som en liten plupp + siffror i Mono tätt ihop). Inforutan ska inte dominera.
- [ ] Step 2: Game-over-modal: `#overlay` stylas som `position: fixed; inset: 0` med en papperskulört (rgba papper) backdrop och en **centrerad stor kort** (max ~min(90vw, 40rem)) som täcker mitten av skärmen — inte bara över brädet. Innehållet (SPELET SLUT, stats, löfte med citat) blir läsbart i full storlek.
- [ ] Step 3: `showGameOver` fyller modal-kortet; `hideOverlay` gömmer det. Startskärmen `#start-screen` är också fixed fullskärm över brädet med samma kortstil.
- [ ] Step 4: Responsivt: på smal skärm lägger sig inforutan under brädet.
- [ ] Step 5: `pnpm test`+`typecheck`+`build` gröna. Commit.

## Self-Review
- Stämpel läslig för alla 8 partier (luminans, inte color_text).
- Kategori vs parti reds ut i legenden (kategori=form, parti=färg) — ingen förväxling.
- Spelet startar inte förrän användaren trycker Starta; instruktioner läses först.
- Game-over läsbart som fullskärmsmodal.
- Neutralitet orörd; inget `verbatim`; tester offline.
