import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { TextField } from '@mister-guiiug/dev-pwa-config/react/field';
import { SegmentedControl } from '@mister-guiiug/dev-pwa-config/react/segmented-control';
import { useI18n } from '../../i18n/index.ts';
import { useBoard } from './store.ts';
import { DECK_REFEREE_NUMBER, isSubstitute, PUCK_ID } from './model.ts';

interface Props {
  id: string | null;
  onClose: () => void;
}

/**
 * LA FICHE D'UN JETON : son nom, sa main, sa profondeur et son orientation.
 *
 * Le nom et la main valent pour tout le schéma ; la profondeur et
 * l'orientation pour l'étape courante seulement — la fiche le dit, sinon on
 * croirait avoir changé un joueur pour toute la phase.
 */
export function TokenSheet({ id, onClose }: Props) {
  const { t } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const step = useBoard(s => s.step);
  const rename = useBoard(s => s.rename);
  const setLeftHanded = useBoard(s => s.setLeftHanded);
  const setSurface = useBoard(s => s.setSurface);
  const rotate = useBoard(s => s.rotate);

  const player = tactic.roster.players.find(p => p.id === id);
  const referee = tactic.roster.referees.find(r => r.id === id);
  const pose = id ? tactic.steps[step]?.poses[id] : undefined;
  const open = Boolean(id && id !== PUCK_ID && (player || referee) && pose);

  const title = player
    ? [
        t(player.team === 'blanc' ? 'board.whitePlayer' : 'board.blackPlayer', {
          number: player.number,
        }),
        isSubstitute(player) ? t('board.substitute') : '',
      ]
        .filter(Boolean)
        .join(', ')
    : referee
      ? referee.number === DECK_REFEREE_NUMBER
        ? t('board.deckReferee')
        : t('board.referee', { number: referee.number })
      : '';

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <Button variant="primary" block onClick={onClose}>
          {t('board.done')}
        </Button>
      }
    >
      {open && id && pose ? (
        <div className="flex flex-col gap-4">
          <TextField
            label={t('board.name')}
            hint={t('board.nameHint')}
            value={(player ?? referee)?.name ?? ''}
            maxLength={24}
            onChange={event => rename(id, event.target.value)}
          />
          {player ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {t('board.depth', { step: step + 1 })}
                </span>
                <SegmentedControl
                  ariaLabel={t('board.depth', { step: step + 1 })}
                  value={pose.surface === false ? 'fond' : 'surface'}
                  onChange={value => setSurface(id, value === 'surface')}
                  options={[
                    { value: 'surface', label: t('board.surface') },
                    { value: 'fond', label: t('board.underwater') },
                  ]}
                  fullWidth
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={player.leftHanded}
                  onChange={event => setLeftHanded(id, event.target.checked)}
                />
                {t('board.leftHanded')}
              </label>
            </>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {t('board.heading', {
                angle: Math.round(pose.angle),
                step: step + 1,
              })}
            </span>
            <input
              type="range"
              min={0}
              max={355}
              step={5}
              value={(Math.round(pose.angle / 5) * 5) % 360}
              onChange={event => rotate(id, Number(event.target.value))}
            />
          </label>
        </div>
      ) : null}
    </Sheet>
  );
}
