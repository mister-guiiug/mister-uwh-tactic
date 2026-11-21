import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyEffectif } from './model.ts';
import { effectifStore, useEffectif } from './store.ts';

/** La clé du socle : le préfixe de l'application, collé à la clé. */
const KEY = 'mister-uwh-tacticeffectif';

const stored = () =>
  JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
    v: number;
    data: ReturnType<typeof emptyEffectif>;
  } | null;

beforeEach(() => {
  localStorage.clear();
  useEffectif.getState().replace(emptyEffectif());
});

afterEach(() => localStorage.clear());

/**
 * Ce que ces tests figent : L'EFFECTIF SURVIT AU RECHARGEMENT, sur
 * l'appareil, sous une clé préfixée par l'application, et ne s'écrit
 * jamais de travers.
 */
describe('le magasin de l’effectif', () => {
  it('s’écrit à chaque lettre, versionné, sous la clé de l’application', () => {
    useEffectif.getState().setMember('blanc', 3, { name: 'Paul' });
    expect(stored()).toMatchObject({ v: 1 });
    expect(stored()!.data.blanc[2]).toEqual({
      name: 'Paul',
      leftHanded: false,
    });
    // Relu comme au prochain démarrage.
    expect(effectifStore.load().blanc[2]!.name).toBe('Paul');
  });

  it('borne l’apnée de 5 à 60 s, et `null` rend le seuil du schéma', () => {
    const { setMember } = useEffectif.getState();
    setMember('noir', 1, { name: 'Max', apnea: 90 });
    expect(useEffectif.getState().effectif.noir[0]!.apnea).toBe(60);
    setMember('noir', 1, { apnea: 12.4 });
    expect(useEffectif.getState().effectif.noir[0]!.apnea).toBe(12);
    setMember('noir', 1, { leftHanded: true });
    expect(useEffectif.getState().effectif.noir[0]).toEqual({
      name: 'Max',
      leftHanded: true,
      apnea: 12,
    });
    setMember('noir', 1, { apnea: null });
    expect(useEffectif.getState().effectif.noir[0]).toEqual({
      name: 'Max',
      leftHanded: true,
    });
  });

  it('coupe un prénom à 24 caractères, comme le schéma', () => {
    useEffectif.getState().setMember('blanc', 1, { name: 'x'.repeat(40) });
    expect(useEffectif.getState().effectif.blanc[0]!.name).toHaveLength(24);
  });

  it('ignore un numéro hors de 1 à 10', () => {
    const before = useEffectif.getState().effectif;
    useEffectif.getState().setMember('blanc', 11, { name: 'Personne' });
    useEffectif.getState().setMember('blanc', 0, { name: 'Personne' });
    expect(useEffectif.getState().effectif).toBe(before);
  });

  it('refuse un effectif mal formé sans rien écrire', () => {
    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    const broken = { blanc: [], noir: [] };
    expect(() => useEffectif.getState().replace(broken as never)).toThrow();
    expect(stored()!.data.blanc[0]!.name).toBe('Paul');
  });

  it('une donnée illisible est mise de côté, et l’effectif repart vide', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, data: { blanc: 3 } }));
    expect(effectifStore.load()).toEqual(emptyEffectif());
    expect(
      Object.keys(localStorage).some(key => key.startsWith(`${KEY}.backup`))
    ).toBe(true);
  });
});
