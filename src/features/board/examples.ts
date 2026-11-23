import { controlThrough } from './curve.ts';
import { createTactic, playerId, PUCK_ID, type Tactic } from './model.ts';
import { createBoardStore } from './store.ts';
import type { SuggestedTag } from './tags.ts';
import { linesOf, type LineId } from './variants.ts';

export interface ExampleTexts {
  name: string;
  notes: [string, string, string];
}

/**
 * UN SCHÉMA D'EXEMPLE, pour qui ouvre l'application sans rien y avoir mis.
 *
 * Une bibliothèque vide n'apprend rien : trois étapes montrent d'un coup ce
 * qu'un schéma sait dire — une situation du règlement, des joueurs qui
 * plongent, des flèches de déplacement, une passe et sa consigne.
 *
 * Il est CONSTRUIT par le magasin du tableau, geste après geste, et non
 * écrit à la main : un exemple qui contournerait les règles du tableau
 * (bassin borné, profondeurs, flèches) finirait par montrer une position que
 * le tableau ne sait pas produire.
 */
export function exampleTactic(
  texts: ExampleTexts,
  options: { id: string; now?: string }
): Tactic {
  const store = createBoardStore(
    createTactic({ id: options.id, name: texts.name, now: options.now })
  );
  const s = () => store.getState();
  const at = (id: string) => {
    const pose = s().tactic.steps[s().step]!.poses[id]!;
    return { x: pose.x, y: pose.y };
  };

  // 1. Palet neutre au centre : tout le monde en surface, de son côté.
  s().applySituation('equal');
  s().setNote(texts.notes[0]);
  s().setDuration(3);

  // 2. Trois Blancs plongent et montent vers le palet.
  s().addStep();
  for (const number of [1, 2, 3]) {
    const id = playerId('blanc', number);
    const from = at(id);
    const to = { x: from.x + 4, y: from.y + (2 - number) * 0.8 };
    s().move(id, to);
    s().setSurface(id, false);
    s().addArrow({ kind: 'move', from, to: at(id) });
  }
  s().setNote(texts.notes[1]);
  s().setDuration(4);

  // 3. Le palet part en passe vers l'aile, l'arrière couvre.
  s().addStep();
  const puckFrom = s().tactic.steps[s().step]!.puck;
  const receiver = at(playerId('blanc', 1));
  const puckTo = { x: receiver.x + 0.6, y: receiver.y };
  s().move(PUCK_ID, puckTo);
  s().addArrow({ kind: 'pass', from: puckFrom, to: puckTo });
  s().setNote(texts.notes[2]);
  s().setDuration(3);

  s().goTo(0);
  return s().tactic;
}

/**
 * LES SCHÉMAS D'EXEMPLE TIRÉS DES DOCUMENTS DE FORMATION (18/11/2026) :
 * l'engagement en 3-2-1, le changement d'aile, la pénalité à deux contre un.
 * Les mouvements suivent les fiches de formation fédérales et les manuels de
 * club que l'utilisateur a fournis (FFESSM, CIBPL, « Fondamentaux techniques
 * et tactiques », manuel de la WUHA) ; les placements sont REDESSINÉS et les
 * consignes RÉÉCRITES — aucun schéma ni texte n'est recopié.
 *
 * Même règle que l'exemple d'ouverture : chacun est construit par le magasin
 * du tableau, geste après geste.
 *
 * DEUX FAMILLES, choisies à part dans la bibliothèque : les PHASES DE JEU
 * (une situation de match, six contre six) et les EXERCICES d'entraînement
 * (quelques joueurs, un geste à répéter). Le coup franc est UNE phase, en
 * deux variantes (ADR 0027), parce que les sources se contredisent :
 * l'entraîneur choisit sa ligne, le nom de chacune dit son document.
 *
 * QUATRE EXEMPLES MONTRENT UNE FONCTION, là où elle dit vrai dans l'eau
 * (ADR 0038) : les variantes du coup franc, la zone de l'aile laissée libre
 * au changement d'aile, la nage courbe du second attaquant de la pénalité,
 * les trois bandes du chat au milieu.
 */
export const PLAY_IDS = [
  'neutral',
  'kickoff',
  'faceOff',
  'rightAttack',
  'wingSwitch',
  'wallPlay',
  'slide',
  'penalty',
  'freePuck',
] as const;
export const DRILL_IDS = [
  'twoOnOne',
  'passThree',
  'wallRelay',
  'piggyInMiddle',
] as const;
export const EXAMPLE_IDS = [...PLAY_IDS, ...DRILL_IDS] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];

