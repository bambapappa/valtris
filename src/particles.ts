// particles.ts — partikelmotor och flytande poängtexter för valtris.
// Använder en fast förallokerad objektpool för stabil prestanda och noll GC.

import type { Particle, FloatingText } from './types';
import { FONT_MONO, SVARTA } from './profile';

export function createParticleSystem(maxParticles = 80, maxTexts = 8) {
  const particles: Particle[] = Array.from({ length: maxParticles }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    w: 0,
    h: 0,
    rotation: 0,
    vRot: 0,
    color: '#111111',
    alpha: 1,
    life: 0,
    maxLife: 400,
    active: false,
  }));

  const texts: FloatingText[] = Array.from({ length: maxTexts }, () => ({
    x: 0,
    y: 0,
    text: '',
    color: '#ffd600',
    alpha: 1,
    life: 0,
    maxLife: 700,
    active: false,
  }));

  return {
    spawnPaperExplosion(x: number, y: number, w: number, h: number, color: string, count = 4) {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        const p = particles[i]!;
        if (!p.active) {
          p.active = true;
          p.x = x + Math.random() * w;
          p.y = y + Math.random() * h;
          // Slumpmässig hastighet utåt och nedåt (pappersfall)
          p.vx = (Math.random() - 0.5) * 120;
          p.vy = -Math.random() * 80 - 20;
          p.w = 3 + Math.random() * 4;
          p.h = 3 + Math.random() * 4;
          p.rotation = Math.random() * Math.PI * 2;
          p.vRot = (Math.random() - 0.5) * 8;
          p.color = color;
          p.alpha = 1;
          p.life = 0;
          p.maxLife = 350 + Math.random() * 200;
          spawned++;
        }
      }
    },

    spawnFloatingText(x: number, y: number, text: string, color = '#ffd600') {
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (!t.active) {
          t.active = true;
          t.x = x;
          t.y = y;
          t.text = text;
          t.color = color;
          t.alpha = 1;
          t.life = 0;
          t.maxLife = 700;
          break;
        }
      }
    },

    update(dtMs: number) {
      const dtSec = dtMs / 1000;
      const gravity = 280; // px/s^2

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (p.active) {
          p.life += dtMs;
          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }
          p.vy += gravity * dtSec;
          p.x += p.vx * dtSec;
          p.y += p.vy * dtSec;
          p.rotation += p.vRot * dtSec;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        }
      }

      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (t.active) {
          t.life += dtMs;
          if (t.life >= t.maxLife) {
            t.active = false;
            continue;
          }
          // Sväva sakta uppåt (ca 30 px över sin livstid)
          t.y -= 35 * dtSec;
          // Håll full opacitet första hälften, tona sedan ut linjärt
          const progress = t.life / t.maxLife;
          t.alpha = progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) * 2);
        }
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      // Rita partiklar
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (p.active && p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      // Rita flytande texter
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (t.active && t.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.font = `bold 13px ${FONT_MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Bakgrundsplatta i trycksvärta så texten är kristallklar
          const metrics = ctx.measureText(t.text);
          const padX = 6, padY = 3;
          const bgW = metrics.width + padX * 2;
          const bgH = 18 + padY * 2;

          ctx.fillStyle = SVARTA;
          ctx.fillRect(t.x - bgW / 2, t.y - bgH / 2, bgW, bgH);
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(t.x - bgW / 2, t.y - bgH / 2, bgW, bgH);

          ctx.fillStyle = t.color;
          ctx.fillText(t.text, t.x, t.y + 0.5);
          ctx.restore();
        }
      }
    },

    getActiveParticleCount(): number {
      return particles.filter((p) => p.active).length;
    },

    getActiveTextCount(): number {
      return texts.filter((t) => t.active).length;
    },

    clear() {
      particles.forEach((p) => (p.active = false));
      texts.forEach((t) => (t.active = false));
    },
  };
}
