import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { useI18n } from '../../i18n/index.ts';
import { boardStore } from '../board/store.ts';
import { applyChanges, identitiesFrom } from './model.ts';
import { dismissEffectifOffer } from './offer.ts';
import { useEffectif } from './store.ts';

/**
 * « APPLIQUER MON EFFECTIF », d'où qu'on le touche — l'onglet Équipes ou la
 * carte proposée à l'arrivée d'un schéma (ADR 0028).
 *
 * Un seul geste à défaire (`applyIdentities` passe par `edit()`) : la barre
 * du schéma le défait comme le reste. La notification le dit, et rend
 * l'annulation à portée de doigt pendant huit secondes (ADR 0008) — à
 * condition que rien n'ait bougé depuis : sinon, « Annuler » défairait un
 * autre geste que celui qu'elle nomme.
 */
export function useApplyEffectif(origin: 'equipes' | 'offre') {
  const { t, fmt, m } = useI18n();
  const toast = useToast();

  return () => {
    const { effectif } = useEffectif.getState();
    const before = boardStore.getState().tactic;
    const count = applyChanges(before, effectif);
    dismissEffectifOffer();
    if (count === 0) return;
    boardStore.getState().applyIdentities(identitiesFrom(effectif));
    const applied = boardStore.getState().tactic;
    trackEvent('effectif', { geste: 'applique', origine: origin });
    const toastId = `effectif-${applied.id}-${applied.updatedAt}`;
    toast.show(
      <span className="flex flex-wrap items-center gap-2">
        {fmt.plural(count, m.effectif.applied, { count })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.dismiss(toastId);
            if (boardStore.getState().tactic === applied) {
              boardStore.getState().undo();
            }
          }}
        >
          {t('board.undo')}
        </Button>
      </span>,
      { id: toastId, duration: 8_000 }
    );
  };
}
