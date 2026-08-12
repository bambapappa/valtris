import type { GamePiece, PartyData } from './types';

export function setStats(score: number, level: number, high: number | null) {
  document.getElementById('score')!.textContent = String(score);
  document.getElementById('level')!.textContent = String(level);
  document.getElementById('highscore')!.textContent = high == null ? '—' : String(high);
}

export function showNext(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('next')!;
  if (!piece) { el.textContent = ''; return; }
  const party = parties.find((p) => p.code === piece.party);
  el.innerHTML = `<div class="vt-piece" style="border-color:${party?.color ?? '#888'}">
    <span class="vt-abbr">${piece.party.toUpperCase()}</span>
    <span class="vt-cat">${piece.category}</span>
  </div>`;
}

export function showDetail(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('detail')!;
  if (!piece) { el.hidden = true; return; }
  const party = parties.find((p) => p.code === piece.party);
  el.hidden = false;
  el.innerHTML = `<p><strong>${piece.title}</strong></p>
    <p>Parti: ${party?.name ?? piece.party} · Kategori: ${piece.category} · Kostnad: ${piece.msek_base} msek/år</p>`;
}

export function showStatus(msg: string) {
  document.getElementById('status')!.textContent = msg;
}

export function showGameOver(killer: GamePiece, parties: PartyData[], score: number, lines: number) {
  const party = parties.find((p) => p.code === killer.party);
  const el = document.getElementById('status')!;
  el.innerHTML = `<div class="vt-over">
    <p>Spelet slut. Poäng: ${score}. Rensade rader: ${lines}.</p>
    <p>Det var ${party?.name ?? killer.party}:s löfte som fyllde brädet:</p>
    <p><strong>${killer.title}</strong> — ${killer.msek_base} msek/år (${killer.category}).</p>
    <p>Tryck Retur för att spela igen.</p>
  </div>`;
}

export function setMethodText() {
  document.getElementById('method-text')!.innerHTML = `
    <p>Klossarna är partiernas verkliga vallöften från utlovat.se. <strong>Kategorin styr klossens form</strong>,
    <strong>kostnaden styr poängen</strong>, och <strong>partiet bara visas</strong> — det ger ingen fördel.</p>
    <p>Du förlorar när stapeln når toppen, precis som i Tetris. Kostnaden är en poängvikt, inte ett tak:
    ett löften större än reformutrymmet är bara en högpoängare.</p>
    <p>Nollkostnadslöften (lagar, utredningar) ger en liten baspoäng. Spelet är neutralt: ett automatiserat
    prov kontrollerar att inget parti får en orimlig andel av klossarna.</p>`;
}
