import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
};

const W2 = playerId('blanc', 2);
const pose = (id: string) => boardStore.getState().tactic.steps[0]!.poses[id]!;

beforeEach(() => {
  boardStore
    .getState()
    .load(createTactic({ id: 't', name: '', now: '2026-11-17T00:00:00Z' }));
});

afterEach(cleanup);

describe('le tableau 2D', () => {
  it('rend les deux équipes, remplaçants compris, les quatre arbitres et le palet, chacun nommé', () => {
    render(<Board2D labels={labels} onEdit={() => {}} />);
    expect(screen.getByRole('group', { name: 'Terrain' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /^(blanc|noir) \d+$/ })
    ).toHaveLength(20);
    expect(screen.getAllByRole('button', { name: /^arbitre/ })).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Palet' })).toBeInTheDocument();
    // Arbitres 1 et 2 à l'engagement (règle 15.1.4) : 7,5 m en long, 12,2 en
    // travers.
    expect(screen.getByText('14.3 m')).toBeInTheDocument();
  });

  it('se pilote au clavier : sélection au focus, flèches, rotation, profondeur', () => {
    render(<Board2D labels={labels} onEdit={() => {}} />);
    const token = screen.getByRole('button', { name: 'blanc 2' });
    const before = pose(W2);

    fireEvent.focus(token);
    expect(boardStore.getState().selected).toBe(W2);
    expect(token).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(token, { key: 'ArrowRight' });
    expect(pose(W2).x).toBeCloseTo(before.x + 0.5);
    fireEvent.keyDown(token, { key: 'ArrowDown', shiftKey: true });
    expect(pose(W2).y).toBeCloseTo(before.y + 0.1);

    fireEvent.keyDown(token, { key: 'e' });
    expect(pose(W2).angle).toBe(15);
    fireEvent.keyDown(token, { key: 's' });
    expect(pose(W2).surface).toBe(false);
  });

  it('Entrée ouvre la fiche du jeton', () => {
    const onEdit = vi.fn();
    render(<Board2D labels={labels} onEdit={onEdit} />);
    const token = screen.getByRole('button', { name: 'noir 4' });
    fireEvent.keyDown(token, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith(playerId('noir', 4));
  });

  it('masque les joueurs retirés de l’effectif', () => {
    boardStore.getState().setCount('noir', 3);
    boardStore.getState().setSubstitutes('noir', 1);
    boardStore.getState().setDeckReferee(false);
    render(<Board2D labels={labels} onEdit={() => {}} />);
    expect(screen.getAllByRole('button', { name: /^noir/ })).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: /^arbitre/ })).toHaveLength(3);
  });

  it('Maj + clic compose une sélection, et le groupe se déplace ensemble', () => {
    render(<Board2D labels={labels} onEdit={() => {}} />);
    const w1 = screen.getByRole('button', { name: 'blanc 1' });
    const w2 = screen.getByRole('button', { name: 'blanc 2' });
    fireEvent.pointerDown(w1);
    fireEvent.pointerDown(w2, { shiftKey: true });
    expect(w1).toHaveAttribute('aria-pressed', 'true');
    expect(w2).toHaveAttribute('aria-pressed', 'true');
    const before = [pose(playerId('blanc', 1)), pose(W2)];
    fireEvent.keyDown(w2, { key: 'ArrowRight' });
    expect(pose(playerId('blanc', 1)).x).toBeCloseTo(before[0]!.x + 0.5);
    expect(pose(W2).x).toBeCloseTo(before[1]!.x + 0.5);
  });

  it('dessine les flèches de l’étape et les signalements d’apnée', () => {
    boardStore.getState().addArrow({
      kind: 'pass',
      from: { x: 10, y: 5 },
      to: { x: 14, y: 6 },
    });
    const { container } = render(
      <Board2D labels={labels} onEdit={() => {}} warnings={new Set([W2])} />
    );
    expect(container.querySelectorAll('path[marker-end]')).toHaveLength(1);
    expect(container.querySelectorAll('circle[stroke="#dc2626"]')).toHaveLength(
      1
    );
  });

  it('en lecture seule, une image sans bouton', () => {
    render(
      <Board2D
        labels={labels}
        onEdit={() => {}}
        interactive={false}
        playhead={0}
      />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'Terrain' })).toBeInTheDocument();
  });
});
