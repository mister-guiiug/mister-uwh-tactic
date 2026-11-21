import { useI18n } from '../../i18n/index.ts';
import { Board2D } from '../board/Board2D.tsx';
import { useBoardLabels } from '../board/labels.ts';
import type { Tactic } from '../board/model.ts';
import { useDescribeStep } from '../board/useDescribeStep.ts';

/**
 * LE CARNET IMPRIMÉ (ADR 0037) : la sélection de la bibliothèque en livret,
 * une phase par page — son nom, la vue d'ensemble de ses nages (ADR 0036),
 * puis une vignette par étape avec sa consigne, ou l'étape racontée quand
 * elle est vide (ADR 0030). C'est le livret de jeu qu'on donne aux joueurs.
 *
 * Invisible à l'écran, seule visible à l'impression (`uwh-print`).
 */
export function CarnetPrint({ schemas }: { schemas: readonly Tactic[] }) {
  const { t } = useI18n();
  const labels = useBoardLabels();
  const describe = useDescribeStep();
  return (
    <section className="uwh-print uwh-print--seance" aria-hidden="true">
      {schemas.map(schema => (
        <article key={schema.id} className="uwh-print__phase">
          <h2>{schema.name || t('board.untitled')}</h2>
          {schema.steps.length > 1 ? (
            <figure className="uwh-print__overview">
              <Board2D
                labels={labels}
                tactic={schema}
                playhead={0}
                interactive={false}
                orientation="landscape"
                overview
              />
              <figcaption>{t('follow.overview')}</figcaption>
            </figure>
          ) : null}
          <div className="uwh-print__steps">
            {schema.steps.map((step, s) => (
              <figure key={s}>
                <Board2D
                  labels={labels}
                  tactic={schema}
                  playhead={s}
                  interactive={false}
                  orientation="landscape"
                />
                <figcaption>
                  {t('seances.printStep', { n: s + 1 })}
                  {` — ${step.note || describe(schema, s)}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
