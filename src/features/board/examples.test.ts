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
  lineAt,
  PLAY_IDS,
  resolveExample,
  storyOf,
  type ExampleId,
  type ExampleStory,
} from './examples.ts';
import { GOAL_TRAY } from './pitch.ts';
import { apneaTable, overLimit } from './apnea.ts';
import { isCurved, pathMiddle } from './curve.ts';
import {
  playerId,
  tacticSchema,
  visiblePlayers,
  type Point,
  type Tactic,
} from './model.ts';
import { createBoardStore } from './store.ts';
import { lineOf, linesOf } from './variants.ts';

/** Chaque ligne du document, aplatie : la principale, puis les variantes. */
const linesOfDoc = (doc: Tactic) => linesOf(doc).map(l => lineOf(doc, l.id));

/**
 * Les consignes de tout le document, dans l'ordre de la frise : la ligne
 * principale, puis les étapes propres de chaque variante.
 */
const allNotes = (doc: Tactic) => [
  ...doc.steps.map(s => s.note),
  ...(doc.variants ?? []).flatMap(v => v.steps.map(s => s.note)),
];

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
  /** Les étapes de tout le document : principale, puis celles des variantes. */
  const STEPS: Record<ExampleId, number> = {
    neutral: 3,
    kickoff: 3,
    faceOff: 3,
    rightAttack: 3,
    wingSwitch: 5,
    wallPlay: 4,
    slide: 3,
    penalty: 4,
    freePuck: 7,
    twoOnOne: 4,
    passThree: 4,
    wallRelay: 4,
    piggyInMiddle: 4,
  };

  it.each(EXAMPLE_IDS)('%s : un schéma valide, une consigne par étape', id => {
    const tactic = buildExample(id, story(STEPS[id]), { id: `ex-${id}` });
    expect(() => tacticSchema.parse(tactic)).not.toThrow();
    expect(allNotes(tactic)).toEqual(story(STEPS[id]).notes);
  });

  it('seul le coup franc a des variantes', () => {
    for (const id of EXAMPLE_IDS) {
      const tactic = buildExample(id, story(STEPS[id]), { id: `ex-${id}` });
      expect(tactic.variants !== undefined).toBe(id === 'freePuck');
    }
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

  it('le second attaquant de la pénalité nage en arc, de l’autre côté du but', () => {
    const tactic = buildExample('penalty', story(4), { id: 'ex' });
    const id = playerId('noir', 2);
    const [before, step] = [tactic.steps[1]!, tactic.steps[2]!];
    const control = step.curves?.[id];
    expect(control).toBeDefined();
    const [a, b] = [before.poses[id]!, step.poses[id]!];
    expect(isCurved(a, b, control!)).toBe(true);
    // À mi-chemin, il est plus loin de l'axe du but que sa ligne droite :
    // il ouvre large, du côté où le palet retombe.
    const axis = tactic.pitch.width / 2;
    expect(pathMiddle(a, b, control).y - axis).toBeGreaterThan(
      (a.y + b.y) / 2 - axis + 1
    );
    // Une flèche droite contredirait le fantôme courbe : il n'en a pas.
    expect(
      step.arrows.filter(
        arrow =>
          arrow.kind === 'move' && arrow.from.x === a.x && arrow.from.y === a.y
      )
    ).toEqual([]);
    // Aucune autre nage courbe dans les exemples : une fonction, un exemple.
    for (const other of EXAMPLE_IDS.filter(e => e !== 'penalty')) {
      const doc = buildExample(other, story(7), { id: `cv-${other}` });
      for (const line of linesOfDoc(doc)) {
        expect(line.steps.every(s => !s.curves)).toBe(true);
      }
    }
  });

  it('le changement d’aile ombre l’aile libre, de la première étape à la dernière', () => {
    const tactic = buildExample(
      'wingSwitch',
      { ...story(5), marks: ['aile libre'] },
      { id: 'ex' }
    );
    const white1 = playerId('blanc', 1);
    for (const step of tactic.steps) {
      expect(step.zones).toHaveLength(1);
      const zone = step.zones![0]!;
      expect(zone.label).toBe('aile libre');
      // L'ailier gauche y attend, et y reçoit à la fin.
      const p = step.poses[white1]!;
      expect(p.x).toBeGreaterThan(zone.x);
      expect(p.x).toBeLessThan(zone.x + zone.w);
      expect(p.y).toBeGreaterThan(zone.y);
      expect(p.y).toBeLessThan(zone.y + zone.h);
    }
    // Aucun Noir sur l'aile libre tant que le palet n'y est pas arrivé.
    const [zone] = tactic.steps[0]!.zones!;
    for (let n = 1; n <= 6; n++) {
      const p = tactic.steps[0]!.poses[playerId('noir', n)]!;
      const inside =
        p.x > zone!.x &&
        p.x < zone!.x + zone!.w &&
        p.y > zone!.y &&
        p.y < zone!.y + zone!.h;
      expect(inside).toBe(false);
    }
    // Sans étiquette fournie, la zone reste, muette.
    const muette = buildExample('wingSwitch', story(5), { id: 'ex' });
    expect(muette.steps[0]!.zones![0]!.label).toBeUndefined();
  });
});

