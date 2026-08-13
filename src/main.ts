import { fetchGameInput, toGamePieces } from './api';
import { PromisePool } from './pool';
import { createBoard, spawn, tryMove, tryRotate, hardDropRow, lockPiece, clearLines, isSpawnBlocked, COLS, ROWS } from './engine';
import type { Board } from './engine';
import { computeMetrics, drawScene } from './render';
import type { ClearFlash } from './render';
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
let active = spawn({ id:'x', title:'', slug:'', party:'s', category:'övrigt', msek_base:0, shape:'O', quote:'', source:{url:'',domain:''} });
let nextPiece: GamePiece | null = null;
let score = 0, level = 1, lines = 0, killer: GamePiece | null = null;
let over = false;
let started = false;       // har användaren tryckt Starta? (stänger av loopen före start)
let rafId: number | null = null;
const store = loadStore();

// ── Radrens-flash ──
// När clearLines rensar >0 rader sätts `clearFlash` med de fulla radindexen
// (i det board som ritas under flashen) och en tidsstämpel ~180 ms framåt.
// Renderaren ritar en vit/gul flash på just dessa rader. Under fönstret
// blockeras spawn/lock (vi håller kvar det rensade boardet visuellt) och
// medan flashen är aktiv hoppar tick-gravity över — klossen ska inte gå
// neråt under blinket. Efter löper ut sätts boardet till det kollapsade
// (clearLines redan beräknat) och spelet fortsätter. Allt visuellt;
// clearLines i engine.ts är fortfarande ren och omedelbar.
const FLASH_MS = 180;
let clearFlash: ClearFlash | null = null;
// Det kollapsade board som träder i kraft när flashen löper ut. Sätts
// samtidigt som clearFlash.
let pendingBoard: Board | null = null;

// ── Responsiv canvas ──
// Brädet skalas efter tillgänglig bredd så det inte svämmar över på en telefon.
// Max 360 px intern upplösning (cell ≈ 36 px) — skarpare än det fasta 300×600
// som fanns tidigare, och krymper på smala skärmar. width/height sätts i JS så
// cellerna i computeMetrics blir konsekventa och ritningen skarp.
const MAX_BOARD_W = 360;
function resizeCanvas() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  const app = document.querySelector('.vt-app') as HTMLElement | null;
  // Tillgänglig bredd = appens content-box (padding är redan avdraget).
  const avail = (app ? app.clientWidth : window.innerWidth) - 4; // 4 px slack för board-wrap:s 2 px ram
  const targetW = Math.min(MAX_BOARD_W, Math.max(160, avail));
  const cell = Math.floor(targetW / COLS);
  const w = cell * COLS;
  const h = cell * ROWS;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

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
  // Under en flash hålls `board` kvar i pre-clear-läget (fulla rader syns),
  // så flashen kan läggas över precis de rader som ska rensas. active är null
  // under flashen (se lockActive) så ingen aktiv kloss ritas då.
  drawScene(ctx, computeMetrics(canvas.width, canvas.height), board, over ? null : active, colorOf, clearFlash);
}

// ── Gemensamma handlingar ──
// Både tangentbordet och touch-knapparna anropar dessa — input-logiken finns på
// ett ställe, inte duplicerad. En liten per-action throttle hindrar snabba
// tryck (t.ex. touchstart + syntetiserad click) från att elda av två gånger.
type ActionKind = 'left' | 'right' | 'rotate' | 'down' | 'drop';
const lastActionAt: Record<ActionKind, number> = { left: 0, right: 0, rotate: 0, down: 0, drop: 0 };
const ACTION_THROTTLE_MS = 40;

function handleAction(action: ActionKind) {
  if (!started || over) return;
  // Blockera all input under radrens-flashen — klossen är redan låst och
  // spawn sker först när flashen löpt ut.
  if (clearFlash) return;
  const now = performance.now();
  if (now - lastActionAt[action] < ACTION_THROTTLE_MS) return;
  lastActionAt[action] = now;
  switch (action) {
    case 'left':   active = tryMove(board, active, -1, 0) ?? active; break;
    case 'right':  active = tryMove(board, active, 1, 0) ?? active; break;
    case 'rotate': active = tryRotate(board, active) ?? active; break;
    case 'down': { const d = tryMove(board, active, 0, 1); if (d) { active = d; score += 1; } break; }
    case 'drop':   active = { ...active, row: hardDropRow(board, active) }; lockActive(); break;
  }
  setStats(score, level, lines, bestOf(store));
}

function spawnNext() {
  const piece = nextPiece ?? pool!.spawn();
  nextPiece = pool!.spawn();
  active = spawn(piece);
  showNext(nextPiece, parties);
  if (isSpawnBlocked(board, piece)) endGame(killer ?? piece);
}

