import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Board2D, type Board2DLabels } from './Board2D.tsx';
import { boardStore } from './store.ts';
import { createTactic, playerId } from './model.ts';

const labels: Board2DLabels = {
  pitch: 'Terrain',
  help: 'Aide',
  puck: 'Palet',
  player: p => `${p.team} ${p.number}`,
  referee: r => `arbitre ${r.number}`,
  formatDistance: m => `${m.toFixed(1)} m`,
  curveHandle: 'Courber',
};

const W1 = playerId('blanc', 1);
const curveOf = () => boardStore.getState().tactic.steps[1]!.curves?.[W1];

/** Blanc 1 nage de (5, 7,5) à (15, 7,5), courbé vers (10, 11,5). */
beforeEach(() => {
  const t = createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' });
  t.steps[0]!.poses[W1] = { x: 5, y: 7.5, angle: 0, surface: false };
  const second = structuredClone(t.steps[0]!);
  second.poses[W1] = { x: 15, y: 7.5, angle: 0, surface: false };
  second.curves = { [W1]: { x: 10, y: 15.5 } };
  t.steps.push(second);
  boardStore.getState().load(t);
  boardStore.getState().goTo(1);
});

afterEach(cleanup);

const handle = (container: HTMLElement) =>
  container.querySelector(`[data-curve-handle="${W1}"]`);
const swimPath = (container: HTMLElement) =>
  container.querySelector(`[data-swim="${W1}"]`)?.getAttribute('d') ?? '';

describe('la poignée qui courbe une nage', () => {
  it('paraît au milieu de la nage du joueur sélectionné, et le chemin est courbe', () => {
    const { container } = render(<Board2D labels={labels} />);
    expect(handle(container)).toBeNull();
    expect(swimPath(container)).toContain(' Q 10 15.5 ');

    boardStore.getState().select(W1);
    const { container: selected } = render(<Board2D labels={labels} />);
    const dot = handle(selected)!.querySelector('path')!;
    expect(dot).toHaveAttribute('d', 'M 10 11.5 h 0.001');
  });

  it('deux touchers redressent la nage, et Annuler la rend', () => {
    boardStore.getState().select(W1);
    const { container } = render(<Board2D labels={labels} />);
    const target = handle(container)!;
    fireEvent.pointerDown(target);
    fireEvent.pointerUp(target);
    expect(curveOf()).toBeDefined();
    fireEvent.pointerDown(target);
    expect(curveOf()).toBeUndefined();
    expect(swimPath(container)).toContain(' L ');

    boardStore.getState().undo();
    expect(curveOf()).toEqual({ x: 10, y: 15.5 });
  });

  it('est là en mode simple aussi, pas pendant un tracé ni une image', () => {
    boardStore.getState().select(W1);
    const pawns = render(<Board2D labels={labels} variant="pawns" />);
    expect(handle(pawns.container)).not.toBeNull();
    cleanup();

    const drawing = render(<Board2D labels={labels} tool="pass" />);
    expect(handle(drawing.container)).toBeNull();
    cleanup();

    const printed = render(
      <Board2D labels={labels} playhead={1} interactive={false} />
    );
    expect(handle(printed.container)).toBeNull();
  });
});
