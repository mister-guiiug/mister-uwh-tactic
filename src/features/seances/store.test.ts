import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seancesStore } from '../../backend/local.ts';
import {
  SEANCE_LIMITS,
  moveItem,
  seancesSnapshotSchema,
  totalMinutes,
} from './model.ts';
import { SAVE_DELAY_MS, flushSeances, useSeances } from './store.ts';

beforeEach(async () => {
  localStorage.clear();
  await useSeances.getState().load();
});

afterEach(() => {
  flushSeances();
  vi.useRealTimers();
});

/** Ce qui est écrit sur l'appareil, sans compte. */
const surAppareil = () => seancesStore.load().seances;

/**
 * Ce que ces tests figent : UNE SÉANCE SE GARDE TELLE QU'ON L'A PRÉPARÉE —
 * l'ordre de ses phases, leurs durées dans les bornes —, et elle survit au
 * rechargement. Sans compte, elle vit sur l'appareil, sous la clé de
 * toujours (`seances`) : le port local l'y écrit.
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
    expect(surAppareil()).toHaveLength(2);
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

  it('se relit après un rechargement', async () => {
    useSeances.getState().create('a', 'Gardée');
    useSeances.setState({ seances: [], ready: false });
    await useSeances.getState().load();
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

/**
 * LA FRAPPE NE PART PAS LETTRE À LETTRE : avec un compte, chaque écriture
 * partirait aussi au serveur. Une retouche s'écrit après un moment de calme,
 * et RIEN NE SE PERD — ce qui attend s'écrit avant une relecture, et quand
 * on le demande (l'éditeur qui se ferme, la page qui se cache).
 */
describe('l’écriture d’une retouche', () => {
  it('regroupe la frappe d’un nom en une écriture, après un moment de calme', () => {
    vi.useFakeTimers();
    const s = useSeances.getState();
    s.create('a');
    for (const nom of ['M', 'Ma', 'Mar', 'Mard', 'Mardi']) s.rename('a', nom);
    expect(useSeances.getState().seances[0]?.name).toBe('Mardi');
    expect(surAppareil()[0]?.name).toBe('');

    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(surAppareil()[0]?.name).toBe('Mardi');
  });

  it('écrit tout de suite ce qui attend quand on le demande', () => {
    vi.useFakeTimers();
    const s = useSeances.getState();
    s.create('a');
    s.rename('a', 'Jeudi');
    flushSeances();
    expect(surAppareil()[0]?.name).toBe('Jeudi');
  });

  it('une relecture écrit d’abord ce qui attend, et ne le perd pas', async () => {
    vi.useFakeTimers();
    const s = useSeances.getState();
    s.create('a');
    s.rename('a', 'Vendredi');
    await useSeances.getState().load();
    expect(useSeances.getState().seances[0]?.name).toBe('Vendredi');
    expect(surAppareil()[0]?.name).toBe('Vendredi');
  });

  it('une séance supprimée n’est pas réécrite par une retouche en attente', () => {
    vi.useFakeTimers();
    const s = useSeances.getState();
    s.create('a');
    s.rename('a', 'Éphémère');
    s.remove('a');
    vi.advanceTimersByTime(SAVE_DELAY_MS * 2);
    expect(surAppareil()).toEqual([]);
  });

  it('« Annuler » remet la séance telle qu’elle était, phases comprises', () => {
    const s = useSeances.getState();
    s.create('a', 'Samedi');
    s.addItem('a', 'x');
    s.updateItem('a', 0, { minutes: 9, note: 'en relais' });
    flushSeances();
    const avant = useSeances.getState().seances[0]!;
    s.remove('a');
    s.restore(avant);
    expect(useSeances.getState().seances).toEqual([avant]);
    expect(surAppareil()).toEqual([avant]);
  });
});

describe('sans compte', () => {
  it('rien n’est hors du compte, et il n’y a rien à y ajouter', async () => {
    useSeances.getState().create('a', 'Ici');
    await useSeances.getState().load();
    expect(useSeances.getState().outside).toEqual([]);
    expect(await useSeances.getState().adopt(['a'])).toBe(0);
  });
});
