import { describe, expect, it } from 'vitest';
import {
  addGoal,
  callTimeout,
  clockLeft,
  endHalf,
  exclude,
  exclusionLeft,
  matchSchema,
  newMatch,
  pause,
  playTime,
  restoreExclusion,
  resume,
  setSettings,
  settle,
  startHalf,
  timeoutLeft,
  unexclude,
  type Match,
} from './model.ts';

const T0 = 1_700_000_000_000;
const s = (seconds: number) => seconds * 1000;
const min = (minutes: number) => minutes * 60_000;

/** Un match de 2 × 10 minutes, pause de 3, lancé à T0. */
const lance = (): Match => startHalf(newMatch(), T0);

const exclu = (match: Match, at: number, number = 4, minutes = 2) =>
  exclude(match, { id: `ex-${number}`, team: 'noir', number, minutes }, at);

/**
 * Ce que ces tests figent : UN CHRONO FAIT D'INSTANTS. Le temps qui reste se
 * déduit de l'heure qu'on lui donne ; rien ne se perd entre deux relevés,
 * fussent-ils séparés de dix minutes de veille. Les exclusions comptent en
 * temps de jeu ; chaque fin n'est rendue qu'une fois.
 */
describe('le chronomètre du match', () => {
  it('part au coup d’envoi et décompte la mi-temps', () => {
    const ready = newMatch();
    expect(clockLeft(ready, T0)).toBe(min(10));
    const match = startHalf(ready, T0);
    expect(match.phase).toBe('half');
    expect(clockLeft(match, T0 + s(61))).toBe(min(10) - s(61));
  });

  it('se met en pause et repart d’où il en était', () => {
    let match = pause(lance(), T0 + s(10));
    // En pause, le temps est figé, quelle que soit l'heure.
    expect(clockLeft(match, T0 + s(300))).toBe(min(10) - s(10));
    match = resume(match, T0 + s(40));
    expect(clockLeft(match, T0 + s(45))).toBe(min(10) - s(15));
  });

  it('ne perd rien d’une veille : l’heure du réveil suffit', () => {
    const match = lance();
    // Aucun relevé pendant quatre minutes : l'écran éteint, l'onglet gelé.
    expect(clockLeft(match, T0 + min(4))).toBe(min(6));
    expect(settle(match, T0 + min(4)).match).toBe(match);
  });

  it('finit la mi-temps à son instant, et la pause part de là', () => {
    const match = lance();
    // Réveillé deux minutes APRÈS la fin des dix minutes.
    const { match: after, ends } = settle(match, T0 + min(12));
    expect(ends).toEqual([{ kind: 'half', half: 1 }]);
    expect(after.phase).toBe('break');
    expect(after.half).toBe(2);
    expect(after.played).toBe(min(10));
    // La pause est partie à T0 + 10 min, pas au réveil : il en reste une.
    expect(clockLeft(after, T0 + min(12))).toBe(min(1));
  });

  it('rend chaque fin une seule fois', () => {
    const first = settle(lance(), T0 + min(11));
    expect(first.ends).toHaveLength(1);
    const again = settle(first.match, T0 + min(11) + s(5));
    expect(again.ends).toEqual([]);
    expect(again.match).toBe(first.match);
  });

  it('signale la fin de la pause une fois, puis compte le dépassement', () => {
    const { match: pause1 } = settle(lance(), T0 + min(10));
    const { match: over, ends } = settle(pause1, T0 + min(13) + s(12));
    expect(ends).toEqual([{ kind: 'break' }]);
    expect(clockLeft(over, T0 + min(13) + s(12))).toBe(-s(12));
    expect(settle(over, T0 + min(14)).ends).toEqual([]);
  });

  it('enchaîne la seconde mi-temps, puis la fin du match', () => {
    const { match: pause1 } = settle(lance(), T0 + min(10));
    const second = startHalf(pause1, T0 + min(13));
    expect(second.phase).toBe('half');
    expect(second.half).toBe(2);
    expect(clockLeft(second, T0 + min(13))).toBe(min(10));
    const { match: done, ends } = settle(second, T0 + min(30));
    expect(ends).toEqual([{ kind: 'half', half: 2 }]);
    expect(done.phase).toBe('over');
    expect(done.played).toBe(min(20));
    expect(clockLeft(done, T0 + min(30))).toBe(0);
  });

  it('« Fin de mi-temps » compte le temps couru, pas la durée prévue', () => {
    const match = endHalf(lance(), T0 + min(7));
    expect(match.phase).toBe('break');
    expect(match.played).toBe(min(7));
    expect(clockLeft(match, T0 + min(7))).toBe(min(3));
  });

  it('ne laisse régler les durées qu’avant le coup d’envoi', () => {
    const ready = setSettings(newMatch(), { halfMinutes: 15, breakMinutes: 5 });
    expect(ready.halfMinutes).toBe(15);
    expect(ready.breakMinutes).toBe(5);
    expect(setSettings(ready, { halfMinutes: 200 }).halfMinutes).toBe(45);
    expect(setSettings(ready, { breakMinutes: 0 }).breakMinutes).toBe(1);
    const started = startHalf(ready, T0);
    expect(setSettings(started, { halfMinutes: 10 })).toBe(started);
  });
});

