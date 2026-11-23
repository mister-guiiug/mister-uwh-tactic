import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import type { Team } from '../model.ts';
import { boardStore } from '../store.ts';
import { noteUsage } from '../../../app/usage.ts';

/**
 * LE GESTE ET SA CONFIRMATION (ADR 0032), partagés par l'onglet « Équipes »
 * et, en mode simple, par « ⋯ ». « Annuler » le défait, comme une
 * composition.
 */
export function usePlaceDefense() {
  const { t } = useI18n();
  const toast = useToast();
  return (team: Team) => {
    boardStore.getState().placeDefense(team);
    noteUsage('defense');
    toast.show(t(team === 'noir' ? 'defense.doneBlack' : 'defense.doneWhite'), {
      tone: 'success',
    });
  };
}