describe('le coup franc, une phase en deux variantes sourcées', () => {
  const story: ExampleStory = {
    name: 'Coup franc',
    notes: ['tronc', 'p1', 'p2', 'p3', 'a1', 'a2', 'a3'],
    lines: ['Par les pivots', 'Par l’arrière'],
  };
  const doc = buildExample('freePuck', story, { id: 'cf' });
  const [pivots, back] = linesOfDoc(doc) as [Tactic, Tactic];
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  /** Les Blancs dans l'eau, du plus proche au plus loin du palet. */
  const whitesByDistance = (tactic: Tactic, index: number) => {
    const step = tactic.steps[index]!;
    return [1, 2, 3, 4, 5, 6]
      .map(n => playerId('blanc', n))
      .sort(
        (a, b) =>
          distance(step.poses[a]!, step.puck) -
          distance(step.poses[b]!, step.puck)
      );
  };

  it('un document : la ligne des pivots, et la variante de l’arrière qui part du tronc', () => {
    expect(doc.variants).toHaveLength(1);
    expect(doc.variants![0]!.from).toBe(0);
    expect(doc.mainLine).toBe('Par les pivots');
    expect(doc.variants![0]!.name).toBe('Par l’arrière');
    expect(pivots.steps.map(s => s.note)).toEqual(['tronc', 'p1', 'p2', 'p3']);
    expect(back.steps.map(s => s.note)).toEqual(['tronc', 'a1', 'a2', 'a3']);
    // Le tronc est le même objet dans les deux lignes : une retouche du
    // coup franc sifflé vaut pour les deux.
    expect(back.steps[0]).toBe(pivots.steps[0]);
  });

  it('le tronc : le coup franc sifflé, et lui seul ouvre sur l’arrêt de jeu', () => {
    expect(pivots.steps[0]!.decision).toEqual({ kind: 'free', team: 'blanc' });
    for (const line of [pivots, back]) {
      expect(line.steps.slice(1).every(s => !s.decision)).toBe(true);
    }
  });

  it('les Noirs reculent à 3 m du palet, vers leur but (règle 17.6), jusqu’au signal', () => {
    for (const line of [pivots, back]) {
      for (const index of [0, 1]) {
        const step = line.steps[index]!;
        for (let n = 1; n <= 6; n++) {
          expect(step.poses[playerId('noir', n)]!.x).toBeGreaterThanOrEqual(
            step.puck.x + 3
          );
        }
      }
    }
  });

  it('un seul endroit pour les deux : chez l’adversaire, où la feinte se tente', () => {
    expect(pivots.steps[0]!.puck.x).toBeGreaterThan(doc.pitch.length / 2);
    expect(back.steps[1]!.puck).toEqual(pivots.steps[1]!.puck);
  });

  it('« Tactique de base » : les deux pivots au palet', () => {
    expect(whitesByDistance(pivots, 1).slice(0, 2).sort()).toEqual([
      playerId('blanc', 4),
      playerId('blanc', 5),
    ]);
  });

  it('CIBPL : l’arrière au palet, les avants sur la ligne des 3 m', () => {
    const step = back.steps[1]!;
    expect(whitesByDistance(back, 1)[0]).toBe(playerId('blanc', 6));
    for (const n of [1, 2, 3]) {
      const x = step.poses[playerId('blanc', n)]!.x;
      expect(Math.abs(x - (step.puck.x + 3))).toBeLessThan(0.6);
    }
  });

  it('s’ouvre sur la ligne principale dans le tableau', () => {
    const store = createBoardStore(doc);
    store.getState().load(doc);
    expect(store.getState().line).toBeNull();
    expect(store.getState().tactic.steps.map(s => s.note)).toEqual([
      'tronc',
      'p1',
      'p2',
      'p3',
    ]);
  });
});

