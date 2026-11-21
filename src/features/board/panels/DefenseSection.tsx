import { useId } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { useBoard } from '../store.ts';
import { usePlaceDefense } from './usePlaceDefense.ts';

/**
 * L'ADVERSAIRE QUI RÉAGIT, sous la composition : on place son équipe, puis
 * l'autre prend d'un geste une place défendable sur l'étape en cours. La
 * phrase au-dessus des boutons dit ce que c'est — une aide au placement, pas
 * une intelligence de jeu — et ce que fait la règle (`defense.ts`).
 */
export function DefenseSection() {
  const { t } = useI18n();
  const counts = useBoard(s => s.tactic.counts);
  const place = usePlaceDefense();
  const titleId = useId();
  const hintId = useId();

  return (
    <section className="uwh-stack uwh-stack--tight" aria-labelledby={titleId}>
      <h3 className="uwh-subtitle" id={titleId}>
        {t('defense.title')}
      </h3>
      <p className="uwh-muted m-0 text-supporting" id={hintId}>
        {t('defense.hint')}
      </p>
      <Button
        variant="outline"
        block
        aria-describedby={hintId}
        disabled={counts.noir === 0}
        onClick={() => place('noir')}
      >
        <Shield size={18} aria-hidden="true" />
        {t('defense.black')}
      </Button>
      <Button
        variant="outline"
        block
        aria-describedby={hintId}
        disabled={counts.blanc === 0}
        onClick={() => place('blanc')}
      >
        <Shield size={18} aria-hidden="true" />
        {t('defense.white')}
      </Button>
    </section>
  );
}
