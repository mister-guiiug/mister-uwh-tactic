import { describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { en } from '../../i18n/messages.en.ts';
import { es } from '../../i18n/messages.es.ts';
import { nl } from '../../i18n/messages.nl.ts';
import { de } from '../../i18n/messages.de.ts';
import { LOCALES, type Locale } from '../../i18n/index.ts';
import { fromCompactCarnet, toCompactCarnet } from '../carnet/share.ts';
import { buildExample, EXAMPLE_IDS, EXAMPLE_TAGS } from './examples.ts';
import {
  createTactic,
  TAG_LIMITS,
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
import {
  cleanTags,
  hasTag,
  isSuggestedTag,
  SUGGESTED_TAGS,
  tagFromInput,
  tagLabel,
  toggleTag,
} from './tags.ts';

/**
 * Ce que ces tests figent : LES ÉTIQUETTES D'UN SCHÉMA (ADR 0029). Une
 * proposée se range sous un identifiant neutre et se lit dans la langue de
 * chacun ; une libre se garde telle qu'on l'a écrite. Le lien et le carnet
 * les emportent dans `x.tg`, qu'un lecteur plus ancien ignore ; ce qui est
 * illisible tombe, sans jamais coûter le schéma.
 */

const CATALOGUES = { fr, en, es, nl, de } satisfies Record<Locale, unknown>;
const NOW = '2026-11-21T10:00:00.000Z';
const meta = { id: 'recu', now: NOW };

const tagged = (tags?: string[]): Tactic => {
  const tactic = createTactic({ id: 'a', name: 'Sortie de mur', now: NOW });
  return tags ? { ...tactic, tags } : tactic;
};

describe('le modèle', () => {
  it('un schéma sans étiquettes reste valide : le champ est facultatif', () => {
    expect(tacticSchema.parse(tagged())).not.toHaveProperty('tags');
    expect(tacticSchema.parse(tagged(['attack', 'Cadets'])).tags).toEqual([
      'attack',
      'Cadets',
    ]);
  });

  it('borne le nombre et la longueur', () => {
    const many = Array.from(
      { length: TAG_LIMITS.count + 1 },
      (_, i) => `t${i}`
    );
    expect(tacticSchema.safeParse(tagged(many)).success).toBe(false);
    const long = 'x'.repeat(TAG_LIMITS.length + 1);
    expect(tacticSchema.safeParse(tagged([long])).success).toBe(false);
    expect(tacticSchema.safeParse(tagged([''])).success).toBe(false);
  });
});

describe('cleanTags', () => {
  it('nettoie : espaces réduites, vides et non-textes écartés', () => {
    expect(
      cleanTags(['  Cadets   U18 ', '', '   ', 3, null, 'Pressing'])
    ).toEqual(['Cadets U18', 'Pressing']);
    expect(cleanTags('attack')).toEqual([]);
    expect(cleanTags(undefined)).toEqual([]);
  });

  it('écarte un doublon, à la casse et aux accents près', () => {
    expect(cleanTags(['Défense haute', 'defense HAUTE', 'Pressing'])).toEqual([
      'Défense haute',
      'Pressing',
    ]);
  });

  it('garde huit étiquettes de 24 caractères au plus', () => {
    const many = Array.from({ length: 12 }, (_, i) => `étiquette ${i}`);
    expect(cleanTags(many)).toHaveLength(TAG_LIMITS.count);
    const [cut] = cleanTags(['x'.repeat(40)]);
    expect(cut).toHaveLength(TAG_LIMITS.length);
    // Sans laisser une moitié d'émoji au bout.
    const [emoji] = cleanTags([`${'x'.repeat(23)}🏊`]);
    expect(emoji).toBe('x'.repeat(23));
  });

  it('rend son identifiant à une proposée écrite autrement', () => {
    expect(cleanTags(['ATTACK', 'set piece', 'Kickoff'])).toEqual([
      'attack',
      'setPiece',
      'kickoff',
    ]);
  });
});

describe('poser et retirer', () => {
  const labels = (locale: Locale) => (tag: (typeof SUGGESTED_TAGS)[number]) =>
    CATALOGUES[locale].tags.suggested[tag];

  it('le nom d’une proposée dans la langue de l’écran donne l’identifiant', () => {
    expect(tagFromInput('défense', labels('fr'))).toBe('defense');
    expect(tagFromInput('  Phase   arrêtée ', labels('fr'))).toBe('setPiece');
    expect(tagFromInput('Defensa', labels('es'))).toBe('defense');
    expect(tagFromInput('übung', labels('de'))).toBe('drill');
    // Le mot d'une autre langue reste une étiquette libre.
    expect(tagFromInput('Defensa', labels('fr'))).toBe('Defensa');
    expect(tagFromInput('Cadets', labels('fr'))).toBe('Cadets');
    expect(tagFromInput('   ', labels('fr'))).toBeNull();
  });

  it('bascule une étiquette, et rien au-delà de huit', () => {
    expect(toggleTag(['attack'], 'drill')).toEqual(['attack', 'drill']);
    expect(toggleTag(['attack', 'Cadets'], 'cadets')).toEqual(['attack']);
    const full = Array.from({ length: TAG_LIMITS.count }, (_, i) => `t${i}`);
    expect(toggleTag(full, 'attack')).toEqual(full);
    expect(hasTag(['Défense haute'], 'defense haute')).toBe(true);
    expect(hasTag(undefined, 'attack')).toBe(false);
  });
});

describe('des identifiants neutres', () => {
  it('chaque proposée a un nom dans chaque langue, distinct des autres', () => {
    for (const locale of LOCALES) {
      const names = SUGGESTED_TAGS.map(tag =>
        CATALOGUES[locale].tags.suggested[tag].trim()
      );
      expect(names.every(name => name !== '')).toBe(true);
      expect(new Set(names.map(n => n.toLowerCase())).size).toBe(names.length);
    }
  });

  it('un schéma envoyé d’Espagne se lit en France, et inversement', () => {
    // Posées en espagnol, rangées sous leur identifiant…
    const fromSpain = ['Ataque', 'Disco parado', 'Presión alta'].map(text =>
      tagFromInput(text, tag => es.tags.suggested[tag])
    );
    expect(fromSpain).toEqual(['attack', 'setPiece', 'Presión alta']);
    // … elles voyagent telles quelles, et se lisent dans la langue de l'écran.
    const read = decodeTactic(
      encodeTactic(tagged(fromSpain as string[])),
      meta
    );
    const shown = (locale: Locale) =>
      read.tags!.map(tag => tagLabel(tag, CATALOGUES[locale].tags.suggested));
    expect(shown('fr')).toEqual(['Attaque', 'Phase arrêtée', 'Presión alta']);
    expect(shown('es')).toEqual(['Ataque', 'Disco parado', 'Presión alta']);
    expect(shown('de')).toEqual([
      'Angriff',
      'Standardsituation',
      'Presión alta',
    ]);
  });
});

describe('le lien et le carnet emportent les étiquettes', () => {
  it('aller-retour, et pas de `x` sans étiquettes', () => {
    const read = decodeTactic(encodeTactic(tagged(['attack', 'Cadets'])), meta);
    expect(read.tags).toEqual(['attack', 'Cadets']);
    expect(toCompact(tagged()).x).toBeUndefined();
    expect(toCompact(tagged([])).x).toBeUndefined();
    expect(decodeTactic(encodeTactic(tagged()), meta)).not.toHaveProperty(
      'tags'
    );
  });

  it('un lecteur plus ancien les ignore, et ouvre le schéma', () => {
    // Elles vivent dans `x` seulement : le reste du lien est celui d'un
    // schéma sans étiquettes, octet pour octet.
    const compact = toCompact(tagged(['attack', 'Cadets']));
    expect(compact.x).toEqual({ tg: ['attack', 'Cadets'] });
    expect({ ...compact, x: undefined }).toEqual(toCompact(tagged()));

    // Une clé de `x` inconnue est ignorée : c'est ainsi qu'un lecteur
    // d'avant le 21/11/2026 passe sur `tg`.
    const future = { ...toCompact(tagged()), x: { zz: ['attack'] } };
    expect(decodeTactic(encodeCompact(future), meta)).not.toHaveProperty(
      'tags'
    );

    // Le schéma d'avant (sans `tags`) relit un brouillon, un fichier ou une
    // copie synchronisée qui en porte : les étiquettes tombent, le reste tient.
    const before = tacticSchema.omit({ tags: true });
    const old = before.parse(tagged(['attack']));
    expect(old).not.toHaveProperty('tags');
    expect(old.name).toBe('Sortie de mur');
  });

  it('des étiquettes illisibles tombent une à une, le lien s’ouvre', () => {
    const forged = {
      ...toCompact(tagged()),
      x: {
        tg: [7, '', 'Cadets', 'cadets', 'x'.repeat(90), ...'abcdefghij'],
      },
    };
    const read = decodeTactic(encodeCompact(forged), meta);
    expect(read.tags).toHaveLength(TAG_LIMITS.count);
    expect(read.tags!.slice(0, 2)).toEqual(['Cadets', 'x'.repeat(24)]);
    const notAList = { ...toCompact(tagged()), x: { tg: 'attack' } };
    expect(decodeTactic(encodeCompact(notAList), meta)).not.toHaveProperty(
      'tags'
    );
  });

  it('un carnet rend chaque schéma avec les siennes', () => {
    const sortie = tagged(['attack', 'wall']);
    const relais = { ...tagged(['drill']), id: 'b', name: 'Relais' };
    const nu = { ...tagged(), id: 'c', name: 'Sans étiquette' };
    let n = 0;
    const { schemas } = fromCompactCarnet(
      toCompactCarnet([sortie, relais, nu], 'Semaine 47'),
      { newId: () => `neuf-${++n}`, now: NOW }
    );
    expect(schemas.map(s => s.tags)).toEqual([
      ['attack', 'wall'],
      ['drill'],
      undefined,
    ]);
  });
});

describe('les exemples sont étiquetés', () => {
  it('chacun, de proposées seulement, et le schéma les garde', () => {
    for (const id of EXAMPLE_IDS) {
      expect(EXAMPLE_TAGS[id].length).toBeGreaterThan(0);
      expect(EXAMPLE_TAGS[id].every(isSuggestedTag)).toBe(true);
      const tactic = buildExample(
        id,
        { name: id, notes: Array.from({ length: 12 }, (_, i) => `n${i}`) },
        { id }
      );
      expect(tacticSchema.parse(tactic).tags).toEqual([...EXAMPLE_TAGS[id]]);
    }
    // Les exercices sont des exercices, et les phases n'en sont pas.
    expect(EXAMPLE_TAGS.passThree).toContain('drill');
    expect(EXAMPLE_TAGS.kickoff).not.toContain('drill');
  });
});

describe('au tableau', () => {
  it('le brouillon reçoit les étiquettes, à la date qu’on lui donne', () => {
    const store = createBoardStore(tagged());
    store.getState().setTags(['attack'], '2026-11-21T11:00:00.000Z');
    expect(store.getState().tactic.tags).toEqual(['attack']);
    expect(store.getState().tactic.updatedAt).toBe('2026-11-21T11:00:00.000Z');

    // C'est un geste du tableau : « Annuler » le défait.
    store.getState().undo();
    expect(store.getState().tactic.tags).toBeUndefined();
    expect(store.getState().tactic.updatedAt).toBe(NOW);

    // Sans date, il garde la sienne ; vides, elles disparaissent.
    store.getState().redo();
    store.getState().setTags([]);
    expect(store.getState().tactic.tags).toBeUndefined();
    expect(store.getState().tactic.updatedAt).toBe('2026-11-21T11:00:00.000Z');
  });
});
