import { beforeEach, describe, expect, it } from 'vitest';
import {
  SEANCE_LIMITS,
  moveItem,
  seancesSnapshotSchema,
  totalMinutes,
} from './model.ts';
import { seancesStore, useSeances } from './store.ts';

beforeEach(() => {
  localStorage.clear();
  useSeances.getState().load();
});

/**
 * Ce que ces tests figent : UNE SÉANCE SE GARDE TELLE QU'ON L'A PRÉPARÉE —
 * l'ordre de ses phases, leurs durées dans les bornes —, et elle survit au
 * rechargement.
 */
describe('les séances', () => {
  it('une séance neuve est vide, en tête de liste, et enregistrée', () => {
    const { create } = useSeances.getState();
    create('a', 'Lundi');
    create('b', 'Mardi');
    expect(useSeances.getState().seances.map(s => s.name)).toEqual([
      'Mardi',
      'Lundi',
    ]);
    expect(seancesStore.load().seances).toHaveLength(2);
    expect(() =>
      seancesSnapshotSchema.parse(seancesStore.load())
    ).not.toThrow();
  });

  it('ajoute, ordonne et retire des phases ; la durée totale suit', () => {
    const s = useSeances.getState();
    s.create('a');
    s.addItem('a', 'schema-1');
    s.addItem('a', 'schema-2');
    s.updateItem('a', 1, { minutes: 12 });
    s.moveItem('a', 1, 0);
    let seance = useSeances.getState().seances[0]!;
    expect(seance.items.map(i => i.schemaId)).toEqual(['schema-2', 'schema-1']);
    expect(totalMinutes(seance)).toBe(12 + SEANCE_LIMITS.minutes.default);

    s.removeItem('a', 0);
    seance = useSeances.getState().seances[0]!;
    expect(seance.items.map(i => i.schemaId)).toEqual(['schema-1']);
  });

  it('borne la durée et la consigne, et le nombre de phases', () => {
    const s = useSeances.getState();
    s.create('a');
    s.addItem('a', 'x');
    s.updateItem('a', 0, { minutes: 999, note: 'n'.repeat(500) });
    const item = useSeances.getState().seances[0]!.items[0]!;
    expect(item.minutes).toBe(SEANCE_LIMITS.minutes.max);
    expect(item.note).toHaveLength(SEANCE_LIMITS.note);

    for (let i = 0; i < SEANCE_LIMITS.items + 5; i++) s.addItem('a', `s${i}`);
    expect(useSeances.getState().seances[0]!.items).toHaveLength(
      SEANCE_LIMITS.items
    );
  });

  it('se relit après un rechargement', () => {
    useSeances.getState().create('a', 'Gardée');
    useSeances.setState({ seances: [] });
    useSeances.getState().load();
    expect(useSeances.getState().seances[0]?.name).toBe('Gardée');
  });

  it('déplacer hors des bords ne change rien', () => {
    const items = [
      { schemaId: 'a', minutes: 5, note: '' },
      { schemaId: 'b', minutes: 5, note: '' },
    ];
    expect(moveItem(items, 0, -1)).toEqual(items);
    expect(moveItem(items, 1, 2)).toEqual(items);
  });
});
