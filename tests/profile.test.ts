import { describe, it, expect } from 'vitest';
import { stampColorOn, mix, STAMP_LIGHT, STAMP_DARK, PAPPER, SVARTA } from '../src/profile';
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

describe('mix — linjär färgblandning', () => {
  it('amt=0 returnerar a oavkortat', () => {
    expect(mix('#112233', '#ffffff', 0)).toBe('#112233');
  });
  it('amt=1 returnerar b oavkortat', () => {
    expect(mix('#112233', '#ffffff', 1)).toBe('#ffffff');
  });
  it('blandar mittpunkten korrekt (#000 + #fff @0.5 → #808080)', () => {
    // 127.5 rundas till 128 → 0x80
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('klamrar amt utanför [0,1]', () => {
    expect(mix('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
  it('accepterar hex utan #', () => {
    expect(mix('112233', 'ffffff', 0)).toBe('#112233');
  });
  it('lägger alltid till # och två siffror per kanal', () => {
    const out = mix('#000000', '#ffffff', 0.5);
    expect(out[0]).toBe('#');
    expect(out.length).toBe(7);
  });
  it('mix mot vitt ger en ljusare variant (S #EE2020)', () => {
    // röd + vitt @0.25 → ljusare röd
    const lighter = mix('#ee2020', '#ffffff', 0.25);
    const [r, g, b] = [lighter.slice(1, 3), lighter.slice(3, 5), lighter.slice(5, 7)]
      .map((h) => parseInt(h, 16));
    expect(r).toBeGreaterThan(0xee);
    expect(g).toBeGreaterThan(0x20);
    expect(b).toBeGreaterThan(0x20);
  });
  it('mix mot svart ger en mörkare variant (M #1B5CB3)', () => {
    const darker = mix('#1b5cb3', '#000000', 0.25);
    const [r, g, b] = [darker.slice(1, 3), darker.slice(3, 5), darker.slice(5, 7)]
      .map((h) => parseInt(h, 16));
    expect(r).toBeLessThan(0x1b);
    expect(g).toBeLessThan(0x5c);
    expect(b).toBeLessThan(0xb3);
  });
});
