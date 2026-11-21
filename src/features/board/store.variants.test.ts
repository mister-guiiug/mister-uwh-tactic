import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBoardStore, RECORD_PAUSE_MS } from './store.ts';
import { createTactic, playerId } from './model.ts';
import { lineOf } from './variants.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);

/**
 * Une phase de deux étapes (« A », « B »), puis une variante qui part de la
 * première : le magasin l'affiche aussitôt, sur sa première étape à elle.
 */
function store() {
  const s = createBoardStore(
    createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' })
  );
  s.getState().setNote('A');
  s.getState().addStep();
  s.getState().setNote('B');
  s.getState().goTo(0);
  return s;
}

const notes = (s: ReturnType<typeof store>) =>
  s.getState().tactic.steps.map(step => step.note);

afterEach(() => {
  vi.useRealTimers();
});

describe('le magasin et les variantes', () => {
  it('une variante naît de l’étape courante, et devient la ligne affichée', () => {
    const s = store();
    s.getState().createVariant();
    const state = s.getState();
    expect(state.line).toBe(state.doc.variants![0]!.id);
    expect(state.step).toBe(1);
    expect(notes(s)).toEqual(['A', '']);
    // Le document garde sa ligne principale entière.
    expect(state.doc.steps.map(step => step.note)).toEqual(['A', 'B']);
    // `tactic` est la ligne aplatie, sans les champs des variantes.
    expect(state.tactic).not.toHaveProperty('variants');
  });

  it('une retouche sur la variante ne touche pas la principale', () => {
    const s = store();
    s.getState().createVariant();
    s.getState().move(W1, { x: 9, y: 4 });
    s.getState().setNote('X');
    const { doc } = s.getState();
    expect(doc.variants![0]!.steps[0]!.poses[W1]).toMatchObject({
      x: 9,
      y: 4,
    });
    expect(doc.steps[1]!.poses[W1]!.x).toBeLessThan(1);
    expect(doc.steps.map(step => step.note)).toEqual(['A', 'B']);
  });

  it('une retouche sur une étape commune va à toutes les lignes', () => {
    const s = store();
    s.getState().createVariant();
    s.getState().goTo(0);
    s.getState().setNote('A partagée');
    s.getState().setLine(null);
    expect(notes(s)).toEqual(['A partagée', 'B']);
  });

  it('passer d’une ligne à l’autre n’est pas un geste à défaire', () => {
    const s = store();
    s.getState().createVariant();
    const id = s.getState().line;
    const past = s.getState().past.length;
    s.getState().setLine(null);
    expect(s.getState().line).toBeNull();
    // Sur la principale, on arrive là où elle diffère de la variante.
    expect(s.getState().step).toBe(1);
    expect(notes(s)).toEqual(['A', 'B']);
    s.getState().setLine(id);
    expect(s.getState().past).toHaveLength(past);
  });

  it('annuler et rétablir couvrent la naissance, le nom et le départ', () => {
    const s = store();
    s.getState().createVariant();
    const id = s.getState().line;
    // Une frappe par lettre : un seul geste.
    s.getState().renameLine('L');
    s.getState().renameLine('Le');
    s.getState().renameLine('Leur 2 monte');
    s.getState().removeVariant();
    expect(s.getState().line).toBeNull();
    expect(s.getState().doc).not.toHaveProperty('variants');

    s.getState().undo();
    expect(s.getState().line).toBe(id);
    expect(s.getState().doc.variants![0]!.name).toBe('Leur 2 monte');
    s.getState().undo();
    expect(s.getState().doc.variants![0]!.name).toBe('');
    s.getState().undo();
    expect(s.getState().doc).not.toHaveProperty('variants');
    expect(s.getState().line).toBeNull();

    s.getState().redo();
    expect(s.getState().line).toBe(id);
    expect(notes(s)).toEqual(['A', '']);
  });

  it('annuler une retouche faite sur une variante y ramène', () => {
    const s = store();
    s.getState().createVariant();
    const id = s.getState().line;
    s.getState().setNote('X');
    s.getState().setLine(null);
    s.getState().undo();
    expect(s.getState().line).toBe(id);
    expect(notes(s)).toEqual(['A', '']);
  });

  it('une étape ajoutée sur la variante est à elle ; retirée la dernière, elle part', () => {
    const s = store();
    s.getState().createVariant();
    s.getState().addStep();
    expect(notes(s)).toEqual(['A', '', '']);
    expect(s.getState().doc.steps).toHaveLength(2);
    s.getState().removeStep();
    s.getState().removeStep();
    expect(s.getState().line).toBeNull();
    expect(s.getState().step).toBe(0);
    expect(s.getState().doc).not.toHaveProperty('variants');
  });

  it('l’enregistrement en direct ouvre ses étapes sur la ligne courante', () => {
    vi.useFakeTimers();
    const s = store();
    s.getState().createVariant();
    s.getState().setRecording(true);
    s.getState().recordGestureStart();
    s.getState().move(W2, { x: 8, y: 8 });
    s.getState().recordGestureEnd();
    vi.advanceTimersByTime(RECORD_PAUSE_MS + 100);
    s.getState().recordGestureStart();
    s.getState().recordGestureEnd();
    const { doc } = s.getState();
    expect(doc.steps).toHaveLength(2);
    expect(doc.variants![0]!.steps).toHaveLength(3);
    expect(s.getState().step).toBe(3);
  });

  it('le bassin et le miroir changent toutes les lignes', () => {
    const s = store();
    s.getState().createVariant();
    s.getState().move(W1, { x: 20, y: 3 });
    s.getState().setLine(null);
    s.getState().mirror();
    const own = () => s.getState().doc.variants![0]!.steps[0]!;
    expect(own().poses[W1]!.y).toBeCloseTo(15 - 3);
    s.getState().setPitch({ length: 21 });
    expect(own().poses[W1]!.x).toBeCloseTo((20 * 21) / 25);
  });

  it('en présentation, « suivant » au bout d’une ligne prend la suivante', () => {
    const s = store();
    s.getState().createVariant();
    const id = s.getState().line;
    s.getState().setLine(null);
    s.getState().goTo(1);
    s.getState().advance();
    expect(s.getState()).toMatchObject({ line: null, step: 1 });
    s.getState().advance(true);
    expect(s.getState()).toMatchObject({ line: id, step: 0 });
    s.getState().advance(true);
    expect(s.getState().step).toBe(1);
    s.getState().advance(true);
    expect(s.getState()).toMatchObject({ line: id, step: 1 });
  });

  it('un schéma ouvert s’affiche sur sa ligne principale', () => {
    const s = store();
    s.getState().createVariant();
    const doc = s.getState().doc;
    const other = createBoardStore(createTactic({ id: 'x', name: '' }));
    other.getState().load(doc);
    expect(other.getState().line).toBeNull();
    expect(other.getState().doc.variants).toHaveLength(1);
    expect(other.getState().tactic).toEqual(lineOf(doc, null));
  });

  it('un brouillon dont la variante ne tient plus est remis en règle', () => {
    const t = createTactic({ id: 't', name: '' });
    t.variants = [{ id: 'v', name: '', from: 7, steps: [t.steps[0]!] }];
    const s = createBoardStore(t);
    expect(s.getState().doc.variants![0]!.from).toBe(0);
  });
});
