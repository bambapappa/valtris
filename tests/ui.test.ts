// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  showActiveTelegram,
  showHelpModal,
  updateSoundButton,
  setStats,
  showStatus,
  renderCategoryLegend,
  renderPartyLegend,
  shapeGlyph,
} from '../src/ui';
import type { GamePiece, PartyData } from '../src/types';
import { SVARTA, PAPPER } from '../src/profile';

describe('ui', () => {
  const sampleParties: PartyData[] = [
    { code: 's', name: 'Socialdemokraterna', color: '#EE2020', color_text: '#FFFFFF', block: 'rödgrön' },
    { code: 'm', name: 'Moderaterna', color: '#1B5CB3', color_text: '#FFFFFF', block: 'tidö' },
    { code: 'sd', name: 'Sverigedemokraterna', color: '#DDDDDD', color_text: '#111111', block: 'tidö' },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <span id="sound-icon">🔊</span>
      <div id="help-modal" hidden></div>
      <div id="telegram">
        <span id="telegram-stamp"></span>
        <span id="telegram-title"></span>
        <span id="telegram-cost"></span>
      </div>
      <span id="score"></span>
      <span id="level"></span>
      <span id="lines"></span>
      <span id="highscore"></span>
      <span id="status"></span>
      <ul id="legend-category"></ul>
      <ul id="legend-party"></ul>
    `;
  });

  describe('showActiveTelegram', () => {
    it('shows default placeholder state when piece is null', () => {
      showActiveTelegram(null, sampleParties);
      const stampEl = document.getElementById('telegram-stamp')!;
      const titleEl = document.getElementById('telegram-title')!;
      const costEl = document.getElementById('telegram-cost')!;

      expect(stampEl.textContent).toBe('VAL');
      expect(stampEl.style.background).toBe('rgb(17, 17, 17)');
      expect(stampEl.style.color).toBe('rgb(246, 243, 236)');
      expect(titleEl.textContent).toBe('valtris');
      expect(costEl.textContent).toBe('');
    });

    it('shows piece details with cost > 0', () => {
      const piece: GamePiece = {
        id: 'p1',
        title: 'Sänk skatten på arbete',
        slug: 'sank-skatten',
        party: 'm',
        category: 'skatter',
        msek_base: 12500,
        shape: 'L',
        quote: 'Vi vill sänka skatten',
        source: { url: 'https://example.com', domain: 'example.com' },
      };

      showActiveTelegram(piece, sampleParties);
      const stampEl = document.getElementById('telegram-stamp')!;
      const titleEl = document.getElementById('telegram-title')!;
      const costEl = document.getElementById('telegram-cost')!;

      expect(stampEl.textContent).toBe('M');
      expect(stampEl.style.background).toBe('rgb(27, 92, 179)'); // #1B5CB3
      expect(stampEl.style.color).toBe('rgb(246, 243, 236)'); // PAPPER for dark blue
      expect(titleEl.textContent).toBe('Sänk skatten på arbete');
      expect(costEl.textContent).toBe('12\u00A0500 MSEK');
    });

    it('shows REGLERING when msek_base is 0', () => {
      const piece: GamePiece = {
        id: 'p2',
        title: 'Skärpta straff',
        slug: 'skarpta-straff',
        party: 'sd',
        category: 'rättsväsende',
        msek_base: 0,
        shape: 'Z',
        quote: '',
        source: { url: '', domain: '' },
      };

      showActiveTelegram(piece, sampleParties);
      const stampEl = document.getElementById('telegram-stamp')!;
      const titleEl = document.getElementById('telegram-title')!;
      const costEl = document.getElementById('telegram-cost')!;

      expect(stampEl.textContent).toBe('SD');
      expect(stampEl.style.background).toBe('rgb(221, 221, 221)'); // #DDDDDD
      expect(stampEl.style.color).toBe('rgb(17, 17, 17)'); // SVARTA for light grey
      expect(titleEl.textContent).toBe('Skärpta straff');
      expect(costEl.textContent).toBe('0 MSEK (REGLERING)');
    });
  });

  describe('showHelpModal', () => {
    it('shows and hides the help modal', () => {
      const modal = document.getElementById('help-modal')!;
      expect(modal.hidden).toBe(true);

      showHelpModal(true);
      expect(modal.hidden).toBe(false);

      showHelpModal(false);
      expect(modal.hidden).toBe(true);
    });
  });

  describe('updateSoundButton', () => {
    it('toggles sound icon between muted and unmuted', () => {
      const icon = document.getElementById('sound-icon')!;
      updateSoundButton(true);
      expect(icon.textContent).toBe('🔇');

      updateSoundButton(false);
      expect(icon.textContent).toBe('🔊');
    });
  });

  describe('setStats & showStatus', () => {
    it('updates stats correctly', () => {
      setStats(1500, 2, 4, 3000);
      expect(document.getElementById('score')!.textContent).toBe('1\u00A0500');
      expect(document.getElementById('level')!.textContent).toBe('2');
      expect(document.getElementById('lines')!.textContent).toBe('4');
      expect(document.getElementById('highscore')!.textContent).toBe('3\u00A0000');
    });

    it('updates status message', () => {
      showStatus('Spel igång');
      expect(document.getElementById('status')!.textContent).toBe('Spel igång');
    });
  });

  describe('legends', () => {
    it('renders category legend and party legend', () => {
      renderCategoryLegend();
      const catLegend = document.getElementById('legend-category')!;
      expect(catLegend.children.length).toBeGreaterThan(0);

      renderPartyLegend(sampleParties);
      const partyLegend = document.getElementById('legend-party')!;
      expect(partyLegend.children.length).toBe(3);
    });

    it('generates shape glyph SVG', () => {
      const glyph = shapeGlyph('T', 6);
      expect(glyph).toContain('<svg');
      expect(glyph).toContain('class="vt-glyph"');
    });
  });
});
