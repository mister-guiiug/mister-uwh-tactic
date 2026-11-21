import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apneaTable } from './apnea.ts';
import { settleTactic, stickTip } from './carry.ts';
import { stepAlerts } from './checks.ts';
import {
  bezierAt,
  controlThrough,
  pathLength,
  pathMiddle,
  settleCurves,
} from './curve.ts';
import { frameAt, swimsInto } from './frame.ts';
import {
  createTactic,
  playerId,
  POOL_MARGIN,
  stepSchema,
  tacticSchema,
  type Tactic,
} from './model.ts';
import {
  decodeTactic,
  encodeCompact,
  encodeTactic,
  toCompact,
} from './share.ts';
import { createBoardStore } from './store.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);
const meta = { id: 'lu', now: '2026-11-21T00:00:00Z' };
const FROM = { x: 5, y: 7.5 };
const TO = { x: 15, y: 7.5 };
/** Le milieu de la nage courbe : 4 m à côté de la corde. */
const MIDDLE = { x: 10, y: 11.5 };

/** Deux étapes : Blanc 1 nage au fond, en ligne droite, de FROM à TO. */
function straight(): Tactic {
  const t = createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' });
  t.steps[0]!.poses[W1] = { ...FROM, angle: 0, surface: false };
  const second = structuredClone(t.steps[0]!);
  second.poses[W1] = { ...TO, angle: 0, surface: false };
  t.steps.push(second);
  return t;
}

/** La même nage, courbée : à mi-chemin, Blanc 1 passe par MIDDLE. */
function curved(): Tactic {
  const t = straight();
  t.steps[1]!.curves = { [W1]: controlThrough(FROM, TO, MIDDLE) };
  return t;
}

const playerAt = (t: Tactic, playhead: number, id = W1) =>
  frameAt(t, playhead).players.find(p => p.id === id)!;

/**
 * Ce que ces tests figent : UNE NAGE COURBE EST LA MÊME PARTOUT. Le temps la
 * suit, la vitesse la mesure, le palet porté reste au bout de la crosse, le
 * lien l'emporte — et un lecteur plus ancien la lit en ligne droite.
 */
describe('la courbe', () => {
  it('part du départ, arrive à l’arrivée, passe par son milieu', () => {
    const c = { x: 10, y: 15.5 };
    expect(bezierAt(FROM, c, TO, 0)).toEqual(FROM);
    expect(bezierAt(FROM, c, TO, 1)).toEqual(TO);
    expect(bezierAt(FROM, c, TO, 0.5)).toEqual(MIDDLE);
    expect(pathMiddle(FROM, TO)).toEqual({ x: 10, y: 7.5 });
  });

  it('la poignée est le milieu : glisser le milieu donne le point de contrôle', () => {
    const middle = { x: 8.3, y: 2.1 };
    const control = controlThrough(FROM, TO, middle);
    const back = pathMiddle(FROM, TO, control);
    expect(back.x).toBeCloseTo(middle.x);
    expect(back.y).toBeCloseTo(middle.y);
  });

  it('mesure la longueur nagée, pas la corde', () => {
    expect(pathLength(FROM, TO)).toBe(10);
    // Un point de contrôle sur la corde : la courbe EST la corde.
    expect(pathLength(FROM, TO, { x: 10, y: 7.5 })).toBeCloseTo(10, 6);
    // Une parabole de 2 m de corde et 0,5 m de flèche : ½∫₀²√(4+u²)du.
    const arc = pathLength({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 });
    expect(arc).toBeCloseTo(2.2956, 3);
  });
});

describe('les courbes remises en règle', () => {
  it('garde une vraie courbe, rend le même schéma', () => {
    const t = curved();
    expect(settleCurves(t)).toBe(t);
  });

  it('retire la courbe d’un joueur immobile, presque droite, ou de la première étape', () => {
    const still = curved();
    still.steps[1]!.poses[W1] = { ...FROM, angle: 0, surface: false };
    expect(settleCurves(still).steps[1]!.curves).toBeUndefined();

    const flat = straight();
    flat.steps[1]!.curves = { [W1]: { x: 10, y: 7.7 } };
    expect(settleCurves(flat).steps[1]!.curves).toBeUndefined();

    const first = curved();
    first.steps[0]!.curves = { [W1]: { x: 1, y: 1 } };
    first.steps[1]!.curves = { ...first.steps[1]!.curves, intrus: TO };
    const settled = settleCurves(first);
    expect(settled.steps[0]!.curves).toBeUndefined();
    expect(Object.keys(settled.steps[1]!.curves!)).toEqual([W1]);
  });
});

