import { useCallback, useMemo } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { describeStep, type StepWords } from './describe.ts';
import { playerTitle } from './labels.ts';
import type { Tactic } from './model.ts';

/**
 * L'ÉTAPE RACONTÉE DANS LA LANGUE DE L'ÉCRAN (ADR 0030) : les mots de
 * `describeStep`, pris au catalogue. Rend une fonction : le tableau, le
 * panneau et l'impression la demandent pour l'étape qu'ils montrent.
 */
export function useDescribeStep(): (tactic: Tactic, index: number) => string {
  const { t, m, fmt } = useI18n();
  const words = useMemo<StepWords>(
    () => ({
      name: player => player.name || playerTitle(t, player),
      start: t('describe.start'),
      nobody: t('describe.nobody'),
      forward: (player, metres) => t('describe.forward', { player, m: metres }),
      back: (player, metres) => t('describe.back', { player, m: metres }),
      side: (player, metres) => t('describe.side', { player, m: metres }),
      dives: player => t('describe.dives', { player }),
      surfaces: player => t('describe.surfaces', { player }),
      pass: (from, to) => t('describe.pass', { from, to }),
      flick: (from, to) => t('describe.flick', { from, to }),
      takes: player => t('describe.takes', { player }),
      drops: player => t('describe.drops', { player }),
      has: player => t('describe.has', { player }),
      others: count => fmt.plural(count, m.describe.others, { count }),
    }),
    [t, m, fmt]
  );
  return useCallback(
    (tactic: Tactic, index: number) =>
      describeStep(tactic, index, words).join(' '),
    [words]
  );
}