/** Le choix dans la bibliothèque, dans cet ordre : les phases, puis les exercices. */
export const EXAMPLE_GROUPS = [
  { id: 'plays', ids: PLAY_IDS },
  { id: 'drills', ids: DRILL_IDS },
] as const;
export type ExampleGroupId = (typeof EXAMPLE_GROUPS)[number]['id'];

/**
 * LES ÉTIQUETTES DES EXEMPLES (ADR 0029), des proposées seulement : leur
 * identifiant neutre se lit dans la langue de chacun. Le palet neutre, le
 * coup franc et la pénalité sont des phases arrêtées ; trois exemples
 * travaillent le jeu au mur.
 */
export const EXAMPLE_TAGS: Record<ExampleId, readonly SuggestedTag[]> = {
  neutral: ['setPiece', 'attack'],
  kickoff: ['kickoff'],
  faceOff: ['setPiece'],
  rightAttack: ['attack'],
  wingSwitch: ['attack'],
  wallPlay: ['attack', 'wall'],
  slide: ['defense'],
  penalty: ['setPiece'],
  freePuck: ['setPiece'],
  twoOnOne: ['drill', 'attack'],
  passThree: ['drill'],
  wallRelay: ['drill', 'wall'],
  piggyInMiddle: ['drill'],
};

/** Un exemple à ouvrir, et la ligne à montrer : 0 la principale (ADR 0027). */
export interface ExampleRef {
  id: ExampleId;
  line: number;
}

/**
 * LES ANCIENS IDENTIFIANTS D'EXEMPLE. Jusqu'au 23/11/2026, le coup franc
 * était deux exemples ; chacun ouvre désormais le coup franc sur SA ligne.
 * Un identifiant d'avant peut traîner dans un test, une adresse ou un état
 * gardé : il ouvre ce qu'il ouvrait.
 */
const LEGACY_EXAMPLES: ReadonlyMap<string, ExampleRef> = new Map([
  ['freePuckPivots', { id: 'freePuck', line: 0 }],
  ['freePuckBack', { id: 'freePuck', line: 1 }],
]);

/**
 * Un identifiant d'exemple, d'aujourd'hui ou d'avant, et la ligne où
 * l'ouvrir ; `null` pour un identifiant inconnu.
 */
export function resolveExample(id: string): ExampleRef | null {
  if ((EXAMPLE_IDS as readonly string[]).includes(id)) {
    return { id: id as ExampleId, line: 0 };
  }
  return LEGACY_EXAMPLES.get(id) ?? null;
}

/**
 * La ligne d'un document par son rang dans la frise : 0 la principale, 1 la
 * première variante. Un rang qui n'existe pas rend la principale.
 */
export function lineAt(doc: Tactic, index: number): LineId {
  return linesOf(doc)[index]?.id ?? null;
}

export interface ExampleStory {
  name: string;
  /**
   * Les consignes, étape après étape : la ligne principale, puis les étapes
   * propres de chaque variante, dans l'ordre de la frise.
   */
  notes: string[];
  /** Les noms des lignes (ADR 0027), la principale d'abord. */
  lines?: string[];
  /** Les étiquettes de zone (ADR 0026), dans l'ordre où l'exemple les pose. */
  marks?: string[];
}

/**
 * L'HISTOIRE D'UN EXEMPLE, lue dans son catalogue : le nom, puis les clés
 * numérotées `noteN`, `lineN` et `markN`, de 1 à la première qui manque. Un
 * tri des clés rangerait `note10` avant `note2`.
 */
export function storyOf(texts: Record<string, string>): ExampleStory {
  const numbered = (prefix: string) => {
    const found: string[] = [];
    for (let n = 1; texts[`${prefix}${n}`] !== undefined; n++) {
      found.push(texts[`${prefix}${n}`]!);
    }
    return found;
  };
  const lines = numbered('line');
  const marks = numbered('mark');
  return {
    name: texts.name ?? '',
    notes: numbered('note'),
    ...(lines.length > 0 ? { lines } : {}),
    ...(marks.length > 0 ? { marks } : {}),
  };
}

type Store = ReturnType<typeof createBoardStore>;

