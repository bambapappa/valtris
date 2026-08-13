import type { GamePiece, PartyData } from './types';
import { stampColorOn } from './profile';

/**
 * UI-hjälpar för valtris. All DOM-uppdatering samlad här så main.ts bara
 * anropar funktioner. Stilmässigt i utlovats profil: Anton-versaler för
 * rubriker, IBM Plex Mono för tal/etiketter, Source Serif för brödtext och
 * citat. Färger/form via tokens (app.css); partifärger är det ENDAST kosmetiska
 * inslaget och sätts via inline style från partidata.
 *
 * Neutralitet: partiet visas bara som färg + förkortning. Inga värderande omdömen
 * om löften eller partier. Inget `verbatim`-mekanik.
 */

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmt(n: number): string {
  // Svenska siffror med mellanslagstusental — tabellmono, stabila kolumner.
  return n.toLocaleString('sv-SE');
}

export function setStats(score: number, level: number, lines: number, high: number | null) {
  setText('score', fmt(score));
  setText('level', String(level));
  setText('lines', String(lines));
  setText('highscore', high == null ? '—' : fmt(high));
}

/**
 * Nästa-kloss i profil: partifärgad stämpel (plupp + förkortning). Stämpelfärgen
 * väljs luminansbaserat via `stampColorOn(party.color)` så förkortningen är
 * läslig för alla 8 partier — inte `color_text`, som för 5 av 8 partier är
 * identisk med fillen. Visar INGEN poängsammanställning i förväg — neutralitet.
 */
export function showNext(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('next');
  if (!el) return;
  if (!piece) { el.textContent = ''; return; }
  const party = parties.find((p) => p.code === piece.party);
  const bg = party?.color ?? '#888888';
  const fg = stampColorOn(bg);
  el.innerHTML = `<div class="vt-piece" style="background:${bg}">
    <span class="vt-abbr" style="color:${fg}">${piece.party.toUpperCase()}</span>
    <span class="vt-cat" style="color:${fg};opacity:0.85">${piece.category}</span>
  </div>`;
}

/** Detaljpuff vid hover på nästa-kloss — löftet i korthet, neutral ton. */
export function showDetail(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('detail');
  if (!el) return;
  if (!piece) { el.hidden = true; return; }
  const party = parties.find((p) => p.code === piece.party);
  el.hidden = false;
  el.innerHTML = `<p><strong>${escapeHtml(piece.title)}</strong></p>
    <p>Parti: ${escapeHtml(party?.name ?? piece.party)} · Kategori: ${escapeHtml(piece.category)} · Kostnad: ${fmt(piece.msek_base)} msek/år</p>`;
}

export function showStatus(msg: string) {
  setText('status', msg);
}

/**
 * Game-over-overlay. Egentligt papperskort centrerat över brädet, i utlovats
 * stil: Anton-versal rubrik "SPELET SLUT", Mono-stats (poäng, rader, nivå,
 * bästa) och ett Source Serif-block som skriver ut det löfte som fyllt
 * brädet — rubrik, parti (endast kosmetiskt: färg+förkortning), kategori,
 * kostnad i msek/år, citatet kursivt och källans domän.
 *
 * Löftets `quote` och `source` kommer rakt från GamePiece (satt av api.ts från
 * utlovat.se). Inget påhittat.
 */
export function showGameOver(
  killer: GamePiece,
  parties: PartyData[],
  score: number,
  lines: number,
  level: number,
  best: number | null,
) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  const party = parties.find((p) => p.code === killer.party);
  const partyName = party?.name ?? killer.party;
  const partyColor = party?.color ?? '#888888';
  const partyText = stampColorOn(partyColor);
  const cost = `${fmt(killer.msek_base)} msek/år`;
  const quoteHtml = killer.quote
    ? `<p class="vt-promise-quote">${escapeHtml(killer.quote)}</p>`
    : '';
  const sourceDomain = killer.source?.domain || '(källa saknas)';
  const sourceHtml = killer.source?.url
    ? `<a href="${escapeAttr(killer.source.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(sourceDomain)}</a>`
    : escapeHtml(sourceDomain);

  overlay.innerHTML = `<div class="vt-card" role="dialog" aria-labelledby="vo-title">
    <h2 id="vo-title" class="vt-card-title">Spelet slut</h2>

    <dl class="vt-card-stats">
      <dt>Poäng</dt><dd>${fmt(score)}</dd>
      <dt>Rensade rader</dt><dd>${lines}</dd>
      <dt>Nivå</dt><dd>${level}</dd>
      <dt>Bästa</dt><dd>${best == null ? '—' : fmt(best)}</dd>
    </dl>

    <div class="vt-promise">
      <p class="vt-promise-rubrik">${escapeHtml(killer.title)}</p>
      <div class="vt-promise-meta">
        <span class="vt-stamp" style="background:${partyColor}">
          <span class="vt-stamp-swatch" style="background:${partyText}"></span>
          <span class="vt-stamp-abbr" style="color:${partyText}">${killer.party.toUpperCase()}</span>
        </span>
        <span>${escapeHtml(partyName)}</span>
        <span>${escapeHtml(killer.category)}</span>
        <span class="vt-promise-cost">${cost}</span>
      </div>
      ${quoteHtml}
      <p class="vt-promise-source">Källa: ${sourceHtml}</p>
    </div>

    <p class="vt-card-foot">Retur = spela igen</p>
  </div>`;
  overlay.hidden = false;
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
}

export function setMethodText() {
  const el = document.getElementById('method-text');
  if (!el) return;
  el.innerHTML = `
    <p>Klossarna är partiernas verkliga vallöften från utlovat.se. <strong>Kategorin styr klossens form</strong>,
    <strong>kostnaden styr poängen</strong>, och <strong>partiet bara visas</strong> — det ger ingen fördel.</p>
    <p>Du förlorar när stapeln når toppen, precis som i Tetris. Kostnaden är en poängvikt, inte ett tak:
    ett löften större än reformutrymmet är bara en högpoängare.</p>
    <p>Nollkostnadslöften (lagar, utredningar) ger en liten baspoäng. Spelet är neutralt: ett automatiserat
    prov kontrollerar att inget parti får en orimlig andel av klossarna.</p>`;
}

/* ── HTML-escape — för att visa löftescitat och partinamn säkert ── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
