import type { CSSProperties } from 'react';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../../i18n/index.ts';
import type { ApneaTable } from '../apnea.ts';
import { playerTitle } from '../labels.ts';
import { boardStore, useBoard } from '../store.ts';

interface Props {
  table: ApneaTable;
}

/**
 * LA FRISE D'APNÉE, EN BANDE DE CHALEUR : une ligne par joueur dans l'eau,
 * une colonne par étape, et une case d'autant plus soutenue que le joueur
 * est au fond depuis longtemps. Au-delà du seuil, la case passe au rouge ET
 * porte un signe, pour qui ne voit pas les couleurs.
 *
 * C'est toujours un TABLEAU, en-têtes de ligne et de colonne compris : la
 * bande se lit au lecteur d'écran case par case, comme avant la refonte.
 * Toucher une colonne mène à l'étape.
 */
export function ApneaPanel({ table }: Props) {
  const { t, fmt } = useI18n();
  const steps = useBoard(s => s.tactic.steps);
  const step = useBoard(s => s.step);
  const limit = useBoard(s => s.tactic.display.apneaLimit);
  const actions = boardStore.getState();

  return (
    <div className="uwh-stack">
      <p className="uwh-muted m-0 text-sm">{t('apnea.hint')}</p>
      <div className="uwh-row uwh-row--end">
        <TextField
          label={t('apnea.limit')}
          type="number"
          inputMode="numeric"
          min={5}
          max={60}
          value={limit}
          onChange={event => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value >= 5 && value <= 60) {
              actions.setDisplay({ apneaLimit: value });
            }
          }}
          className="w-36"
        />
        <p className="m-0 text-sm" aria-live="polite">
          {t('apnea.bottomNow', {
            white: table.bottom[step]?.blanc ?? 0,
            black: table.bottom[step]?.noir ?? 0,
          })}
        </p>
      </div>
      {table.players.length === 0 ? null : (
        <div className="uwh-apnea">
          <table>
            <caption className="sr-only">{t('apnea.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('apnea.player')}</th>
                {steps.map((s, i) => (
                  <th
                    key={i}
                    scope="col"
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <button
                      type="button"
                      className="uwh-apnea__step"
                      onClick={() => actions.goTo(i)}
                    >
                      {/* Le nom contient le texte visible (WCAG 2.5.3) :
                          « Étape 1 », dont on voit « 1 ». La durée reste
                          hors du bouton, en-tête de colonne lisible seul. */}
                      <span className="sr-only">{t('board.stepWord')} </span>
                      {i + 1}
                    </button>
                    <span className="uwh-apnea__duration">
                      {fmt.number(s.duration)} s
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.players.map(player => (
                <tr key={player.id}>
                  <th scope="row">
                    <span
                      className="uwh-apnea__team"
                      data-team={player.team}
                      aria-hidden="true"
                    />
                    {playerTitle(t, player)}
                    {player.name ? ` · ${player.name}` : ''}
                  </th>
                  {table.cells[player.id]!.map((cell, i) => (
                    <td
                      key={i}
                      data-state={
                        cell.over ? 'over' : cell.surface ? 'surface' : 'bottom'
                      }
                      style={
                        {
                          '--level': Math.min(1, cell.seconds / limit).toFixed(
                            2
                          ),
                        } as CSSProperties
                      }
                    >
                      {cell.surface
                        ? t('apnea.surface')
                        : `${cell.over ? '⚠ ' : ''}${fmt.number(cell.seconds)} s`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
