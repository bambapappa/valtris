import { COLS, ROWS, cellsOf } from './engine';
import type { Board, ActivePiece } from './engine';
import { SVARTA, GUL, LINJE_SVAG, FONT_MONO, stampColorOn, mix } from './profile';

export interface ViewMetrics {
  cell: number;
  boardX: number;
  boardY: number;
}

export function computeMetrics(canvasW: number, canvasH: number): ViewMetrics {
  const cell = Math.floor(Math.min(canvasW / COLS, canvasH / ROWS));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  return {
    cell,
    boardX: Math.floor((canvasW - boardW) / 2),
    boardY: Math.floor((canvasH - boardH) / 2),
  };
}

export function cellRect(
  m: ViewMetrics,
  row: number,
  col: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: m.boardX + col * m.cell,
    y: m.boardY + row * m.cell,
    w: m.cell,
    h: m.cell,
  };
}

/**
 * Klossdjup — andelar av cellens höjd för topp-highlight respektive
 * botten-skugga. Små, fasta för alla partier → enhetligt, neutralt djup.
 */
const DEEP_TOP = 0.18;     // topp-highlight: övre 18% av cellen
const DEEP_BOTTOM = 0.22;  // botten-skugga: nedre 22% av cellen
const HL_AMT = 0.28;       // mix mot vitt för highlight
const SH_AMT = 0.34;       // mix mot svart för skugga

/**
 * Radrens-flash. Sätts av main.ts när clearLines rensar >0 rader. Renderaren
 * ritar en vit/gul flash på just dessa rader (över klossarna, under ramen)
 * under det gällande tidsfönstret. Allt visuellt — motorn (clearLines) är
 * oförändrat och ren; flashen är en render+loop-fråga lagd ovanpå.
 */
