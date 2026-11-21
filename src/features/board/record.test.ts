import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBoardStore, RECORD_PAUSE_MS } from './store.ts';
import { createTactic, playerId } from './model.ts';

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);

function store() {
  return createBoardStore(
    createTactic({ id: 't', name: '', now: '2026-11-21T00:00:00Z' })
  );
}

/** Un glisser complet : il commence vraiment, bouge, puis finit. */
function glisser(
  s: ReturnType<typeof store>,
  id: string,
  to: { x: number; y: number }
) {
  s.getState().recordGestureStart();
  s.getState().move(id, to);
  s.getState().recordGestureEnd();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-21T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('l’enregistrement en direct', () => {
  it('le premier glisser ouvre une étape : celle de départ reste intacte', () => {
    const s = store();
    s.getState().setRecording(true);
    const avant = s.getState().tactic.steps[0]!.poses[W1]!;
    glisser(s, W1, { x: 10, y: 5 });
    const { tactic, step } = s.getState();
    expect(tactic.steps).toHaveLength(2);
    expect(step).toBe(1);
    expect(tactic.steps[0]!.poses[W1]).toEqual(avant);
    expect(tactic.steps[1]!.poses[W1]).toMatchObject({ x: 10, y: 5 });
  });

  it('des glissers rapprochés font une seule étape : ils bougent ensemble', () => {
    const s = store();
    s.getState().setRecording(true);
    glisser(s, W1, { x: 10, y: 5 });
    vi.advanceTimersByTime(RECORD_PAUSE_MS - 200);
    glisser(s, W2, { x: 11, y: 7 });
    const { tactic } = s.getState();
    expect(tactic.steps).toHaveLength(2);
    expect(tactic.steps[1]!.poses[W2]).toMatchObject({ x: 11, y: 7 });
  });

  it('après une pause, le glisser suivant ouvre l’étape d’après', () => {
    const s = store();
    s.getState().setRecording(true);
    glisser(s, W1, { x: 10, y: 5 });
    vi.advanceTimersByTime(RECORD_PAUSE_MS + 100);
    glisser(s, W1, { x: 14, y: 6 });
    const { tactic, step } = s.getState();
    expect(tactic.steps).toHaveLength(3);
    expect(step).toBe(2);
    expect(tactic.steps[1]!.poses[W1]).toMatchObject({ x: 10, y: 5 });
    expect(tactic.steps[2]!.poses[W1]).toMatchObject({ x: 14, y: 6 });
  });

  it('un geste interrompu sans fin ne fige pas la pause', () => {
    const s = store();
    s.getState().setRecording(true);
    s.getState().recordGestureStart(); // jamais fini : un pointercancel
    s.getState().move(W1, { x: 10, y: 5 });
    vi.advanceTimersByTime(RECORD_PAUSE_MS + 100);
    glisser(s, W1, { x: 14, y: 6 });
    expect(s.getState().tactic.steps).toHaveLength(3);
  });

  it('hors enregistrement, un glisser n’ouvre rien', () => {
    const s = store();
    glisser(s, W1, { x: 10, y: 5 });
    expect(s.getState().tactic.steps).toHaveLength(1);
  });

  it('lire, ouvrir un autre schéma ou repartir de zéro l’arrêtent', () => {
    const s = store();
    s.getState().setRecording(true);
    glisser(s, W1, { x: 10, y: 5 });
    s.getState().play();
    expect(s.getState().recording).toBe(false);

    s.getState().setRecording(true);
    s.getState().load(createTactic({ id: 'u', name: 'Autre' }));
    expect(s.getState().recording).toBe(false);

    s.getState().setRecording(true);
    s.getState().reset();
    expect(s.getState().recording).toBe(false);
  });

  it('se relance à zéro : le premier glisser rouvre une étape', () => {
    const s = store();
    s.getState().setRecording(true);
    glisser(s, W1, { x: 10, y: 5 });
    s.getState().setRecording(false);
    s.getState().setRecording(true);
    glisser(s, W1, { x: 12, y: 5 });
    expect(s.getState().tactic.steps).toHaveLength(3);
  });
});
