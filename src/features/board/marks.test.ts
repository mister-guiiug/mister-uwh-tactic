import { describe, expect, it } from 'vitest';
import { createBoardStore } from './store.ts';
import { guessTactic } from './learn/rounds.ts';
import { marksAt, zoneFromCorners } from './marks.ts';
import {
  createTactic,
  MARK_TEXT_MAX,
  MAX_WORDS,
  MAX_ZONES,
  playerId,
  POOL_MARGIN,
  stepSchema,
  tacticSchema,
  type Zone,
} from './model.ts';

/**
 * Ce que ces tests figent : LES ZONES ET LES MOTS APPARTIENNENT À L'ÉTAPE
 * (ADR 0026). Facultatifs — une étape sans eux reste celle d'avant, octet
 * pour octet ; une étape copiée les emporte, pas ses flèches ; le miroir et
 * le bassin les déplacent avec le terrain ; « Annuler » les défait.
 */

const W1 = playerId('blanc', 1);
const COULOIR: Zone = { shape: 'rect', x: 2, y: 1, w: 8, h: 3 };

function store() {
  return createBoardStore(
    createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' })
  );
}
const step = (s: ReturnType<typeof store>, index = s.getState().step) =>
  s.getState().tactic.steps[index]!;

describe('le modèle', () => {
  it('une étape sans zone ni mot se relit telle quelle, et une étape annotée aussi', () => {
    const t = createTactic({ id: 't', name: '' });
    expect(stepSchema.parse(t.steps[0])).not.toHaveProperty('zones');
    t.steps[0]!.zones = [{ ...COULOIR, label: 'Couloir' }];
    t.steps[0]!.words = [{ x: 12, y: 7, text: 'Pressing' }];
    const back = tacticSchema.parse(JSON.parse(JSON.stringify(t)));
    expect(back.steps[0]!.zones).toEqual([{ ...COULOIR, label: 'Couloir' }]);
    expect(back.steps[0]!.words).toEqual([{ x: 12, y: 7, text: 'Pressing' }]);
  });

  it('refuse un mot vide ou trop long, une étiquette trop longue', () => {
    const t = createTactic({ id: 't', name: '' });
    t.steps[0]!.words = [{ x: 1, y: 1, text: '' }];
    expect(() => tacticSchema.parse(t)).toThrow();
    t.steps[0]!.words = [{ x: 1, y: 1, text: 'x'.repeat(MARK_TEXT_MAX + 1) }];
    expect(() => tacticSchema.parse(t)).toThrow();
    delete t.steps[0]!.words;
    t.steps[0]!.zones = [{ ...COULOIR, label: 'x'.repeat(MARK_TEXT_MAX + 1) }];
    expect(() => tacticSchema.parse(t)).toThrow();
  });

  it('une zone tracée d’un coin à l’autre, dans n’importe quel sens, reste dans le bassin', () => {
    const pitch = createTactic({ id: 't', name: '' }).pitch;
    expect(
      zoneFromCorners('ellipse', { x: 10, y: 8 }, { x: 4, y: 2 }, pitch)
    ).toEqual({ shape: 'ellipse', x: 4, y: 2, w: 6, h: 6 });
    expect(
      zoneFromCorners('rect', { x: -5, y: 3 }, { x: 2, y: 40 }, pitch)
    ).toEqual({
      shape: 'rect',
      x: -POOL_MARGIN,
      y: 3,
      w: 2 + POOL_MARGIN,
      h: pitch.width + POOL_MARGIN - 3,
    });
  });

  it('les deux vues lisent les annotations de l’étape commencée, comme les flèches', () => {
    const t = createTactic({ id: 't', name: '' });
    const second = structuredClone(t.steps[0]!);
    second.words = [{ x: 5, y: 5, text: 'Ici' }];
    t.steps.push(second);
    expect(marksAt(t, 0)).toEqual({ zones: [], words: [] });
    expect(marksAt(t, 0.9).words).toEqual([]);
    expect(marksAt(t, 1).words).toEqual([{ x: 5, y: 5, text: 'Ici' }]);
    expect(marksAt(t, 7).words).toHaveLength(1);
  });
});

