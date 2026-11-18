import { describe, expect, it } from 'vitest';
import { clampView, MAX_ZOOM, viewBoxOf, zoomAround } from './boardZoom.ts';

const base = { x: -2.4, y: -2.4, w: 29.8, h: 19.8 };

describe('le zoom du tableau', () => {
  it('reste entre ×1 et ×4, et dans le bassin', () => {
    expect(clampView({ k: 0.5, x: 10, y: 10 }, base)).toEqual({
      k: 1,
      x: base.x,
      y: base.y,
    });
    const v = clampView({ k: 9, x: 100, y: -100 }, base);
    expect(v.k).toBe(MAX_ZOOM);
    expect(v.x).toBeCloseTo(base.x + base.w - base.w / MAX_ZOOM);
    expect(v.y).toBe(base.y);
  });

  it('garde sous les doigts le point qu’on pince', () => {
    const pxPerUnit = 12;
    const anchor = { x: 10, y: 6 };
    const offset = { x: 150, y: 90 };
    const v = zoomAround(base, 2, anchor, offset, pxPerUnit);
    // Le point du bassin retombe au même pixel : (u − coin) × échelle.
    expect((anchor.x - v.x) * pxPerUnit * v.k).toBeCloseTo(offset.x);
    expect((anchor.y - v.y) * pxPerUnit * v.k).toBeCloseTo(offset.y);
  });

  it('écrit la portion visible en `viewBox`', () => {
    expect(viewBoxOf({ k: 2, x: 0, y: 1 }, base)).toBe('0 1 14.9 9.9');
  });
});
