import { fetchGameInput, toGamePieces } from './api';
import { PromisePool } from './pool';
import { createBoard, spawn, tryMove, tryRotate, hardDropRow, lockPiece, clearLines, isSpawnBlocked, ghostPiece, COLS, ROWS } from './engine';
import type { Board } from './engine';
import { computeMetrics, drawScene } from './render';
import type { ClearFlash } from './render';
import { lockScore, lineScore } from './score';
import { colorForParty } from './mapping';
import { loadStore, saveStore, bestOf, addScore } from './highscore';
import { setStats, showNext, showDetail, showStatus, showGameOver, hideOverlay, setMethodText, renderCategoryLegend, renderPartyLegend, showActiveTelegram, showHelpModal, updateSoundButton } from './ui';
import { initAudio, isMuted, toggleMuted, playMove, playRotate, playHardDrop, playLock, playLineClear, playGameOver } from './audio';
import { createParticleSystem } from './particles';
import type { GamePiece, PartyData, PartyCode } from './types';

void COLS; void ROWS;

let parties: PartyData[] = [];
let pool: PromisePool | null = null;
let board = createBoard();
let active = spawn({ id:'x', title:'', slug:'', party:'s', category:'övrigt', msek_base:0, shape:'O', quote:'', source:{url:'',domain:''} });
let nextPiece: GamePiece | null = null;
let score = 0, level = 1, lines = 0, killer: GamePiece | null = null;
let over = false;
let started = false;
let pausedForHelp = false;
let rafId: number | null = null;
const store = loadStore();
const particleSystem = createParticleSystem();

// Screen-shake offset
let shakeUntil = 0;
let shakeOffsetY = 0;

const FLASH_MS = 180;
let clearFlash: ClearFlash | null = null;
let pendingBoard: Board | null = null;

const MAX_BOARD_W = 360;
function resizeCanvas() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  const app = document.querySelector('.vt-app') as HTMLElement | null;
  const avail = (app ? app.clientWidth : window.innerWidth) - 4;
  const targetW = Math.min(MAX_BOARD_W, Math.max(160, avail));
  const cell = Math.floor(targetW / COLS);
  const w = cell * COLS;
  const h = cell * ROWS;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

const onBoard = new Map<string, GamePiece>();

function tickInterval() { return Math.max(120, 800 - (level - 1) * 60); }
let lastTick = 0;
let lastFrameTime = performance.now();

function colorOf(p: string) { return colorForParty(p as PartyCode, parties); }

function draw() {
  const canvas = document.getElementById('board') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const now = performance.now();
  const m = computeMetrics(canvas.width, canvas.height);
  const ghost = (!over && started && !clearFlash) ? ghostPiece(board, active) : null;

  drawScene(ctx, m, board, over ? null : active, colorOf, clearFlash, now, ghost, shakeOffsetY, particleSystem);
}

type ActionKind = 'left' | 'right' | 'rotate' | 'down' | 'drop';
const lastActionAt: Record<ActionKind, number> = { left: 0, right: 0, rotate: 0, down: 0, drop: 0 };
const ACTION_THROTTLE_MS = 40;

function handleAction(action: ActionKind) {
  if (!started || over || pausedForHelp) return;
  initAudio();
  if (clearFlash) return;
  const now = performance.now();
  if (now - lastActionAt[action] < ACTION_THROTTLE_MS) return;
  lastActionAt[action] = now;

  switch (action) {
    case 'left': {
      const next = tryMove(board, active, -1, 0);
      if (next) { active = next; playMove(); }
      break;
    }
    case 'right': {
      const next = tryMove(board, active, 1, 0);
      if (next) { active = next; playMove(); }
      break;
    }
    case 'rotate': {
      const next = tryRotate(board, active);
      if (next) { active = next; playRotate(); }
      break;
    }
    case 'down': {
      const d = tryMove(board, active, 0, 1);
      if (d) { active = d; score += 1; playMove(); }
      break;
    }
    case 'drop': {
      active = { ...active, row: hardDropRow(board, active) };
      shakeUntil = performance.now() + 120;
      playHardDrop();
      lockActive();
      break;
    }
  }
  setStats(score, level, lines, bestOf(store));
}

