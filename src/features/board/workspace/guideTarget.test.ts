import { describe, expect, it } from 'vitest';
import { createTactic, playerId } from '../model.ts';
import { guideTarget } from './guide.ts';

const tactic = createTactic({ id: 't', name: '' });
const step = tactic.steps[0]!;
const W1 = playerId('blanc', 1);
const W3 = playerId('blanc', 3);

describe('le doigt du guide', () => {
  it('descendre : un joueur blanc à toucher, puis le bouton', () => {
    expect(guideTarget(0, null, step)).toEqual({ token: W1 });
    expect(guideTarget(0, W3, step)).toEqual({ control: 'dive' });
  });

  it('un arbitre ou le palet sélectionné ne compte pas : on montre un joueur', () => {
    expect(guideTarget(0, 'palet', step)).toEqual({ token: W1 });
  });

  it('le palet : le joueur au fond, puis « Donner le palet »', () => {
    const fond = structuredClone(step);
    fond.poses[W3] = { ...fond.poses[W3]!, surface: false };
    expect(guideTarget(1, null, fond)).toEqual({ token: W3 });
    expect(guideTarget(1, W3, fond)).toEqual({ control: 'puck' });
  });

  it('une étape, puis lire : les boutons de la frise', () => {
    expect(guideTarget(2, W1, step)).toEqual({ control: 'step' });
    expect(guideTarget(3, null, step)).toEqual({ control: 'play' });
  });

  it('fini : rien à montrer', () => {
    expect(guideTarget(-1, null, step)).toBeNull();
  });
});
