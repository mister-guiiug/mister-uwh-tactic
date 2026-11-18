import { describe, expect, it } from 'vitest';
import css from '../index.css?raw';

/**
 * Ce que ces tests figent : L'INTERFACE NE NOMME PLUS UNE TAILLE DE TEXTE
 * (ADR 0017).
 *
 * L'audit du 18/11/2026 relevait onze tailles à l'écran, de 10,88 à 20 px,
 * écrites une à une : vingt `font-size` en dur dans `index.css`, une
 * trentaine de `text-sm` et `text-xs`, et l'échelle fluide du socle qui
 * glissait avec la fenêtre. Il en reste six, nommées par leur usage, à la
 * manière d'Astryx : `display-3`, `h1`, `h2`, `h3`, `h4`, `body`, `label`,
 * `supporting` (les trois derniers partagent leurs tailles avec `h4`).
 */

const sources = import.meta.glob<string>('../**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Le dessin du terrain parle en mètres, l'image en pixels : pas l'interface. */
const HORS_INTERFACE = /Board2D\.tsx$|stepImage\.tsx$|PrintSheet\.tsx$/;

const composants = Object.entries(sources).filter(
  ([chemin]) => !/\.test\.tsx$/.test(chemin) && !HORS_INTERFACE.test(chemin)
);

/** La grammaire est déclarée une fois, dans son bloc : on lit le reste. */
function horsDeLaGrammaire(feuille: string): string {
  const debut = feuille.indexOf("LA GRAMMAIRE D'ASTRYX");
  const fin = feuille.indexOf('Une seule voix pour les titres');
  expect(debut).toBeGreaterThan(0);
  expect(fin).toBeGreaterThan(debut);
  return feuille.slice(0, debut) + feuille.slice(fin);
}

describe('l’échelle typographique', () => {
  it('index.css n’écrit aucune taille de texte hors des jetons', () => {
    const tailles = [
      ...horsDeLaGrammaire(css).matchAll(/font-size:\s*([^;]+);/g),
    ].map(m => m[1]!.trim());
    expect(tailles.length).toBeGreaterThan(10);
    expect(tailles.filter(t => !t.startsWith('var(--text-'))).toEqual([]);
  });

  it('six tailles, et 12 px au plancher', () => {
    const crans = [...css.matchAll(/--font-size-[a-z0-9]+:\s*([0-9.]+)rem;/g)]
      .map(m => Number(m[1]) * 16)
      .sort((a, b) => a - b);
    expect(crans).toEqual([12, 14, 17, 20, 24, 29]);
  });

  it('trouve les composants à relire', () => {
    expect(composants.length).toBeGreaterThan(20);
  });

  it.each(composants)('%s ne choisit pas sa taille de texte', (_c, code) => {
    expect(code.match(/\btext-(xs|sm|base|lg|[2-9]?xl)\b/g) ?? []).toEqual([]);
    expect(code.match(/fontSize\s*[:=]/g) ?? []).toEqual([]);
  });
});