function spawnNext() {
  const piece = nextPiece ?? pool!.spawn();
  nextPiece = pool!.spawn();
  active = spawn(piece);
  showNext(nextPiece, parties);
  showActiveTelegram(piece, parties);
  if (isSpawnBlocked(board, piece)) endGame(killer ?? piece);
}

function lockActive() {
  killer = active.game;
  board = lockPiece(board, active);
  onBoard.set(active.game.id, active.game);

  const before = board;
  const res = clearLines(board);
  const postClear = res.board;

  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  const m = canvas ? computeMetrics(canvas.width, canvas.height) : { cell: 30, boardX: 0, boardY: 0 };

  if (res.cleared > 0) {
    const clearedPieces = collectClearedPieces(before, postClear);
    const addedScore = lineScore(clearedPieces, res.cleared, level);
    lines += res.cleared;
    score += addedScore;
    level = 1 + Math.floor(lines / 10);
    pruneOnBoard();

    playLineClear(res.cleared);

    const fullRows: number[] = [];
    for (let i = 0; i < before.length; i++) {
      if (before[i]!.every((c) => c !== null)) {
        fullRows.push(i);
        // Spawna pappersstans-partiklar för varje cell i raden
        for (let col = 0; col < COLS; col++) {
          const cell = before[i]![col];
          const color = cell?.color || (cell ? colorOf(cell.party) : '#ffd600');
          const r = { x: m.boardX + col * m.cell, y: m.boardY + i * m.cell, w: m.cell, h: m.cell };
          particleSystem.spawnPaperExplosion(r.x, r.y, r.w, r.h, color, 3);
        }
      }
    }

    // Spawna flytande poängetikett
    const midRow = fullRows.length > 0 ? fullRows[Math.floor(fullRows.length / 2)]! : 10;
    const textX = m.boardX + (COLS * m.cell) / 2;
    const textY = m.boardY + midRow * m.cell;
    const label = res.cleared === 4 ? `TETRIS! +${addedScore.toLocaleString('sv-SE')} MSEK` : res.cleared === 3 ? `TRIPPEL! +${addedScore.toLocaleString('sv-SE')} MSEK` : res.cleared === 2 ? `DUBBEL! +${addedScore.toLocaleString('sv-SE')} MSEK` : `+${addedScore.toLocaleString('sv-SE')} MSEK`;
    particleSystem.spawnFloatingText(textX, textY, label, '#ffd600');

    setStats(score, level, lines, bestOf(store));
    pendingBoard = postClear;
    clearFlash = { rows: fullRows, until: performance.now() + FLASH_MS };
    active = { ...active, row: ROWS + 4 };
  } else {
    playLock();
    score += lockScore(active.game);
    board = postClear;
    setStats(score, level, lines, bestOf(store));
    spawnNext();
  }
}

function finishClearFlash() {
  if (!pendingBoard) return;
  board = pendingBoard;
  pendingBoard = null;
  clearFlash = null;
  spawnNext();
}

function collectClearedPieces(before: ReturnType<typeof createBoard>, _after: ReturnType<typeof createBoard>): GamePiece[] {
  const ids = new Set<string>();
  for (const row of before) {
    if (row.every((c) => c !== null)) {
      for (const cell of row) {
        if (cell && cell.pieceId) ids.add(cell.pieceId);
      }
    }
  }
  const out: GamePiece[] = [];
  for (const id of ids) {
    const g = onBoard.get(id);
    if (g) out.push(g);
  }
  return out;
}

function pruneOnBoard() {
  const remaining = new Set<string>();
  for (const row of board) {
    for (const cell of row) {
      if (cell?.pieceId) remaining.add(cell.pieceId);
    }
  }
  for (const id of onBoard.keys()) {
    if (!remaining.has(id)) onBoard.delete(id);
  }
}

function endGame(k: GamePiece) {
  over = true;
  playGameOver();
  addScore(store, score); saveStore(store);
  showGameOver(k, parties, score, lines, level, bestOf(store));
  setStats(score, level, lines, bestOf(store));
}

function step(now: number) {
  const dt = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;

  // Uppdatera partiklar och skärmskak
  particleSystem.update(dt);

  if (now < shakeUntil) {
    const remain = (shakeUntil - now) / 120;
    shakeOffsetY = Math.round(Math.sin(now * 0.05) * 3.5 * remain);
  } else {
    shakeOffsetY = 0;
  }

  if (started && !over && !pausedForHelp) {
    if (clearFlash && now >= clearFlash.until) {
      finishClearFlash();
    } else if (!clearFlash && now - lastTick > tickInterval()) {
      lastTick = now;
      const down = tryMove(board, active, 0, 1);
      if (down) active = down; else lockActive();
    }
  }
  if (started) draw();
  rafId = requestAnimationFrame(step);
}

