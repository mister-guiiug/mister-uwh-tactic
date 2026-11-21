import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  arcPath,
  GOAL_TRAY,
  pitchMarkings,
  sectorPath,
  type Marking,
} from './pitch.ts';
import {
  FIN_COLOR,
  finOutline,
  GLOVE,
  outlinePath,
  stickOutline,
  TEAM_GEAR,
} from './equipment.ts';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { frameAt, type FramePlayer, type FrameReferee } from './frame.ts';
import {
  ARROW_KINDS,
  distance,
  POOL_MARGIN,
  PUCK_ID,
  type Arrow,
  type ArrowKind,
  type Point,
  type Tactic,
} from './model.ts';
import { FOV_APERTURE, FOV_RANGE } from './checks.ts';
import { useBoard } from './store.ts';
import { useBoardZoom } from './boardZoom.ts';
import {
  ARROW,
  GEAR,
  GOAL,
  OFFICIAL,
  POOL,
  PUCK,
  SIGNAL,
  TEAM,
} from '../../design/tokens.ts';

/**
 * Marge autour du terrain, en mètres : le mètre de bassin où nagent les
 * remplaçants, puis la plage où se tient l'arbitre de bord.
 */
const MARGIN = 2.4;
/** Pas du clavier : un demi-mètre, un dixième avec Maj ; 15° par rotation. */
const KEY_STEP = 0.5;
const KEY_STEP_FINE = 0.1;
const KEY_ROTATE = 15;

export interface Board2DLabels {
  pitch: string;
  help: string;
  player: (p: FramePlayer) => string;
  referee: (r: FrameReferee) => string;
  puck: string;
  formatDistance: (metres: number) => string;
  /** Le bouton qui remet le tableau à plat après un zoom. */
  resetZoom?: string;
}

/**
 * - `auto` : le terrain se dresse sous 640 px de large (l'impression).
 * - `fit` : le tableau remplit la boîte qui le contient, et se dresse quand
 *   elle est plus haute que large — l'espace de travail, qui lui donne la
 *   hauteur de l'écran.
 * - `landscape` : toujours en long (les vignettes de la bibliothèque).
 */
export type BoardOrientation = 'auto' | 'fit' | 'landscape';

interface Props {
  labels: Board2DLabels;
  /** Ouvre l'inspecteur du jeton (double-clic, Entrée). */
  onEdit?: (id: string) => void;
  /**
   * Un schéma à dessiner à la place du brouillon : une image, sans geste
   * (les vignettes de la bibliothèque).
   */
  tactic?: Tactic;
  orientation?: BoardOrientation;
  /** Une tête de lecture fixe : l'impression dessine chaque étape ainsi. */
  playhead?: number;
  /** `false` : une image, sans geste ni focus (l'impression). */
  interactive?: boolean;
  /** L'outil flèche en cours, ou `null` pour déplacer les jetons. */
  tool?: ArrowKind | null;
  /** Les joueurs à signaler (apnée au-delà du seuil). */
  warnings?: Set<string>;
  /**
   * `pawns` : des pions ronds et numérotés, lisibles au doigt (le mode
   * simple) ; `swimmers` : les nageurs détaillés (par défaut).
   */
  variant?: 'swimmers' | 'pawns';
  /**
   * Un jeton touché, AVANT la sélection : rendre `true` le consomme — le
   * mode « Passe à… » y désigne le receveur.
   */
  onPick?: (id: string) => boolean;
  /** Le libellé du choix entre jetons superposés. */
  whichLabel?: string;
  /**
   * Le coin haut-gauche est pris par « Calques », posé sur la scène. Au
   * téléphone, terrain dressé, ce bouton recouvrait le coin du bassin et du
   * terrain (retour du 20/11/2026). Le terrain se range alors à droite : la
   * place libre de la scène se regroupe sous le bouton, sans rien coûter à
   * la taille du terrain. Couché, il reste centré : rangé en bas, il aurait
   * laissé une bande vide au-dessus de lui.
   */
  dockCorner?: boolean;
}

/**
 * Sous cette largeur, le terrain se dresse : 25 m sur 15 en paysage, sur un
 * téléphone tenu droit, ce sont des joueurs de vingt pixels.
 */
const PORTRAIT_BELOW = 640;

function usePortrait(
  ref: React.RefObject<HTMLElement | null>,
  orientation: BoardOrientation
): boolean {
  const [portrait, setPortrait] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (orientation === 'landscape' || !el) return;
    // Pendant la mise en place (hauteurs mesurées, polices), on tranche au
    // seuil ; ensuite seulement, avec la marge.
    const settledAt = performance.now() + 1000;
    const decide = (width: number, height: number) => {
      if (width <= 0) return;
      // `fit` : la boîte a une hauteur à elle (l'espace de travail la fixe),
      // la lire ne boucle pas sur la taille du dessin.
      if (orientation !== 'fit') {
        setPortrait(width < PORTRAIT_BELOW);
        return;
      }
      /*
       * UNE MARGE AUTOUR DU SEUIL : dressé au-delà de 1,15, couché en deçà
       * de 1,05, et entre les deux on garde ce qu'on a. Sans elle, une
       * ligne d'état qui paraît au premier geste suffisait à faire tourner
       * le terrain sous le doigt, quand la boîte frôlait le seuil (CI de
       * mister-uwh-tactic#8, Pixel 7).
       */
      const ratio = height / width;
      if (performance.now() < settledAt) {
        setPortrait(ratio > 1.1);
        return;
      }
      setPortrait(was => (ratio > 1.15 ? true : ratio < 1.05 ? false : was));
    };
    /*
     * MESURÉ AVANT LA PREMIÈRE PEINTURE, puis suivi. Sans cette mesure, un
     * téléphone voyait le terrain en long une image, puis dressé : le
     * premier rappel de `ResizeObserver` arrive après la peinture — et
     * jamais dans un onglet resté en arrière-plan.
     */
    const box = el.getBoundingClientRect();
    decide(box.width, box.height);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) decide(rect.width, rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, orientation]);
  return orientation === 'landscape' ? false : portrait;
}

