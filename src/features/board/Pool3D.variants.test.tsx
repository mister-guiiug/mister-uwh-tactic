import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { Frame } from './frame.ts';

/**
 * LA 3D SUIT LA LIGNE AFFICHÉE D'ELLE-MÊME (ADR 0027). La scène three.js est
 * remplacée par un relevé de ce que `Pool3D` lui passe : le WebGL de jsdom
 * n'existe pas, et ce qu'on vérifie ici, c'est le branchement, pas le dessin.
 */
const frames: Frame[] = [];
vi.mock('./scene3d.ts', () => ({
  PoolScene: class {
    update(input: { frame: Frame }) {
      frames.push(input.frame);
    }
    resize() {}
    setCamera() {}
    dispose() {}
  },
}));

const { default: Pool3D } = await import('./Pool3D.tsx');
const { boardStore } = await import('./store.ts');
const { createTactic, playerId } = await import('./model.ts');

const W2 = playerId('blanc', 2);

describe('la 3D et les variantes', () => {
  it('montre la ligne affichée, sans rien savoir des variantes', () => {
    const doc = createTactic({ id: 't', name: 'Sortie' });
    const own = structuredClone(doc.steps[0]!);
    own.poses[W2] = { ...own.poses[W2]!, x: 6, y: 3 };
    doc.variants = [{ id: 'v', name: 'Leur 2 monte', from: 0, steps: [own] }];
    act(() => {
      boardStore.getState().load(doc);
      boardStore.getState().setLine('v');
      boardStore.getState().goTo(1);
    });
    render(
      <Pool3D
        camera="tribune"
        label="Vue 3D du bassin"
        unavailable=""
        formatDistance={m => `${m} m`}
      />
    );
    const w2 = () => frames.at(-1)!.players.find(p => p.id === W2)!;
    expect(w2()).toMatchObject({ x: 6, y: 3 });

    // Sur la ligne principale, la même étape n'existe pas : la première, où
    // Blanc 2 est encore contre son mur.
    act(() => boardStore.getState().setLine(null));
    expect(w2().x).toBeLessThan(1);
  });
});
