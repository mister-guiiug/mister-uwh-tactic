import { useEffect, useState } from 'react';

/**
 * IMPRIMER UNE FEUILLE QUI N'EXISTE QUE LE TEMPS DE L'IMPRESSION. La feuille
 * (`uwh-print`, seule visible sur le papier) se monte, le dialogue
 * d'impression s'ouvre à l'image suivante, puis elle se démonte : dessiner
 * toutes les vignettes d'une phase ou d'une séance en permanence coûterait à
 * chaque rendu de l'écran.
 *
 * Rend `[printing, print]` : monter la feuille quand `printing` est vrai.
 */
export function usePrinting(): [boolean, () => void] {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done, { once: true });
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);
  return [printing, () => setPrinting(true)];
}
