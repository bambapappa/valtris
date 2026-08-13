import { fetchGameInput, toGamePieces } from './api';
import { PromisePool } from './pool';
import { createBoard, spawn, tryMove, tryRotate, hardDropRow, lockPiece, clearLines, isSpawnBlocked, COLS, ROWS } from './engine';
import { computeMetrics, drawScene } from './render';
import { lockScore, lineScore } from './score';
import { colorForParty } from './mapping';
import { loadStore, saveStore, bestOf, addScore } from './highscore';
import { setStats, showNext, showDetail, showStatus, showGameOver, hideOverlay, setMethodText, renderCategoryLegend, renderPartyLegend } from './ui';
import type { GamePiece, PartyData, PartyCode } from './types';

// COLS/ROWS are re-exported by main only for potential downstream use; keep the
// import live without an unused-variable error under noUncheckedIndexedAccess.
void COLS; void ROWS;

let parties: PartyData[] = [];
let pool: PromisePool | null = null;
let board = createBoard();
let active = spawn({ id:'x', title:'', party:'s', category:'övrigt', msek_base:0, shape:'O', quote:'', source:{url:'',domain:''} });
let nextPiece: GamePiece | null = null;
let score = 0, level = 1, lines = 0, killer: GamePiece | null = null;
let over = false;
let started = false;       // har användaren tryckt Starta? (stänger av loopen före start)
let rafId: number | null = null;
const store = loadStore();

// Pieces currently locked on the board, keyed by pieceId. Used to honestly sum
// the cleared promises' costs when a line clears (Global Constraint: cost drives
// score). The same promise id may be locked more than once across a long game
// (the pool refills), so we prune by presence on the board, not by clear event.
const onBoard = new Map<string, GamePiece>();

function tickInterval() { return Math.max(120, 800 - (level - 1) * 60); }
let lastTick = 0;

function colorOf(p: string) { return colorForParty(p as PartyCode, parties); }

function draw() {
  const canvas = document.getElementById('board') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  drawScene(ctx, computeMetrics(canvas.width, canvas.height), board, over ? null : active, colorOf);
}

function spawnNext() {
  const piece = nextPiece ?? pool!.spawn();
  nextPiece = pool!.spawn();
  active = spawn(piece);
  showNext(nextPiece, parties);
  if (isSpawnBlocked(board, piece)) endGame(killer ?? piece);
}

function lockActive() {
  killer = active.game;
  board = lockPiece(board, active);
  onBoard.set(active.game.id, active.game);

  const before = board;
  const res = clearLines(board);
  board = res.board;

  if (res.cleared > 0) {
    const clearedPieces = collectClearedPieces(before, board);
    lines += res.cleared;
    score += lineScore(clearedPieces, res.cleared, level);
    level = 1 + Math.floor(lines / 10);
    pruneOnBoard();
  } else {
    score += lockScore(active.game);
  }
  setStats(score, level, lines, bestOf(store));
  spawnNext();
}

/**
 * The GamePieces whose cells were removed by the last clearLines.
 *
 * `before` is the board just after locking (with full rows still present);
 * `after` is the board returned by clearLines (full rows dropped, empties
 * prepended on top). A row was removed iff it was full (no nulls) in `before`.
 * We scan those rows, collect the unique pieceIds, and look each up in the
 * on-board map to recover its cost. This makes the line bonus honestly sum the
 * cleared promises' costs rather than the previous stub (which returned only the
 * last killer). ids that no longer have any cell on the board are pruned by the
 * caller so a later refill+re-lock of the same promise id is tracked correctly.
 */
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

/** Drop map entries for ids that no longer have any cell on the board. */
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
  addScore(store, score); saveStore(store);
  showGameOver(k, parties, score, lines, level, bestOf(store));
  setStats(score, level, lines, bestOf(store));
}

function step(now: number) {
  if (started && !over) {
    if (now - lastTick > tickInterval()) {
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
  nextPiece = null; onBoard.clear(); hideOverlay(); showStatus(''); spawnNext(); setStats(0, 1, 0, bestOf(store));
}

window.addEventListener('keydown', (e) => {
  if (!started) return;                       // ignore keys on start screen
  if (over) { if (e.key === 'Enter') beginGame(); return; }  // Enter = spela igen
  switch (e.key) {
    case 'ArrowLeft': active = tryMove(board, active, -1, 0) ?? active; break;
    case 'ArrowRight': active = tryMove(board, active, 1, 0) ?? active; break;
    case 'ArrowDown': { const d = tryMove(board, active, 0, 1); if (d) { active = d; score += 1; } break; }
    case 'ArrowUp': active = tryRotate(board, active) ?? active; break;
    case ' ': active = { ...active, row: hardDropRow(board, active) }; lockActive(); break;
    default: return;
  }
  setStats(score, level, lines, bestOf(store));
});

const nextEl = document.getElementById('next');
if (nextEl) {
  nextEl.addEventListener('mouseenter', () => showDetail(nextPiece, parties));
  nextEl.addEventListener('mouseleave', () => showDetail(null, parties));
}

/* ── Startskärmflöde ──
 * Ingen autostart. Vid load: hämta data i bakgrunden och rita legender, men
 * starta INTE spel-loopen förrän användaren trycker Starta. Begin/return togglar
 * `started` och synlighet mellan #start-screen och .vt-game. */

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

/** Börja ett nytt spel (Starta-knappen, eller Retur på game-over). Göm
 * startskärmen, visa spelet, nollställ och starta loopen. */
function beginGame() {
  if (!pool) { setStartStatus('Väntar på data från utlovat.se…'); return; }
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

// Game-over-overlay: "tillbaka till start" återvänder till startskärmen.
document.getElementById('overlay')?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && t.closest('#back-to-start')) showStartScreen();
});

async function load() {
  setMethodText();
  renderCategoryLegend();          // statisk kategori→form-legend
  setStartStatus('Hämtar löften från utlovat.se…');
  showStatus('Hämtar löften från utlovat.se…');
  try {
    const { promises, parties: p } = await fetchGameInput();
    parties = p;
    const pieces = toGamePieces(promises);
    if (pieces.length === 0) throw new Error('no active promises');
    pool = new PromisePool(pieces);
    renderPartyLegend(parties);    // datadriven partifärgslegend
    setStartStatus('');
    showStatus('');
    setStartBtn('Starta', false);
  } catch (err) {
    setStartStatus('Kunde inte hämta löften från utlovat.se just nu — försök igen.');
    showStatus('Kunde inte hämta löften från utlovat.se just nu.');
    console.error(err);
  }
}

load();

