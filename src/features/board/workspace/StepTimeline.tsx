import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Pause,
  Play,
  Plus,
  Timer,
} from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { useI18n } from '../../../i18n/index.ts';
import { MAX_STEPS, SPEEDS, boardStore, useBoard } from '../store.ts';
import { branchOf, forksOn, tourNext } from '../variants.ts';
import { LinesPopover } from './LinesPopover.tsx';
import { noteUsage } from '../../../app/usage.ts';

/**
 * Sous cette largeur, en pixels, la frise passe sur deux rangs : sur un
 * seul, ses huit boutons et trois pastilles en demandent à peu près autant.
 */
const NARROW_BELOW = 640;

interface Props {
  /** Les étapes où un joueur dépasse le seuil d'apnée. */
  warned: ReadonlySet<number>;
  /** Le mode présentation : de grandes cibles, sans ajout d'étape. */
  big?: boolean;
  /** Le mode simple : ni vitesse ni apnée, l'essentiel (ADR 0020). */
  simple?: boolean;
  /** Ouvre la frise d'apnée ; la pastille dit combien d'alertes. */
  onApnea?: () => void;
  alerts?: { count: number; label: string };
  /** L'enregistrement en direct est possible (hors présentation). Absent : pas de bouton. */
  canRecord?: boolean;
  /** Chaque valeur nouvelle ouvre les lignes de la phase (ADR 0039). */
  linesRequest?: number;
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
 *
 * LES LIGNES DE LA PHASE AUSSI (ADR 0027) : la frise montre la ligne
 * affichée, ses étapes communes et ses embranchements, et un bouton dit
 * laquelle c'est — on y passe d'une ligne à l'autre, on en fait naître une.
 */
export function StepTimeline({
  warned,
  big = false,
  simple = false,
  onApnea,
  alerts,
  canRecord,
  linesRequest,
}: Props) {
  const { t, fmt } = useI18n();
  const speed = useBoard(s => s.speed);
  const step = useBoard(s => s.step);
  const total = useBoard(s => s.tactic.steps.length);
  const steps = useBoard(s => s.tactic.steps);
  const playing = useBoard(s => s.playing);
  const playhead = useBoard(s => s.playhead);
  const recording = useBoard(s => s.recording);
  const doc = useBoard(s => s.doc);
  const line = useBoard(s => s.line);
  const actions = boardStore.getState();
  const list = useRef<HTMLOListElement>(null);
  const shown = playing ? Math.min(Math.floor(playhead), total - 1) : step;
  /*
   * LES VARIANTES SUR LA FRISE (ADR 0027) : sur une variante, les étapes
   * communes avec la principale ont un contour en tirets ; là où la phase
   * se sépare, une pastille porte un losange.
   */
  const branch = branchOf(doc, line);
  const forks = forksOn(doc, line);
  const chipLabel = (i: number) => {
    let label = t(warned.has(i) ? 'board.stepChipWarn' : 'board.stepChip', {
      step: i + 1,
    });
    if (branch !== null && i <= branch) {
      label = t('variants.chipCommon', { label });
    }
    return forks.has(i) ? t('variants.chipFork', { label }) : label;
  };
  // EN PRÉSENTATION, « suivant » au bout d'une ligne prend la suivante.
  const touring = big && step >= total - 1 && tourNext(doc, line) !== null;

  /*
   * LA FRISE ÉTROITE SE RANGE SUR DEUX RANGS : les pastilles entre
   * « précédente » et « suivante », les gestes dessous. Sur une ligne, à
   * 393 px de large en mode complet, il ne restait que 9 px aux pastilles
   * (relevé du 21/11/2026) : la frise ne montrait plus aucune étape. Mesurée
   * sur la frise elle-même, pas sur l'écran : à côté du panneau, une
   * tablette la rend aussi étroite qu'un téléphone.
   */
  const root = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setNarrow(el.clientWidth < NARROW_BELOW);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const twoRows = narrow && !big && (!simple || doc.variants !== undefined);

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
      ref={root}
      className="uwh-timeline"
      role="group"
      aria-label={t('board.steps')}
      data-big={big ? '' : undefined}
      data-narrow={twoRows ? '' : undefined}
    >
      <Button
        variant="ghost"
        size={size}
        iconOnly
        className="uwh-timeline__prev"
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
              aria-label={chipLabel(i)}
              data-warn={warned.has(i) ? '' : undefined}
              data-common={branch !== null && i <= branch ? '' : undefined}
              data-fork={forks.has(i) ? '' : undefined}
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
          data-guide-target="step"
          disabled={total >= MAX_STEPS}
          onClick={actions.addStep}
        >
          <Plus size={20} aria-hidden="true" />
        </Button>
      )}
      {/* Le mode simple ne crée pas de variante, il lit celles d'un schéma
          reçu (ADR 0020). En présentation, l'embranchement se choisit sur
          le tableau. */}
      {big || (simple && !doc.variants) ? null : (
        <LinesPopover readOnly={simple} openRequest={linesRequest} />
      )}
      {big || canRecord === undefined ? null : (
        <Button
          variant="ghost"
          iconOnly
          className="uwh-record"
          aria-label={t('board.record')}
          aria-pressed={recording}
          title={t('board.recordTitle')}
          disabled={!canRecord && !recording}
          onClick={() => {
            if (!recording) noteUsage('recording');
            actions.setRecording(!recording);
          }}
        >
          <Circle size={20} aria-hidden="true" />
        </Button>
      )}
      <Button
        variant="ghost"
        size={size}
        iconOnly
        className="uwh-timeline__next"
        aria-label={t('board.next')}
        disabled={step >= total - 1 && !playing && !touring}
        onClick={() => actions.advance(big)}
      >
        <ChevronRight size={icon} aria-hidden="true" />
      </Button>
      {big || simple ? null : (
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
      {big || simple || !onApnea ? null : (
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
        data-guide-target="play"
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
