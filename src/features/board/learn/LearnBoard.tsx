import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  Board2D,
  KEY_STEP,
  KEY_STEP_FINE,
  Pawn,
  UprightText,
  type Board2DLabels,
} from '../Board2D.tsx';
import { boardFrame } from '../boardFrame.ts';
import type { FramePlayer } from '../frame.ts';
import {
  clampFor,
  distance,
  isSubstitute,
  type PlayerIdentity,
  type Point,
  type Pose,
  type Tactic,
} from '../model.ts';
import { POOL, TEAM } from '../../../design/tokens.ts';
import {
  guessTactic,
  MOVED,
  poseAt,
  revealTactic,
  type RoundResult,
} from './rounds.ts';
import { clientToPitch, pitchToPercent } from './screen.ts';

/**
 * LA ZONE QU'ON SAISIT, en mètres autour du joueur : celle d'un joueur au
 * tableau (`HIT` de `Board2D.tsx`). La feuille de style la garde à 2,75 rem
 * au moins à l'écran, la cible tactile de 44 px.
 */
const TOKEN_REACH = 1.15;

interface Props {
  /** Le schéma tel qu'il était à l'ouverture du jeu. */
  tactic: Tactic;
  /** L'étape à deviner, comptée depuis 0 (jamais la première). */
  step: number;
  player: PlayerIdentity;
  /** Là où on a mis le jeton, en mètres. */
  guess: Point;
  /** Rempli après « Vérifier » : la bonne place paraît. */
  checked: RoundResult | null;
  /** Terrain dressé : le téléphone tenu droit. */
  portrait: boolean;
  labels: Board2DLabels;
  tokenLabel: string;
  tokenHelp: string;
  onGuess: (point: Point) => void;
  /** Entrée sur le jeton. */
  onCheck: () => void;
}

/** Le joueur tel que `Pawn` le dessine, posé en `at`. */
function framePlayer(
  player: PlayerIdentity,
  pose: Pose,
  at: Point
): FramePlayer {
  return {
    ...player,
    x: at.x,
    y: at.y,
    angle: pose.angle,
    surfaceness: pose.surface === false ? 0 : 1,
    substitute: isSubstitute(player),
  };
}

/**
 * LE TERRAIN DU JEU : une COPIE de l'étape, dessinée par `Board2D` en image
 * (la prop `tactic`), et par-dessus un calque à nous, dans le même cadre
 * (`boardFrame.ts`) — le jeton qu'on déplace, puis la bonne place et le
 * trait d'écart. Le magasin du tableau n'est jamais touché.
 *
 * Le jeton est un élément HTML posé en pourcentage du calque, qui a les
 * proportions du terrain : 44 px au moins sous le doigt, un focus clavier
 * natif, sans mesurer l'écran. Le dessin, lui, parle en mètres.
 */
