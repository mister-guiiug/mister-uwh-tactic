import { useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Timer,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { MAX_STEPS, SPEEDS, boardStore, useBoard } from '../store.ts';

interface Props {
  /** Les étapes où un joueur dépasse le seuil d'apnée. */
  warned: ReadonlySet<number>;
  /** Le mode présentation : de grandes cibles, sans ajout d'étape. */
  big?: boolean;
  /** Ouvre la frise d'apnée ; la pastille dit combien d'alertes. */
  onApnea?: () => void;
  alerts?: { count: number; label: string };
}

/**
 * LA FRISE DES ÉTAPES, épinglée sous le tableau : une phase de jeu EST une
 * suite d'étapes, et l'audit UX du 18/11/2026 trouvait cette suite rangée
 * dans une carte, sous le tableau, à 1 400 px du haut sur un téléphone.
 *
 * Une pastille par étape (l'étape courante marquée, un point rouge là où
 * l'apnée dépasse le seuil), précédente et suivante, « + » pour ajouter, et
 * la lecture. La durée, la consigne et les flèches de l'étape sont dans
 * l'onglet « Étape » du panneau : la frise navigue, elle n'édite pas.
 *
 * TOUT CE QUI EST TEMPS EST ICI (ADR 0017) : la vitesse de lecture, qui
 * était dans l'onglet « Étape », et la frise d'apnée, qui avait un onglet à
 * elle — une frise sous une autre frise.
 */
export function StepTimeline({ warned, big = false, onApnea, alerts }: Props) {
  const { t, fmt } = useI18n();
  const speed = useBoard(s => s.speed);
  const step = useBoard(s => s.step);
  const total = useBoard(s => s.tactic.steps.length);
  const steps = useBoard(s => s.tactic.steps);
  const playing = useBoard(s => s.playing);
  const playhead = useBoard(s => s.playhead);
  const actions = boardStore.getState();
  const list = useRef<HTMLOListElement>(null);
  const shown = playing ? Math.min(Math.floor(playhead), total - 1) : step;

  /*
   * L'étape courante reste visible quand la frise défile en largeur. À la
   * main, et pas par `scrollIntoView` : celui-ci fait aussi défiler la PAGE
   * quand la frise est sous la ligne de flottaison.
   */
  useEffect(() => {
    const ol = list.current;
    const el = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!ol || !el) return;
    const a = el.getBoundingClientRect();
    const b = ol.getBoundingClientRect();
    if (a.left < b.left) ol.scrollLeft -= b.left - a.left;
    else if (a.right > b.right) ol.scrollLeft += a.right - b.right;
  }, [shown]);

  const size = big ? 'lg' : 'md';
  const icon = big ? 26 : 20;

  return (
    <div
      className="uwh-timeline"
      role="group"
      aria-label={t('board.steps')}
      data-big={big ? '' : undefined}
    >
      <Button
        variant="ghost"
        size={size}
        iconOnly
        aria-label={t('board.previous')}
        disabled={step === 0 && !playing}
        onClick={() => actions.goTo(step - 1)}
      >
        <ChevronLeft size={icon} aria-hidden="true" />
      </Button>
      <ol ref={list} className="uwh-timeline__steps">
        {Array.from({ length: total }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className="uwh-timeline__step"
              aria-current={i === shown ? 'step' : undefined}
              aria-label={t(
                warned.has(i) ? 'board.stepChipWarn' : 'board.stepChip',
                { step: i + 1 }
              )}
              data-warn={warned.has(i) ? '' : undefined}
              // La consigne au survol : on retrouve une étape sans l'ouvrir.
              title={steps[i]?.note || undefined}
              onClick={() => actions.goTo(i)}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
      {big ? null : (
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('board.addStep')}
          disabled={total >= MAX_STEPS}
          onClick={actions.addStep}
        >
          <Plus size={20} aria-hidden="true" />
        </Button>
      )}
      <Button
        variant="ghost"
        size={size}
        iconOnly
        aria-label={t('board.next')}
        disabled={step >= total - 1 && !playing}
        onClick={() => actions.goTo(step + 1)}
      >
        <ChevronRight size={icon} aria-hidden="true" />
      </Button>
      {big ? null : (
        <Button
          variant="ghost"
          className="uwh-timeline__speed"
          aria-label={t('board.speedCycle', { speed: `×${fmt.number(speed)}` })}
          onClick={() =>
            actions.setSpeed(
              SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!
            )
          }
        >
          ×{fmt.number(speed)}
        </Button>
      )}
      {big || !onApnea ? null : (
        <Button
          variant="ghost"
          className="uwh-timeline__apnea"
          aria-haspopup="dialog"
          onClick={onApnea}
        >
          <Timer size={18} aria-hidden="true" />
          <span className="uwh-timeline__apnea-text">
            {t('board.apneaOpen')}
          </span>
          {alerts && alerts.count > 0 ? (
            <span className="uwh-panel__badge">
              <span aria-hidden="true">{alerts.count}</span>
              <span className="sr-only">{alerts.label}</span>
            </span>
          ) : null}
        </Button>
      )}
      <Button
        variant={playing ? 'secondary' : 'primary'}
        size={size}
        iconOnly
        aria-label={playing ? t('board.pause') : t('board.play')}
        disabled={total < 2}
        onClick={() => (playing ? actions.pause() : actions.play())}
      >
        {playing ? (
          <Pause size={icon - 2} aria-hidden="true" />
        ) : (
          <Play size={icon - 2} aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {t('board.stepOf', { step: shown + 1, total })}
      </span>
    </div>
  );
}
