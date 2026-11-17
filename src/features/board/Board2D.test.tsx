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
    // Arbitres 1 et 2 à l'engagement : 3 m en long, 13,4 m en travers.
    expect(screen.getByText('13.7 m')).toBeInTheDocument();
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
});
