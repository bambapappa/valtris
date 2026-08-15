import { COLS, ROWS, cellsOf } from './engine';
import type { Board, ActivePiece } from './engine';
import { SVARTA, GUL, LINJE_SVAG, FONT_MONO, stampColorOn, mix } from './profile';
import type { createParticleSystem } from './particles';

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

export interface ClearFlash {
  rows: number[];
  until: number;
}


/**
 * Taktil kloss med 45°-fasning (Stil A):
 * Ljusare fasning uppe/vänster, mörkare fasning nere/höger, och skarp
 * 1px mörk yttre ram för djup och taktil trycksakskänsla.
 */
function fillCell(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  row: number,
  col: number,
  party: string,
  color: string,
): void {
  const r = cellRect(m, row, col);
  const bevel = Math.max(2, Math.round(m.cell * 0.12));

  // 1. Bas-rektangel
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // 2. Topp & vänster fasning (ljusare highlight)
  ctx.fillStyle = mix(color, '#ffffff', 0.42);
  // Topp-fasning (trapets)
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.lineTo(r.x + r.w - bevel, r.y + bevel);
  ctx.lineTo(r.x + bevel, r.y + bevel);
  ctx.closePath();
  ctx.fill();

  // Vänster-fasning (trapets)
  ctx.beginPath();
  ctx.moveTo(r.x, r.y);
  ctx.lineTo(r.x + bevel, r.y + bevel);
  ctx.lineTo(r.x + bevel, r.y + r.h - bevel);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
  ctx.fill();

  // 3. Botten & höger fasning (mörkare skugga)
  ctx.fillStyle = mix(color, '#000000', 0.45);
  // Botten-fasning (trapets)
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  ctx.lineTo(r.x + bevel, r.y + r.h - bevel);
  ctx.lineTo(r.x + r.w - bevel, r.y + r.h - bevel);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.closePath();
  ctx.fill();

  // Höger-fasning (trapets)
  ctx.beginPath();
  ctx.moveTo(r.x + r.w, r.y);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x + r.w - bevel, r.y + r.h - bevel);
  ctx.lineTo(r.x + r.w - bevel, r.y + bevel);
  ctx.closePath();
  ctx.fill();

  // 4. Inre plan yta
  ctx.fillStyle = color;
  ctx.fillRect(r.x + bevel, r.y + bevel, r.w - bevel * 2, r.h - bevel * 2);

  // 5. Yttre skarp hårlinje
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  // 6. Stämpel: partiförkortning i Mono, centrerad
  const label = party.toUpperCase();
  ctx.fillStyle = stampColorOn(color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(m.cell * 0.40)}px ${FONT_MONO}`;
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
}

/**
 * Ghost piece (landningsskugga): ritas med partifärgad inre fyllning
 * och en mörk streckad ytterlinje med hög kontrast så den syns perfekt
 * mot pappersbakgrunden oavsett om partifärgen är ljusgul, ljusblå eller mörk.
 */
function drawGhost(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  ghost: ActivePiece,
  color: string,
): void {
  ctx.save();
  // Partifärgad mjuk fyllning
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.22;
  for (const [r, c] of cellsOf(ghost)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const rr = cellRect(m, r, c);
      ctx.fillRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
    }
  }

  // Mörk streckad kontur för skarp kontrast mot papper
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = SVARTA;
  ctx.lineWidth = 1.5;
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([3, 2]);
  }
  for (const [r, c] of cellsOf(ghost)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const rr = cellRect(m, r, c);
      ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
    }
  }
  ctx.restore();
}

function outlineActive(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  active: ActivePiece,
): void {
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
    ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
  }
  ctx.restore();
}

function drawClearFlash(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  flash: ClearFlash,
  now: number,
): void {
  const remain = flash.until - now;
  if (remain <= 0) return;
  const t = Math.max(0, Math.min(1, remain / 180));
  const alpha = 0.78 * t;
  const boardW = m.cell * COLS;
  ctx.fillStyle = `rgba(255, 252, 230, ${alpha.toFixed(3)})`;
  for (const r of flash.rows) {
    if (r < 0 || r >= ROWS) continue;
    const y = m.boardY + r * m.cell;
    ctx.fillRect(m.boardX, y, boardW, m.cell);
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  board: Board,
  active: ActivePiece | null,
  colorOf: (party: string) => string,
  flash?: ClearFlash | null,
  now: number = performance.now(),
  ghost?: ActivePiece | null,
  shakeOffsetY = 0,
  particleSystem?: ReturnType<typeof createParticleSystem> | null,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  if (shakeOffsetY !== 0) {
    ctx.translate(0, shakeOffsetY);
  }

  const boardW = m.cell * COLS;
  const boardH = m.cell * ROWS;

  // Rutnät
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

  // Låsta celler
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c];
      if (cell) {
        fillCell(ctx, m, r, c, cell.party, cell.color || colorOf(cell.party));
      }
    }
  }

  // Ghost piece (ritas under aktiv kloss om den inte redan är vid botten)
  if (ghost && active && ghost.row !== active.row) {
    drawGhost(ctx, m, ghost, colorOf(active.game.party));
  }

  // Aktiv kloss
  if (active) {
    for (const [r, c] of cellsOf(active)) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        fillCell(ctx, m, r, c, active.game.party, colorOf(active.game.party));
      }
    }
    outlineActive(ctx, m, active);
  }

  // Radrens-flash
  if (flash && flash.rows.length > 0) {
    drawClearFlash(ctx, m, flash, now);
  }

  // Yttre ram
  ctx.strokeStyle = SVARTA;
  ctx.lineWidth = 2;
  ctx.strokeRect(m.boardX + 1, m.boardY + 1, boardW - 2, boardH - 2);

  // Partiklar och flytande poäng
  if (particleSystem) {
    particleSystem.draw(ctx);
  }

  ctx.restore();
}
