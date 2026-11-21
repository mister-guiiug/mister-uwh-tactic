import { useCallback, useEffect, useState } from 'react';

/**
 * L'HEURE, RELUE TANT QU'UN CHRONOMÈTRE TOURNE (`clock.ts`). Toutes les
 * `period` millisecondes, et aussitôt que l'onglet revient au premier plan :
 * un téléphone en veille ne reçoit plus ses `setInterval`, et l'écran
 * rallumé montrerait sinon, une période durant, le temps d'avant la veille.
 *
 * L'heure sert à l'AFFICHAGE : le temps lui-même se calcule sur des
 * instants, et ne dépend pas de la régularité de ces relevés.
 */
export function useNow(running: boolean, period = 1000): [number, () => void] {
  const [now, setNow] = useState(() => Date.now());
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(refresh, period);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [running, period, refresh]);
  return [now, refresh];
}
