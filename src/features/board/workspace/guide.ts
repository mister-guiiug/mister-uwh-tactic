import { useEffect, useState } from 'react';
import { boardStore, useBoard } from '../store.ts';
import { playerId, type Step } from '../model.ts';

/** Les quatre gestes, dans l'ordre : descendre, le palet, une étape, lire. */
export const GESTURES = ['dive', 'puck', 'step', 'play'] as const;
export type GuideGesture = (typeof GESTURES)[number];

/** Le bouton à montrer : celui qui fait le geste en cours. */
export type GuideControl = 'dive' | 'puck' | 'step' | 'play';

/**
 * CE QUE LE GUIDE MONTRE DU DOIGT : un jeton à toucher, ou un bouton.
 * `null` : rien, le guide est fini.
 */
export interface GuideTarget {
  token?: string;
  control?: GuideControl;
}

export interface GuideProgress {
  /** Le geste en cours, de 0 à 3 ; `-1` : tous faits. */
  at: number;
  finished: boolean;
  target: GuideTarget | null;
}

const isField = (id: string) => !id.startsWith('arbitre') && id !== 'palet';

/**
 * LE DOIGT DU GUIDE (ADR 0020, suivi du 21/11/2026). La seule mesure du
 * guide en phrases : passé dès le premier geste. Une phrase demande de
 * trouver le joueur et le bouton qu'elle nomme ; un anneau les montre.
 *
 * - descendre : un joueur blanc à toucher, puis « Descendre au fond » ;
 * - le palet : le joueur choisi (ou celui qui est au fond), puis « Donner le
 *   palet » ;
 * - une étape : « + » ; lire : « Lire ».
 */
export function guideTarget(
  at: number,
  selected: string | null,
  current: Step | undefined
): GuideTarget | null {
  const gesture = GESTURES[at];
  if (!gesture) return null;
  if (gesture === 'step' || gesture === 'play') return { control: gesture };
  if (selected && isField(selected)) return { control: gesture };
  const poses = Object.entries(current?.poses ?? {}).filter(([id]) =>
    isField(id)
  );
  if (gesture === 'puck') {
    const under = poses.find(([, pose]) => pose.surface === false);
    if (under) return { token: under[0] };
  }
  const white = poses.find(([id]) => id.startsWith('blanc'));
  return { token: white?.[0] ?? playerId('blanc', 1) };
}

/**
 * OÙ EN EST LE GUIDE, lu sur le tableau lui-même : le geste est fait quand
 * le schéma le montre. Le tableau l'appelle une fois et le passe au guide
 * (le texte) comme au terrain et aux boutons (l'anneau).
 */
export function useGuideProgress(): GuideProgress {
  const steps = useBoard(s => s.tactic.steps);
  const index = useBoard(s => s.step);
  const selected = useBoard(s => s.selected);
  const [played, setPlayed] = useState(false);

  // La lecture lancée, une fois : on l'écoute dans le magasin plutôt que de
  // la recopier dans un effet à chaque rendu.
  useEffect(
    () =>
      boardStore.subscribe(state => {
        if (state.playing && state.tactic.steps.length > 1) setPlayed(true);
      }),
    []
  );

  const current = steps[index];
  const met = [
    Object.entries(current?.poses ?? {}).some(
      ([id, pose]) => isField(id) && pose.surface === false
    ),
    steps.some(step => step.carrier),
    steps.length > 1,
    played,
  ];
  const at = met.findIndex(m => !m);
  return {
    at,
    finished: at === -1,
    target: guideTarget(at, selected, current),
  };
}
