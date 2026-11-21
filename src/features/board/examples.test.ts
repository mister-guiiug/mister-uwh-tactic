import { describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { en } from '../../i18n/messages.en.ts';
import { es } from '../../i18n/messages.es.ts';
import { nl } from '../../i18n/messages.nl.ts';
import { de } from '../../i18n/messages.de.ts';
import { LOCALES, type Locale } from '../../i18n/index.ts';

const messages = { fr, en, es, nl, de } satisfies Record<Locale, unknown>;
import {
  buildExample,
  DRILL_IDS,
  EXAMPLE_GROUPS,
  EXAMPLE_IDS,
  exampleTactic,
  PLAY_IDS,
  type ExampleId,
  type ExampleStory,
} from './examples.ts';
import { GOAL_TRAY } from './pitch.ts';
import { apneaTable, overLimit } from './apnea.ts';
import {
  playerId,
  tacticSchema,
  visiblePlayers,
  type Point,
  type Tactic,
} from './model.ts';

const texts = {
  name: 'Exemple',
  notes: ['un', 'deux', 'trois'] as [string, string, string],
};

describe('exampleTactic', () => {
  const tactic = exampleTactic(texts, { id: 'exemple' });

  it('rend un schéma valide, de trois étapes et leurs consignes', () => {
    expect(() => tacticSchema.parse(tactic)).not.toThrow();
    expect(tactic.name).toBe('Exemple');
    expect(tactic.steps.map(s => s.note)).toEqual(['un', 'deux', 'trois']);
  });

  it('fait plonger trois Blancs à la deuxième étape, flèches à l’appui', () => {
    const step = tactic.steps[1]!;
    for (const n of [1, 2, 3]) {
      expect(step.poses[playerId('blanc', n)]!.surface).toBe(false);
    }
    expect(step.arrows.filter(a => a.kind === 'move')).toHaveLength(3);
  });

  it('finit sur une passe', () => {
    expect(tactic.steps[2]!.arrows.map(a => a.kind)).toEqual(['pass']);
  });
});

describe('les exemples tirés des documents de formation', () => {
  const story = (n: number) => ({
    name: 'Phase',
    notes: Array.from({ length: n }, (_, i) => `consigne ${i + 1}`),
  });
  const STEPS: Record<ExampleId, number> = {
    neutral: 3,
    kickoff: 3,
    faceOff: 3,
    rightAttack: 3,
    wingSwitch: 5,
    wallPlay: 4,
    slide: 3,
    penalty: 4,
    freePuckPivots: 3,
    freePuckBack: 3,
    twoOnOne: 4,
    passThree: 4,
    wallRelay: 4,
    piggyInMiddle: 4,
  };

  it.each(EXAMPLE_IDS)('%s : un schéma valide, une consigne par étape', id => {
    const tactic = buildExample(id, story(STEPS[id]), { id: `ex-${id}` });
    expect(() => tacticSchema.parse(tactic)).not.toThrow();
    expect(tactic.steps).toHaveLength(STEPS[id]);
    expect(tactic.steps.map(s => s.note)).toEqual(story(STEPS[id]).notes);
  });

  it('l’engagement nomme les Blancs comme les clubs, et les aligne au mur', () => {
    const tactic = buildExample('kickoff', story(3), { id: 'ex' });
    const names = Object.fromEntries(
      tactic.roster.players
        .filter(p => p.team === 'blanc' && p.number <= 6)
        .map(p => [p.id, p.name])
    );
    expect(Object.values(names).sort()).toEqual(
      ['AC', 'AD', 'AG', 'AR', 'PD', 'PG'].sort()
    );
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(tactic.steps[0]!.poses[playerId('blanc', n)]!.x).toBeCloseTo(0.6);
    }
  });

  it('la pénalité finit dans la cuvette du but des Blancs', () => {
    const tactic = buildExample('penalty', story(4), { id: 'ex' });
    const puck = tactic.steps.at(-1)!.puck;
    expect(puck.x).toBeLessThan(GOAL_TRAY.trough);
    expect(Math.abs(puck.y - tactic.pitch.width / 2)).toBeLessThan(
      GOAL_TRAY.width / 2
    );
  });
});

