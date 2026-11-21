import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { schemaVersions } from '../../backend/index.ts';
import { sameVersion } from '../../backend/versions.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { restoreVersion } from './restoreVersion.ts';
import { useSchemas } from './store.ts';

/**
 * Ce que ces tests figent : REVENIR À UNE VERSION, C'EST L'ENREGISTRER, ET
 * RIEN NE SE PERD (ADR 0034). La bibliothèque est celle de l'appareil, pour
 * de vrai : le backend local, et son historique.
 */

const ID = '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';

const version = (n: number, extra: Partial<Tactic> = {}): Tactic => ({
  ...createTactic({
    id: ID,
    name: `Sortie de mur ${n}`,
    now: new Date(Date.UTC(2026, 10, 21, 8, n)).toISOString(),
  }),
  ...extra,
});

const noms = (liste: Tactic[]) => liste.map(t => t.name);
const courant = () => useSchemas.getState().schemas.find(s => s.id === ID)!;

beforeEach(async () => {
  localStorage.clear();
  await useSchemas.getState().load();
});

afterEach(() => {
  useSchemas.setState({ schemas: [], outside: [], ready: false, error: null });
});

describe('revenir à une version', () => {
  it('l’enregistre comme la nouvelle ; la courante passe dans l’historique', async () => {
    const { save } = useSchemas.getState();
    await save(version(1));
    await save(version(2));
    await save(version(3));
    expect(noms(schemaVersions.list(ID))).toEqual([
      'Sortie de mur 2',
      'Sortie de mur 1',
    ]);

    const choisie = schemaVersions.list(ID)[1]!;
    const avant = courant();
    const reprise = await restoreVersion(choisie);

    // Le schéma est la version choisie, datée du geste — après la courante,
    // pour que la synchronisation la garde.
    expect(sameVersion(courant(), choisie)).toBe(true);
    expect(courant()).toEqual(reprise);
    expect(Date.parse(reprise.updatedAt)).toBeGreaterThan(
      Date.parse(avant.updatedAt)
    );
    // La courante est dans l'historique ; la reprise l'a quitté.
    expect(noms(schemaVersions.list(ID))).toEqual([
      'Sortie de mur 3',
      'Sortie de mur 2',
    ]);
    // Relu de l'appareil, pas seulement de l'écran.
    await useSchemas.getState().load();
    expect(courant().name).toBe('Sortie de mur 1');
  });

  it('revenir à celle qu’on vient de quitter défait le geste', async () => {
    const { save } = useSchemas.getState();
    await save(version(1));
    await save(version(2));
    const quittee = courant();

    await restoreVersion(schemaVersions.list(ID)[0]!);
    expect(courant().name).toBe('Sortie de mur 1');

    const [laissee] = schemaVersions.list(ID);
    expect(sameVersion(laissee!, quittee)).toBe(true);
    await restoreVersion(laissee!);

    expect(courant().name).toBe('Sortie de mur 2');
    // Rien ne s'est perdu : l'autre est toujours là.
    expect(noms(schemaVersions.list(ID))).toEqual(['Sortie de mur 1']);
  });

  it('garde les étiquettes de la courante : elles rangent le schéma', async () => {
    const { save } = useSchemas.getState();
    await save(version(1, { tags: ['drill'] }));
    await save(version(2, { tags: ['attack', 'Cadets'] }));

    await restoreVersion(schemaVersions.list(ID)[0]!);

    expect(courant().name).toBe('Sortie de mur 1');
    expect(courant().tags).toEqual(['attack', 'Cadets']);
  });

  it('une courante sans étiquette n’en reprend pas d’une version', async () => {
    const { save } = useSchemas.getState();
    await save(version(1, { tags: ['drill'] }));
    await save(version(2));

    await restoreVersion(schemaVersions.list(ID)[0]!);

    expect(courant().tags).toBeUndefined();
  });
});
