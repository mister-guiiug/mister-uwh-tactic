import { GitBranch } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { lineLabel } from '../lineLabel.ts';
import { boardStore, useBoard } from '../store.ts';
import { forkAt } from '../variants.ts';

/**
 * L'EMBRANCHEMENT, EN PRÉSENTATION (ADR 0027) : à l'étape où la phase se
 * sépare, un bouton par suite, nommé. Celle qu'on suivra est enfoncée ;
 * toucher l'autre y passe, sans changer d'étape.
 *
 * LA TÉLÉCOMMANDE n'a que « suivant » et « précédent » : elle suit la suite
 * enfoncée, et au bout d'une ligne revient ici pour prendre la suivante
 * (`tourNext`). Toutes les suites se montrent ainsi l'une après l'autre,
 * sans toucher l'écran.
 */
export function ForkChoice() {
  const { t } = useI18n();
  const doc = useBoard(s => s.doc);
  const line = useBoard(s => s.line);
  const step = useBoard(s => s.step);
  const playing = useBoard(s => s.playing);
  const fork = playing ? null : forkAt(doc, line, step);
  if (!fork) return null;
  const actions = boardStore.getState();
  return (
    <div className="uwh-fork" role="group" aria-label={t('variants.choose')}>
      <span className="uwh-fork__title">
        <GitBranch size={20} aria-hidden="true" />
        {t('variants.choosePrompt')}
      </span>
      {fork.options.map(option => {
        const chosen = option === fork.current;
        return (
          <Button
            key={option ?? ''}
            size="lg"
            variant={chosen ? 'primary' : 'secondary'}
            aria-pressed={chosen}
            onClick={() => {
              if (!chosen) actions.setLine(option);
            }}
          >
            {lineLabel(t, doc, option)}
          </Button>
        );
      })}
    </div>
  );
}