describe('le coup franc, en deux variantes sourcées', () => {
  const story = { name: 'Coup franc', notes: ['a', 'b', 'c'] };
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  /** Les Blancs dans l'eau, du plus proche au plus loin du palet. */
  const whitesByDistance = (tactic: Tactic) => {
    const step = tactic.steps[0]!;
    return [1, 2, 3, 4, 5, 6]
      .map(n => playerId('blanc', n))
      .sort(
        (a, b) =>
          distance(step.poses[a]!, step.puck) -
          distance(step.poses[b]!, step.puck)
      );
  };

  it.each(['freePuckPivots', 'freePuckBack'] as const)(
    '%s : les Noirs reculent à 3 m du palet, vers leur but (règle 17.6)',
    id => {
      const tactic = buildExample(id, story, { id: 'cf' });
      const step = tactic.steps[0]!;
      for (let n = 1; n <= 6; n++) {
        expect(step.poses[playerId('noir', n)]!.x).toBeGreaterThanOrEqual(
          step.puck.x + 3
        );
      }
    }
  );

  it('« Tactique de base » : les deux pivots au palet, chez l’adversaire', () => {
    const tactic = buildExample('freePuckPivots', story, { id: 'cf' });
    expect(tactic.steps[0]!.puck.x).toBeGreaterThan(tactic.pitch.length / 2);
    expect(whitesByDistance(tactic).slice(0, 2).sort()).toEqual([
      playerId('blanc', 4),
      playerId('blanc', 5),
    ]);
  });

  it('CIBPL : l’arrière au palet, les avants sur la ligne des 3 m', () => {
    const tactic = buildExample('freePuckBack', story, { id: 'cf' });
    const step = tactic.steps[0]!;
    expect(whitesByDistance(tactic)[0]).toBe(playerId('blanc', 6));
    for (const n of [1, 2, 3]) {
      const x = step.poses[playerId('blanc', n)]!.x;
      expect(Math.abs(x - (step.puck.x + 3))).toBeLessThan(0.6);
    }
  });
});

describe('les exercices', () => {
  const story = (n: number) => ({
    name: 'Exercice',
    notes: Array.from({ length: n }, (_, i) => `consigne ${i + 1}`),
  });

  it.each(DRILL_IDS)(
    '%s : ses seuls joueurs, ni remplaçants ni arbitres',
    id => {
      const tactic = buildExample(id, story(4), { id: `dr-${id}` });
      expect(tactic.counts.substitutes).toEqual({ blanc: 0, noir: 0 });
      expect(tactic.counts.referees).toBe(0);
      expect(tactic.counts.deckReferee).toBe(false);
      expect(visiblePlayers(tactic).length).toBeLessThanOrEqual(6);
    }
  );

  it('la passe à trois : toujours un joueur au fond avec le palet', () => {
    const tactic = buildExample('passThree', story(4), { id: 'dr' });
    tactic.steps.forEach(step => {
      const down = [1, 2, 3].filter(
        n => step.poses[playerId('blanc', n)]!.surface === false
      );
      expect(down.length).toBeGreaterThan(0);
    });
  });
});

describe('le choix dans la bibliothèque', () => {
  it('deux groupes, phases puis exercices, qui couvrent chaque exemple une fois', () => {
    expect(EXAMPLE_GROUPS.map(g => g.id)).toEqual(['plays', 'drills']);
    const listed = EXAMPLE_GROUPS.flatMap(g => [...g.ids]);
    expect(listed).toEqual([...EXAMPLE_IDS]);
    expect(new Set(listed).size).toBe(EXAMPLE_IDS.length);
  });

  it('les deux coups francs sont des phases de jeu', () => {
    expect(PLAY_IDS).toContain('freePuckPivots');
    expect(PLAY_IDS).toContain('freePuckBack');
  });

  it('quatre exercices', () => {
    expect(DRILL_IDS).toHaveLength(4);
  });
});

describe('les textes des exemples, dans chaque langue', () => {
  /** Comme l'écran des schémas : le nom, puis les consignes `noteN` dans l'ordre. */
  const storyIn = (
    locale: keyof typeof messages,
    id: ExampleId
  ): ExampleStory => {
    const m = messages[locale].schemas;
    const texts = m.examples[id] as Record<string, string>;
    const notes =
      id === 'neutral'
        ? [m.exampleNote1, m.exampleNote2, m.exampleNote3]
        : Object.keys(texts)
            .filter(key => key.startsWith('note'))
            .sort()
            .map(key => texts[key]!);
    return { name: texts.name!, notes };
  };

  // Une traduction plus longue que le français peut dépasser les 280
  // caractères d'une consigne : l'allemand y est le plus exposé.
  for (const locale of LOCALES) {
    it.each(EXAMPLE_IDS)(
      `${locale} · %s : une consigne entière par étape, un nom entier`,
      id => {
        const story = storyIn(locale, id);
        const tactic = buildExample(id, story, { id: `tx-${id}` });
        expect(() => tacticSchema.parse(tactic)).not.toThrow();
        // Ni consigne perdue (une de plus que d'étapes), ni consigne coupée
        // (le magasin tronque au-delà de 280 caractères, sans le dire).
        expect(tactic.steps.map(s => s.note)).toEqual(story.notes);
        expect(tactic.name).toBe(story.name);
      }
    );
  }
});

describe('les exemples respectent l’apnée', () => {
  it.each(EXAMPLE_IDS)('%s : aucun joueur au-delà du seuil', id => {
    const tactic = buildExample(
      id,
      { name: 'Phase', notes: ['a', 'b', 'c', 'd', 'e'] },
      { id: `ap-${id}` }
    );
    const table = apneaTable(tactic);
    tactic.steps.forEach((_, i) => {
      expect([...overLimit(table, i)]).toEqual([]);
    });
  });
});