describe('le temps suit la courbe', () => {
  it('à mi-lecture, le joueur n’est plus sur la droite', () => {
    expect(playerAt(straight(), 0.5)).toMatchObject({ x: 10, y: 7.5 });
    const p = playerAt(curved(), 0.5);
    expect(p.x).toBeCloseTo(MIDDLE.x);
    expect(p.y).toBeCloseTo(MIDDLE.y);
  });

  it('aux étapes elles-mêmes, rien ne change', () => {
    expect(playerAt(curved(), 0)).toMatchObject(FROM);
    expect(playerAt(curved(), 1)).toMatchObject(TO);
  });

  it('une courbe tirée contre le mur ne le traverse pas', () => {
    const t = straight();
    t.steps[1]!.curves = { [W1]: { x: 10, y: 60 } };
    expect(playerAt(t, 0.5).y).toBe(t.pitch.width + POOL_MARGIN);
  });

  it('les chemins de l’étape portent la courbe, pour le tableau et la 3D', () => {
    const swims = swimsInto(curved(), 1);
    expect(swims.map(s => s.now.id)).toEqual([W1]);
    expect(swims[0]!.control).toEqual(controlThrough(FROM, TO, MIDDLE));
    expect(swimsInto(curved(), 0)).toEqual([]);
  });
});

describe('le palet porté suit la crosse sur la courbe', () => {
  const carried = (second = W1) => {
    const t = curved();
    t.steps[0]!.carrier = W1;
    t.steps[1]!.carrier = second;
    t.steps[1]!.poses[W2] = { x: 15, y: 9, angle: 180, surface: false };
    return settleTactic(t);
  };

  it('le même porteur aux deux étapes : le palet reste au bout de sa crosse', () => {
    const t = carried();
    const frame = frameAt(t, 0.5);
    const carrier = frame.players.find(p => p.id === W1)!;
    const tip = stickTip(carrier, false);
    expect(frame.puck.x).toBeCloseTo(tip.x);
    expect(frame.puck.y).toBeCloseTo(tip.y);
    // En ligne droite d'une crosse à l'autre, il serait resté près de 7,5.
    expect(frame.puck.y).toBeGreaterThan(11);
    // Aux étapes, le palet exact de l'étape.
    expect(frameAt(t, 0).puck).toEqual(t.steps[0]!.puck);
    expect(frameAt(t, 1).puck).toEqual(t.steps[1]!.puck);
  });

  it('une passe à un autre joueur va droit', () => {
    const t = carried(W2);
    const { puck } = frameAt(t, 0.5);
    const a = t.steps[0]!.puck;
    const b = t.steps[1]!.puck;
    expect(puck.x).toBeCloseTo((a.x + b.x) / 2);
    expect(puck.y).toBeCloseTo((a.y + b.y) / 2);
  });
});

describe('la vitesse se mesure sur la courbe', () => {
  it('une nage droite dans la limite devient trop rapide une fois courbée', () => {
    // 10 m en 5 s : 2 m/s, la limite par défaut, sans la dépasser.
    const line = straight();
    expect(stepAlerts(line, apneaTable(line), 1).fast).toEqual([]);

    const arc = curved();
    const fast = stepAlerts(arc, apneaTable(arc), 1).fast;
    const length = pathLength(FROM, TO, arc.steps[1]!.curves![W1]);
    expect(length).toBeGreaterThan(13);
    expect(fast.find(f => f.id === W1)!.speed).toBeCloseTo(length / 5);
  });
});

