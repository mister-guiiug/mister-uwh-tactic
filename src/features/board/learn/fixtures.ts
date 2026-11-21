import { stickTip } from '../carry.ts';
import { createTactic, playerId, type Tactic } from '../model.ts';

export const W1 = playerId('blanc', 1);
export const N1 = playerId('noir', 1);

/**
 * UNE PHASE DE TROIS ÉTAPES, pour les tests du jeu : Blanc 1 plonge au
 * centre, puis avance et reçoit le palet ; Noir 1 monte à sa rencontre.
 * Les flèches de l'entraîneur sont dessinées sur les étapes — celles de
 * Blanc 1 souffleraient la réponse.
 */
export function learnPhase(): Tactic {
  const tactic = createTactic({
    id: 'phase-a-apprendre',
    name: 'Montée au palet',
    now: '2026-11-21T00:00:00Z',
  });
  const first = tactic.steps[0]!;
  const w1 = first.poses[W1]!;
  const n1 = first.poses[N1]!;

  const second = structuredClone(first);
  second.poses[W1] = { ...w1, x: 8, y: 7, surface: false };
  second.poses[N1] = { ...n1, x: 20, y: 5, surface: false };
  second.arrows = [
    // Le déplacement de Blanc 1 : il dit où aller.
    { kind: 'move', from: { x: w1.x, y: w1.y }, to: { x: 8, y: 7 } },
    // Celui de Noir 1 : rien à voir avec lui.
    { kind: 'move', from: { x: n1.x, y: n1.y }, to: { x: 20, y: 5 } },
  ];
  second.note = 'Blanc 1 plonge vers le centre.';

  const third = structuredClone(second);
  third.poses[W1] = { ...third.poses[W1]!, x: 11, y: 7.5 };
  third.carrier = W1;
  third.puck = stickTip(third.poses[W1]!, false);
  third.arrows = [
    // La passe qu'il reçoit, au bout de sa crosse.
    { kind: 'pass', from: { x: 20, y: 5 }, to: third.puck },
    // Une flèche loin de lui.
    { kind: 'move', from: { x: 20, y: 5 }, to: { x: 18, y: 10 } },
  ];
  third.note = 'Il reçoit la passe.';

  tactic.steps.push(second, third);
  return tactic;
}

/** Gèle un objet en profondeur : toute écriture lève une erreur. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}
