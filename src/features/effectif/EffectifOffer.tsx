import { useMemo } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../i18n/index.ts';
import { useBoard } from '../board/store.ts';
import { applyChanges } from './model.ts';
import { dismissEffectifOffer, useEffectifOffer } from './offer.ts';
import { useEffectif } from './store.ts';
import { useApplyEffectif } from './useApplyEffectif.tsx';

/**
 * LA CARTE « APPLIQUER MON EFFECTIF ? » (ADR 0028), au-dessus du tableau,
 * quand un schéma vient d'arriver. Elle ne bloque rien et ne paraît que si
 * l'effectif changerait quelque chose : vide, ou déjà posé, elle se tait.
 *
 * C'est aussi LE geste du mode simple (ADR 0020) : sans onglets, il n'y a
 * pas d'onglet Équipes ; l'effectif s'y pose d'un toucher, ici, ou pas.
 */
export function EffectifOffer() {
  const { t } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const offered = useEffectifOffer();
  const effectif = useEffectif(s => s.effectif);
  const apply = useApplyEffectif('offre');
  const count = useMemo(
    () => applyChanges(tactic, effectif),
    [tactic, effectif]
  );

  if (offered !== tactic.id || count === 0) return null;

  return (
    <div
      className="uwh-modecard"
      role="region"
      aria-label={t('effectif.offerTitle')}
    >
      <p className="m-0">{t('effectif.offer')}</p>
      <div className="uwh-row">
        <Button size="sm" variant="primary" onClick={apply}>
          {t('effectif.apply')}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismissEffectifOffer}>
          {t('effectif.offerLater')}
        </Button>
      </div>
    </div>
  );
}
