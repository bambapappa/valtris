import { describe, it, expect } from 'vitest';
import { stampColorOn, STAMP_LIGHT, STAMP_DARK, PAPPER, SVARTA } from '../src/profile';
import partiesRaw from './fixtures/parties.sample.json';

describe('stampColorOn — luminansbaserad stämpelfärg', () => {
  it('exponerar STAMP_LIGHT=PAPPER och STAMP_DARK=SVARTA', () => {
    expect(STAMP_LIGHT).toBe(PAPPER);
    expect(STAMP_DARK).toBe(SVARTA);
    expect(STAMP_LIGHT).toBe('#f6f3ec');
    expect(STAMP_DARK).toBe('#111111');
  });

  it('väljer SVARTA på ljus fill (SD #DDDDDD)', () => {
    // SD:s ljusa grå fill → mörk stämpel.
    expect(stampColorOn('#DDDDDD')).toBe(SVARTA);
  });

  it('väljer PAPPER på röd fill (S #EE2020)', () => {
    expect(stampColorOn('#EE2020')).toBe(PAPPER);
  });

  it('väljer PAPPER på mörkblå fill (M #1B5CB3)', () => {
    expect(stampColorOn('#1B5CB3')).toBe(PAPPER);
  });

  it('väljer PAPPER på nästan svart fill (#111111)', () => {
    expect(stampColorOn('#111111')).toBe(PAPPER);
  });

  it('ger kontrast (≠ fill) för alla 8 verkliga partifärger', () => {
    // Sanity: stämpeln får aldrig sammanfalla med fillen — det var buggen med
    // color_text. Luminansregeln garanterar kontrast för alla partier.
    for (const p of partiesRaw.data) {
      const stamp = stampColorOn(p.color);
      expect(stamp, `${p.code}: stämpel får inte matcha fill ${p.color}`).not.toBe(p.color);
    }
  });

  it('tar emot hex med eller utan inledande #', () => {
    expect(stampColorOn('DDDDDD')).toBe(stampColorOn('#DDDDDD'));
    expect(stampColorOn('EE2020')).toBe(stampColorOn('#EE2020'));
  });
});
