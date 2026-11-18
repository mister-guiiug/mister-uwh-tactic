import { useMemo } from 'react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { useI18n } from '../../i18n/index.ts';
import { apneaTable } from './apnea.ts';
import { boardStore, useBoard } from './store.ts';

/**
 * LA FRISE D'APNÉE : une ligne par joueur dans l'eau, une colonne par étape,
 * « fond » ou « surface », et les secondes de fond d'affilée. Une case au-delà
 * du seuil est signalée — par sa couleur ET par un signe, pour qui ne voit pas
 * les couleurs. Le décompte par équipe dit d'un coup d'œil qui tient le fond.
 */
export function ApneaCard() {
  const { t, fmt } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const table = useMemo(() => apneaTable(tactic), [tactic]);
  const limit = tactic.display.apneaLimit;

  return (
    <Card className="mt-3 flex flex-col gap-3">
      <CardHeader title={t('apnea.title')} subtitle={t('apnea.hint')} />
      <div className="flex flex-wrap items-end gap-3">
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
              boardStore.getState().setDisplay({ apneaLimit: value });
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
                {tactic.steps.map((s, i) => (
                  <th
                    key={i}
                    scope="col"
                    aria-current={i === step ? 'step' : undefined}
                  >
                    {i + 1}
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
                    {t(
                      player.team === 'blanc'
                        ? 'board.whitePlayer'
                        : 'board.blackPlayer',
                      { number: player.number }
                    )}
                    {player.name ? ` · ${player.name}` : ''}
                  </th>
                  {table.cells[player.id]!.map((cell, i) => (
                    <td
                      key={i}
                      data-state={
                        cell.over ? 'over' : cell.surface ? 'surface' : 'bottom'
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
    </Card>
  );
}