describe('les anciens identifiants du coup franc', () => {
  it('se résolvent vers le nouvel exemple, chacun sur sa ligne', () => {
    expect(resolveExample('freePuckPivots')).toEqual({
      id: 'freePuck',
      line: 0,
    });
    expect(resolveExample('freePuckBack')).toEqual({ id: 'freePuck', line: 1 });
    expect(resolveExample('freePuck')).toEqual({ id: 'freePuck', line: 0 });
    expect(resolveExample('kickoff')).toEqual({ id: 'kickoff', line: 0 });
    expect(resolveExample('inconnu')).toBeNull();
    expect(resolveExample('toString')).toBeNull();
  });

  it('« par l’arrière » ouvre le tableau sur la variante de l’arrière', () => {
    const story = storyOf(
      fr.schemas.examples.freePuck as Record<string, string>
    );
    const ref = resolveExample('freePuckBack')!;
    const doc = buildExample(ref.id, story, { id: 'cf' });
    const store = createBoardStore(doc);
    store.getState().load(doc);
    const line = lineAt(doc, ref.line);
    expect(line).not.toBeNull();
    store.getState().setLine(line);
    const shown = store.getState().tactic;
    expect(store.getState().line).toBe(doc.variants![0]!.id);
    expect(shown.steps[1]!.note).toBe(story.notes[4]);
    expect(shown.steps[1]!.note).toContain('CIBPL-FFESSM');
  });

  it('un rang de ligne qui n’existe pas rend la principale', () => {
    const doc = buildExample('kickoff', { name: 'x', notes: [] }, { id: 'k' });
    expect(lineAt(doc, 0)).toBeNull();
    expect(lineAt(doc, 1)).toBeNull();
  });
});