/** Les petits gestes partagés par les exemples : placer, nager, passer. */
function director(store: Store) {
  const s = () => store.getState();
  const at = (id: string) => {
    const pose = s().tactic.steps[s().step]!.poses[id]!;
    return { x: pose.x, y: pose.y };
  };
  const puck = () => s().tactic.steps[s().step]!.puck;
  return {
    s,
    at,
    puck,
    /** Poser un jeton sans flèche (la mise en place d'une étape). */
    place(id: string, x: number, y: number, surface?: boolean, angle?: number) {
      s().move(id, { x, y });
      if (surface !== undefined) s().setSurface(id, surface);
      if (angle !== undefined) s().rotate(id, angle);
    },
    /** Nager jusqu'à un point, la flèche de déplacement en trace. */
    swim(id: string, x: number, y: number, surface = false) {
      const from = at(id);
      s().move(id, { x, y });
      s().setSurface(id, surface);
      s().addArrow({ kind: 'move', from, to: at(id) });
    },
    /**
     * Nager en arc, en passant par `via` à mi-chemin (`curve.ts`), comme la
     * poignée du tableau. Sans flèche : une flèche est droite, et dirait
     * l'inverse du chemin que trace le fantôme.
     */
    curve(id: string, x: number, y: number, via: { x: number; y: number }) {
      const from = at(id);
      s().move(id, { x, y });
      s().setSurface(id, false);
      s().setCurve(id, controlThrough(from, at(id), via));
    },
    /** Le palet part, en passe ou en flick. */
    send(x: number, y: number, kind: 'pass' | 'flick' = 'pass') {
      const from = puck();
      s().move(PUCK_ID, { x, y });
      s().addArrow({ kind, from, to: puck() });
    },
    /** Le palet suit le joueur qui le porte, sans flèche à lui. */
    carry(x: number, y: number) {
      s().move(PUCK_ID, { x, y });
    },
    step(note: string | undefined, duration: number) {
      s().setNote(note ?? '');
      s().setDuration(duration);
    },
  };
}

/** Les six Blancs en 3-2-1, nommés comme dans les clubs : AG, AC, AD, PG, PD, AR. */
const ROLES_321: Record<number, string> = {
  1: 'AG',
  2: 'AC',
  3: 'AD',
  4: 'PG',
  5: 'PD',
  6: 'AR',
};
const white = (n: number) => playerId('blanc', n);
const black = (n: number) => playerId('noir', n);

/** Les mêmes noms, par identifiant de joueur. */
const namesById = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(ROLES_321).map(([n, name]) => [white(Number(n)), name])
  );

function nameWhites(store: Store) {
  for (const [id, name] of Object.entries(namesById())) {
    store.getState().rename(id, name);
  }
}

/**
 * L'ENGAGEMENT EN 3-2-1. Le long du mur, dans l'ordre que donnent les
 * fiches : arrière, pivot gauche, ailier gauche, avant-centre, ailier droit,
 * pivot droit. Au signal, l'avant-centre plonge droit sur le palet, les
 * ailiers le suivent un peu en arrière et serrés, les pivots s'étagent,
 * l'arrière se centre derrière eux ; puis la passe vers une aile.
 */
function kickoff(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applySituation('kickoff');
  nameWhites(store);
  const order = [6, 4, 1, 2, 3, 5];
  order.forEach((n, i) => d.place(white(n), 0.6, 3.75 + i * 1.5, true, 0));
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(2), 11.6, 7.5);
  d.swim(white(1), 10, 6.3);
  d.swim(white(3), 10, 8.7);
  d.swim(white(4), 7, 6.4);
  d.swim(white(5), 5.6, 8.6);
  d.swim(white(6), 3.6, 7.5);
  d.swim(black(3), 14.2, 7.5);
  d.step(story.notes[1], 4);

  d.s().addStep();
  d.send(13.6, 10.4);
  d.swim(white(3), 13.9, 10.6);
  d.swim(white(2), 12.6, 8.4);
  d.step(story.notes[2], 3);
  d.s().goTo(0);
}

/**
 * LE CHANGEMENT D'AILE. L'ailier droit, bloqué sur le mur, attire la
 * défense ; le palet repart en arrière — pivot droit, arrière, pivot
 * gauche — et ressort sur l'aile laissée libre.
 *
 * L'aile libre est OMBRÉE dès la première étape (ADR 0026) : c'est l'endroit
 * que vise toute la phase, et il ne bouge pas — chaque étape ajoutée garde
 * la zone. L'ailier gauche y attend ; l'étiquette, au centre, se lit
 * au-dessus de lui sans toucher l'onde de son pion en surface. La zone
 * s'arrête à 21 m : l'arbitre 3 se tient par défaut à (20 ; 2), et une zone
 * centrée plus loin posait son étiquette sous son jeton (vu le 23/11/2026).
 */
