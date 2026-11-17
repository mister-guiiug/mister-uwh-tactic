import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { arcPath, pitchMarkings, sectorPath, type Marking } from './pitch.ts';
import {
  FIN_COLOR,
  finOutline,
  GLOVE,
  outlinePath,
  stickOutline,
  TEAM_GEAR,
} from './equipment.ts';
import { frameAt, type FramePlayer, type FrameReferee } from './frame.ts';
import { distance, POOL_MARGIN, PUCK_ID, type Point } from './model.ts';
import { useBoard } from './store.ts';

/**
 * Marge autour du terrain, en mètres : le mètre de bassin où nagent les
 * remplaçants, puis la plage où se tient l'arbitre de bord.
 */
const MARGIN = 2.4;
/** Ouverture et portée du champ de vision dessiné d'un arbitre. */
export const FOV_APERTURE = 100;
export const FOV_RANGE = 9;
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
}

interface Props {
  labels: Board2DLabels;
  /** Ouvre la fiche du jeton (double-clic, Entrée). */
  onEdit: (id: string) => void;
}

/**
 * Sous cette largeur, le terrain se dresse : 25 m sur 15 en paysage, sur un
 * téléphone tenu droit, ce sont des joueurs de vingt pixels.
 */
const PORTRAIT_BELOW = 640;

function usePortrait(ref: React.RefObject<HTMLElement | null>): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setPortrait(width < PORTRAIT_BELOW);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return portrait;
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
          fill={marking.team === 'blanc' ? '#ffffff' : '#111827'}
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
    case 'goal': {
      const outside = marking.team === 'blanc' ? -0.35 : 0;
      return (
        <rect
          x={marking.x + outside}
          y={marking.y1}
          width={0.35}
          height={marking.y2 - marking.y1}
          fill={marking.team === 'blanc' ? '#f8fafc' : '#111827'}
          stroke="#0b2545"
          strokeWidth={0.05}
        />
      );
    }
  }
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
function Swimmer({ player }: { player: FramePlayer }) {
  const surface = player.surfaceness >= 0.5;
  const white = player.team === 'blanc';
  const gear = TEAM_GEAR[player.team];
  const fill = white ? '#f8fafc' : '#111827';
  const stroke = white ? '#0f172a' : '#e5e7eb';
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
          stroke="#ffffff"
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
          stroke={white ? '#0f172a' : '#94a3b8'}
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
        stroke={white ? '#0f172a' : '#e5e7eb'}
        strokeWidth={0.018}
        strokeLinejoin="round"
      />
      <ellipse
        cx={stickArm.x2}
        cy={stickArm.y2}
        rx={0.08}
        ry={0.055}
        fill={GLOVE.silicone}
        stroke="#0f172a"
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
        fill="#38bdf8"
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
      <circle cx={0.42} cy={0} r={0.09} fill="#111827" />
      <rect
        x={-0.32}
        y={-0.32}
        width={0.64}
        height={0.64}
        rx={0.12}
        fill="#c81e1e"
        stroke={selected ? '#ffffff' : '#7f1d1d'}
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
        fill="#111827"
      />
      <circle
        r={0.38}
        fill="#c81e1e"
        stroke={selected ? '#ffffff' : '#7f1d1d'}
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
  color = '#0b2545',
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
        stroke={color === '#ffffff' ? 'none' : 'rgba(255,255,255,0.75)'}
        strokeWidth={0.1}
        paintOrder="stroke"
      >
        {children}
      </text>
    </g>
  );
}

type Drag = { id: string; mode: 'move' | 'rotate'; offset: Point };