function MarkingShape({ marking }: { marking: Marking }) {
  const stroke = 'var(--uwh-line)';
  switch (marking.kind) {
    case 'rect':
      return (
        <rect
          x={marking.x}
          y={marking.y}
          width={marking.w}
          height={marking.h}
          fill="none"
          stroke={stroke}
          strokeWidth={marking.style === 'thin' ? 0.04 : 0.07}
        />
      );
    case 'arc':
      return (
        <path
          d={arcPath(
            marking.cx,
            marking.cy,
            marking.r,
            marking.start,
            marking.end
          )}
          fill="none"
          stroke={stroke}
          strokeWidth={marking.style === 'thin' ? 0.04 : 0.06}
          strokeDasharray={marking.style === 'dotted' ? '0.25 0.3' : undefined}
        />
      );
    case 'line':
      return (
        <line
          x1={marking.x1}
          y1={marking.y1}
          x2={marking.x2}
          y2={marking.y2}
          stroke={stroke}
          strokeWidth={0.04}
          strokeOpacity={0.6}
        />
      );
    case 'zone':
      return (
        <rect
          x={marking.x}
          y={marking.y}
          width={marking.w}
          height={marking.h}
          rx={0.15}
          fill={TEAM[marking.team].zone}
          fillOpacity={marking.team === 'blanc' ? 0.35 : 0.15}
          stroke={stroke}
          strokeWidth={0.04}
          strokeDasharray="0.2 0.15"
        />
      );
    case 'spot':
      return (
        <circle cx={marking.x} cy={marking.y} r={marking.r} fill={stroke} />
      );
    case 'goal':
      return <GoalTray marking={marking} />;
  }
}

/**
 * LE BUT VU DE DESSUS, à l'échelle du règlement (`GOAL_TRAY`) : contre le
 * mur, la paroi arrière à la couleur de l'équipe qui défend ; la cuvette,
 * sombre, où le palet doit entrer ; la rampe qui y monte depuis le terrain ;
 * les pentes de côté aux deux bouts ; et les deux limites des 3 m, entre
 * lesquelles le but compte. Zoomé, chaque partie se lit ; de loin, c'est un
 * bac d'acier au bord du terrain, plus un bloc blanc ou noir hors de lui.
 */
