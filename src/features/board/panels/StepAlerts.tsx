import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useI18n } from '../../../i18n/index.ts';
import { apneaTable } from '../apnea.ts';
import { stepAlerts } from '../checks.ts';
import { playerTitle, refereeTitle } from '../labels.ts';
import { DECK_REFEREE_NUMBER, DEFAULT_MAX_SPEED } from '../model.ts';
import { useBoard } from '../store.ts';

/**
 * LES ALERTES DE L'ÉTAPE, DITES EN CLAIR : qui dépasse son apnée, qui va
 * trop vite pour arriver à temps, et ce que les arbitres ne voient pas
 * (`checks.ts`). La frise marque l'étape ; ici, on lit pourquoi.
 */
export function StepAlerts() {
  const { t, fmt } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const apnea = useMemo(() => apneaTable(tactic), [tactic]);
  const alerts = useMemo(
    () => stepAlerts(tactic, apnea, step),
    [tactic, apnea, step]
  );
  if (alerts.count === 0) return null;

  const nameOf = (id: string) => {
    const player = tactic.roster.players.find(p => p.id === id);
    if (player) {
      const title = playerTitle(t, player);
      return player.name ? `${title} (${player.name})` : title;
    }
    const referee = tactic.roster.referees.find(r => r.id === id);
    return referee
      ? refereeTitle(t, {
          deck: referee.number === DECK_REFEREE_NUMBER,
          number: referee.number,
        })
      : id;
  };
  const limitOf = (id: string) =>
    tactic.roster.players.find(p => p.id === id)?.apnea ??
    tactic.display.apneaLimit;
  const lines = [
    ...alerts.apnea.map(id =>
      t('board.alertApnea', {
        name: nameOf(id),
        seconds: apnea.cells[id]?.[step]?.seconds ?? 0,
        limit: limitOf(id),
      })
    ),
    ...alerts.fast.map(({ id, speed }) =>
      t('board.alertFast', {
        name: nameOf(id),
        speed: fmt.number(speed, { maximumFractionDigits: 1 }),
        limit: fmt.number(tactic.display.maxSpeed ?? DEFAULT_MAX_SPEED, {
          maximumFractionDigits: 1,
        }),
      })
    ),
    ...(alerts.blind ? [t('board.alertBlind')] : []),
    ...alerts.masked.map(({ referee, by }) =>
      t('board.alertMasked', { referee: nameOf(referee), player: nameOf(by) })
    ),
  ];

  return (
    <section className="uwh-alerts" aria-labelledby="uwh-alerts-title">
      <h3 id="uwh-alerts-title" className="uwh-subtitle">
        <TriangleAlert size={16} aria-hidden="true" />
        {t('board.alertsTitle', { step: step + 1 })}
      </h3>
      <ul className="uwh-alerts__list">
        {lines.map(line => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
