import { useI18n } from '../../i18n/index.ts';
import { Board2D } from '../board/Board2D.tsx';
import { useBoardLabels } from '../board/labels.ts';
import type { Tactic } from '../board/model.ts';
import { totalMinutes, type Seance } from './model.ts';

interface Props {
  seance: Seance;
  library: ReadonlyMap<string, Tactic>;
}

/**
 * LA SÉANCE SUR PAPIER (ADR 0018, suivi du 20/11/2026) : son nom et sa
 * durée, puis chaque phase — son schéma, ses minutes, sa consigne — avec une
 * vignette par étape. La phase seule s'imprimait déjà depuis le tableau ; la
 * séance est ce qu'on plastifie pour le bord du bassin, où le téléphone ne
 * va pas.
 *
 * Invisible à l'écran, seule visible à l'impression (`uwh-print` dans
 * `index.css`). Une phase dont le schéma a disparu le dit, plutôt que de
 * laisser un trou dans la numérotation.
 */
export function SeancePrint({ seance, library }: Props) {
  const { t, m, fmt } = useI18n();
  const labels = useBoardLabels();
  return (
    <section className="uwh-print uwh-print--seance" aria-hidden="true">
      <h2>{seance.name || t('seances.untitled')}</h2>
      <p>
        {fmt.plural(seance.items.length, m.seances.summary, {
          count: seance.items.length,
          minutes: totalMinutes(seance),
        })}
      </p>
      <ol>
        {seance.items.map((item, i) => {
          const schema = library.get(item.schemaId);
          return (
            <li key={i}>
              <h3>
                {t('seances.phaseOf', {
                  n: i + 1,
                  total: seance.items.length,
                })}
                {' · '}
                {schema
                  ? schema.name || t('board.untitled')
                  : t('seances.missing')}
                {' · '}
                {t('seances.minutesShort', { n: item.minutes })}
              </h3>
              {item.note ? <p>{item.note}</p> : null}
              {schema ? (
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
                        {step.note ? ` — ${step.note}` : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