function stopLoop() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

function reset() {
  board = createBoard(); score = 0; level = 1; lines = 0; over = false; killer = null;
  nextPiece = null; onBoard.clear(); clearFlash = null; pendingBoard = null;
  particleSystem.clear(); shakeOffsetY = 0; shakeUntil = 0;
  hideOverlay(); showStatus(''); spawnNext(); setStats(0, 1, 0, bestOf(store));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pausedForHelp) {
    toggleHelp(false);
    return;
  }
  if (!started) return;
  if (over) { if (e.key === 'Enter') beginGame(); return; }
  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); handleAction('left'); break;
    case 'ArrowRight': e.preventDefault(); handleAction('right'); break;
    case 'ArrowDown':  e.preventDefault(); handleAction('down'); break;
    case 'ArrowUp':    e.preventDefault(); handleAction('rotate'); break;
    case ' ':          e.preventDefault(); handleAction('drop'); break;
    default: return;
  }
});

document.querySelectorAll<HTMLButtonElement>('.vt-touch [data-action]').forEach((btn) => {
  const action = btn.dataset.action as ActionKind;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleAction(action);
  });
  btn.addEventListener('click', () => handleAction(action));
});

window.addEventListener('resize', () => { resizeCanvas(); draw(); });

const nextEl = document.getElementById('next');
if (nextEl) {
  nextEl.addEventListener('mouseenter', () => showDetail(nextPiece, parties));
  nextEl.addEventListener('mouseleave', () => showDetail(null, parties));
}

function setStartBtn(label: string, disabled: boolean) {
  const btn = document.getElementById('start-btn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.textContent = label;
  btn.disabled = disabled;
}

function showStartScreen() {
  started = false;
  over = false;
  stopLoop();
  hideOverlay();
  const ss = document.getElementById('start-screen');
  const game = document.querySelector<HTMLElement>('.vt-game');
  if (ss) ss.hidden = false;
  if (game) game.hidden = true;
}

function beginGame() {
  if (!pool) { setStartStatus('Väntar på data från utlovat.se…'); return; }
  initAudio();
  const ss = document.getElementById('start-screen');
  const game = document.querySelector<HTMLElement>('.vt-game');
  if (ss) ss.hidden = true;
  if (game) game.hidden = false;
  started = true;
  reset();
  if (rafId == null) rafId = requestAnimationFrame(step);
}

function setStartStatus(msg: string) {
  const el = document.getElementById('start-status');
  if (el) el.textContent = msg;
}

document.getElementById('start-btn')?.addEventListener('click', () => {
  if (pool) beginGame();
});

document.getElementById('overlay')?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && t.closest('#back-to-start')) showStartScreen();
});

// Ljudknapp
document.getElementById('sound-btn')?.addEventListener('click', () => {
  initAudio();
  const isMute = toggleMuted();
  updateSoundButton(isMute);
});

// Hjälpmodal (?)
function toggleHelp(show: boolean) {
  pausedForHelp = show;
  showHelpModal(show);
}

document.getElementById('help-btn')?.addEventListener('click', () => {
  toggleHelp(true);
});
document.getElementById('close-help-btn')?.addEventListener('click', () => {
  toggleHelp(false);
});

async function load() {
  updateSoundButton(isMuted());
  setMethodText();
  renderCategoryLegend();
  setStartStatus('Hämtar löften från utlovat.se…');
  showStatus('Hämtar löften från utlovat.se…');
  try {
    const { promises, parties: p } = await fetchGameInput();
    parties = p;
    const pieces = toGamePieces(promises);
    if (pieces.length === 0) throw new Error('no active promises');
    pool = new PromisePool(pieces);
    renderPartyLegend(parties);
    setStartStatus('');
    showStatus('');
    setStartBtn('Starta', false);
  } catch (err) {
    setStartStatus('Kunde inte hämta löften från utlovat.se just nu — försök igen.');
    showStatus('Kunde inte hämta löften från utlovat.se just nu.');
    console.error(err);
  }
}

resizeCanvas();
load();
