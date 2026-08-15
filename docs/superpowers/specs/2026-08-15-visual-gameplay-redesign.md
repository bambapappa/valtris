# Designspecifikation: Visuell lyftning, Game Feel och Ljudbild för valtris

**Datum:** 2026-08-15  
**Status:** Godkänd design, redo för implementeringsplan  
**Mål:** Förvandla valtris från ett stelt grundprojekt till ett taktilt, visuellt attraktivt och roligt spel i utlovat.se:s grafiska profil och neutrala anda.

---

## 1. Bakgrund & Neutralitetskontrakt

valtris är ett webbaserat Tetris där klossarna är partiernas verkliga vallöften från [utlovat.se](https://utlovat.se). 
Det ursprungliga designdokumentet ([`docs/superpowers/specs/2026-08-12-valtris-design.md`](file:///Users/bambapappa/Dev/projects/valtris/docs/superpowers/specs/2026-08-12-valtris-design.md)) etablerade **neutralitetskontraktet** och datamappningen.

Denna specifikation bygger vidare på grunden och introducerar:
1. **Löftesnärvaro under spelets gång** via en **Live-telegramremsa** i toppen som visar vad spelaren bygger med i realtid.
2. **Taktil "Game Feel" & visuell juice**: Ghost piece (landningsguide), skärmskak vid hård drop, pappersstans-partiklar och flytande reformpoäng vid radrensning.
3. **Ljudbild via Web Audio API**: Krispiga mekaniska klick och stämpelljud utan externa filer.
4. **Hjälp & Spelregler (`?`)**: En lättillgänglig modal tillgänglig från både startskärmen och under pågående spel som förklarar kontroller, poäng och neutralitet.

### Neutralitetskontraktet (Orubbligt)
* **Partiet på klossen är 100 % kosmetiskt:** Färg och förkortning visas, men påverkar aldrig fysik, sannolikheter, gravitation, poäng eller svårighetsgrad.
* **Kategori styr form, kostnad styr poäng:** Fast mappning kategori → tetromino. Kostnaden i MSEK/år är poängvikt.
* **Tonen är torr och saklig:** All text är hämtad från utlovat.se (CC-BY-4.0) utan värderingar.

---

## 2. Gränssnitt, Layout & Typografi

### 2.1 Visuell profil & Designtokens
* **Färger:** Varmt myndighetspapper (`--papper: #f6f3ec`), tryckbläck (`--svarta: #111111`), signalgult (`--gul: #ffd600`), grafit (`--grafit: #3f3d38`), dis (`--dis: #6e6a61`), svaga hårlinjer (`--linje-svag: #c9c3b6`).
* **Typografi:** 
  * `Anton` (display): Versala rubriker, banners, "TETRIS!".
  * `IBM Plex Mono` (mono): Alla tal, stämplar, etiketter, kostnader, flytande poäng.
  * `Source Serif 4` (brödtext): Vallöftesrubriker, citat, regler.
* **Form:** Kantig trycksaksestetik, `border-radius: 0` på alla komponenter, 1px/2px solida svarta ramar.

### 2.2 Live-telegram (Toppremsa)
* **Placering:** Fast remsa i absolut överkant av spelskärmen (både desktop och mobil).
* **Stil:** Svart platta (`#111111`) med 2 px gul underkant (`#ffd600`), textfärg `#f6f3ec`.
* **Innehåll:**
  * Vänster: Partistamp `[S]`, `[M]`, etc. med partifärg och kontrasterande bokstav.
  * Mitten: Löftets titel i `Source Serif 4` / `IBM Plex Mono`, med CSS-ellipsis (`text-overflow: ellipsis; white-space: nowrap; overflow: hidden;`) så den aldrig ändrar remsans höjd (~36 px).
  * Höger: Kostnad i gult (t.ex. `45 000 MSEK/ÅR`).
* **Övergång:** Subtil mjuk fade (120 ms) när en ny kloss spawnas.

### 2.3 Desktop vs Mobil (≤ 720px)
* **Desktop:**
  * Header med titel, undertitel, ljudknapp (`🔊`/`🔇`) och hjälpknapp (`?`).
  * Live-telegram spänner över spelzonen.
  * 2-kolumns layout: Vänster är canvas (upp till 360 px), höger är sidopanel (*Nästa kloss* 4×4 mini-grid, *Poäng* med gul vänsteraccent och mjuk uppräkning, *Nivå*, *Rensade rader*, *Highscore*).
* **Mobil:**
  * Live-telegram i toppen.
  * Kompakt HUD-rad ovanför brädet: `POÄNG: 124 500` · `NIVÅ: 3` · `RADER: 14` · `NÄSTA: [Mini-glyph]`.
  * Canvas skalas dynamiskt efter bredden via `resizeCanvas`.
  * Touch-kontroller fästa direkt under brädet: 4 knappar (◀ ↻ ▶ ⤓) med direkt respons via `pointerdown` och gul aktiv färg.

### 2.4 Hjälpknapp (`?`) & Modal
* Tydlig `?`-knapp i headern.
* Klick under spel pausar spelloopen automatiskt och öppnar en pappersmodal med 5 korta avsnitt:
  1. *Hur man styr* (tangenter & touch).
  2. *Form = Kategori* (tabell över kategorier och deras tetromino).
  3. *Färg = Parti* (kosmetiskt, ger inga fördelar).
  4. *Poängräkning* (låskostnad + radbonus summas och multipliceras med nivå).
  5. *Neutralitet & Källa* (utlovat.se CC-BY-4.0).
* Klick på *Stäng* eller `Esc` stänger modalen och återupptar spelet sömlöst.

---

## 3. Game Feel, Visuella Effekter & Canvas

### 3.1 Ghost Piece (Landningsguide)
* **Beräkning:** `hardDropRow(board, active)` i `engine.ts`.
* **Rendering:** Ritas på canvas under den aktiva klossen som en partifärgad streckad kontur (1.5 px) med 15 % alfa-fyllning.
* **Beteende:** Visas endast när klossen svävar över sin landningsposition; tonas bort när klossen rör vid botten.

### 3.2 Hard Drop Punch (Screen Shake)
* Vid hård drop (`Space` eller `⤓`) tillförs en vertikal offset (3–4 px nedåt) på canvas/brädesramen.
* Offseten dämpas ut exponentiellt över ~120 ms med en fjäderrörelse.

### 3.3 Radrensning: Pappersstans & Flytande Poäng
* **Stans-flash:** Fyllda rader blinkar intensivt i signalgult (`#ffd600`) och vitt under 180 ms.
* **Partiklar (Pappersstans):** Varje cell i den fyllda raden spottar ut 3–5 små rektangulära partiklar i cellens partifärg som rör sig utåt/nedåt med slumpmässig gravitation och rotation över 400 ms.
* **Flytande poängtext:** En stämpeltext i `IBM Plex Mono` stansas ut över radens mitt och svävar uppåt 20 px under 700 ms:
  * 1 rad: `+12 000 MSEK`
  * 2 rader: `DUBBEL! +34 000 MSEK`
  * 3 rader: `TRIPPEL! +78 000 MSEK`
  * 4 rader: `TETRIS! +160 000 MSEK`
* **Mjukt nedfall:** Klossarna ovanför de rensade raderna faller ner med en mjuk mikrostuds.

### 3.4 Prestanda & Partikelpool
* Partiklar och flytande texter hanteras i en förallokerad fast array (max 80 partiklar, max 5 aktiva texter) i `src/particles.ts` för att garantera noll Garbage Collection under spel och stabil 60 FPS.

---

## 4. Ljudmotor (Web Audio API)

Fristående modul [`src/audio.ts`](file:///Users/bambapappa/Dev/projects/valtris/src/audio.ts) som använder syntetiska oscillatorer och brusfilter utan externa ljudfiler.

### 4.1 Ljudeffekter
* **`playMove()` / `playRotate()`:** Extremt kort klick (15 ms triangelvåg 440 Hz → 220 Hz med snabbt decay) likt ett mekaniskt tangentbord.
* **`playHardDrop()` / `playLock()`:** Dämpad stämpelduns (sinusvåg 90 Hz → 30 Hz över 60 ms + kort lågpassbrus).
* **`playLineClear(lines: number)`:** Stigande harmoniska dur-ackord i klock/tryck-stil:
  * 1 rad: C5 + E5 (523 Hz, 659 Hz)
  * 2 rader: C5 + E5 + G5
  * 3 rader: C5 + E5 + G5 + C6
  * 4 rader (Tetris): C5 + G5 + C6 + E6 med längre efterklang och gult skimmer.
* **`playGameOver()`:** Kort fallande tonsekvens i retrostil.

### 4.2 Ljudkontroll & Persistens
* Ljudknapp (`🔊 Ljud på` / `🔇 Ljud av`) i sidhuvudet.
* Status sparas i `localStorage.getItem('valtris_muted')`.
* `AudioContext` initieras vid första användarinteraktionen (startknapp, piltangent eller klick) för att uppfylla webbläsares autoplay-policy.

---

## 5. Modulstruktur & Ändringar

```
src/
├── types.ts       # Datatyper (inkl. Particle, FloatingText, AudioEvents)
├── api.ts         # Hämta från utlovat.se (oförändrad)
├── mapping.ts     # Kategori->form, kostnad->poäng, parti->färg (oförändrad)
├── pool.ts        # Slumpmässig löftespåse utan återläggning (oförändrad)
├── score.ts       # Poängberäkning (oförändrad)
├── engine.ts      # Tetris-logik + export av ghostDropRow
├── profile.ts     # Färg- och typografitokens för canvas
├── particles.ts   # (NY) Partikelsystem & flytande poängtexter
├── audio.ts       # (NY) Web Audio API syntetisör & mute-state
├── render.ts      # Canvas-rendering (Board + Ghost Piece + Shake + Partiklar)
├── ui.ts          # DOM-hjälpar (Live-telegram, hjälpmodal, HUD, stats)
├── main.ts        # Spelloop, audio-triggering, paus/resume, touch & keyboard
└── styles/
    ├── tokens.css # Designtokens
    ├── base.css   # Typografi & reset
    └── app.css    # Layout, telegram, hjälpmodal, touch, HUD
```

---

## 6. Teststrategi & Kvalitetskrav

1. **Enhetstester (`vitest`):**
   * [`tests/engine.test.ts`](file:///Users/bambapappa/Dev/projects/valtris/tests/engine.test.ts): Verifiera `ghostDropRow` (att spökklossen stannar vid rätt bottenrad och vid hinder).
   * [`tests/particles.test.ts`](file:///Users/bambapappa/Dev/projects/valtris/tests/particles.test.ts): Testa att partiklar och flytande texter spawnas, uppdateras och återvinns utan läckor.
   * [`tests/audio.test.ts`](file:///Users/bambapappa/Dev/projects/valtris/tests/audio.test.ts): Mocka AudioContext och verifiera att anrop inte kraschar när ljud är aktivt eller mutat.
   * Alla 9 befintliga testfiler (inklusive neutralitetstestet [`tests/neutrality.test.ts`](file:///Users/bambapappa/Dev/projects/valtris/tests/neutrality.test.ts)) måste fortsätta vara 100 % gröna.
2. **Visuell & Responsiv verifiering:**
   * Verifiera att Live-telegram aldrig ändrar höjd oavsett löftestitelns längd.
   * Verifiera att mobilvy (360 px) inte orsakar horisontell scroll eller hoppande touch-knappar.
   * Verifiera att hjälpmodalen pauser/resumar spelet felfritt.
