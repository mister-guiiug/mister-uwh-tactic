import { beforeEach, describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { buildExample, type ExampleId } from '../board/examples.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { encodeJson, QR_CAPACITY } from '../board/share.ts';
import { schemasStore, seancesStore } from '../../backend/local.ts';
import { useSchemas } from '../schemas/store.ts';
import { seanceCodeFromHash } from './link.ts';
import type { Seance } from './model.ts';
import {
  decodeSharedSeance,
  fromCompactSeance,
  receiveSeance,
  seanceShareUrl,
  toCompactSeance,
} from './share.ts';
import { useSeances } from './store.ts';

/**
 * Ce que ces tests figent : LE LIEN D'UNE SÉANCE EMPORTE CE QU'IL FAUT POUR
 * LA PRÉSENTER — elle, et chacun de ses schémas une fois —, et ce qui
 * revient entre sous de nouveaux identifiants, les phases recâblées.
 */

const BASE = 'https://mister-guiiug.github.io/mister-uwh-tactic/';
const NOW = '2026-11-20T10:00:00.000Z';

/** Un exemple de la bibliothèque, avec ses vrais textes français. */
function exemple(id: Exclude<ExampleId, 'neutral'>, uuid: string): Tactic {
  const texts = fr.schemas.examples[id] as Record<string, string>;
  const notes = Object.keys(texts)
    .filter(key => key.startsWith('note'))
    .sort()
    .map(key => texts[key]!);
  return buildExample(id, { name: texts.name!, notes }, { id: uuid });
}

const sortie = createTactic({ id: 'sortie', name: 'Sortie de mur', now: NOW });
const relais = createTactic({ id: 'relais', name: 'Relais au fond', now: NOW });

const seance = (items: Seance['items'], name = 'Mardi'): Seance => ({
  id: 'seance-mardi',
  name,
  items,
  updatedAt: NOW,
});

const phase = (schemaId: string, minutes = 5, note = '') => ({
  schemaId,
  minutes,
  note,
});

function compteur() {
  let n = 0;
  return () => `neuf-${++n}`;
}

describe('le lien d’une séance', () => {
  it('emporte chaque schéma une fois, et les phases y renvoient', () => {
    const library = new Map([
      ['sortie', sortie],
      ['relais', relais],
    ]);
    const compact = toCompactSeance(
      seance([phase('sortie', 8, 'au mur'), phase('relais'), phase('sortie')]),
      library
    );
    expect(compact.t).toHaveLength(2);
    expect(compact.p).toEqual([
      [0, 8, 'au mur'],
      [1, 5, ''],
      [0, 5, ''],
    ]);
  });

  it('revient sous de nouveaux identifiants, les phases recâblées', () => {
    const library = new Map([
      ['sortie', sortie],
      ['relais', relais],
    ]);
    const { seance: recue, schemas } = fromCompactSeance(
      toCompactSeance(
        seance([
          phase('sortie', 8, 'au mur'),
          phase('relais'),
          phase('sortie'),
        ]),
        library
      ),
      { newId: compteur(), now: NOW }
    );
    expect(schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Relais au fond',
    ]);
    expect(schemas.map(s => s.id)).not.toContain('sortie');
    expect(recue.id).not.toBe('seance-mardi');
    expect(recue.name).toBe('Mardi');
    expect(recue.items).toEqual([
      { schemaId: schemas[0]!.id, minutes: 8, note: 'au mur' },
      { schemaId: schemas[1]!.id, minutes: 5, note: '' },
      { schemaId: schemas[0]!.id, minutes: 5, note: '' },
    ]);
  });

  it('une phase dont le schéma a disparu ne part pas', () => {
    const compact = toCompactSeance(
      seance([phase('efface'), phase('sortie')]),
      new Map([['sortie', sortie]])
    );
    expect(compact.p).toEqual([[0, 5, '']]);
    expect(compact.t).toHaveLength(1);
  });

  it('refuse un lien forgé : une phase qui renvoie hors de la liste', () => {
    expect(() =>
      fromCompactSeance(
        { v: 1, n: 'Forgée', p: [[3, 5, '']], t: [] },
        { newId: compteur(), now: NOW }
      )
    ).toThrow();
    expect(() =>
      fromCompactSeance(
        { v: 99, n: 'Future', p: [], t: [] },
        { newId: compteur(), now: NOW }
      )
    ).toThrow();
  });

  it('se reconnaît au fragment, compressé ou non, sans se confondre avec un schéma', async () => {
    const library = new Map([['sortie', sortie]]);
    const url = await seanceShareUrl(seance([phase('sortie')]), library, BASE);
    expect(url.startsWith(`${BASE}#zs=`)).toBe(true);
    const shared = seanceCodeFromHash(url.slice(BASE.length))!;
    expect(shared.compressed).toBe(true);
    const back = await decodeSharedSeance(shared, {
      newId: compteur(),
      now: NOW,
    });
    expect(back.seance.items).toHaveLength(1);

    const plain = encodeJson(
      toCompactSeance(seance([phase('sortie')]), library)
    );
    expect(seanceCodeFromHash(`#ss=${plain}`)).toEqual({
      code: plain,
      compressed: false,
    });
    expect(seanceCodeFromHash('#s=abc')).toBeNull();
    expect(seanceCodeFromHash('#z=abc')).toBeNull();
  });

  /**
   * LA LONGUEUR D'UN LIEN DE TROIS PHASES, mesurée sur trois vrais exemples
   * de la bibliothèque (engagement 3-2-1, attaque à droite, jeu au mur : dix
   * étapes en tout, consignes françaises comprises) : 1 909 octets le
   * 20/11/2026, sous la capacité d'un QR code (2 953). Quatre exemples :
   * 2 385 ; cinq : 2 872, à la limite ; trois schémas vierges : 385. Au-delà,
   * l'écran ne propose que le lien.
   */
  it('trois phases d’exemples tiennent dans un QR code', async () => {
    const schemas = [
      exemple('kickoff', '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a51'),
      exemple('rightAttack', '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a52'),
      exemple('wallPlay', '0f8b6c2e-1a3d-4e5f-8a9b-0c1d2e3f4a53'),
    ];
    const library = new Map(schemas.map(s => [s.id, s]));
    const url = await seanceShareUrl(
      seance(
        schemas.map((s, i) =>
          phase(s.id, 8, `Consigne de la phase ${i + 1} : à deux, en relais.`)
        ),
        'Mardi : engagement, attaque, mur'
      ),
      library,
      BASE
    );
    const bytes = new TextEncoder().encode(url).length;
    expect(bytes).toBeLessThan(QR_CAPACITY);
    // Assez près du plafond pour qu'un changement de format qui l'enflerait
    // se voie ici, et pas sur un QR code illisible au bord du bassin.
    expect(bytes).toBeLessThan(2200);
  });
});

describe('une séance reçue', () => {
  beforeEach(async () => {
    localStorage.clear();
    useSchemas.setState({ schemas: [], outside: [], ready: false });
    await useSeances.getState().load();
  });

  it('entre dans la bibliothèque avec ses schémas', async () => {
    const library = new Map([
      ['sortie', sortie],
      ['relais', relais],
    ]);
    const url = await seanceShareUrl(
      seance([phase('sortie', 7, 'vite'), phase('relais')]),
      library,
      BASE
    );
    const recue = await receiveSeance(
      seanceCodeFromHash(url.slice(BASE.length))!
    );

    const enregistres = schemasStore.load().schemas;
    expect(enregistres.map(s => s.name).sort()).toEqual([
      'Relais au fond',
      'Sortie de mur',
    ]);
    const [rangee] = seancesStore.load().seances;
    expect(rangee).toEqual(recue);
    expect(rangee!.items.map(item => item.schemaId).sort()).toEqual(
      enregistres.map(s => s.id).sort()
    );
    expect(useSeances.getState().seances[0]?.id).toBe(recue.id);
  });
});
