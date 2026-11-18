import { useMemo } from 'react';
import { ChevronDown, RotateCcw, RotateCw, Waves } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { frameAt } from '../frame.ts';
import { playerTitle, refereeTitle } from '../labels.ts';
import { PUCK_ID } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';

interface Props {
  /** Mène à l'inspecteur, sous le tableau sur un téléphone. */
  onDetails: () => void;
}

/**
 * LES GESTES DU JETON, POSÉS SUR LE TABLEAU — sur un téléphone seulement.
 *
 * Sur un téléphone, le panneau est sous la ligne de flottaison (ADR 0016) :
 * toucher un jeton ouvrait l'inspecteur… qu'on ne voyait pas. La barre
 * reprend ici les trois gestes qu'on fait sans quitter le terrain des yeux —
 * tourner, plonger ou remonter — et un bouton qui descend à l'inspecteur
 * pour le reste. Sur grand écran, l'inspecteur est à côté : la barre se
 * cache (`index.css`).
 */
export function SelectionBar({ onDetails }: Props) {
  const { t } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const playhead = useBoard(s => s.playhead);
  const selected = useBoard(s => s.selected);
  const extra = useBoard(s => s.extra);
  const actions = boardStore.getState();
  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);

  if (!selected || selected === PUCK_ID) return null;

  const group = extra.length > 0;
  const player = frame.players.find(p => p.id === selected);
  const referee = frame.referees.find(r => r.id === selected);
  const token = player ?? referee;
  if (!token) return null;

  const title = group
    ? t('board.groupSelected', { count: extra.length + 1 })
    : player
      ? [playerTitle(t, player), player.name].filter(Boolean).join(' · ')
      : [refereeTitle(t, referee!), referee!.name].filter(Boolean).join(' · ');
  const surface = player ? player.surfaceness >= 0.5 : false;

  return (
    <div className="uwh-selbar" role="group" aria-label={title}>
      <span className="uwh-selbar__title" aria-hidden="true">
        {title}
      </span>
      <Button
        variant="ghost"
        iconOnly
        aria-label={group ? t('board.rotateGroupLeft') : t('board.rotateLeft')}
        onClick={() =>
          group
            ? actions.rotateSelection(-15)
            : actions.rotate(token.id, token.angle - 15)
        }
      >
        <RotateCcw size={20} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        iconOnly
        aria-label={
          group ? t('board.rotateGroupRight') : t('board.rotateRight')
        }
        onClick={() =>
          group
            ? actions.rotateSelection(15)
            : actions.rotate(token.id, token.angle + 15)
        }
      >
        <RotateCw size={20} aria-hidden="true" />
      </Button>
      {player && !group ? (
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.depthBottom')}
          aria-pressed={!surface}
          onClick={() => actions.setSurface(player.id, !surface)}
        >
          <Waves size={20} aria-hidden="true" />
        </Button>
      ) : null}
      {group ? null : (
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.details')}
          onClick={onDetails}
        >
          <ChevronDown size={20} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
