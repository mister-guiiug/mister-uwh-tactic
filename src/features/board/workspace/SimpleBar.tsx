import { useMemo } from 'react';
import { ArrowUpRight, CircleDot, Waves, X } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { frameAt } from '../frame.ts';
import { playerTitle } from '../labels.ts';
import { isSubstitute } from '../model.ts';
import { boardStore, useBoard } from '../store.ts';

interface Props {
  /** Le passeur, pendant « Passe à… » : on attend le receveur. */
  passFrom: string | null;
  onPassStart: (id: string) => void;
  onPassCancel: () => void;
  /** « Tous les réglages » : passe en mode complet. */
  onAdvanced: () => void;
}

/**
 * LA BARRE DU MODE SIMPLE, posée sur le tableau (ADR 0020). Elle dit ce
 * qu'on peut faire, EN TOUTES LETTRES — la barre du mode complet n'a que des
 * icônes :
 *
 * - rien de choisi : comment s'y prendre, et le chemin vers tous les réglages ;
 * - un joueur choisi : au fond ou en surface, le palet, « Passe à… » ;
 * - pendant « Passe à… » : touchez le receveur, ou annulez.
 */
export function SimpleBar({
  passFrom,
  onPassStart,
  onPassCancel,
  onAdvanced,
}: Props) {
  const { t } = useI18n();
  const tactic = useBoard(s => s.tactic);
  const playhead = useBoard(s => s.playhead);
  const step = useBoard(s => s.step);
  const selected = useBoard(s => s.selected);
  const actions = boardStore.getState();
  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);

  if (passFrom) {
    return (
      <div className="uwh-simplebar" role="group" aria-label={t('simple.pass')}>
        <span className="uwh-simplebar__title" role="status">
          {t('simple.passPick')}
        </span>
        <Button variant="ghost" onClick={onPassCancel}>
          {t('simple.cancel')}
        </Button>
      </div>
    );
  }

  const player = frame.players.find(p => p.id === selected);
  if (!player || isSubstitute(player)) {
    return (
      <div
        className="uwh-simplebar"
        role="group"
        aria-label={t('simple.title')}
      >
        <span className="uwh-simplebar__hint">{t('simple.hint')}</span>
        <Button variant="ghost" size="sm" onClick={onAdvanced}>
          {t('simple.allSettings')}
        </Button>
      </div>
    );
  }

  const surface = player.surfaceness >= 0.5;
  const carries = tactic.steps[step]?.carrier === player.id;
  const title = [playerTitle(t, player), player.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="uwh-simplebar" role="group" aria-label={title}>
      <span className="uwh-simplebar__title" aria-hidden="true">
        {title}
      </span>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={!surface}
        onClick={() => actions.setSurface(player.id, !surface)}
      >
        <Waves size={16} aria-hidden="true" />
        {surface ? t('simple.dive') : t('simple.surface')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={carries}
        onClick={() => actions.setCarrier(carries ? null : player.id)}
      >
        <CircleDot size={16} aria-hidden="true" />
        {carries ? t('board.dropPuck') : t('board.givePuck')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPassStart(player.id)}
      >
        <ArrowUpRight size={16} aria-hidden="true" />
        {t('simple.pass')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={t('simple.deselect')}
        onClick={() => actions.select(null)}
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