/**
 * Låser den aktiva klossen, räknar poäng och — om rader rensas — startar en
 * ~180 ms radrens-flash. Under flashen hålls `board` kvar i pre-clear-läget
 * (fulla rader syns) så renderaren kan blinka på just de raderna; det
 * kollapsade boardet sparas i `pendingBoard` och träder i kraft (med spawn)
 * när flashen löper ut i step(). Motorn (clearLines i engine.ts) är oförändrad
 * och omedelbar — flashen är uteslutande en render+loop-fråga lagd ovanpå.
 */
function lockActive() {
  killer = active.game;
  board = lockPiece(board, active);
  onBoard.set(active.game.id, active.game);

  const before = board;
  const res = clearLines(board);
  const postClear = res.board;

  if (res.cleared > 0) {
    const clearedPieces = collectClearedPieces(before, postClear);
    lines += res.cleared;
    score += lineScore(clearedPieces, res.cleared, level);
    level = 1 + Math.floor(lines / 10);
    pruneOnBoard();

    // Vilka rader var fulla (ska blinkas)? En rad var full i `before` om ingen
    // cell var null. Samla indexen i `before`:s ordning.
    const fullRows: number[] = [];
    for (let i = 0; i < before.length; i++) {
      if (before[i]!.every((c) => c !== null)) fullRows.push(i);
    }

    // Visuell frysning: behåll pre-clear board (fulla rader) för ritningen, lägg
    // undan det kollapsade boardet till flashens slut. Ingen aktiv kloss
    // under flashen (draw hoppar över den om active är null-ekvivalent).
    setStats(score, level, lines, bestOf(store));
    pendingBoard = postClear;
    clearFlash = { rows: fullRows, until: performance.now() + FLASH_MS };
    // Sätt active till en osynlig (utanför brädet) pseudo-piece så draw inte
    // ritar något aktivt under flashen. step gör spawnNext när flashen löpt ut.
    active = { ...active, row: ROWS + 4 };
  } else {
    score += lockScore(active.game);
    board = postClear;
    setStats(score, level, lines, bestOf(store));
    spawnNext();
  }
}

/** Tillämpa en utgången flash: byt till kollapsat board och spawna nästa. */
function finishClearFlash() {
  if (!pendingBoard) return;
  board = pendingBoard;
  pendingBoard = null;
  clearFlash = null;
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
    // Radrens-flash aktiv? Ingen gravity under fönstret — vi håller det
    // pre-clear boardet stilla så blinket syns. Löper det ut nu, applicera
    // kollapsen och spawna nästa kloss.
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
  hideOverlay(); showStatus(''); spawnNext(); setStats(0, 1, 0, bestOf(store));
}

window.addEventListener('keydown', (e) => {
  if (!started) return;                       // ignore keys on start screen
  if (over) { if (e.key === 'Enter') beginGame(); return; }  // Enter = spela igen
  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); handleAction('left'); break;
    case 'ArrowRight': e.preventDefault(); handleAction('right'); break;
    case 'ArrowDown':  e.preventDefault(); handleAction('down'); break;
    case 'ArrowUp':    e.preventDefault(); handleAction('rotate'); break;
    case ' ':          e.preventDefault(); handleAction('drop'); break;
    default: return;
  }
});

// ── Touch-kontroller ──
// pointerdown täcker mus, touch och pen — ett enda event, inget dubbelavfyrande
// från touchstart + syntetiserad click. touch-action: none (satt i CSS) stänger
// av scroll/zoom på knapparna och brädet. preventDefault här stoppar följden
// (click, fokus-ring på iOS) för att kåpan ska sitta på trycket, inte på klicket.
//
// A11y: knapparna är riktiga <button>, så Enter/Space aktiverar dem nativt via
// `click`. Eftersom pointerdown anropar preventDefault undertrycks den
// syntetiserade clicken på touch — men tangentbords-aktivering (Enter/Space)
// ger en äkta click-event, så vi lyssnar också på click för desktop-a11y.
// Throttlen i handleAction hindrar dubbelavfyrande om både pointerdown och
// click nås (t.ex. musklick).
document.querySelectorAll<HTMLButtonElement>('.vt-touch [data-action]').forEach((btn) => {
  const action = btn.dataset.action as ActionKind;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleAction(action);
  });
  // Tangentbordsaktivering (Enter/Space på fokuserad knapp) → click-event.
  btn.addEventListener('click', () => handleAction(action));
});

// Responsiv canvas: omrita vid resize så brädet alltid fyller tillgänglig bredd.
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

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

// Sätt responsiv canvas-storlek vid start (och vid resize, se ovan).
resizeCanvas();

load();

