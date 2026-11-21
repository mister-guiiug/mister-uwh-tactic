import { useI18n } from '../../i18n/index.ts';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import { useLineLabel } from './lineLabel.ts';
import { useBoard } from './store.ts';
import { useDescribeStep } from './useDescribeStep.ts';

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
  const describe = useDescribeStep();
  // LA LIGNE AFFICHÉE, et son nom (ADR 0027) : une fiche par suite.
  const lineName = useLineLabel();
  return (
    <section className="uwh-print" aria-hidden="true">
      <h2>{tactic.name || t('board.untitled')}</h2>
      {lineName ? <p>{t('variants.printLine', { line: lineName })}</p> : null}
      {/* LA VUE D'ENSEMBLE (ADR 0036) : toutes les nages sur une image, en
          tête de la fiche — la phase d'un coup d'œil. */}
      {tactic.steps.length > 1 ? (
        <figure className="uwh-print__overview">
          <Board2D
            labels={labels}
            tactic={tactic}
            playhead={0}
            interactive={false}
            overview
          />
          <figcaption>{t('follow.overview')}</figcaption>
        </figure>
      ) : null}
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
            {/* Sans consigne, l'étape racontée (ADR 0030) : la fiche n'a
                plus de vignette muette. */}
            <p>{step.note || describe(tactic, i)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
