import { useCallback, useMemo } from 'react';
import { useI18n } from '../../i18n/index.ts';
import type { Board2DLabels } from './Board2D.tsx';
import type { FramePlayer, FrameReferee } from './frame.ts';

/**
 * LES MOTS DU TABLEAU, une fois pour l'espace de travail, l'impression et les
 * vignettes de la bibliothèque. Le nom accessible d'un jeton dit tout ce que
 * le dessin montre : équipe, numéro, nom, profondeur, main, alerte d'apnée.
 */
export function useBoardLabels(warnings?: Set<string>): Board2DLabels {
  const { t, fmt } = useI18n();
  const formatDistance = useCallback(
    (metres: number) =>
      `${fmt.number(metres, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`,
    [fmt]
  );
  return useMemo(
    () => ({
      pitch: t('board.pitch'),
      help: t('board.help'),
      puck: t('board.puck'),
      player: (p: FramePlayer) => playerLabel(t, p, warnings?.has(p.id)),
      referee: (r: FrameReferee) => refereeLabel(t, r),
      formatDistance,
    }),
    [t, formatDistance, warnings]
  );
}

type T = ReturnType<typeof useI18n>['t'];

export function playerTitle(
  t: T,
  p: { team: 'blanc' | 'noir'; number: number }
): string {
  return t(p.team === 'blanc' ? 'board.whitePlayer' : 'board.blackPlayer', {
    number: p.number,
  });
}

export function playerLabel(t: T, p: FramePlayer, warned = false): string {
  return [
    playerTitle(t, p),
    p.substitute ? t('board.substitute') : '',
    p.name,
    p.surfaceness >= 0.5 ? t('board.surface') : t('board.underwater'),
    p.leftHanded ? t('board.leftHanded') : '',
    warned ? t('apnea.warning') : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function refereeTitle(
  t: T,
  r: { deck: boolean; number: number }
): string {
  return r.deck
    ? t('board.deckReferee')
    : t('board.referee', { number: r.number });
}

export function refereeLabel(t: T, r: FrameReferee): string {
  return [refereeTitle(t, r), r.name].filter(Boolean).join(', ');
}
