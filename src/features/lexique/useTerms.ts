import { useEffect, useState } from 'react';
import type { Term } from './terms.ts';

/**
 * LES DÉFINITIONS, EN MORCEAU À PART. Elles pèsent 14 Ko et ne servent qu'à
 * relier les mots d'une consigne — rien ne les attend pour afficher le
 * tableau. Le premier rendu montre la consigne en texte simple ; les liens
 * paraissent quand le morceau est là (et il est dans le précache).
 */
let loaded: readonly Term[] | null = null;
let pending: Promise<readonly Term[]> | null = null;

export const loadTerms = () =>
  (pending ??= import('./terms.ts').then(module => (loaded = module.TERMS)));

export function useTerms(): readonly Term[] | null {
  const [terms, setTerms] = useState(loaded);
  useEffect(() => {
    if (terms) return;
    let alive = true;
    void loadTerms().then(list => {
      if (alive) setTerms(list);
    });
    return () => {
      alive = false;
    };
  }, [terms]);
  return terms;
}