export function LearnBoard({
  tactic,
  step,
  player,
  guess,
  checked,
  portrait,
  labels,
  tokenLabel,
  tokenHelp,
  onGuess,
  onCheck,
}: Props) {
  const frame = boardFrame(tactic.pitch, portrait);
  const rotation = portrait ? 90 : 0;
  const start = poseAt(tactic, step - 1, player.id);
  const target = poseAt(tactic, step, player.id);
  const shown = useMemo(
    () =>
      checked
        ? revealTactic(tactic, step)
        : guessTactic(tactic, step, player.id, guess),
    [tactic, step, player.id, guess, checked]
  );
  const helpId = `learn-help-${useId().replace(/:/g, '')}`;
  const layer = useRef<HTMLDivElement>(null);
  const token = useRef<HTMLDivElement>(null);
  /** Pendant un glisser : l'écart entre le doigt et le centre du jeton. */
  const grab = useRef<Point | null>(null);

  // CHAQUE ÉTAPE À DEVINER REND LA MAIN AU JETON : on arrive du choix du
  // joueur, ou d'« Étape suivante », et le clavier repart de là.
  useEffect(() => {
    if (!checked) token.current?.focus({ preventScroll: true });
  }, [step, player.id, checked]);

  const place = (point: Point) =>
    onGuess(clampFor(player.id, point, tactic.pitch));

  const toPitch = (event: PointerEvent): Point | null => {
    const box = layer.current?.getBoundingClientRect();
    if (!box) return null;
    return clientToPitch({ x: event.clientX, y: event.clientY }, box, frame);
  };

  /*
   * SAISI SUR LE JETON, il suit le doigt sans sauter ; touché ailleurs, il
   * vient sous le doigt, et le glisser continue de là. Le doigt cache le
   * jeton qu'il traîne : toucher l'endroit voulu est souvent plus juste.
   */
  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (checked) return;
    const at = toPitch(event);
    if (!at) return;
    event.preventDefault();
    const onToken = token.current?.contains(event.target as Node) ?? false;
    grab.current = onToken
      ? { x: guess.x - at.x, y: guess.y - at.y }
      : { x: 0, y: 0 };
    if (!onToken) place(at);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    token.current?.focus({ preventScroll: true });
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const offset = grab.current;
    if (!offset) return;
    const at = toPitch(event);
    if (at) place({ x: at.x + offset.x, y: at.y + offset.y });
  };

  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!grab.current) return;
    grab.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCheck();
      return;
    }
    const amount = event.shiftKey ? KEY_STEP_FINE : KEY_STEP;
    const screen: Record<string, Point> = {
      ArrowRight: { x: amount, y: 0 },
      ArrowLeft: { x: -amount, y: 0 },
      ArrowDown: { x: 0, y: amount },
      ArrowUp: { x: 0, y: -amount },
    };
    const delta = screen[event.key];
    if (!delta) return;
    event.preventDefault();
    // Les flèches suivent l'écran : terrain dressé, « droite » le traverse.
    const origin = frame.toPitch({ x: 0, y: 0 });
    const moved = frame.toPitch(delta);
    place({
      x: guess.x + moved.x - origin.x,
      y: guess.y + moved.y - origin.y,
    });
  };

  const at = pitchToPercent(guess, frame);
  const colors = TEAM[player.team];
  const mid = { x: (guess.x + target.x) / 2, y: (guess.y + target.y) / 2 };

  return (
    <div
      className="uwh-learn__board"
      style={{ '--uwh-learn-ratio': frame.h / frame.w } as CSSProperties}
    >
      <Board2D
        labels={labels}
        tactic={shown}
        // Dressé sous la largeur où le tableau se dresse : `auto` le
        // décide à la même règle que nous (`LearnSheet`), couché sinon.
        orientation={portrait ? 'auto' : 'landscape'}
        variant="pawns"
      />
      <div
        ref={layer}
        className="uwh-learn__layer"
        data-checked={checked ? '' : undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg
          className="uwh-learn__drawing"
          viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
          aria-hidden="true"
        >
          <g transform={frame.transform}>
            {/* D'où il part : le fantôme du tableau, et le chemin qu'on lui
                fait faire. */}
            {!checked && distance(guess, start) > MOVED ? (
              <g pointerEvents="none">
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={0.32}
                  fill={colors.zone}
                  fillOpacity={0.35}
                  stroke={POOL.ink}
                  strokeOpacity={0.4}
                  strokeWidth={0.04}
                />
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={guess.x}
                  y2={guess.y}
                  stroke={POOL.ink}
                  strokeOpacity={0.45}
                  strokeWidth={0.05}
                  strokeDasharray="0.15 0.12"
                />
              </g>
            ) : null}
            {/* Vérifié : la bonne place (dessinée par le tableau, cerclée
                ici), ce qu'on avait choisi, et l'écart entre les deux. */}
            {checked ? (
              <g pointerEvents="none" data-learn="answer">
                <line
                  x1={guess.x}
                  y1={guess.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={POOL.ink}
                  strokeWidth={0.07}
                  strokeDasharray="0.2 0.14"
                  strokeLinecap="round"
                />
                <circle
                  cx={target.x}
                  cy={target.y}
                  r={0.95}
                  fill="none"
                  stroke="var(--uwh-accent)"
                  strokeWidth={0.1}
                />
                <g
                  opacity={0.5}
                  transform={`translate(${guess.x} ${guess.y}) rotate(${start.angle})`}
                >
                  <Pawn player={framePlayer(player, start, guess)} />
                </g>
                <UprightText
                  x={guess.x}
                  y={guess.y}
                  rotation={rotation}
                  dy={0}
                  size={0.55}
                  color={colors.number}
                  weight={700}
                >
                  {player.number}
                </UprightText>
                <UprightText
                  x={mid.x}
                  y={mid.y}
                  rotation={rotation}
                  dy={-0.45}
                  size={0.45}
                  weight={700}
                >
                  {labels.formatDistance(checked.gap)}
                </UprightText>
              </g>
            ) : null}
          </g>
        </svg>
        {checked ? null : (
          <div
            ref={token}
            role="button"
            tabIndex={0}
            className="uwh-learn__token"
            aria-label={tokenLabel}
            aria-describedby={helpId}
            style={
              {
                left: `${at.left}%`,
                top: `${at.top}%`,
                '--uwh-learn-reach': `${(200 * TOKEN_REACH) / frame.w}%`,
              } as CSSProperties
            }
            onKeyDown={onKey}
          />
        )}
      </div>
      <p id={helpId} className="sr-only">
        {tokenHelp}
      </p>
    </div>
  );
}