describe('le magasin', () => {
  it('ajoute une zone, refuse un trait ou un clic, et s’arrête à dix', () => {
    const s = store();
    s.getState().addZone({ shape: 'rect', x: 3, y: 3, w: 0.2, h: 4 });
    expect(step(s).zones).toBeUndefined();
    s.getState().addZone(COULOIR);
    expect(step(s).zones).toEqual([COULOIR]);
    for (let i = 0; i < MAX_ZONES + 3; i++) s.getState().addZone(COULOIR);
    expect(step(s).zones).toHaveLength(MAX_ZONES);
  });

  it('garde une zone dans le bassin', () => {
    const s = store();
    s.getState().addZone({ shape: 'ellipse', x: 20, y: 10, w: 20, h: 20 });
    const [zone] = step(s).zones!;
    expect(zone!.x + zone!.w).toBe(25 + POOL_MARGIN);
    expect(zone!.y + zone!.h).toBe(15 + POOL_MARGIN);
  });

  it('change la forme et l’étiquette d’une zone ; une étiquette vide la retire', () => {
    const s = store();
    s.getState().addZone(COULOIR);
    s.getState().setZone(0, { shape: 'ellipse' });
    s.getState().setZone(0, { label: 'Couloir gauche' });
    expect(step(s).zones![0]).toEqual({
      ...COULOIR,
      shape: 'ellipse',
      label: 'Couloir gauche',
    });
    s.getState().setZone(0, { label: '' });
    expect(step(s).zones![0]).not.toHaveProperty('label');
    s.getState().setZone(0, { label: 'x'.repeat(50) });
    expect(step(s).zones![0]!.label).toHaveLength(MARK_TEXT_MAX);
  });

  it('pose un mot, jamais vide, et le réécrit', () => {
    const s = store();
    s.getState().addWord({ x: 12, y: 7, text: '   ' });
    expect(step(s).words).toBeUndefined();
    s.getState().addWord({ x: 12, y: 7, text: '  Ici on ferme ' });
    expect(step(s).words).toEqual([{ x: 12, y: 7, text: 'Ici on ferme' }]);
    s.getState().setWordText(0, '');
    expect(step(s).words![0]!.text).toBe('Ici on ferme');
    s.getState().setWordText(0, 'On ferme');
    expect(step(s).words![0]!.text).toBe('On ferme');
    for (let i = 0; i < MAX_WORDS + 2; i++) {
      s.getState().addWord({ x: 1, y: 1, text: 'Mot' });
    }
    expect(step(s).words).toHaveLength(MAX_WORDS);
  });

  it('supprimer la dernière annotation rend l’étape d’avant, octet pour octet', () => {
    const s = store();
    const before = JSON.stringify(step(s));
    s.getState().addZone(COULOIR);
    s.getState().addWord({ x: 12, y: 7, text: 'Ici' });
    s.getState().removeZone(0);
    s.getState().removeWord(0);
    expect(JSON.stringify(step(s))).toBe(before);
  });

  it('« Annuler » défait la zone, puis le mot', () => {
    const s = store();
    s.getState().addZone(COULOIR);
    s.getState().addWord({ x: 12, y: 7, text: 'Ici' });
    s.getState().undo();
    expect(step(s).words).toBeUndefined();
    expect(step(s).zones).toHaveLength(1);
    s.getState().undo();
    expect(step(s).zones).toBeUndefined();
  });

  it('une étape copiée emporte zones et mots, pas les flèches', () => {
    const s = store();
    s.getState().addZone(COULOIR);
    s.getState().addWord({ x: 12, y: 7, text: 'Ici' });
    s.getState().addArrow({
      kind: 'move',
      from: { x: 1, y: 1 },
      to: { x: 5, y: 5 },
    });
    s.getState().addStep();
    expect(step(s, 1).zones).toEqual([COULOIR]);
    expect(step(s, 1).words).toEqual([{ x: 12, y: 7, text: 'Ici' }]);
    expect(step(s, 1).arrows).toEqual([]);
    // Ce sont des copies : retoucher la nouvelle ne touche pas l'ancienne.
    s.getState().setZone(0, { label: 'Couloir' });
    expect(step(s, 0).zones![0]).not.toHaveProperty('label');
  });

  it('le miroir passe zones et mots sur l’autre aile', () => {
    const s = store();
    s.getState().addZone(COULOIR);
    s.getState().addWord({ x: 12, y: 2, text: 'Ici' });
    s.getState().mirror();
    expect(step(s).zones).toEqual([{ ...COULOIR, y: 15 - 4 }]);
    expect(step(s).words).toEqual([{ x: 12, y: 13, text: 'Ici' }]);
  });

  it('un bassin plus court les rapproche, sans les sortir du bassin', () => {
    const s = store();
    s.getState().addZone({ shape: 'rect', x: 20, y: 5, w: 6, h: 2 });
    s.getState().addWord({ x: 25.5, y: 7.5, text: 'Mur' });
    s.getState().setPitch({ length: 21 });
    const [zone] = step(s).zones!;
    expect(zone!.x).toBeCloseTo((20 * 21) / 25);
    expect(zone!.x + zone!.w).toBeCloseTo(21 + POOL_MARGIN);
    expect(step(s).words![0]).toMatchObject({ x: 21.5, y: 7.5 });
  });

  it('replacer à l’engagement, ou selon le règlement, les garde', () => {
    const s = store();
    s.getState().addZone(COULOIR);
    s.getState().addWord({ x: 12, y: 7, text: 'Ici' });
    s.getState().resetToKickoff();
    expect(step(s).zones).toEqual([COULOIR]);
    s.getState().applySituation('equal');
    expect(step(s).words).toEqual([{ x: 12, y: 7, text: 'Ici' }]);
  });
});

describe('« À toi de jouer » ne souffle pas la réponse', () => {
  it('retire un mot posé là où il doit aller ; garde les zones et les autres mots', () => {
    const t = createTactic({ id: 't', name: '' });
    t.steps[0]!.poses[W1] = { x: 5, y: 7.5, angle: 0, surface: false };
    const second = structuredClone(t.steps[0]!);
    second.poses[W1] = { x: 15, y: 7.5, angle: 0, surface: false };
    second.zones = [COULOIR];
    second.words = [
      { x: 15.2, y: 7.4, text: 'Ici' },
      { x: 22, y: 2, text: 'Pressing' },
    ];
    t.steps.push(second);
    const guess = guessTactic(t, 1, W1, { x: 8, y: 8 }).steps[0]!;
    expect(guess.zones).toEqual([COULOIR]);
    expect(guess.words).toEqual([{ x: 22, y: 2, text: 'Pressing' }]);
  });
});
