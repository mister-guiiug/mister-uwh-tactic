import { useEffect, useRef, useState, type PointerEvent } from 'react';

/**
 * LE ZOOM DU TABLEAU : pincer pour grossir, glisser pour se déplacer.
 *
 * Sur un téléphone, 25 m de bassin dans 340 px, ce sont des joueurs de vingt
 * pixels : on vise mal, on lit mal les noms. Le tableau garde son dessin en
 * mètres ; seul le `viewBox` change — la portion du bassin qu'on regarde. Les
 * gestes des jetons n'en savent rien : ils convertissent déjà l'écran en
 * mètres par la matrice du SVG, qui suit le `viewBox`.
 *
 * Une vue est `k` (le grossissement, 1 à `MAX_ZOOM`) et le coin haut-gauche
 * de la portion visible, en unités du `viewBox` de base.
 */
export interface BoardView {
  k: number;
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_ZOOM = 4;

/** La vue ramenée dans le bassin : on ne zoome pas au-delà, ni hors champ. */
export function clampView(view: BoardView, base: Box): BoardView {
  const k = Math.min(MAX_ZOOM, Math.max(1, view.k));
  const w = base.w / k;
  const h = base.h / k;
  return {
    k,
    x: Math.min(base.x + (base.w - w), Math.max(base.x, view.x)),
    y: Math.min(base.y + (base.h - h), Math.max(base.y, view.y)),
  };
}

/**
 * Grossit à `k` en gardant le point `anchor` (unités du `viewBox`) sous le
 * même pixel : `offset` est sa distance au coin de la portion visible, en
 * pixels, et `pxPerUnit` l'échelle à `k = 1`.
 */
export function zoomAround(
  base: Box,
  k: number,
  anchor: { x: number; y: number },
  offset: { x: number; y: number },
  pxPerUnit: number
): BoardView {
  const scale = pxPerUnit * Math.min(MAX_ZOOM, Math.max(1, k));
  return clampView(
    { k, x: anchor.x - offset.x / scale, y: anchor.y - offset.y / scale },
    base
  );
}

/** Grossit ou réduit autour du centre de la portion visible (clavier). */
export function zoomCentered(
  view: BoardView,
  base: Box,
  factor: number
): BoardView {
  const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
  const cx = view.x + base.w / view.k / 2;
  const cy = view.y + base.h / view.k / 2;
  return clampView({ k, x: cx - base.w / k / 2, y: cy - base.h / k / 2 }, base);
}

export const viewBoxOf = (view: BoardView, base: Box) =>
  `${view.x} ${view.y} ${base.w / view.k} ${base.h / view.k}`;

interface Gesture {
  kind: 'pinch' | 'pan';
  view: BoardView;
  /** Pixels par unité à `k = 1`. */
  pxPerUnit: number;
  /** Le coin de la portion visible, en pixels écran (constant au zoom). */
  corner: { x: number; y: number };
  /** Le point du bassin sous le milieu des doigts, au départ. */
  anchor: { x: number; y: number };
  /** Écart des doigts au départ (pincement), ou point de départ (glisser). */
  start: { x: number; y: number; d: number };
  moved: boolean;
}

/** La vue, les gestes qui la changent, et de quoi la remettre à plat. */
export function useBoardZoom(
  svg: React.RefObject<SVGSVGElement | null>,
  base: Box,
  enabled: boolean,
  /** Change quand le dessin change de cadre (bassin redimensionné, dressé). */
  resetKey: string
) {
  const initial = { k: 1, x: base.x, y: base.y };
  const [view, setView] = useState<BoardView>(initial);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setView(initial);
  }
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  /** Le repère écran du SVG pour la vue courante. */
  const frame = (current: BoardView) => {
    const ctm = svg.current?.getScreenCTM?.();
    if (!ctm || !ctm.a) return null;
    return {
      pxPerUnit: ctm.a / current.k,
      corner: { x: current.x * ctm.a + ctm.e, y: current.y * ctm.d + ctm.f },
      toUnits: (cx: number, cy: number) => ({
        x: (cx - ctm.e) / ctm.a,
        y: (cy - ctm.f) / ctm.d,
      }),
    };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const f = frame(view);
    if (!a || !b || !f) return;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    gesture.current = {
      kind: 'pinch',
      view,
      pxPerUnit: f.pxPerUnit,
      corner: f.corner,
      anchor: f.toUnits(mid.x, mid.y),
      start: { ...mid, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 },
      moved: true,
    };
  };

