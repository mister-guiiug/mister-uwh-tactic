import { useRef, useState } from 'react';

/**
 * LE FEUTRE DE LA PRÉSENTATION (ADR 0031) : au bord du bassin, l'entraîneur
 * montre la phase sur la tablette et entoure un joueur, trace « toi, tu
 * passes là ». Un calque au-dessus du tableau prend le doigt ; les traits
 * vivent en pixels d'écran, par-dessus la 2D comme la 3D — un feutre sur la
 * vitre, pas une donnée du schéma. Rien ne s'enregistre.
 *
 * `clearKey` change (étape suivante, « Effacer ») : les traits s'effacent.
 */
export function PresentMarker({ clearKey }: { clearKey: string }) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [key, setKey] = useState(clearKey);
  if (key !== clearKey) {
    setKey(clearKey);
    setStrokes([]);
  }
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef<{ pointer: number; d: string } | null>(null);

  const at = (event: React.PointerEvent) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    return `${(event.clientX - box.left).toFixed(1)} ${(event.clientY - box.top).toFixed(1)}`;
  };

  return (
    <svg
      ref={svg}
      className="uwh-marker"
      aria-hidden="true"
      onPointerDown={event => {
        // Le balayage de la présentation ne voit pas ce geste : on dessine.
        event.stopPropagation();
        const p = at(event);
        if (!p) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drawing.current = { pointer: event.pointerId, d: `M ${p} L ${p}` };
        setStrokes(list => [...list, drawing.current!.d]);
      }}
      onPointerMove={event => {
        const current = drawing.current;
        if (!current || current.pointer !== event.pointerId) return;
        const p = at(event);
        if (!p) return;
        current.d += ` L ${p}`;
        setStrokes(list => [...list.slice(0, -1), current.d]);
      }}
      onPointerUp={event => {
        event.stopPropagation();
        drawing.current = null;
      }}
      onPointerCancel={() => {
        drawing.current = null;
      }}
    >
      {strokes.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
