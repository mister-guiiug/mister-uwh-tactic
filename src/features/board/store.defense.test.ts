import { describe, expect, it } from 'vitest';
import { createBoardStore } from './store.ts';
import { createTactic, MAX_PLAYERS, playerId, type Step } from './model.ts';
import { lineOf } from './variants.ts';

const NOIRS = Array.from({ length: MAX_PLAYERS }, (_, i) =>
  playerId('noir', i + 1)
);
const BLANCS = Array.from({ length: MAX_PLAYERS }, (_, i) =>
  playerId('blanc', i + 1)
);

const store = () =>
  createBoardStore(
    createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' })
  );

/** Les places d'une équipe à une étape, pour comparer avant et après. */
const placesOf = (step: Step, ids: string[]) =>
  ids.map(id => {
    const { x, y } = step.poses[id]!;
    return { x, y };
  });

describe('le magasin place une équipe en défense (ADR 0032)', () => {
  it('les Noirs se placent en un geste, qu’Annuler défait et que Rétablir refait', () => {
    const s = store();
    s.getState().applyFormation('blanc', '3-2-1');
    const before = s.getState().tactic.steps[0]!;
    const past = s.getState().past.length;

    s.getState().placeDefense('noir');
    const placed = s.getState().tactic.steps[0]!;
    expect(s.getState().past).toHaveLength(past + 1);
    expect(placesOf(placed, NOIRS)).not.toEqual(placesOf(before, NOIRS));
    // Les Blancs n'ont pas bougé.
    expect(placesOf(placed, BLANCS)).toEqual(placesOf(before, BLANCS));

    s.getState().undo();
    expect(s.getState().tactic.steps[0]).toEqual(before);
    s.getState().redo();
    expect(placesOf(s.getState().tactic.steps[0]!, NOIRS)).toEqual(
      placesOf(placed, NOIRS)
    );
  });

  it('une équipe sans personne dans l’eau : rien ne bouge, rien à défaire', () => {
    const s = store();
    s.getState().setCount('noir', 0);
    const { doc, past } = s.getState();
    s.getState().placeDefense('noir');
    expect(s.getState().doc).toBe(doc);
    expect(s.getState().past).toHaveLength(past.length);
  });

  it('sur une variante, le geste s’écrit à sa place : l’étape de la variante, ou la commune', () => {
    const s = store();
    s.getState().addStep();
    s.getState().goTo(0);
    // La variante part de l'étape 1 et s'affiche sur sa première étape à elle.
    s.getState().createVariant();
    const variantId = s.getState().line!;
    const main = s.getState().doc.steps.map(step => placesOf(step, NOIRS));
    expect(s.getState().step).toBe(1);

    s.getState().placeDefense('noir');
    let { doc } = s.getState();
    expect(doc.steps.map(step => placesOf(step, NOIRS))).toEqual(main);
    const own = doc.variants!.find(v => v.id === variantId)!.steps[0]!;
    expect(placesOf(own, NOIRS)).not.toEqual(main[1]);
    // Le nombre d'étapes ne change sur aucune ligne.
    expect(doc.steps).toHaveLength(2);
    expect(lineOf(doc, variantId).steps).toHaveLength(2);

    // Sur l'étape commune, la retouche va à la ligne principale : toutes
    // les lignes la voient.
    s.getState().goTo(0);
    s.getState().placeDefense('noir');
    doc = s.getState().doc;
    expect(placesOf(doc.steps[0]!, NOIRS)).not.toEqual(main[0]);
    expect(placesOf(lineOf(doc, variantId).steps[0]!, NOIRS)).toEqual(
      placesOf(doc.steps[0]!, NOIRS)
    );
    expect(s.getState().line).toBe(variantId);
  });
});