describe('le temps mort', () => {
  it('arrête le chrono, dure une minute, et se signale une fois', () => {
    let match = callTimeout(lance(), 'blanc', T0 + min(2));
    expect(match.timeouts).toEqual({ blanc: 1, noir: 0 });
    expect(clockLeft(match, T0 + min(5))).toBe(min(8));
    expect(timeoutLeft(match, T0 + min(2) + s(20))).toBe(s(40));
    const { match: ended, ends } = settle(match, T0 + min(3) + s(4));
    expect(ends).toEqual([{ kind: 'timeout', team: 'blanc' }]);
    expect(settle(ended, T0 + min(4)).ends).toEqual([]);
    // « Reprendre le jeu » : le chrono repart, le temps mort s'efface.
    match = resume(ended, T0 + min(3) + s(30));
    expect(match.timeout).toBeNull();
    expect(clockLeft(match, T0 + min(3) + s(40))).toBe(min(8) - s(10));
  });

  it('ne s’appelle que pendant une mi-temps, un à la fois', () => {
    expect(callTimeout(newMatch(), 'noir', T0).timeout).toBeNull();
    const match = callTimeout(lance(), 'noir', T0 + s(5));
    expect(callTimeout(match, 'blanc', T0 + s(6))).toBe(match);
  });

  it('se recompte à chaque mi-temps', () => {
    const match = callTimeout(lance(), 'noir', T0 + s(5));
    const second = startHalf(endHalf(match, T0 + min(1)), T0 + min(4));
    expect(second.timeouts).toEqual({ blanc: 0, noir: 0 });
  });
});

describe('les exclusions', () => {
  it('décomptent en temps de jeu : la pause les arrête', () => {
    let match = exclu(lance(), T0 + min(1));
    const ex = match.exclusions[0]!;
    expect(ex.at).toBe(min(1));
    expect(exclusionLeft(match, ex, T0 + min(1) + s(30))).toBe(s(90));
    match = pause(match, T0 + min(1) + s(30));
    expect(exclusionLeft(match, ex, T0 + min(9))).toBe(s(90));
    match = resume(match, T0 + min(9));
    expect(exclusionLeft(match, ex, T0 + min(9) + s(30))).toBe(s(60));
  });

  it('se terminent une fois, à leur heure de jeu', () => {
    const match = exclu(lance(), T0 + min(1));
    const { match: after, ends } = settle(match, T0 + min(3) + s(1));
    expect(ends).toEqual([{ kind: 'exclusion', team: 'noir', number: 4 }]);
    expect(after.exclusions[0]!.rang).toBe(true);
    expect(settle(after, T0 + min(4)).ends).toEqual([]);
  });

  it('passent la pause et finissent en seconde mi-temps', () => {
    // Exclu à 9 min de jeu pour 2 min : 1 min avant la pause, 1 min après.
    const match = exclu(lance(), T0 + min(9));
    const { match: pause1, ends } = settle(match, T0 + min(12));
    expect(ends).toEqual([{ kind: 'half', half: 1 }]);
    expect(exclusionLeft(pause1, pause1.exclusions[0]!, T0 + min(12))).toBe(
      min(1)
    );
    const second = startHalf(pause1, T0 + min(14));
    const late = settle(second, T0 + min(15) + s(1));
    expect(late.ends).toEqual([{ kind: 'exclusion', team: 'noir', number: 4 }]);
    expect(playTime(late.match, T0 + min(15) + s(1))).toBe(min(11) + s(1));
  });

  it('une longue veille relève tout ce qui a fini, rien de plus', () => {
    const match = exclu(exclu(lance(), T0 + min(7), 4, 2), T0 + min(7), 7, 5);
    const { match: after, ends } = settle(match, T0 + min(40));
    // Le n° 4 revient à 9 min de jeu ; la mi-temps s'arrête à 10 ; le n° 7,
    // exclu jusqu'à 12 min de jeu, attend la seconde mi-temps.
    expect(ends).toEqual([
      { kind: 'half', half: 1 },
      { kind: 'break' },
      { kind: 'exclusion', team: 'noir', number: 4 },
    ]);
    expect(exclusionLeft(after, after.exclusions[1]!, T0 + min(40))).toBe(
      min(2)
    );
  });

  it('se retirent, et « Annuler » les remet à leur place', () => {
    let match = exclu(exclu(lance(), T0, 4), T0 + s(1), 7);
    const removed = match.exclusions[0]!;
    match = unexclude(match, removed.id);
    expect(match.exclusions.map(e => e.number)).toEqual([7]);
    match = restoreExclusion(match, removed, 0);
    expect(match.exclusions.map(e => e.number)).toEqual([4, 7]);
  });

  it('refusent un numéro hors des bonnets, et le match fini', () => {
    expect(exclu(lance(), T0, 0).exclusions).toEqual([]);
    expect(exclu(lance(), T0, 100).exclusions).toEqual([]);
    const over = { ...lance(), phase: 'over' as const };
    expect(exclu(over, T0)).toBe(over);
  });
});

describe('le score', () => {
  it('compte les buts, et n’en retire pas sous zéro', () => {
    let match = addGoal(newMatch(), 'blanc', 1);
    match = addGoal(match, 'blanc', 1);
    match = addGoal(match, 'noir', 1);
    expect(match.score).toEqual({ blanc: 2, noir: 1 });
    match = addGoal(match, 'noir', -1);
    expect(addGoal(match, 'noir', -1)).toBe(match);
    expect(match.score).toEqual({ blanc: 2, noir: 0 });
  });
});

describe('le match gardé', () => {
  it('se relit tel qu’il a été écrit, en JSON', () => {
    const match = exclu(callTimeout(lance(), 'noir', T0 + s(30)), T0 + s(31));
    const relu = matchSchema.parse(JSON.parse(JSON.stringify(match)));
    expect(relu).toEqual(match);
  });

  it('refuse un match qui ne se comprend pas', () => {
    expect(() =>
      matchSchema.parse({ ...newMatch(), phase: 'mi-temps' })
    ).toThrow();
  });
});