export interface ClearFlash {
  rows: number[];     // radindex som ska rensas (i det board-läge som ritas)
  until: number;      // timestamp (performance.now()) då flashen löper ut
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  row: number,
  col: number,
  party: string,
  color: string,
): void {
  const r = cellRect(m, row, col);
  // Partifärg (dataviz — klossen).
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // ── Klossdjup: linjära ränder (ingen blob-gradient). ──
  // Topp-highlight: ljusare band längs överkanten. Botten-skugga: mörkare
  // band längs underkanten. Samma andel + samma mix-belopp för ALLA partier
  // → djupet är kosmetiskt uniformt och bryter inte neutraliteten.
  const topH = Math.max(1, Math.round(r.h * DEEP_TOP));
  const botH = Math.max(1, Math.round(r.h * DEEP_BOTTOM));
  ctx.fillStyle = mix(color, '#ffffff', HL_AMT);
  ctx.fillRect(r.x, r.y, r.w, topH);
  ctx.fillStyle = mix(color, '#000000', SH_AMT);
  ctx.fillRect(r.x, r.y + r.h - botH, r.w, botH);

  // Hårlinje kanten på varje cell för definition.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  // Stämpel: partiförkortning i Mono, centrerad. Färgen väljs luminansbaserat
  // mot cellens partifärg (stampColorOn) — inte color_text, som för 5 av 8
  // partier är identisk med fillen (osynlig stämpel).
  const label = party.toUpperCase();
  ctx.fillStyle = stampColorOn(color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(m.cell * 0.42)}px ${FONT_MONO}`;
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
}

/**
 * Aktiv kloss: kontureras med en 2 px GUL (#ffd600) ram och en mjuk
 * drop-skugga så den läser som svävande över brädet. GUL är utlovats neutrala
 * signalfärg (inte en partifärg) → konturen är densamma oavsett vilket parti
 * den aktiva klossen bär. Skuggan släcks innan klossarna ritas så den inte
 * blöder över låsta celler (se drawScene).
 */
function outlineActive(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  active: ActivePiece,
  color: string,
): void {
  // Mjuk drop-skugga runt varje cell i den aktiva klossen — syns som en lätt
  // halo under/tilt av klossen. shadowBlur i canvas är dyr; vi slår på den
  // bara runt själva konturen och slår av direkt efteråt.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = Math.max(4, m.cell * 0.35);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(2, m.cell * 0.12);
  ctx.strokeStyle = GUL;
  ctx.lineWidth = 2;
  for (const [r, c] of cellsOf(active)) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const rr = cellRect(m, r, c);
    // Skuggan behöver en stroked rect för att shadow ska applicera.
    ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
  }
  ctx.restore();
  // Använd inte `color` som konturfärg — konturen är alltid GUL (neutralt).
  void color;
}

/**
 * Radrens-flash: vit/gul ett-skikt-overlay på de rader som håller på att
 * rensas, ritad ovanpå klossarna men under brädesramen. Intensiteten fades
 * linjärt mot 0 i slutet av fönstret så övergången till kollapsen är mjuk.
 */
function drawClearFlash(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  flash: ClearFlash,
  now: number,
): void {
  const remain = flash.until - now;
  if (remain <= 0) return;
  // ~180 ms fönster (sätts av main.ts); alpha faller linjärt 0.78 → 0.
  const t = Math.max(0, Math.min(1, remain / 180));
  const alpha = 0.78 * t;
  const boardW = m.cell * COLS;
  // Vit ton (läsbar ovanpå vilken partifärg som helst) med en aning av utlovats
  // gula signalfärg så flashen hör ihop med spelets accentfärg.
  ctx.fillStyle = `rgba(255, 252, 230, ${alpha.toFixed(3)})`;
  for (const r of flash.rows) {
    if (r < 0 || r >= ROWS) continue;
    const y = m.boardY + r * m.cell;
    ctx.fillRect(m.boardX, y, boardW, m.cell);
  }
}

/**
 * Renderar scenen i utlovats profil: pappersbakgrund (transparent — DOM:en
 * målar papper), synlig 2px SVARTA brädesram, svaga LINJE_SVAG rutlinjer,
 * och partistämpel i Mono per fylld cell.
 *
 * Stämpelfärgen väljs per cell via `stampColorOn(cellens partifärg)` så
 * förkortningen är läslig för alla 8 partier (luminansbaserat, neutralt).
 *
 * Polering (I4-Task 4): fyllda celler får ett enhetligt topp/botten-djup,
 * den aktiva klossen får en gul 2px-kontur + mjuk drop-skugga, och rader
 * som håller på att rensas blinkar vitt/gult under ~180 ms (via `flash`).
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  board: Board,
  active: ActivePiece | null,
  colorOf: (party: string) => string,
  flash?: ClearFlash | null,
  now: number = performance.now(),
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const boardW = m.cell * COLS;
  const boardH = m.cell * ROWS;

  // Svaga rutlinjer (1px LINJE_SVAG) inuti brädet — dras före klossarna så
  // de syns igenom ofyllda celler men täcks av fyllda.
  ctx.strokeStyle = LINJE_SVAG;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    const x = m.boardX + c * m.cell + 0.5;
    ctx.moveTo(x, m.boardY);
    ctx.lineTo(x, m.boardY + boardH);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = m.boardY + r * m.cell + 0.5;
    ctx.moveTo(m.boardX, y);
    ctx.lineTo(m.boardX + boardW, y);
  }
  ctx.stroke();

  // Låsta celler.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c];
      if (cell) {
        fillCell(ctx, m, r, c, cell.party, cell.color || colorOf(cell.party));
      }
    }
  }

  // Aktiv kloss: fyll celler först, lägg sedan gul kontur + drop-skugga
  // ovanpå så den läser som svävande. (Skuggan släcks internt i outlineActive
  // via save/restore — den påverkar inte efterföljande ritning.)
  if (active) {
    for (const [r, c] of cellsOf(active)) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        fillCell(ctx, m, r, c, active.game.party, colorOf(active.game.party));
      }
    }
    outlineActive(ctx, m, active, colorOf(active.game.party));
  }

  // Radrens-flash: ovanpå klossarna, under brädesramen.
  if (flash && flash.rows.length > 0) {
    drawClearFlash(ctx, m, flash, now);
  }

  // Synlig brädesram: 2px SVARTA, dras sist så den ligger ovanpå allt.
  ctx.strokeStyle = SVARTA;
  ctx.lineWidth = 2;
  // Centrera 2px-linjen på brädets kant: offset 1px utåt/inåt ger en skarp ram.
  ctx.strokeRect(m.boardX + 1, m.boardY + 1, boardW - 2, boardH - 2);
}