describe('l’histoire d’un exemple, lue dans son catalogue', () => {
  it('prend les clés numérotées dans l’ordre de leur numéro, jusqu’à la première absente', () => {
    const texts: Record<string, string> = { name: 'N', hint: 'h' };
    for (let n = 1; n <= 11; n++) texts[`note${n}`] = `c${n}`;
    texts.line1 = 'L1';
    texts.line2 = 'L2';
    texts.mark1 = 'M1';
    texts.mark3 = 'orpheline';
    const story = storyOf(texts);
    expect(story.notes).toEqual(
      Array.from({ length: 11 }, (_, i) => `c${i + 1}`)
    );
    expect(story.lines).toEqual(['L1', 'L2']);
    expect(story.marks).toEqual(['M1']);
    expect(storyOf({ name: 'N' })).toEqual({ name: 'N', notes: [] });
  });

  it('le coup franc a deux noms de ligne, et chacun dit sa source', () => {
    for (const locale of LOCALES) {
      const story = storyOf(
        messages[locale].schemas.examples.freePuck as Record<string, string>
      );
      expect(story.lines).toHaveLength(2);
      expect(story.lines![0]).toContain('Tactique de base');
      expect(story.lines![1]).toContain('CIBPL-FFESSM');
      // La première consigne propre de chaque variante nomme son document.
      expect(story.notes[1]).toContain(
        'Tactique de base du hockey subaquatique'
      );
      expect(story.notes[4]).toContain('Le coup franc');
      expect(story.notes[4]).toContain('CIBPL-FFESSM');
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

  it('le chat au milieu : trois bandes, et chaque paire dans la sienne', () => {
    const tactic = buildExample('piggyInMiddle', story(4), { id: 'dr' });
    const step = tactic.steps[0]!;
    const bands = step.zones!;
    expect(bands).toHaveLength(3);
    // Trois bandes d'une ligne d'eau à l'autre, collées, à travers le bassin.
    bands.forEach((band, i) => {
      expect(band.shape).toBe('rect');
      expect(band.h).toBeCloseTo(2.5);
      if (i > 0) expect(band.y).toBeCloseTo(bands[i - 1]!.y + 2.5);
    });
    const bandOf = (p: Point) =>
      bands.findIndex(b => p.y > b.y && p.y < b.y + b.h);
    expect(bandOf(step.poses[playerId('blanc', 1)]!)).toBe(0);
    expect(bandOf(step.poses[playerId('blanc', 2)]!)).toBe(0);
    expect(bandOf(step.poses[playerId('noir', 1)]!)).toBe(1);
    expect(bandOf(step.poses[playerId('noir', 2)]!)).toBe(1);
    expect(bandOf(step.poses[playerId('blanc', 3)]!)).toBe(2);
    expect(bandOf(step.poses[playerId('blanc', 4)]!)).toBe(2);
    // L'endroit ne bouge pas : chaque étape garde les bandes.
    for (const s of tactic.steps) expect(s.zones).toEqual(bands);
    // Le dernier flick retombe au-delà de la bande du haut.
    expect(tactic.steps.at(-1)!.puck.y).toBeLessThan(bands[0]!.y);
  });
});

describe('le choix dans la bibliothèque', () => {
  it('deux groupes, phases puis exercices, qui couvrent chaque exemple une fois', () => {
    expect(EXAMPLE_GROUPS.map(g => g.id)).toEqual(['plays', 'drills']);
    const listed = EXAMPLE_GROUPS.flatMap(g => [...g.ids]);
    expect(listed).toEqual([...EXAMPLE_IDS]);
    expect(new Set(listed).size).toBe(EXAMPLE_IDS.length);
  });

  it('le coup franc est une phase de jeu, une seule fois', () => {
    expect(PLAY_IDS.filter(id => id.startsWith('freePuck'))).toEqual([
      'freePuck',
    ]);
  });

  it('quatre exercices', () => {
    expect(DRILL_IDS).toHaveLength(4);
  });
});

describe('les textes des exemples, dans chaque langue', () => {
  /** Comme l'écran des schémas : le nom, puis les clés numérotées dans l'ordre. */
  const storyIn = (
    locale: keyof typeof messages,
    id: ExampleId
  ): ExampleStory => {
    const m = messages[locale].schemas;
    const story = storyOf(m.examples[id] as Record<string, string>);
    return id === 'neutral'
      ? { ...story, notes: [m.exampleNote1, m.exampleNote2, m.exampleNote3] }
      : story;
  };

  // Une traduction plus longue que le français peut dépasser les 280
  // caractères d'une consigne, ou les 40 d'un nom de ligne, ou les 32 d'une
  // étiquette : l'allemand y est le plus exposé.
  for (const locale of LOCALES) {
    it.each(EXAMPLE_IDS)(
      `${locale} · %s : une consigne entière par étape, des noms entiers`,
      id => {
        const story = storyIn(locale, id);
        const tactic = buildExample(id, story, { id: `tx-${id}` });
        expect(() => tacticSchema.parse(tactic)).not.toThrow();
        // Ni consigne perdue (une de plus que d'étapes), ni consigne coupée
        // (le magasin tronque au-delà de 280 caractères, sans le dire).
        expect(allNotes(tactic)).toEqual(story.notes);
        expect(tactic.name).toBe(story.name);
        // Ni nom de ligne ni étiquette coupés, ni perdus.
        expect(
          linesOf(tactic)
            .map(l => l.name)
            .filter(Boolean)
        ).toEqual(story.lines ?? []);
        const labels = tactic.steps[0]!.zones?.flatMap(z =>
          z.label ? [z.label] : []
        );
        expect(labels ?? []).toEqual(story.marks ?? []);
      }
    );
  }
});

describe('les exemples respectent l’apnée', () => {
  it.each(EXAMPLE_IDS)(
    '%s : aucun joueur au-delà du seuil, sur chaque ligne',
    id => {
      const doc = buildExample(
        id,
        { name: 'Phase', notes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
        { id: `ap-${id}` }
      );
      for (const tactic of linesOfDoc(doc)) {
        const table = apneaTable(tactic);
        tactic.steps.forEach((_, i) => {
          expect([...overLimit(table, i)]).toEqual([]);
        });
      }
    }
  );
});