export function Board2D({ labels, onEdit }: Props) {
  const tactic = useBoard(s => s.tactic);
  const playhead = useBoard(s => s.playhead);
  const selected = useBoard(s => s.selected);
  const select = useBoard(s => s.select);
  const move = useBoard(s => s.move);
  const rotate = useBoard(s => s.rotate);
  const setSurface = useBoard(s => s.setSurface);

  const wrapper = useRef<HTMLDivElement>(null);
  const inner = useRef<SVGGElement>(null);
  const drag = useRef<Drag | null>(null);
  const portrait = usePortrait(wrapper);
  const rotation = portrait ? 90 : 0;

  const { pitch } = tactic;
  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);
  const markings = useMemo(() => pitchMarkings(pitch), [pitch]);

  const viewW = (portrait ? pitch.width : pitch.length) + 2 * MARGIN;
  const viewH = (portrait ? pitch.length : pitch.width) + 2 * MARGIN;
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

  const startDrag = (event: PointerEvent, id: string, mode: Drag['mode']) => {
    event.stopPropagation();
    event.preventDefault();
    select(id);
    const at = toPitch(event);
    const current = positionOf(id);
    if (!at || !current) return;
    drag.current = {
      id,
      mode,
      offset: { x: current.x - at.x, y: current.y - at.y },
    };
    (event.currentTarget as SVGElement).ownerSVGElement?.setPointerCapture?.(
      event.pointerId
    );
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const at = toPitch(event);
    if (!at) return;
    if (d.mode === 'move') {
      move(d.id, { x: at.x + d.offset.x, y: at.y + d.offset.y });
    } else {
      const current = positionOf(d.id);
      if (!current) return;
      rotate(
        d.id,
        (Math.atan2(at.y - current.y, at.x - current.x) * 180) / Math.PI
      );
    }
  };

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onTokenKey = (event: KeyboardEvent, id: string) => {
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

  const tokenProps = (id: string, label: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    'aria-pressed': selected === id,
    'aria-describedby': 'board-help',
    className: 'uwh-token',
    'data-token': id,
    onPointerDown: (e: PointerEvent) => startDrag(e, id, 'move'),
    onDoubleClick: () => onEdit(id),
    onFocus: () => select(id),
    onKeyDown: (e: KeyboardEvent) => onTokenKey(e, id),
  });

  const rotateHandle = (id: string) =>
    selected === id ? (
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
          stroke="#ffffff"
          strokeWidth={0.05}
        />
      </g>
    ) : null;

  const line = frame.refereeLine;

  return (
    <div ref={wrapper} className="uwh-board">
      <p id="board-help" className="sr-only">
        {labels.help}
      </p>
      <svg
        role="group"
        aria-label={labels.pitch}
        viewBox={`${-MARGIN} ${-MARGIN} ${viewW} ${viewH}`}
        className="block h-auto w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={() => select(null)}
      >
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
                    fill="#ffffff"
                    fillOpacity={0.28}
                    pointerEvents="none"
                  />
                ))
            : null}

          {line ? (
            <g pointerEvents="none">
              <line
                x1={line[0].x}
                y1={line[0].y}
                x2={line[1].x}
                y2={line[1].y}
                stroke="#c81e1e"
                strokeWidth={0.07}
                strokeDasharray="0.12 0.12"
              />
              <UprightText
                x={(line[0].x + line[1].x) / 2}
                y={(line[0].y + line[1].y) / 2}
                rotation={rotation}
                dy={-0.35}
                size={0.4}
                color="#9b1c1c"
              >
                {labels.formatDistance(distance(line[0], line[1]))}
              </UprightText>
            </g>
          ) : null}

          {frame.players.map(p => (
            <g key={p.id} {...tokenProps(p.id, labels.player(p))}>
              <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
                <circle className="uwh-focus" r={1.15} fill="transparent" />
                <Swimmer player={p} />
                {rotateHandle(p.id)}
              </g>
              <UprightText
                x={p.x}
                y={p.y}
                rotation={rotation}
                dy={0}
                size={0.3}
                color={p.team === 'blanc' ? '#0f172a' : '#ffffff'}
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
                  <DeckRefereeShape selected={selected === r.id} />
                ) : (
                  <RefereeShape selected={selected === r.id} />
                )}
                {rotateHandle(r.id)}
              </g>
              <UprightText
                x={r.x}
                y={r.y}
                rotation={rotation}
                dy={0}
                size={0.4}
                color="#ffffff"
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
              r={0.2}
              fill="#fbcfe8"
              stroke="#be185d"
              strokeWidth={0.08}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
