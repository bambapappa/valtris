import { COLS, ROWS, cellsOf } from './engine';
import type { Board, ActivePiece } from './engine';
import { SVARTA, LINJE_SVAG, FONT_MONO } from './profile';

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

/** Default text color when no textColorOf is supplied — tryckbläck. */
const DEFAULT_TEXT_COLOR = SVARTA;

function fillCell(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  row: number,
  col: number,
  party: string,
  color: string,
  textColor: string,
): void {
  const r = cellRect(m, row, col);
  // Partifärg (dataviz — klossen).
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Hårlinje kanten på varje cell för definition.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  // Stämpel: partiförkortning i Mono, centrerad, i partiets kontrasttextfärg.
  const label = party.toUpperCase();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(m.cell * 0.42)}px ${FONT_MONO}`;
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
}

/**
 * Renderar scenen i utlovats profil: pappersbakgrund (transparent — DOM:en
 * målar papper), synlig 2px SVARTA brädesram, svaga LINJE_SVAG rutlinjer,
 * och partistämpel i Mono per fylld cell.
 *
 * `textColorOf` mappar partikod → partiets `color_text` (kontrast mot
 * partifärgen). Om den utelämnas faller stämpeln tillbaka på SVARTA så
 * befintliga anropare/testare inte går sönder.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  board: Board,
  active: ActivePiece | null,
  colorOf: (party: string) => string,
  textColorOf: (party: string) => string = () => DEFAULT_TEXT_COLOR,
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

  // Låsta celler + aktiv kloss.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c];
      if (cell) {
        fillCell(ctx, m, r, c, cell.party, cell.color || colorOf(cell.party), textColorOf(cell.party));
      }
    }
  }
  if (active) {
    for (const [r, c] of cellsOf(active)) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        fillCell(ctx, m, r, c, active.game.party, colorOf(active.game.party), textColorOf(active.game.party));
      }
    }
  }

  // Synlig brädesram: 2px SVARTA, dras sist så den ligger ovanpå allt.
  ctx.strokeStyle = SVARTA;
  ctx.lineWidth = 2;
  // Centrera 2px-linjen på brädets kant: offset 1px utåt/inåt ger en skarp ram.
  ctx.strokeRect(m.boardX + 1, m.boardY + 1, boardW - 2, boardH - 2);
}