function GoalTray({
  marking,
}: {
  marking: Extract<Marking, { kind: 'goal' }>;
}) {
  const { x, team } = marking;
  const into = x === 0 ? 1 : -1;
  const mid = (marking.y1 + marking.y2) / 2;
  const half = GOAL_TRAY.width / 2;
  const at = (u: number) => x + into * u;
  const top = mid - half;
  const bottom = mid + half;
  const outer = GOAL_TRAY.total / 2;
  // Une pente de côté : du bout de la paroi au pied de la rampe, arrondie
  // comme sur le dessin du règlement.
  const side = (from: number, to: number) =>
    `M ${x} ${from} L ${x} ${to} Q ${at(GOAL_TRAY.depth)} ${to} ${at(
      GOAL_TRAY.depth
    )} ${from} Z`;
  const thin = 0.02;
  return (
    <g aria-hidden="true">
      <path
        d={side(top, mid - outer)}
        fill={GOAL.steel}
        stroke={GOAL.edge}
        strokeWidth={thin}
      />
      <path
        d={side(bottom, mid + outer)}
        fill={GOAL.steel}
        stroke={GOAL.edge}
        strokeWidth={thin}
      />
      <rect
        x={Math.min(at(GOAL_TRAY.trough), at(GOAL_TRAY.depth))}
        y={top}
        width={GOAL_TRAY.ramp}
        height={GOAL_TRAY.width}
        fill={GOAL.ramp}
        stroke={GOAL.edge}
        strokeWidth={thin}
      />
      <rect
        x={Math.min(x, at(GOAL_TRAY.trough))}
        y={top}
        width={GOAL_TRAY.trough}
        height={GOAL_TRAY.width}
        fill={GOAL.trough}
      />
      {/* Les limites des 3 m : le but compte entre elles. */}
      <line
        x1={x}
        y1={top}
        x2={at(GOAL_TRAY.depth)}
        y2={top}
        stroke={GOAL.edge}
        strokeWidth={0.03}
      />
      <line
        x1={x}
        y1={bottom}
        x2={at(GOAL_TRAY.depth)}
        y2={bottom}
        stroke={GOAL.edge}
        strokeWidth={0.03}
      />
      {/* La paroi arrière, contre le mur : la couleur de l'équipe, cernée
          pour se lire sur l'eau comme sur la plage. */}
      <line
        x1={x}
        y1={mid - outer}
        x2={x}
        y2={mid + outer}
        stroke={GOAL.edge}
        strokeWidth={0.11}
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1={mid - outer + 0.04}
        x2={x}
        y2={mid + outer - 0.04}
        stroke={TEAM[team].body}
        strokeWidth={0.06}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Les contours d'équipement, calculés une fois. */
const STICK_PATH = {
  right: outlinePath(stickOutline()),
  left: outlinePath(stickOutline(), -1),
};
const FIN_PATH = outlinePath(finOutline());
/** Le bout des jambes, où se chaussent les palmes. */
const FEET_X = -1.12;

/**
 * UN NAGEUR VU DE DESSUS, tête vers les x croissants, origine au thorax.
 *
 * Le corps garde la teinte de l'équipe — c'est un tableau, on doit lire
 * blanc ou noir d'un coup d'œil —, mais l'équipement est le vrai : le bonnet
 * blanc, ou BLEU pour les Noirs, la crosse à crochet blanche ou noire, le
 * gant bleu ciel, les palmes noires de 50 cm (`equipment.ts`, que la 3D lit
 * aussi).
 *
 * Sous l'eau, il est allongé, bras tendus, la crosse devant lui ; en surface,
 * bras écartés, et une onde autour de lui. La main de la crosse est la droite
 * (côté `y` positif, vu de dessus) — la gauche pour un gaucher, dont la
 * crosse est le miroir.
 */
/**
 * LE PION DU MODE SIMPLE : un rond à la couleur de l'équipe, son numéro en
 * gros, une encoche pour la direction. Lisible au doigt sur un téléphone,
 * là où le nageur détaillé fait 20 px. En surface, une onde l'entoure.
 */
function Pawn({ player }: { player: FramePlayer }) {
  const surface = player.surfaceness >= 0.5;
  const colors = TEAM[player.team];
  return (
    <g>
      {surface ? (
        <circle
          r={0.95}
          fill="none"
          stroke={SIGNAL.light}
          strokeOpacity={0.9}
          strokeWidth={0.06}
          strokeDasharray="0.16 0.12"
        />
      ) : null}
      <path d="M 0.58 -0.24 L 0.92 0 L 0.58 0.24 Z" fill={colors.outline} />
      <circle
        r={0.62}
        fill={colors.body}
        stroke={colors.outline}
        strokeWidth={0.07}
      />
    </g>
  );
}

function Swimmer({ player }: { player: FramePlayer }) {
  const surface = player.surfaceness >= 0.5;
  const gear = TEAM_GEAR[player.team];
  const colors = TEAM[player.team];
  const fill = colors.body;
  const stroke = colors.outline;
  const side = player.leftHanded ? -1 : 1;
  const stickArm = surface
    ? { x1: 0.22, y1: 0.17 * side, x2: 0.42, y2: 0.62 * side }
    : { x1: 0.22, y1: 0.16 * side, x2: 0.86, y2: 0.13 * side };
  const freeArm = surface
    ? { x1: 0.22, y1: -0.17 * side, x2: 0.42, y2: -0.62 * side }
    : { x1: 0.22, y1: -0.16 * side, x2: 0.7, y2: -0.2 * side };
  return (
    <g>
      {surface ? (
        <circle
          r={1.05}
          fill="none"
          stroke={SIGNAL.light}
          strokeOpacity={0.9}
          strokeWidth={0.04}
          strokeDasharray="0.14 0.12"
        />
      ) : null}
      {/* Les palmes, chaussées au bout des jambes. */}
      {[-0.12, 0.12].map(y => (
        <path
          key={y}
          d={FIN_PATH}
          transform={`translate(${FEET_X + 0.04} ${y})`}
          fill={FIN_COLOR}
          stroke={colors.finOutline}
          strokeWidth={0.02}
        />
      ))}
      <g fill={fill} stroke={stroke} strokeWidth={0.035} strokeLinejoin="round">
        <rect x={FEET_X} y={-0.18} width={0.84} height={0.11} rx={0.05} />
        <rect x={FEET_X} y={0.07} width={0.84} height={0.11} rx={0.05} />
        <ellipse cx={0.03} cy={0} rx={0.36} ry={0.21} />
      </g>
      <g stroke={fill} strokeWidth={0.09} strokeLinecap="round">
        <line {...stickArm} />
        <line {...freeArm} />
      </g>
      <g stroke={stroke} strokeWidth={0.02} strokeLinecap="round" fill="none">
        <line {...stickArm} />
        <line {...freeArm} />
      </g>
      {/* La crosse, talon dans le gant, crochet vers l'intérieur, À LA
          COULEUR DE L'ÉQUIPE. Un liseré la détache de l'eau. */}
      <path
        d={side === 1 ? STICK_PATH.right : STICK_PATH.left}
        transform={`translate(${stickArm.x2 - 0.02} ${stickArm.y2})`}
        fill={gear.stick}
        stroke={stroke}
        strokeWidth={0.018}
        strokeLinejoin="round"
      />
      <ellipse
        cx={stickArm.x2}
        cy={stickArm.y2}
        rx={0.08}
        ry={0.055}
        fill={GLOVE.silicone}
        stroke={TEAM.blanc.outline}
        strokeWidth={0.015}
      />
      {/* La tête sous son bonnet de water-polo, protège-oreilles compris. */}
      <circle
        cx={0.5}
        cy={-0.13}
        r={0.05}
        fill={gear.cap}
        stroke={stroke}
        strokeWidth={0.015}
      />
      <circle
        cx={0.5}
        cy={0.13}
        r={0.05}
        fill={gear.cap}
        stroke={stroke}
        strokeWidth={0.015}
      />
      <circle
        cx={0.5}
        cy={0}
        r={0.14}
        fill={gear.cap}
        stroke={stroke}
        strokeWidth={0.035}
      />
      <rect
        x={0.56}
        y={-0.1}
        width={0.08}
        height={0.2}
        rx={0.03}
        fill={GEAR.mask}
      />
    </g>
  );
}

/**
 * L'ARBITRE DE BORD, debout sur la plage : un carré, pour qu'on ne le
 * confonde pas avec les arbitres aquatiques, et un sifflet vers le terrain.
 */
function DeckRefereeShape({ selected }: { selected: boolean }) {
  return (
    <g>
      <circle cx={0.42} cy={0} r={0.09} fill={OFFICIAL.whistle} />
      <rect
        x={-0.32}
        y={-0.32}
        width={0.64}
        height={0.64}
        rx={0.12}
        fill={OFFICIAL.shirt}
        stroke={selected ? SIGNAL.light : OFFICIAL.outline}
        strokeWidth={0.05}
      />
    </g>
  );
}

function RefereeShape({ selected }: { selected: boolean }) {
  return (
    <g>
      <rect
        x={0.18}
        y={-0.24}
        width={0.3}
        height={0.48}
        rx={0.06}
        fill={OFFICIAL.whistle}
      />
      <circle
        r={0.38}
        fill={OFFICIAL.shirt}
        stroke={selected ? SIGNAL.light : OFFICIAL.outline}
        strokeWidth={0.05}
      />
    </g>
  );
}

/** Le nom, toujours droit à l'écran, même terrain dressé. */
function UprightText({
  x,
  y,
  rotation,
  dy,
  children,
  size = 0.42,
  color = POOL.ink,
  weight = 600,
}: {
  x: number;
  y: number;
  rotation: number;
  dy: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${-rotation})`}
      pointerEvents="none"
    >
      <text
        y={dy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size}
        fontWeight={weight}
        fill={color}
        stroke={color === SIGNAL.light ? 'none' : SIGNAL.light}
        strokeOpacity={0.75}
        strokeWidth={0.1}
        paintOrder="stroke"
      >
        {children}
      </text>
    </g>
  );
}

type Drag =
  | {
      kind: 'token';
      id: string;
      mode: 'move' | 'rotate';
      offset: Point;
      /** Où le doigt s'est posé, et s'il a bougé depuis. */
      start: Point;
      moved: boolean;
      /** En direct : le geste a été annoncé au magasin (ADR 0025). */
      recorded?: boolean;
      /** Les jetons sous le doigt, le plus proche d'abord. */
      candidates: string[];
    }
  | { kind: 'arrow'; from: Point; to: Point };

/**
 * LE RAYON OÙ UN TOUCHER ATTEINT UN JETON, en mètres : celui de sa zone de
 * focus. Un toucher qui en atteint plusieurs ne devine pas — il demande.
 */
const HIT = { player: 1.15, referee: 0.75, puck: 0.55 } as const;
/** Au-delà, en mètres, le geste est un glisser et non un toucher. */
const TAP_SLOP = 0.25;

/** Le tracé d'une flèche : droit pour un déplacement ou une passe, en arc pour un flick. */
function arrowPath(arrow: Arrow): string {
  const { from, to } = arrow;
  if (arrow.kind !== 'flick') return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  // L'arc se bombe sur le côté : vu de dessus, c'est la trace d'un palet qui vole.
  const bulge = Math.min(2, len * 0.25);
  const cx = mx - ((to.y - from.y) / len) * bulge;
  const cy = my + ((to.x - from.x) / len) * bulge;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

const ARROW_STYLE: Record<
  ArrowKind,
  { stroke: string; dash?: string; width: number }
> = {
  move: { stroke: ARROW.move, dash: '0.3 0.18', width: 0.08 },
  pass: { stroke: ARROW.pass, width: 0.09 },
  flick: { stroke: ARROW.flick, dash: '0.08 0.14', width: 0.1 },
};

const noop = () => {};

export function Board2D({
  labels,
  onEdit = noop,
  tactic: shown,
  orientation = 'auto',
  playhead: requestedPlayhead,
  interactive: requestedInteractive = true,
  tool = null,
  warnings,
  variant = 'swimmers',
  onPick,
  whichLabel = '',
  dockCorner = false,
}: Props) {
  const draft = useBoard(s => s.tactic);
  const tactic = shown ?? draft;
  // Un schéma passé en prop est une image : ni geste, ni lecture en cours.
  const interactive = shown ? false : requestedInteractive;
  const fixedPlayhead = shown ? (requestedPlayhead ?? 0) : requestedPlayhead;
  const livePlayhead = useBoard(s => s.playhead);
  const playing = useBoard(s => s.playing);
  const stepIndex = useBoard(s => s.step);
  const selected = useBoard(s => s.selected);
  const extra = useBoard(s => s.extra);
  const select = useBoard(s => s.select);
  const move = useBoard(s => s.move);
  const rotate = useBoard(s => s.rotate);
  const recordGestureStart = useBoard(s => s.recordGestureStart);
  const recordGestureEnd = useBoard(s => s.recordGestureEnd);
  const setSurface = useBoard(s => s.setSurface);
  const addArrow = useBoard(s => s.addArrow);
  const playhead = fixedPlayhead ?? livePlayhead;
  const uid = useId().replace(/:/g, '');
  const helpId = `board-help-${uid}`;

  const wrapper = useRef<HTMLDivElement>(null);
  const inner = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [choice, setChoice] = useState<{
    ids: string[];
    x: number;
    y: number;
  } | null>(null);
  const choiceRef = useRef<HTMLDivElement>(null);
  // Le choix se referme d'un toucher au-dehors ou d'Échap ; il prend le
  // focus pour qu'un clavier y entre aussi.
  useEffect(() => {
    if (!choice) return;
    choiceRef.current?.querySelector('button')?.focus({ preventScroll: true });
    // Un choix refermé sans rien choisir est un geste abandonné : la mesure
    // dit s'il revient souvent.
    const drop = () => {
      setChoice(null);
      trackEvent('choix_jeton', { issue: 'abandonne' });
    };
    const outside = (event: globalThis.PointerEvent) => {
      if (!choiceRef.current?.contains(event.target as Node)) drop();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') drop();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [choice]);
  const [preview, setPreview] = useState<{ from: Point; to: Point } | null>(
    null
  );
  const portrait = usePortrait(wrapper, orientation);
  const rotation = portrait ? 90 : 0;

  const { pitch } = tactic;
  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);
  const markings = useMemo(() => pitchMarkings(pitch), [pitch]);
  const shownStep = Math.min(Math.floor(playhead), tactic.steps.length - 1);
  const arrows = tactic.steps[shownStep]?.arrows ?? [];
  /*
   * LE FANTÔME DE L'ÉTAPE PRÉCÉDENTE : où était chacun, et le chemin
   * parcouru. C'est ce qu'on veut lire quand on explique une phase — qui a
   * bougé, de combien — et ce qu'un tableau de positions ne dit pas.
   */
  const ghosts = useMemo(() => {
    if (!tactic.display.ghosts || playing || fixedPlayhead !== undefined) {
      return [];
    }
    if (stepIndex === 0) return [];
    const before = frameAt(tactic, stepIndex - 1);
    return frame.players
      .map(p => {
        const was = before.players.find(b => b.id === p.id);
        return was && distance(was, p) > 0.3 ? { now: p, was } : null;
      })
      .filter((g): g is { now: FramePlayer; was: FramePlayer } => g !== null);
  }, [tactic, playing, fixedPlayhead, stepIndex, frame]);

  const group = selected && !shown ? [selected, ...extra] : [];
  const isSelected = (id: string) => group.includes(id);

  const viewW = (portrait ? pitch.width : pitch.length) + 2 * MARGIN;
  const viewH = (portrait ? pitch.length : pitch.width) + 2 * MARGIN;
  const zoom = useBoardZoom(
    svgRef,
    { x: -MARGIN, y: -MARGIN, w: viewW, h: viewH },
    interactive,
    `${portrait}-${viewW}-${viewH}`
  );
  // Dressé, le but des Blancs est en haut : (x, y) → (largeur − y, x).
  const transform = portrait
    ? `translate(${pitch.width} 0) rotate(90)`
    : undefined;

  const positionOf = (id: string): (Point & { angle: number }) | null => {
    if (id === PUCK_ID) return { ...frame.puck, angle: 0 };
    return (
      frame.players.find(p => p.id === id) ??
      frame.referees.find(r => r.id === id) ??
      null
    );
  };

  /** Le point du terrain sous le pointeur, en mètres. */
  const toPitch = (event: PointerEvent): Point | null => {
    const ctm = inner.current?.getScreenCTM?.();
    if (!ctm) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      ctm.inverse()
    );
    return { x: p.x, y: p.y };
  };

  /** La capture va toujours au SVG entier : il reçoit la suite du geste. */
  const capture = (event: PointerEvent) =>
    (event.currentTarget as Element)
      .closest('svg')
      ?.setPointerCapture?.(event.pointerId);

  /** L'outil flèche : un glisser trace une flèche, d'un jeton ou d'un point. */
  const startArrow = (event: PointerEvent, from: Point) => {
    event.stopPropagation();
    event.preventDefault();
    drag.current = { kind: 'arrow', from, to: from };
    setPreview({ from, to: from });
    capture(event);
  };

  const startDrag = (
    event: PointerEvent,
    id: string,
    mode: 'move' | 'rotate'
  ) => {
    const at = toPitch(event);
    if (tool && mode === 'move') {
      const origin = positionOf(id);
      if (origin) startArrow(event, origin);
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    setChoice(null);
    if (mode === 'move' && onPick?.(id)) return;
    // Maj, Ctrl ou Cmd : on compose une sélection au lieu de la remplacer.
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    select(id, additive);
    const current = positionOf(id);
    if (!at || !current || additive) return;
    drag.current = {
      kind: 'token',
      id,
      mode,
      offset: { x: current.x - at.x, y: current.y - at.y },
      start: at,
      moved: false,
      candidates: mode === 'move' ? tokensAt(at) : [id],
    };
    capture(event);
  };

  /** Le nom court d'un jeton, pour le choix : « Blanc 3 », « Arbitre 1 ». */
  const shortLabel = (id: string) => {
    const player = frame.players.find(p => p.id === id);
    if (player) return labels.player(player).split(',')[0]!;
    const referee = frame.referees.find(r => r.id === id);
    if (referee) return labels.referee(referee).split(',')[0]!;
    return labels.puck.split(',')[0]!;
  };

  /** Les jetons qu'un toucher en ce point atteint, le plus proche d'abord. */
  const tokensAt = (at: Point): string[] =>
    [
      ...frame.players.map(p => ({ id: p.id, r: HIT.player, p })),
      ...frame.referees.map(r => ({ id: r.id, r: HIT.referee, p: r })),
      { id: PUCK_ID, r: HIT.puck, p: frame.puck },
    ]
      .map(t => ({ id: t.id, gap: distance(t.p, at), r: t.r }))
      .filter(t => t.gap <= t.r)
      .sort((a, b) => a.gap - b.gap)
      .map(t => t.id);

  const onBackgroundDown = (event: PointerEvent<SVGSVGElement>) => {
    if (tool) {
      const at = toPitch(event);
      if (at) startArrow(event, at);
      return;
    }
    // Grossi, le fond du bassin se fait glisser ; un toucher sans mouvement
    // désélectionne toujours, à la fin du geste.
    if (zoom.zoomed && zoom.startPan(event)) {
      capture(event);
      return;
    }
    select(null);
  };

  /** Le second doigt annule ce que le premier avait commencé. */
  const onPinchStart = (event: PointerEvent<SVGSVGElement>) => {
    if (zoom.capture.onPointerDownCapture(event)) {
      const d = drag.current;
      if (d?.kind === 'token' && d.recorded) recordGestureEnd();
      drag.current = null;
      setPreview(null);
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (zoom.panning()) {
      zoom.move(event);
      return;
    }
    const d = drag.current;
    if (!d) return;
    const at = toPitch(event);
    if (!at) return;
    if (d.kind === 'arrow') {
      d.to = at;
      setPreview({ from: d.from, to: at });
      return;
    }
    if (d.mode === 'move') {
      // Un toucher qui tremble n'est pas un glisser : le jeton ne bouge
      // qu'au-delà de quelques centimètres, et le choix reste possible.
      if (!d.moved && distance(at, d.start) < TAP_SLOP) return;
      d.moved = true;
      // En direct, le premier vrai mouvement ouvre l'étape, s'il le faut :
      // un simple toucher n'en crée jamais.
      if (!d.recorded) {
        d.recorded = true;
        recordGestureStart();
      }
      move(d.id, { x: at.x + d.offset.x, y: at.y + d.offset.y });
    } else {
      const current = positionOf(d.id);
      if (!current) return;
      if (!d.recorded) {
        d.recorded = true;
        recordGestureStart();
      }
      rotate(
        d.id,
        (Math.atan2(at.y - current.y, at.x - current.x) * 180) / Math.PI
      );
    }
  };

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    const pan = zoom.end();
    if (pan) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (pan.tap) select(null);
      return;
    }
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (d.kind === 'arrow') {
      setPreview(null);
      // Un simple clic ne fait pas une flèche.
      if (tool && distance(d.from, d.to) > 0.5) {
        addArrow({ kind: tool, from: d.from, to: d.to });
      }
      return;
    }
    if (d.recorded) recordGestureEnd();
    // UN TOUCHER SUR PLUSIEURS JETONS DEMANDE LEQUEL, au lieu de deviner :
    // le long d'un mur, les joueurs se touchent presque.
    if (!d.moved && d.candidates.length > 1) {
      const box = wrapper.current?.getBoundingClientRect();
      if (box) {
        setChoice({
          ids: d.candidates,
          x: event.clientX - box.left,
          y: event.clientY - box.top,
        });
        trackEvent('choix_jeton', {
          issue: 'propose',
          jetons: d.candidates.length,
        });
      }
    }
  };

  const onTokenKey = (event: KeyboardEvent, id: string) => {
    // Le zoom au clavier, pour qui ne peut pas pincer : + et −, 0 pour le
    // bassin entier. Depuis n'importe quel jeton, qui a le focus du tableau.
    if (['+', '=', '-', '0'].includes(event.key) && !event.ctrlKey) {
      event.preventDefault();
      if (event.key === '0') zoom.reset();
      else zoom.zoomBy(event.key === '-' ? 1 / 1.5 : 1.5);
      return;
    }
    const current = positionOf(id);
    if (!current) return;
    const step = event.shiftKey ? KEY_STEP_FINE : KEY_STEP;
    // Les flèches suivent l'écran : terrain dressé, « droite » descend le long.
    const screen: Record<string, Point> = {
      ArrowRight: { x: step, y: 0 },
      ArrowLeft: { x: -step, y: 0 },
      ArrowDown: { x: 0, y: step },
      ArrowUp: { x: 0, y: -step },
    };
    const delta = screen[event.key];
    if (delta) {
      event.preventDefault();
      const d = portrait ? { x: delta.y, y: -delta.x } : delta;
      move(id, { x: current.x + d.x, y: current.y + d.y });
      return;
    }
    if (id === PUCK_ID) return;
    if (event.key === '[' || event.key === 'q') {
      event.preventDefault();
      rotate(id, current.angle - KEY_ROTATE);
    } else if (event.key === ']' || event.key === 'e') {
      event.preventDefault();
      rotate(id, current.angle + KEY_ROTATE);
    } else if (event.key === 's') {
      const player = frame.players.find(p => p.id === id);
      if (player) {
        event.preventDefault();
        setSurface(id, player.surfaceness < 0.5);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onEdit(id);
    } else if (event.key === 'Escape') {
      select(null);
    }
  };

  const tokenProps = (id: string, label: string) =>
    interactive
      ? {
          role: 'button' as const,
          tabIndex: 0,
          'aria-label': label,
          'aria-pressed': isSelected(id),
          'aria-describedby': helpId,
          className: 'uwh-token',
          'data-token': id,
          onPointerDown: (e: PointerEvent) => startDrag(e, id, 'move'),
          onDoubleClick: () => onEdit(id),
          onFocus: () => {
            if (!isSelected(id)) select(id);
          },
          onKeyDown: (e: KeyboardEvent) => onTokenKey(e, id),
        }
      : { 'data-token': id, 'aria-label': label, role: 'img' as const };

  const rotateHandle = (id: string) =>
    interactive && selected === id && extra.length === 0 ? (
      <g
        className="uwh-handle"
        onPointerDown={e => startDrag(e, id, 'rotate')}
        aria-hidden="true"
      >
        <line
          x1={1.15}
          y1={0}
          x2={1.5}
          y2={0}
          stroke="var(--uwh-accent)"
          strokeWidth={0.06}
        />
        <circle
          cx={1.72}
          cy={0}
          r={0.24}
          fill="var(--uwh-accent)"
          stroke={SIGNAL.light}
          strokeWidth={0.05}
        />
      </g>
    ) : null;

  const line = frame.refereeLine;
  const marker = (kind: ArrowKind) => `url(#tip-${kind}-${uid})`;

  return (
    <div
      ref={wrapper}
      className={`uwh-board${orientation === 'fit' ? ' uwh-board--fit' : ''}`}
    >
      {interactive ? (
        <p id={helpId} className="sr-only">
          {labels.help}
        </p>
      ) : null}
      <svg
        ref={svgRef}
        role={interactive ? 'group' : 'img'}
        aria-label={labels.pitch}
        viewBox={
          interactive ? zoom.viewBox : `${-MARGIN} ${-MARGIN} ${viewW} ${viewH}`
        }
        // Les gestes et le zoom lisent `getScreenCTM`, qui suit ce cadrage.
        preserveAspectRatio={
          dockCorner && portrait ? 'xMaxYMid meet' : undefined
        }
        className={`block touch-none select-none${tool ? ' uwh-board--draw' : ''}`}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? endDrag : undefined}
        onPointerCancel={interactive ? endDrag : undefined}
        onPointerDown={interactive ? onBackgroundDown : undefined}
        onPointerDownCapture={interactive ? onPinchStart : undefined}
        onPointerMoveCapture={
          interactive ? zoom.capture.onPointerMoveCapture : undefined
        }
        onPointerUpCapture={
          interactive ? zoom.capture.onPointerUpCapture : undefined
        }
        onPointerCancelCapture={
          interactive ? zoom.capture.onPointerUpCapture : undefined
        }
      >
        <defs>
          {ARROW_KINDS.map(kind => (
            <marker
              key={kind}
              id={`tip-${kind}-${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ARROW_STYLE[kind].stroke} />
            </marker>
          ))}
        </defs>
        <rect
          x={-MARGIN}
          y={-MARGIN}
          width={viewW}
          height={viewH}
          fill="var(--uwh-deck)"
        />
        <g ref={inner} transform={transform}>
          {/* Le bassin, puis le terrain dedans. */}
          <rect
            x={-POOL_MARGIN}
            y={-POOL_MARGIN}
            width={pitch.length + 2 * POOL_MARGIN}
            height={pitch.width + 2 * POOL_MARGIN}
            fill="var(--uwh-pool)"
          />
          <rect
            x={0}
            y={0}
            width={pitch.length}
            height={pitch.width}
            fill="var(--uwh-water)"
          />
          {markings.map((m, i) => (
            <MarkingShape key={i} marking={m} />
          ))}

          {/* Les champs de vision sous tout le reste : ils éclairent, ils ne
              cachent pas. */}
          {tactic.display.fieldOfView
            ? frame.referees
                .filter(r => !r.deck)
                .map(r => (
                  <path
                    key={`fov-${r.id}`}
                    d={sectorPath(r.x, r.y, FOV_RANGE, r.angle, FOV_APERTURE)}
                    fill={SIGNAL.light}
                    fillOpacity={0.28}
                    pointerEvents="none"
                  />
                ))
            : null}

          {/* Les fantômes et le chemin parcouru depuis l'étape précédente. */}
          {ghosts.map(({ now, was }) => (
            <g key={`ghost-${now.id}`} pointerEvents="none" aria-hidden="true">
              <circle
                cx={was.x}
                cy={was.y}
                r={0.32}
                fill={TEAM[now.team].zone}
                fillOpacity={0.35}
                stroke={POOL.ink}
                strokeOpacity={0.4}
                strokeWidth={0.04}
              />
              <line
                x1={was.x}
                y1={was.y}
                x2={now.x}
                y2={now.y}
                stroke={POOL.ink}
                strokeOpacity={0.45}
                strokeWidth={0.05}
                strokeDasharray="0.15 0.12"
              />
            </g>
          ))}

          {/* Les flèches de l'étape : déplacements, passes, flicks. */}
          {[
            ...arrows,
            ...(preview && tool ? [{ kind: tool, ...preview }] : []),
          ].map((arrow, i) => (
            <path
              key={`arrow-${i}`}
              d={arrowPath(arrow)}
              fill="none"
              stroke={ARROW_STYLE[arrow.kind].stroke}
              strokeWidth={ARROW_STYLE[arrow.kind].width}
              strokeDasharray={ARROW_STYLE[arrow.kind].dash}
              strokeLinecap="round"
              markerEnd={marker(arrow.kind)}
              pointerEvents="none"
            />
          ))}

          {line ? (
            <g pointerEvents="none">
              <line
                x1={line[0].x}
                y1={line[0].y}
                x2={line[1].x}
                y2={line[1].y}
                stroke={OFFICIAL.shirt}
                strokeWidth={0.07}
                strokeDasharray="0.12 0.12"
              />
              <UprightText
                x={(line[0].x + line[1].x) / 2}
                y={(line[0].y + line[1].y) / 2}
                rotation={rotation}
                dy={-0.35}
                size={0.4}
                color={OFFICIAL.label}
              >
                {labels.formatDistance(distance(line[0], line[1]))}
              </UprightText>
            </g>
          ) : null}

          {frame.players.map(p => (
            <g key={p.id} {...tokenProps(p.id, labels.player(p))}>
              <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
                <circle className="uwh-focus" r={1.15} fill="transparent" />
                {warnings?.has(p.id) ? (
                  <circle
                    r={1.25}
                    fill="none"
                    stroke={SIGNAL.apnea}
                    strokeWidth={0.1}
                    strokeDasharray="0.25 0.15"
                  />
                ) : null}
                {variant === 'pawns' ? (
                  <Pawn player={p} />
                ) : (
                  <Swimmer player={p} />
                )}
                {rotateHandle(p.id)}
              </g>
              <UprightText
                x={p.x}
                y={p.y}
                rotation={rotation}
                dy={0}
                size={variant === 'pawns' ? 0.55 : 0.3}
                color={TEAM[p.team].number}
                weight={700}
              >
                {p.number}
              </UprightText>
              {tactic.display.labels && p.name ? (
                <UprightText x={p.x} y={p.y} rotation={rotation} dy={1.05}>
                  {p.name}
                </UprightText>
              ) : null}
            </g>
          ))}

          {frame.referees.map(r => (
            <g key={r.id} {...tokenProps(r.id, labels.referee(r))}>
              <g transform={`translate(${r.x} ${r.y}) rotate(${r.angle})`}>
                <circle className="uwh-focus" r={0.75} fill="transparent" />
                {r.deck ? (
                  <DeckRefereeShape selected={isSelected(r.id)} />
                ) : (
                  <RefereeShape selected={isSelected(r.id)} />
                )}
                {rotateHandle(r.id)}
              </g>
              <UprightText
                x={r.x}
                y={r.y}
                rotation={rotation}
                dy={0}
                size={0.4}
                color={SIGNAL.light}
                weight={700}
              >
                {r.deck ? '' : r.number}
              </UprightText>
              {tactic.display.labels && r.name ? (
                <UprightText x={r.x} y={r.y} rotation={rotation} dy={0.75}>
                  {r.name}
                </UprightText>
              ) : null}
            </g>
          ))}

          <g {...tokenProps(PUCK_ID, labels.puck)}>
            <circle
              className="uwh-focus"
              cx={frame.puck.x}
              cy={frame.puck.y}
              r={0.55}
              fill="transparent"
            />
            <circle
              cx={frame.puck.x}
              cy={frame.puck.y}
              r={0.2 + frame.puckHeight * 0.12}
              fill={PUCK.fill}
              stroke={PUCK.stroke}
              strokeWidth={0.08}
            />
          </g>
        </g>
      </svg>
      {choice ? (
        <div
          ref={choiceRef}
          className="uwh-choice"
          role="group"
          aria-label={whichLabel}
          style={{
            left: Math.min(
              Math.max(choice.x, 96),
              (wrapper.current?.clientWidth ?? 0) - 96
            ),
            top: choice.y,
          }}
        >
          <p className="uwh-choice__title" aria-hidden="true">
            {whichLabel}
          </p>
          {choice.ids.map(id => (
            <button
              key={id}
              type="button"
              className="uwh-choice__item"
              onClick={() => {
                select(id);
                setChoice(null);
                trackEvent('choix_jeton', { issue: 'choisi' });
              }}
            >
              {shortLabel(id)}
            </button>
          ))}
        </div>
      ) : null}
      {interactive && zoom.zoomed ? (
        <button type="button" className="uwh-zoom-reset" onClick={zoom.reset}>
          {labels.resetZoom ?? '1:1'}
        </button>
      ) : null}
    </div>
  );
}
