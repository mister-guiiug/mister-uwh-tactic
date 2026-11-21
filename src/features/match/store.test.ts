import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clockLeft, exclusionLeft, newMatch } from './model.ts';
import { useMatch } from './store.ts';

const KEY = 'mister-uwh-tacticmatch';
const T0 = new Date('2026-11-21T18:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  localStorage.clear();
  useMatch.getState().replace(newMatch());
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

/** Une nouvelle page : le module se recharge, et relit l'appareil. */
async function recharger() {
  vi.resetModules();
  return (await import('./store.ts')).useMatch;
}

/**
 * Ce que ces tests figent : LE MATCH SURVIT À UN RECHARGEMENT. Il est écrit
 * sous la clé de l'application, préfixe et clé collés ; relu par une
 * nouvelle page, il reprend le chrono où il en est — le temps passé pendant
 * le rechargement compris —, et ne redit pas une fin déjà dite.
 */
describe('le match sur l’appareil', () => {
  it('s’écrit sous mister-uwh-tacticmatch, enveloppé et versionné', () => {
    useMatch.getState().start();
    const brut = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    expect(brut.v).toBe(1);
    expect(brut.data.phase).toBe('half');
  });

  it('reprend après un rechargement, le temps passé compté', async () => {
    const actions = useMatch.getState();
    actions.start();
    vi.setSystemTime(T0 + 60_000);
    actions.goal('blanc', 1);
    actions.exclude({ team: 'noir', number: 4, minutes: 2 });
    vi.setSystemTime(T0 + 90_000);
    actions.pause();
    vi.setSystemTime(T0 + 120_000);
    actions.resume();

    // Vingt secondes plus tard, l'onglet recharge.
    vi.setSystemTime(T0 + 140_000);
    const relu = await recharger();
    const { match } = relu.getState();
    expect(match.phase).toBe('half');
    expect(match.score).toEqual({ blanc: 1, noir: 0 });
    // 140 s écoulées dont 30 de pause : 110 s jouées sur 600.
    expect(clockLeft(match, Date.now())).toBe(490_000);
    // Exclu à 60 s de jeu pour 120 : il en reste 70.
    expect(exclusionLeft(match, match.exclusions[0]!, Date.now())).toBe(70_000);
  });

  it('relève au rechargement une fin survenue page fermée, une fois', async () => {
    useMatch.getState().start();
    vi.setSystemTime(T0 + 11 * 60_000);
    const relu = await recharger();
    relu.getState().tick();
    const ends = relu.getState().ends;
    expect(ends?.list).toEqual([{ kind: 'half', half: 1 }]);
    relu.getState().acknowledge(ends!.id);

    const encore = await recharger();
    expect(encore.getState().match.phase).toBe('break');
    encore.getState().tick();
    expect(encore.getState().ends).toBeNull();
  });

  it('n’écrit rien quand rien ne change', () => {
    useMatch.getState().start();
    const avant = localStorage.getItem(KEY);
    const ecrire = vi.spyOn(Storage.prototype, 'setItem');
    vi.setSystemTime(T0 + 5_000);
    useMatch.getState().tick();
    expect(ecrire).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBe(avant);
    ecrire.mockRestore();
  });

  it('garde de côté un match illisible et repart d’un neuf', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, data: { phase: 3 } }));
    const relu = await recharger();
    expect(relu.getState().match).toEqual(newMatch());
    expect(
      Object.keys(localStorage).some(k => k.startsWith(`${KEY}.backup`))
    ).toBe(true);
  });
});
