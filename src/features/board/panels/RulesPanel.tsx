import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { SelectField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useToast } from '@mister-guiiug/dev-pwa-config/react/toast';
import { useI18n } from '../../../i18n/index.ts';
import { REFEREE_PAIRS, type RefereePair } from '../model.ts';
import { SITUATIONS, type Situation } from '../situations.ts';
import { boardStore, useBoard } from '../store.ts';
import { Switch } from '../workspace/Switch.tsx';

/**
 * LE RÈGLEMENT : les situations qui replacent l'étape en cours (engagement,
 * palet neutre, palet d'avantage, tir de pénalité — « Annuler » la rend), et
 * les officiels qui le font appliquer, avec ce qu'on dessine d'eux.
 */
export function RulesPanel() {
  const { t } = useI18n();
  const toast = useToast();
  const counts = useBoard(s => s.tactic.counts);
  const display = useBoard(s => s.tactic.display);
  const actions = boardStore.getState();
  const [situation, setSituation] = useState<Situation>('equal');
  const label = (s: Situation) => t(`situations.${s}`);

  return (
    <div className="uwh-stack">
      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('situations.title')}</h3>
        <p className="uwh-muted m-0 text-supporting">{t('situations.hint')}</p>
        <SelectField
          label={t('situations.pick')}
          value={situation}
          onChange={event => setSituation(event.target.value as Situation)}
        >
          {SITUATIONS.map(s => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </SelectField>
        <p className="uwh-rule m-0 text-supporting">
          {t(`situations.rule.${situation}`)}
        </p>
        <Button
          variant="primary"
          onClick={() => {
            actions.applySituation(situation);
            toast.show(t('situations.done', { name: label(situation) }), {
              tone: 'success',
            });
          }}
        >
          {t('situations.apply')}
        </Button>
      </section>

      <section className="uwh-stack uwh-stack--tight">
        <h3 className="uwh-subtitle">{t('board.officials')}</h3>
        <SelectField
          label={t('board.refereeCount')}
          value={counts.referees}
          onChange={event =>
            actions.setCount('referees', Number(event.target.value))
          }
        >
          {[0, 2, 3].map(n => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('board.refereeLine')}
          value={display.refereeLine ?? ''}
          disabled={counts.referees < 2}
          onChange={event =>
            actions.setDisplay({
              refereeLine:
                event.target.value === ''
                  ? null
                  : (event.target.value as RefereePair),
            })
          }
        >
          <option value="">{t('board.refereeLineNone')}</option>
          {REFEREE_PAIRS.filter(pair =>
            pair.split('-').every(n => Number(n) <= counts.referees)
          ).map(pair => (
            <option key={pair} value={pair}>
              {t('board.refereeLinePair', { a: pair[0]!, b: pair[2]! })}
            </option>
          ))}
        </SelectField>
        <Switch
          label={t('board.deckRefereeShown')}
          checked={counts.deckReferee}
          onChange={actions.setDeckReferee}
        />
        <Switch
          label={t('board.fieldOfView')}
          checked={display.fieldOfView}
          onChange={value => actions.setDisplay({ fieldOfView: value })}
        />
        {/* LES ARBITRES DE L'EAU SUIVENT LE PALET, de part et d'autre :
            avec le champ de vision affiché, l'onglet Étape dit ensuite si
            l'un d'eux le voit (`checks.ts`). */}
        <div className="uwh-stack uwh-stack--tight">
          <div>
            <Button
              variant="outline"
              disabled={counts.referees === 0}
              onClick={actions.followPuck}
            >
              <Crosshair size={18} aria-hidden="true" />
              {t('board.followPuck')}
            </Button>
          </div>
          <p className="uwh-muted m-0 text-supporting">
            {t('board.followPuckHint')}
          </p>
        </div>
      </section>
    </div>
  );
}
