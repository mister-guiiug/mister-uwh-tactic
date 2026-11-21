import { describe, expect, it } from 'vitest';
import { MARK, OFFICIAL, POOL, PUCK, SIGNAL, TEAM } from './tokens.ts';

/**
 * Ce que ces tests figent : UNE ZONE ET UN MOT SE LISENT SUR L'EAU
 * (ADR 0026), dans les deux thèmes — l'eau ne change pas avec le thème,
 * seule la plage s'assombrit, et un mot qui y déborde se lit par son
 * liseré blanc. L'arithmétique est celle de WCAG 2.2 : 3:1 pour un trait
 * (1.4.11), 4,5:1 pour un texte (1.4.3).
 */

function luminance(couleur: string): number {
  const h = couleur.replace('#', '');
  const canal = (i: number) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  const [haut, bas] = x > y ? [x, y] : [y, x];
  return (haut + 0.05) / (bas + 0.05);
}

/** `devant` posé à `opacite` sur `fond`, comme le fait le navigateur. */
function melange(devant: string, fond: string, opacite: number): string {
  const canal = (c: string, i: number) =>
    Number.parseInt(c.replace('#', '').slice(i, i + 2), 16);
  return `#${[0, 2, 4]
    .map(i =>
      Math.round(canal(devant, i) * opacite + canal(fond, i) * (1 - opacite))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** L'eau du terrain, celle du bassin autour, celle du fond en 3D. */
const EAUX = { terrain: POOL.water, bassin: POOL.pool, fond3d: POOL.water3d };

describe('les zones et les mots sur l’eau', () => {
  it.each(Object.entries(EAUX))(
    'le contour d’une zone se voit sur l’eau (%s) : 3:1',
    (_eau, fond) => {
      expect(contraste(MARK.stroke, fond)).toBeGreaterThanOrEqual(3);
    }
  );

  it.each(Object.entries(EAUX))(
    'un mot se lit sur l’eau (%s) et dans une zone : 4,5:1',
    (_eau, fond) => {
      expect(contraste(MARK.ink, fond)).toBeGreaterThanOrEqual(4.5);
      const zone = melange(MARK.fill, fond, MARK.fillOpacity);
      expect(contraste(MARK.ink, zone)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('sur la plage sombre, le liseré blanc porte le mot : 4,5:1', () => {
    expect(contraste(MARK.ink, SIGNAL.light)).toBeGreaterThanOrEqual(4.5);
  });

  it('un violet que rien d’autre ne porte sur le tableau', () => {
    const autres = [
      TEAM.blanc.body,
      TEAM.noir.body,
      OFFICIAL.shirt,
      PUCK.stroke,
      POOL.ink,
      SIGNAL.apnea,
      SIGNAL.selection3d,
    ];
    for (const couleur of [MARK.fill, MARK.stroke, MARK.ink]) {
      expect(autres).not.toContain(couleur);
    }
  });
});