function wingSwitch(store: Store, story: ExampleStory) {
  const d = director(store);
  const label = story.marks?.[0];
  d.s().addZone({
    shape: 'rect',
    x: 13.6,
    y: 0.2,
    w: 7.6,
    h: 3.6,
    ...(label ? { label } : {}),
  });
  d.s().applyFormation('blanc', '3-2-1', namesById());
  d.place(white(3), 18.5, 13.5, false, 0);
  d.place(white(2), 16.4, 9.6, true, 0);
  d.place(white(1), 17.4, 3.4, true, 0);
  d.place(white(5), 14, 11.6, true, 0);
  d.place(white(4), 12.4, 4.8, true, 0);
  d.place(white(6), 10.4, 7.5, true, 0);
  d.carry(19.1, 13.5);
  d.place(black(1), 20.1, 13.1, false, 180);
  d.place(black(2), 19.6, 11.8, false, 180);
  d.place(black(3), 21.2, 10.8, true, 180);
  d.place(black(4), 22, 8.6, true, 180);
  d.place(black(5), 22.2, 5.4, true, 180);
  d.place(black(6), 23.4, 7.5, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.s().rotate(white(3), 180);
  d.send(14.4, 11.6);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.swim(white(5), 13.6, 11.2);
  d.send(10.8, 7.5);
  // On respire : l'ailier qui a donné, et le premier défenseur collé au mur
  // (la frise d'apnée le réclamait).
  d.s().setSurface(white(3), true);
  d.s().setSurface(black(1), true);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.swim(white(6), 10.4, 6.6);
  d.send(12.1, 4.9);
  d.s().setSurface(black(2), true);
  d.s().setSurface(white(5), true);
  d.step(story.notes[3], 3);

  d.s().addStep();
  d.s().setSurface(white(6), true);
  d.swim(white(4), 14.6, 4.2);
  d.send(18.1, 3.2);
  d.swim(white(1), 18.4, 3.2);
  d.step(story.notes[4], 4);
  d.s().goTo(0);
}

/**
 * LA PÉNALITÉ À DEUX CONTRE UN. Les attaquants en surface l'un derrière
 * l'autre, à hauteur du palet, à 3 m du but ; le défenseur touche le mur.
 * Le premier part d'un côté et lève le palet derrière le défenseur ; le
 * second, parti de l'autre, le pousse dans la cuvette.
 *
 * Le second NAGE EN ARC (ADR 0019) : tout droit, il passerait dans le dos du
 * premier et sur le défenseur ; il ouvre large de l'autre côté du but pour
 * arriver derrière lui, là où le palet retombe.
 */
function penalty(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applySituation('penalty-blanc');
  const spot = d.puck();
  d.place(black(1), spot.x + 0.5, spot.y, true, 180);
  d.place(black(2), spot.x + 1.8, spot.y, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(black(1), spot.x - 0.4, spot.y - 1.8);
  d.carry(spot.x - 0.8, spot.y - 1.8);
  d.swim(white(1), 0.9, spot.y - 1);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.send(1.2, spot.y + 1.4, 'flick');
  d.curve(black(2), 1.6, spot.y + 1.4, { x: spot.x + 0.4, y: spot.y + 2.1 });
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.send(0.07, spot.y + 1.1);
  d.step(story.notes[3], 2);
  d.s().goTo(0);
}

/** Les Noirs en face, en miroir des Blancs : x renversé, y gardé. */
function mirrorBlacks(store: Store) {
  const d = director(store);
  for (let n = 1; n <= 6; n++) {
    const p = d.at(white(n));
    d.place(black(n), 25 - p.x, p.y, true, 180);
  }
}

/**
 * L'ENTRE-DEUX. Tout le monde en surface jusqu'au signal ; les avants face
 * à leurs vis-à-vis de part et d'autre de la ligne des arbitres, les pivots
 * derrière, l'arrière entre eux. Au signal, l'avant-centre plonge les pieds
 * d'abord, droit sur le palet, et ne remonte pas avant que le palet soit
 * parti sur l'aile.
 */
function faceOff(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applySituation('equal');
  nameWhites(store);
  d.place(white(1), 11.3, 5.5, true, 0);
  d.place(white(2), 11.3, 7.5, true, 0);
  d.place(white(3), 11.3, 9.5, true, 0);
  d.place(white(4), 8.8, 6, true, 0);
  d.place(white(5), 8.8, 9, true, 0);
  d.place(white(6), 6.8, 7.5, true, 0);
  mirrorBlacks(store);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(2), 12.1, 7.5);
  d.swim(black(2), 12.9, 7.5);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.send(14.2, 4.6);
  d.swim(white(1), 14.4, 4.6);
  d.s().setSurface(black(2), true);
  d.step(story.notes[2], 3);
  d.s().goTo(0);
}

/**
 * L'ATTAQUE À DROITE DANS LEUR MOITIÉ. L'ailier droit porte, l'avant-centre
 * attend la passe, l'ailier gauche se démarque haut à gauche ; la ligne
 * d'arrière monte pour reprendre vite un palet perdu. Dans leur terrain, on
 * fonce au centre du but.
 */
function rightAttack(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applyFormation('blanc', '3-2-1', namesById());
  d.place(white(3), 17.5, 12.5, false, 0);
  d.place(white(2), 16, 9, true, 0);
  d.place(white(1), 19.5, 3.5, true, 0);
  d.place(white(4), 13, 5.5, true, 0);
  d.place(white(5), 14, 10.5, true, 0);
  d.place(white(6), 11.5, 7.5, true, 0);
  d.carry(18, 12.5);
  d.place(black(1), 19.5, 12, false, 180);
  d.place(black(2), 20.5, 9.5, true, 180);
  d.place(black(3), 21, 5, true, 180);
  d.place(black(4), 22.5, 10, true, 180);
  d.place(black(5), 22.5, 5.5, true, 180);
  d.place(black(6), 23.5, 7.5, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(3), 19, 12.8);
  d.carry(19.5, 12.8);
  d.swim(white(4), 15, 5.5, true);
  d.swim(white(5), 16, 11, true);
  d.swim(white(6), 13.5, 7.5, true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.send(19.6, 8.6);
  d.swim(white(2), 19.8, 8.6);
  d.s().setSurface(white(3), true);
  d.s().setSurface(black(1), true);
  d.step(story.notes[2], 3);
  d.s().goTo(0);
}

/**
 * JOUER LE MUR, PUIS SORTIR. Le pivot droit bataille sur son mur, l'ailier
 * droit tourné vers lui alterne sandwichs et retournés, l'avant-centre en
 * léger retrait ratisse et fait écran, l'arrière soutient ; l'ailier opposé
 * reste dehors, et c'est lui qui part en contre-attaque à la sortie.
 */
function wallPlay(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applyFormation('blanc', '3-2-1', namesById());
  d.place(white(5), 9, 14.1, false, 0);
  d.place(white(3), 10.4, 13.5, false, 180);
  d.place(white(2), 8.2, 12.6, false, 0);
  d.place(white(6), 6.8, 12.3, true, 0);
  d.place(white(1), 11.5, 4, true, 0);
  d.place(white(4), 5.5, 6.5, true, 0);
  d.carry(9.4, 14.2);
  d.place(black(1), 9.9, 13.8, false, 180);
  d.place(black(2), 10.8, 12.4, false, 180);
  d.place(black(3), 8.8, 11.2, true, 180);
  d.place(black(4), 13, 9, true, 180);
  d.place(black(5), 14, 5.5, true, 180);
  d.place(black(6), 16, 7.5, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.send(6.6, 12, 'flick');
  d.swim(white(6), 6.6, 12);
  d.s().setSurface(white(5), true);
  d.s().setSurface(white(2), true);
  d.s().setSurface(black(1), true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.send(8.6, 9.6);
  d.swim(white(2), 8.6, 9.6);
  d.s().setSurface(white(3), true);
  d.s().setSurface(black(2), true);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.send(12.2, 4.2);
  d.swim(white(1), 12.4, 4.2);
  d.s().setSurface(white(6), true);
  d.step(story.notes[3], 3);
  d.s().goTo(0);
}

/**
 * LA DÉFENSE QUI COULISSE, action à gauche de notre terrain, en trois
 * profondeurs de palet : au niveau de nos avants, de notre pivot, de notre
 * arrière. Les avants font les sandwichs ; les pivots montent ou descendent
 * selon le danger ; l'ailier opposé règle sa hauteur sur l'avant-centre.
 */
function slide(store: Store, story: ExampleStory) {
  const d = director(store);
  d.s().applyFormation('blanc', '3-2-1', namesById());
  d.place(white(1), 13.5, 3.4, false, 0);
  d.place(white(2), 13.2, 5.6, true, 0);
  d.place(white(3), 13.8, 9.6, true, 0);
  d.place(white(4), 10.5, 4.6, true, 0);
  d.place(white(5), 10, 10, true, 0);
  d.place(white(6), 7, 7.5, true, 0);
  d.place(black(1), 14.6, 3, false, 180);
  d.carry(14.1, 3);
  d.place(black(2), 16.5, 5.5, true, 180);
  d.place(black(3), 17.5, 10, true, 180);
  d.place(black(4), 19, 4.5, true, 180);
  d.place(black(5), 19.5, 10, true, 180);
  d.place(black(6), 21.5, 7.5, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(black(1), 10.4, 3.2);
  d.carry(9.9, 3.2);
  d.swim(white(4), 9.5, 3.6);
  d.swim(white(5), 7.2, 9.5, true);
  d.place(white(1), 11.5, 3, true);
  d.place(white(2), 11.6, 5.6, true);
  d.place(white(3), 11.6, 9.8, true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.swim(black(1), 7, 3.6);
  d.carry(6.5, 3.6);
  d.s().setSurface(white(4), true);
  d.swim(white(6), 6.2, 4.2);
  d.swim(white(5), 3.5, 7.5, true);
  d.swim(white(1), 8.5, 3.4, true);
  d.swim(white(2), 8.8, 6, true);
  d.swim(white(3), 7.8, 9.8, true);
  d.step(story.notes[2], 3);
  d.s().goTo(0);
}

/**
 * LE COUP FRANC, UNE PHASE EN DEUX VARIANTES (ADR 0027, ADR 0038) : deux
 * documents de formation ne le jouent pas de la même façon.
 *
 * LE TRONC est ce que dit le règlement, et que les deux supposent : l'arbitre
 * arrête le jeu, les Noirs reculent derrière la ligne des 3 m, vers leur but
 * (17.6) ; les avants blancs leur font face. La phase se sépare là où les
 * documents se séparent : qui se place au-dessus du palet.
 *
 * - LA LIGNE PRINCIPALE suit « Tactique de base du hockey subaquatique » :
 *   les pivots seuls le jouent, et la feinte ne se tente que dans la moitié
 *   adverse — d'où le palet posé chez les Noirs. Un pivot plonge le premier
 *   et passe sur le palet comme s'il l'emportait ; l'autre le prend et sert
 *   l'avant-centre.
 * - LA VARIANTE suit la fiche « Le coup franc » du CIBPL-FFESSM (initiateur
 *   hockey subaquatique) : l'arrière au-dessus du palet, un pivot à côté de
 *   lui, l'autre en retrait. Au signal, l'arrière avance tant qu'on le
 *   laisse passer, puis tire vers ses avants et suit son palet. La fiche ne
 *   dit pas où le coup franc est sifflé : il l'est au même endroit.
 *
 * Le reste du placement n'est dit par aucun des deux : c'est un point de
 * départ. Les consignes viennent dans l'ordre de la frise : le tronc, les
 * trois étapes des pivots, puis les trois de l'arrière.
 */
function freePuck(store: Store, story: ExampleStory) {
  const d = director(store);
  nameWhites(store);

  // Le tronc : le coup franc sifflé, l'arrêt de jeu sur lequel la phase
  // s'ouvre. Personne n'est encore au-dessus du palet.
  d.carry(16, 7.5);
  d.s().applySituation('advantage-blanc');
  d.place(white(1), 18.6, 3.75, true, 0);
  d.place(white(2), 18.6, 7.5, true, 0);
  d.place(white(3), 18.6, 11.25, true, 0);
  d.place(white(4), 14.2, 5.6, true, 0);
  d.place(white(5), 14.2, 9.4, true, 0);
  d.place(white(6), 11.4, 7.5, true, 0);
  d.s().setDecision({ kind: 'free', team: 'blanc' });
  d.step(story.notes[0], 3);

  // La ligne principale, par les pivots. Une étape copiée garderait l'arrêt
  // de jeu : il n'ouvre que la première.
  d.s().addStep();
  d.s().setDecision(null);
  d.swim(white(4), 15.3, 6.9, true);
  d.swim(white(5), 15.3, 8.1, true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.swim(white(4), 17.4, 10.4);
  d.swim(black(3), 18.6, 10.6);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.swim(white(5), 15.6, 7.5);
  d.send(18.1, 6.9);
  d.swim(white(2), 17.7, 6.9);
  d.s().setSurface(white(4), true);
  d.step(story.notes[3], 3);

  // La variante, par l'arrière : elle naît du tronc.
  d.s().goTo(0);
  d.s().createVariant();
  d.s().setDecision(null);
  d.swim(white(6), 15.5, 7.5, true);
  d.swim(white(4), 15.3, 6, true);
  d.swim(white(5), 12.5, 8.4, true);
  d.step(story.notes[4], 3);

  d.s().addStep();
  d.swim(white(6), 17.2, 7.9);
  d.carry(17.7, 7.9);
  d.swim(white(4), 16.3, 6.2);
  d.swim(white(1), 18.4, 4.9);
  d.swim(black(1), 18.9, 4.4);
  d.swim(white(2), 18.6, 7);
  d.swim(black(2), 19.1, 7.8);
  d.swim(white(3), 18.5, 10.4);
  d.swim(black(3), 19.1, 10.8);
  d.step(story.notes[5], 3);

  d.s().addStep();
  d.send(20, 10);
  d.swim(white(3), 19.5, 10);
  d.swim(white(6), 19, 9);
  d.swim(white(4), 17.8, 6.6, true);
  d.s().setSurface(white(1), true);
  d.s().setSurface(black(1), true);
  d.step(story.notes[6], 3);

  // Les noms des lignes disent leur source ; on rouvre sur la principale.
  d.s().renameLine(story.lines?.[1] ?? '');
  d.s().setLine(null);
  d.s().renameLine(story.lines?.[0] ?? '');
  d.s().goTo(0);
}

/**
 * UN EXERCICE NE MET À L'EAU QUE SES JOUEURS : ni remplaçants, ni arbitres.
 * Six contre six et quatre officiels autour d'un deux contre un cacheraient
 * ce que l'exercice demande de regarder.
 */
function drillSquad(store: Store, whites: number, blacks: number) {
  const s = () => store.getState();
  s().setCount('blanc', whites);
  s().setCount('noir', blacks);
  s().setSubstitutes('blanc', 0);
  s().setSubstitutes('noir', 0);
  s().setCount('referees', 0);
  s().setDeckReferee(false);
}

/**
 * LE DEUX CONTRE UN, d'après le manuel de la WUHA (§ 8.3) : deux attaquants,
 * dont le porteur, doivent passer un défenseur. Le porteur le fixe, la passe
 * part quand il s'engage, le receveur accélère aussitôt.
 */
function twoOnOne(store: Store, story: ExampleStory) {
  const d = director(store);
  drillSquad(store, 2, 1);
  d.place(white(1), 7.5, 6.5, true, 0);
  d.carry(8.1, 6.5);
  d.place(white(2), 7, 9.5, true, 0);
  d.place(black(1), 14, 7.5, true, 180);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(1), 11, 6.8);
  d.carry(11.6, 6.8);
  d.swim(white(2), 10.6, 9.6);
  d.swim(black(1), 12.8, 7.2);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.send(12.9, 9.8);
  d.swim(white(2), 12.4, 9.8);
  d.s().setSurface(white(1), true);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.swim(white(2), 16.4, 9.4);
  d.carry(17, 9.4);
  d.swim(white(1), 14.6, 7.4, true);
  d.s().setSurface(black(1), true);
  d.step(story.notes[3], 3);
  d.s().goTo(0);
}

/**
 * LA PASSE À TROIS, d'après la fiche « La passe à trois » du CIBPL-FFESSM,
 * l'exercice à trois des « Fondamentaux techniques et tactiques » et le
 * « Three Passing » du manuel de la WUHA (§ 10.1) : le palet avance en ligne
 * droite, de passe en passe, toujours avec quelqu'un au fond ; le passeur
 * remonte, le suivant plonge devant le receveur.
 */
function passThree(store: Store, story: ExampleStory) {
  const d = director(store);
  drillSquad(store, 3, 0);
  d.place(white(1), 4, 7.5, false, 0);
  d.carry(4.5, 7.5);
  d.place(white(2), 6.2, 6.4, true, 0);
  d.place(white(3), 2.6, 8.6, true, 0);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(2), 6.6, 7.2);
  d.send(7.1, 7.2);
  d.s().setSurface(white(1), true);
  d.swim(white(3), 5.4, 8.6, true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.swim(white(3), 9.2, 7.8);
  d.send(9.7, 7.8);
  d.s().setSurface(white(2), true);
  d.swim(white(1), 8, 6.4, true);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.swim(white(1), 11.8, 7.2);
  d.send(12.3, 7.2);
  d.s().setSurface(white(3), true);
  d.swim(white(2), 10.6, 8.6, true);
  d.step(story.notes[3], 3);
  d.s().goTo(0);
}

/**
 * LE RELAIS SUR LE MUR, d'après la fiche « Le relais sur le mur » du
 * CIBPL-FFESSM et « Comment jouer le mur ? » des « Fondamentaux » : le
 * porteur bloqué donne en retrait, remonte et se replace derrière son
 * coéquipier ; à force, le défenseur doit respirer et la paire avance.
 */
function wallRelay(store: Store, story: ExampleStory) {
  const d = director(store);
  drillSquad(store, 2, 1);
  d.place(white(1), 10, 14.1, false, 0);
  d.carry(10.5, 14.2);
  d.place(black(1), 11.2, 14, false, 180);
  d.place(white(2), 8.2, 13.3, true, 0);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.swim(white(2), 8.6, 14.1);
  d.send(9.1, 14.2);
  d.s().setSurface(white(1), true);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.swim(white(1), 7.2, 13.3, true);
  d.swim(white(2), 9.6, 14.1);
  d.carry(10.1, 14.2);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.s().setSurface(black(1), true);
  d.swim(white(2), 12.6, 14.1);
  d.carry(13.1, 14.2);
  d.swim(white(1), 10.8, 13.3, true);
  d.step(story.notes[3], 3);
  d.s().goTo(0);
}

/**
 * LE CHAT AU MILIEU, d'après le « Piggy in the middle » du manuel de la WUHA
 * (§ 10.2) : trois bandes marquées par les lignes d'eau, une paire dans
 * chacune ; celles du bord se passent le palet à travers celle du milieu,
 * qui l'intercepte et tente de le lever par-dessus l'une d'elles.
 *
 * LES TROIS BANDES SONT DES ZONES (ADR 0026) : c'est la règle de
 * l'exercice, et l'endroit ne bouge pas d'une étape à l'autre. Une ligne
 * d'eau tous les 2,5 m ; le dernier flick retombe au-delà de la bande du
 * haut.
 */
function piggyInMiddle(store: Store, story: ExampleStory) {
  const d = director(store);
  drillSquad(store, 4, 2);
  for (const y of [3.75, 6.25, 8.75]) {
    d.s().addZone({ shape: 'rect', x: 9, y, w: 7.5, h: 2.5 });
  }
  d.place(white(1), 11, 5, true, 90);
  d.carry(11, 5.6);
  d.place(white(2), 14, 5, true, 90);
  d.place(white(3), 11.6, 10, true, 270);
  d.place(white(4), 14.4, 10, true, 270);
  d.place(black(1), 11.8, 7.2, true, 270);
  d.place(black(2), 13.6, 7.8, true, 90);
  d.step(story.notes[0], 3);

  d.s().addStep();
  d.s().setSurface(white(1), false);
  d.send(12.2, 9.4);
  d.swim(white(3), 12.2, 9.9);
  d.swim(black(1), 12.5, 7.2);
  d.step(story.notes[1], 3);

  d.s().addStep();
  d.s().setSurface(white(1), true);
  d.s().setSurface(black(1), true);
  d.swim(white(2), 13.6, 5.4);
  d.swim(black(2), 12.9, 7);
  d.send(12.9, 7.5);
  d.step(story.notes[2], 3);

  d.s().addStep();
  d.s().rotate(black(2), 270);
  d.carry(12.9, 6.5);
  d.send(13.4, 3.4, 'flick');
  d.s().setSurface(white(3), true);
  d.step(story.notes[3], 3);
  d.s().goTo(0);
}

const BUILDERS: Record<Exclude<ExampleId, 'neutral'>, typeof kickoff> = {
  kickoff,
  faceOff,
  rightAttack,
  wingSwitch,
  wallPlay,
  slide,
  penalty,
  freePuck,
  twoOnOne,
  passThree,
  wallRelay,
  piggyInMiddle,
};

/**
 * Un schéma d'exemple, par son identifiant et ses textes : le DOCUMENT
 * (ADR 0027), variantes comprises. Il s'ouvre sur sa ligne principale ;
 * `lineAt` donne celle qu'un ancien identifiant demandait.
 */
export function buildExample(
  id: ExampleId,
  story: ExampleStory,
  options: { id: string; now?: string }
): Tactic {
  const tags = [...EXAMPLE_TAGS[id]];
  if (id === 'neutral') {
    const [a = '', b = '', c = ''] = story.notes;
    return {
      ...exampleTactic({ name: story.name, notes: [a, b, c] }, options),
      tags,
    };
  }
  const store = createBoardStore(
    createTactic({ id: options.id, name: story.name, now: options.now })
  );
  BUILDERS[id](store, story);
  return { ...store.getState().doc, tags };
}
