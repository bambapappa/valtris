# valtris — speltest-iteration 3 (länk, form, mobil, grafik)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Speltest-återkoppling 3: game-over ska förklara + länka till löftet på utlovat.se; nästa-kloss måste visa formen; spelet ska gå att spela i telefon; och grafiken ska kännas mer uttrycksfull (mindre billig).

**Architecture:** Samma stack. (1) `slug` läggs på GamePiece så game-over kan länka till `utlovat.se/lofte/<id>/<slug>` + en förklarande rad. (2) Nästa-kloss-förhandsvisningen ritar själva tetromino-formen (mini-grid) i partifärg+stämpel. (3) Mobil: canvas skalas efter viewport + tryckkontroller (◀ ▶ ↻ ⤓) + layout anpassad. (4) Grafik: klossarna får djup (topp-highlight + botten-skugga), den aktiva klossen får en gul kontur + mjuk skugga, radrensning får en kort flash-animation, bakgrunden får karaktär, och typen/modalerna blir mer självsäkra med den gula accenten.

**Tech Stack:** TypeScript, Vite, Vitest, HTML Canvas.

## Global Constraints ( oförändrade )
- **Neutralitet först:** partiet kosmetiskt; allt visuellt djup/accent appliceras ENHETLIGT på alla klossar oavsett parti. Gula accenten är neutral (signalfärg, inte partifärg). Kostnad = poängvikt. Ton torr/saklig. Inget `verbatim`. Tester offline. `pnpm test`+`typecheck`+`build` gröna.
- Palett oförändrad (papper/svarta/gul + partifärger endast i dataviz). Fonter: Anton/IBM Plex Mono/Source Serif 4. radius 0 kvar som bas, men klossdjup/linjär highlight tillåts inom det uttrycksfulla valet.

## Beslut tagna
- Grafikriktning: mer uttrycksfullt (djup, motion, accent), inom utlovats palett/typografi.
- Mobil: on-screen tryckknappar (upptäckbara för nya spelare) + responsiv canvas.
- Löfteslänk: `https://utlovat.se/lofte/<id>/<slug>`.

## Filstruktur
| Sökväg | Ändras |
|---|---|
| `src/types.ts` | `GamePiece.slug`, `PromiseData.slug` |
| `src/api.ts` | `validatePromises`/`toGamePieces` behåller `slug` |
| `src/ui.ts` | game-over: förklarande rad + länk; nästa-kloss: ritar mini-form; tryckknappar; typhierarki |
| `src/render.ts` | cell-djup (highlight/skugga), aktiv kloss gul kontur + skugga, radrens-flash |
| `src/main.ts` | clear-anim-tillstånd; touch-handlers; mobila storlekar |
| `src/styles/app.css` | bakgrundskaraktär, tryckknappar, responsiv, accent |
| `index.html` | markup för tryckknappar |

---

## I4-Task 1: Game-over beskrivning + löfteslänk

**Files:** `src/types.ts`, `src/api.ts`, `src/ui.ts`; tests.

- [ ] `src/types.ts`: lägg till `slug: string` på `PromiseData` och `GamePiece`.
- [ ] `src/api.ts`: `validatePromises` behåller `slug` (sträng); `toGamePieces` sätter `slug`.
- [ ] `src/ui.ts` `showGameOver`: lägg till (a) en förklarande rad efter löftet: t.ex. "Det här löftet låstes sist och fyllde brädet — det blev det som gav dig game over." och (b) en länk "Läs löftet på utlovat.se →" till `https://utlovat.se/lofte/${killer.id}/${killer.slug}`, öppnas i ny flik (`target="_blank" rel="noopener"`). Torr ton, inga värderingar.
- [ ] `tests/api.test.ts`: assert `slug` överlever `toGamePieces`. `pnpm test`/`typecheck`/`build` gröna. Commit.

## I4-Task 2: Nästa-kloss visar formen

**Files:** `src/ui.ts` (showNext), ev. `src/render.ts` (delad form-hjälp).

- [ ] Bygg en liten delad hjälp som returnerar en tetrominos cell-offsets för en given form (samma tabell som engine använder) — återanvänd från `src/engine.ts` (ROTATIONS[shape][0]) om den går att exportera, annars en lokal mini-referens.
- [ ] `showNext`: rita en mini-grid (t.ex. 4×4 CSS-rutor eller en liten canvas) som visar formen i partifärg med stämpel, i stället för bara en färgplupp + text. Behåll partifärg + förkortning (kosmetiskt).
- [ ] `pnpm test`/`typecheck`/`build` gröna. Commit.

## I4-Task 3: Mobil — tryckkontroller + responsiv

**Files:** `src/styles/app.css`, `index.html`, `src/main.ts`.

- [ ] `index.html`: lägg till on-screen kontroller `<div class="vt-touch">` med knappar ◀ ▶ ↻ (rotera) ⤓ (hard drop). 
- [ ] `src/main.ts`: knappar triggar samma handlingar som tangentbordet (move/rotate/hard-drop). Förhindra dubbla handlingar vid snabb tryck (enkel throttle).Förhindra scroll/zoom vid touch på brädet (`touch-action: none`).
- [ ] Responsiv: canvas storlek anpassas efter tillgänglig bredd (skala cellerna); inforutan lägger sig under brädet på smal skärm; kontrollerna synns på touchenheter (och döljs inte på desktop — de är upptäckbara).
- [ ] `pnpm test`/`typecheck`/`build` gröna. Commit.

## I4-Task 4: Grafik — uttrycksfullt, inom paletten

**Files:** `src/render.ts`, `src/styles/app.css`, ev. `src/ui.ts`.

- [ ] **Klossdjup:** varje fylld cell ritas med en tunn topp-highlight (ljusare rand i toppen) och en botten-skugga (mörkare rand i botten) — enhetligt för alla partier. Ingen gradient-blob; linjära ränder i sammafamiljens ljushet.
- [ ] **Aktiv kloss:** en gul (`GUL`) 2 px kontur runt den aktiva klossen + en mjuk drop-skugga så den läser som svävande över brädet.
- [ ] **Radrens-flash:** när `clearLines` rensar >0, sätt ett kort anim-tillstånd i `main.ts` (t.ex. `clearAnim = {rows, until}` ~180 ms) där `render.ts` ritar en vit/gul flash på just de raderna innan de kollapsar. Blockera ny spawn under animen.
- [ ] **Bakgrund:** subtil karaktär bakom brädet (t.ex. ett mycket svagt geometriskt mönster via CSS-gradient på papper — inte plottrigt).
- [ ] **Typhierarki + accent:** självsäkrare rubriker (Anton), poäng/tal i Mono med gul accent på det viktigaste, polerad modal och Starta-knapp med gul markering.
- [ ] Allt djup appliceras enhetligt — neutralitet bevaras. `pnpm test`/`typecheck`/`build` gröna. Commit.

## Self-Review
- Game-over förklarar + länkar till rätt löftes-URL.
- Nästa-kloss visar formen.
- Går att spela i telefon (tryck + responsiv).
- Grafiken känns mer levande utan att bryta palett/typografi eller neutralitet.
- Inget `verbatim`; tester offline.
