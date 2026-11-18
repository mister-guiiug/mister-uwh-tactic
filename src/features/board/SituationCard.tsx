import { useState } from 'react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { SelectField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../i18n/index.ts';
import { SITUATIONS, type Situation } from './situations.ts';
import { boardStore } from './store.ts';

/**
 * LES SITUATIONS DU RÈGLEMENT : engagement, palet neutre, palet d'avantage,
 * tir de pénalité. Elles replacent l'étape en cours ; « Annuler » la rend.
 */
export function SituationCard() {
  const { t } = useI18n();
  const toast = useToast();
  const [situation, setSituation] = useState<Situation>('equal');
  const label = (s: Situation) => t(`situations.${s}`);

  return (
    <Card className="mt-3 flex flex-col gap-3">
      <CardHeader
        title={t('situations.title')}
        subtitle={t('situations.hint')}
      />
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label={t('situations.pick')}
          value={situation}
          onChange={event => setSituation(event.target.value as Situation)}
          className="min-w-56 flex-1"
        >
          {SITUATIONS.map(s => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </SelectField>
        <Button
          variant="outline"
          onClick={() => {
            boardStore.getState().applySituation(situation);
            toast.show(t('situations.done', { name: label(situation) }), {
              tone: 'success',
            });
          }}
        >
          {t('situations.apply')}
        </Button>
      </div>
      <p className="m-0 text-sm" style={{ color: 'var(--dwc-text-soft)' }}>
        {t(`situations.rule.${situation}`)}
      </p>
    </Card>
  );
}
