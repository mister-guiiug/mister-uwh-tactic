import { useI18n } from '../../i18n/index.ts';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import { useBoard } from './store.ts';

interface Props {
  labels: Board2DLabels;
}

/**
 * LA PHASE SUR PAPIER : une vignette par étape, avec sa consigne et sa
 * durée. Invisible à l'écran, seule visible à l'impression (`uwh-print` dans
 * `index.css`) — de quoi plastifier une fiche pour le bord du bassin.
 */
export function PrintSheet({ labels }: Props) {
  const { t, fmt } = useI18n();
  const tactic = useBoard(s => s.tactic);
  return (
    <section className="uwh-print" aria-hidden="true">
      <h2>{tactic.name || t('board.untitled')}</h2>
      <ol>
        {tactic.steps.map((step, i) => (
          <li key={i}>
            <h3>
              {t('board.stepOf', { step: i + 1, total: tactic.steps.length })}
              {' · '}
              {fmt.number(step.duration)} s
            </h3>
            <Board2D
              labels={labels}
              onEdit={() => {}}
              playhead={i}
              interactive={false}
            />
            {step.note ? <p>{step.note}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