describe('le lien emporte la courbe', () => {
  it('aller-retour, au décimètre', () => {
    const read = decodeTactic(encodeTactic(curved()), meta);
    expect(read.steps[1]!.curves).toEqual({ [W1]: { x: 10, y: 15.5 } });
    expect(read.steps[0]!.curves).toBeUndefined();
    expect(toCompact(straight()).x).toBeUndefined();
  });

  it('un lecteur plus ancien lit la phase en ligne droite, sans planter', () => {
    // La courbe vit dans `x` seulement : les étapes sont celles d'une nage
    // droite, octet pour octet.
    const compact = toCompact(curved());
    expect(compact.x?.cv).toEqual([[1, 0, 100, 155]]);
    expect(compact.s).toEqual(toCompact(straight()).s);

    // Une clé de `x` inconnue est ignorée — c'est ainsi qu'un lecteur
    // d'avant le 21/11/2026 passe sur `cv`.
    const future = { ...toCompact(straight()), x: { zz: [[1, 0, 3, 4]] } };
    const read = decodeTactic(encodeCompact(future), meta);
    expect(read.steps[1]!.curves).toBeUndefined();

    // Le schéma d'avant (sans `curves`) relit un brouillon, un fichier ou
    // une copie synchronisée qui en porte : la courbe tombe, le reste tient.
    const before = tacticSchema.extend({
      steps: z
        .array(stepSchema.omit({ curves: true }))
        .min(1)
        .max(30),
    });
    const old = before.parse(curved());
    expect(old.steps[1]).not.toHaveProperty('curves');
    expect(old.steps[1]!.poses[W1]).toMatchObject(TO);
  });

  it('une courbe illisible est ignorée, le lien s’ouvre', () => {
    const forged = {
      ...toCompact(straight()),
      x: { cv: [[0, 0, 1, 1], [1, 999, 1, 1], [7, 0, 1, 1], 'n', [1, 0]] },
    };
    const read = decodeTactic(encodeCompact(forged), meta);
    expect(read.steps.every(s => s.curves === undefined)).toBe(true);
  });
});

describe('le geste au magasin', () => {
  const ready = () => {
    const s = createBoardStore(straight());
    s.getState().goTo(1);
    return s;
  };
  const curveOf = (s: ReturnType<typeof ready>, step = 1) =>
    s.getState().tactic.steps[step]!.curves?.[W1];

  it('courbe, redresse ; annuler et rétablir couvrent le geste', () => {
    const s = ready();
    s.getState().setCurve(W1, { x: 10, y: 15.5 });
    expect(curveOf(s)).toEqual({ x: 10, y: 15.5 });
    s.getState().undo();
    expect(curveOf(s)).toBeUndefined();
    s.getState().redo();
    expect(curveOf(s)).toEqual({ x: 10, y: 15.5 });
    s.getState().setCurve(W1, null);
    expect(curveOf(s)).toBeUndefined();
  });

  it('la première étape n’a pas de départ : rien à courber', () => {
    const s = ready();
    s.getState().goTo(0);
    s.getState().setCurve(W1, { x: 10, y: 15.5 });
    expect(s.getState().tactic.steps[0]!.curves).toBeUndefined();
    expect(s.getState().past).toEqual([]);
  });

  it('relâchée sur la corde, la poignée redresse la nage', () => {
    const s = ready();
    s.getState().setCurve(W1, { x: 10, y: 7.6 });
    expect(curveOf(s)).toBeUndefined();
  });

  it('une étape copiée ne copie pas la courbe ; un joueur ramené la perd', () => {
    const s = ready();
    s.getState().setCurve(W1, { x: 10, y: 15.5 });
    s.getState().addStep();
    expect(curveOf(s, 2)).toBeUndefined();
    expect(curveOf(s, 1)).toBeDefined();

    s.getState().goTo(1);
    s.getState().move(W1, FROM);
    expect(curveOf(s)).toBeUndefined();
  });

  it('la phase retournée ou le bassin redimensionné emportent la courbe', () => {
    const s = ready();
    s.getState().setCurve(W1, { x: 10, y: 13 });
    s.getState().mirror();
    expect(curveOf(s)).toEqual({ x: 10, y: 2 });
    // Comme les positions : proportionnel dans le terrain, 2 m sur 15
    // deviennent 1,6 m sur 12.
    s.getState().setPitch({ width: 12 });
    expect(curveOf(s)!.y).toBeCloseTo(1.6);
  });
});
