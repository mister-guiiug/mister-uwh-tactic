import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '@mister-guiiug/dev-pwa-config/react/use-media-query';
import { frameAt, type FramePlayer, type FrameReferee } from './frame.ts';
import { PoolScene, type CameraPreset } from './scene3d.ts';
import { registerCanvas } from './canvasRegistry.ts';
import { distance } from './model.ts';
import { useBoard } from './store.ts';

export interface Pool3DProps {
  camera: CameraPreset;
  label: string;
  unavailable: string;
  formatDistance: (metres: number) => string;
  /** Le mode économie : ni ombres, ni caustiques, ni houle. */
  eco?: boolean;
}

/**
 * LA VUE 3D, chargée à la demande : three.js n'entre dans le navigateur que
 * lorsqu'on ouvre cet onglet (`lazy()` dans `BoardScreen`).
 *
 * Le composant ne fait que relier : il crée la scène, lui passe l'image
 * courante à chaque changement du magasin, et rend au magasin la sélection et
 * les déplacements faits à la souris ou au doigt dans le bassin.
 */
export default function Pool3D({
  camera,
  label,
  unavailable,
  formatDistance,
  eco = false,
}: Pool3DProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<PoolScene | null>(null);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  const tactic = useBoard(s => s.tactic);
  const playhead = useBoard(s => s.playhead);
  const playing = useBoard(s => s.playing);
  const step = useBoard(s => s.step);
  const selected = useBoard(s => s.selected);
  const select = useBoard(s => s.select);
  const move = useBoard(s => s.move);

  const frame = useMemo(() => frameAt(tactic, playhead), [tactic, playhead]);
  const shown = Math.min(Math.floor(playhead), tactic.steps.length - 1);
  const arrows = useMemo(
    () => tactic.steps[shown]?.arrows ?? [],
    [tactic, shown]
  );
  // Les chemins depuis l'étape précédente, comme les fantômes du tableau.
  const trails = useMemo(() => {
    if (!tactic.display.ghosts || playing || step === 0) return [];
    const before = frameAt(tactic, step - 1);
    return frame.players.flatMap(p => {
      const was = before.players.find(b => b.id === p.id);
      return was && distance(was, p) > 0.3 ? [{ from: was, to: p }] : [];
    });
  }, [tactic, playing, step, frame]);

  useEffect(() => {
    if (!canvas.current || !container.current) return;
    let instance: PoolScene;
    try {
      instance = new PoolScene(
        canvas.current,
        { onSelect: id => select(id), onMove: move },
        { reducedMotion, eco }
      );
    } catch {
      // Pas de WebGL (navigateur ancien, accélération coupée) : on le dit,
      // le tableau 2D reste là. Hors du corps de l'effet, pour ne pas
      // enchaîner un second rendu dans le même passage.
      queueMicrotask(() => setFailed(true));
      return;
    }
    scene.current = instance;
    registerCanvas(canvas.current);
    const el = container.current;
    const resize = () => instance.resize(el.clientWidth, el.clientHeight);
    resize();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      registerCanvas(null);
      instance.dispose();
      scene.current = null;
    };
  }, [select, move, reducedMotion, eco]);

  useEffect(() => {
    // L'arbitre de bord n'a pas de numéro à montrer : son nom, ou rien.
    const labelOf = (token: FramePlayer | FrameReferee) => {
      if ('deck' in token && token.deck) {
        return tactic.display.labels ? token.name : '';
      }
      return tactic.display.labels && token.name
        ? token.name
        : String(token.number);
    };
    scene.current?.update({
      pitch: tactic.pitch,
      frame,
      display: tactic.display,
      selected,
      labelOf,
      distanceLabel: formatDistance,
      arrows,
      trails,
    });
  }, [
    tactic,
    frame,
    selected,
    formatDistance,
    failed,
    reducedMotion,
    eco,
    arrows,
    trails,
  ]);

  useEffect(() => {
    scene.current?.setCamera(camera);
  }, [camera, reducedMotion, eco]);

  if (failed) {
    return (
      <p role="status" className="uwh-pool uwh-pool--failed">
        {unavailable}
      </p>
    );
  }

  return (
    <div ref={container} className="uwh-pool">
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="block h-full w-full touch-none"
      />
    </div>
  );
}