  /** Le glisser d'une vue grossie, lancé depuis le fond du bassin. */
  const startPan = (event: PointerEvent) => {
    const f = frame(view);
    if (!f) return false;
    gesture.current = {
      kind: 'pan',
      view,
      pxPerUnit: f.pxPerUnit,
      corner: f.corner,
      anchor: { x: 0, y: 0 },
      start: { x: event.clientX, y: event.clientY, d: 0 },
      moved: false,
    };
    return true;
  };

  /** `true` quand le mouvement appartient au zoom. */
  const move = (event: PointerEvent) => {
    const g = gesture.current;
    if (!g) return false;
    if (g.kind === 'pan') {
      const dx = event.clientX - g.start.x;
      const dy = event.clientY - g.start.y;
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      const scale = g.pxPerUnit * g.view.k;
      setView(
        clampView(
          { k: g.view.k, x: g.view.x - dx / scale, y: g.view.y - dy / scale },
          base
        )
      );
      return true;
    }
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return true;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    setView(
      zoomAround(
        base,
        (g.view.k * d) / g.start.d,
        g.anchor,
        { x: mid.x - g.corner.x, y: mid.y - g.corner.y },
        g.pxPerUnit
      )
    );
    return true;
  };

  /** Fin d'un glisser : `tap` quand il n'a pas bougé (un toucher simple). */
  const end = () => {
    const g = gesture.current;
    if (!g || g.kind !== 'pan') return null;
    gesture.current = null;
    return { tap: !g.moved };
  };

  // Les deux doigts, comptés AVANT les jetons (phase de capture) : le second
  // doigt transforme le geste en pincement, quoi qu'il touche.
  const capture = {
    onPointerDownCapture: (event: PointerEvent) => {
      if (!enabled || event.pointerType !== 'touch') return false;
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pointers.current.size === 2) {
        event.stopPropagation();
        startPinch();
        return true;
      }
      return false;
    },
    onPointerMoveCapture: (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return false;
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (gesture.current?.kind === 'pinch') {
        event.stopPropagation();
        move(event);
        return true;
      }
      return false;
    },
    onPointerUpCapture: (event: PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (gesture.current?.kind === 'pinch' && pointers.current.size < 2) {
        gesture.current = null;
        event.stopPropagation();
      }
    },
  };

  // La molette AVEC Ctrl (c'est aussi le pincement d'un pavé tactile) :
  // sans Ctrl, la molette fait défiler la page, comme partout ailleurs.
  // Écouteur non passif, ajouté à la main : React les rend passifs.
  useEffect(() => {
    const el = svg.current;
    if (!el || !enabled) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setView(current => {
        const f = frame(current);
        if (!f) return current;
        const anchor = f.toUnits(event.clientX, event.clientY);
        return zoomAround(
          base,
          current.k * Math.exp(-event.deltaY * 0.01),
          anchor,
          { x: event.clientX - f.corner.x, y: event.clientY - f.corner.y },
          f.pxPerUnit
        );
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  return {
    viewBox: viewBoxOf(view, base),
    zoomed: view.k > 1.01,
    reset: () => setView(initial),
    zoomBy: (factor: number) =>
      setView(current => zoomCentered(current, base, factor)),
    capture,
    startPan,
    move,
    end,
    panning: () => gesture.current?.kind === 'pan',
  };
}
