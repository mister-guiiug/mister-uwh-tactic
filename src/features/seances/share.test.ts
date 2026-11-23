import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { buildExample, type ExampleId } from '../board/examples.ts';
import { createTactic, type Tactic } from '../board/model.ts';
import { encodeJson, QR_CAPACITY } from '../board/share.ts';
import { boardStore } from '../board/store.ts';
import { schemasStore, seancesStore } from '../../backend/local.ts';
import { useSchemas } from '../schemas/store.ts';
import { seanceCodeFromHash } from './link.ts';
import type { Seance } from './model.ts';
import { presentGuest, useSeancePlay } from './play.ts';
import {
  decodeSharedSeance,
  fromCompactSeance,
  readSharedSeance,
  receiveSeance,
  seanceShareUrl,
  seanceShareUrls,
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

/**
 * LE LIEN POUR LES JOUEURS D'UNE SÉANCE (ADR 0040) : le même code derrière
 * une autre clé ; ouvert, la séance est présentée, et rien n'est rangé.
 */
describe('le lien pour les joueurs d’une séance', () => {
  const library = new Map([
    ['sortie', sortie],
    ['relais', relais],
  ]);
  const mardi = seance([phase('sortie', 7, 'vite'), phase('relais', 4)]);

  beforeEach(async () => {
    localStorage.clear();
    useSchemas.setState({ schemas: [], outside: [], ready: false });
    await useSeances.getState().load();
    boardStore
      .getState()
      .load(createTactic({ id: 'brouillon', name: 'Mon brouillon' }));
  });

  afterEach(() => useSeancePlay.getState().stop());

  it('porte le même code que le lien pour modifier, derrière sa clé', async () => {
    const urls = await seanceShareUrls(mardi, library, BASE);
    expect(urls.edit.startsWith(`${BASE}#zs=`)).toBe(true);
    expect(urls.players.startsWith(`${BASE}#zsp=`)).toBe(true);
    expect(urls.players.slice(`${BASE}#zsp=`.length)).toBe(
      urls.edit.slice(`${BASE}#zs=`.length)
    );
    expect(await seanceShareUrl(mardi, library, BASE, { player: true })).toBe(
      urls.players
    );
    const shared = seanceCodeFromHash(urls.players.slice(BASE.length))!;
    expect(shared).toMatchObject({ compressed: true, player: true });
    const { seance: lue } = await decodeSharedSeance(shared, {
      newId: compteur(),
      now: NOW,
    });
    expect(lue.items.map(item => item.minutes)).toEqual([7, 4]);
  });

  /** Le lien pour les joueurs de `mardi`, lu puis présenté. */
  async function ouvrirPourLesJoueurs() {
    const url = await seanceShareUrl(mardi, library, BASE, { player: true });
    const recue = await readSharedSeance(
      seanceCodeFromHash(url.slice(BASE.length))!,
      NOW
    );
    return { recue, presentee: presentGuest(recue) };
  }

  it('ouvert, présente la première phase sans rien ranger', async () => {
    const { recue, presentee } = await ouvrirPourLesJoueurs();
    expect(presentee).toBe(true);

    // Lue sous de nouveaux identifiants, comme toute séance reçue…
    expect(recue.seance.id).not.toBe('seance-mardi');
    expect(recue.schemas.map(s => s.id)).not.toContain('sortie');
    // … le tableau montre la première phase…
    expect(boardStore.getState().tactic.name).toBe('Sortie de mur');
    // … la présentation porte la séance et ses schémas…
    const play = useSeancePlay.getState();
    expect(play.seanceId).toBe(recue.seance.id);
    expect(play.index).toBe(0);
    expect(play.guest).toBe(recue);
    expect(play.guest?.schemas.map(s => s.name)).toEqual([
      'Sortie de mur',
      'Relais au fond',
    ]);
    expect(recue.seance.items[0]).toMatchObject({ minutes: 7, note: 'vite' });
    // … et rien n'entre dans la bibliothèque : ni la séance, ni ses schémas.
    expect(schemasStore.load().schemas).toEqual([]);
    expect(seancesStore.load().seances).toEqual([]);
    expect(useSeances.getState().seances).toEqual([]);
    expect(useSchemas.getState().schemas).toEqual([]);
  });

  it('quitter la présentation oublie la séance reçue', async () => {
    await ouvrirPourLesJoueurs();
    useSeancePlay.getState().stop();
    expect(useSeancePlay.getState()).toMatchObject({
      seanceId: null,
      guest: null,
    });
    // Le joueur garde la phase qu'il regardait, sur le tableau, comme un
    // schéma reçu : à enregistrer s'il veut la garder.
    expect(boardStore.getState().tactic.name).toBe('Sortie de mur');
  });

  it('un lien forgé est refusé ; une séance vide ne se présente pas', async () => {
    const forge = encodeJson({ v: 1, n: 'Forgée', p: [[3, 5, '']], t: [] });
    await expect(
      readSharedSeance({ code: forge, compressed: false }, NOW)
    ).rejects.toThrow();
    const vide = await readSharedSeance(
      {
        code: encodeJson({ v: 1, n: 'Vide', p: [], t: [] }),
        compressed: false,
      },
      NOW
    );
    expect(presentGuest(vide)).toBe(false);
    expect(boardStore.getState().tactic.name).toBe('Mon brouillon');
    expect(useSeancePlay.getState().seanceId).toBeNull();
  });
});
