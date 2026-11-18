import { createTactic, playerId, PUCK_ID, type Tactic } from './model.ts';
import { createBoardStore } from './store.ts';

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
 */
export const EXAMPLE_IDS = [
  'neutral',
  'kickoff',
  'faceOff',
  'rightAttack',
  'wingSwitch',
  'wallPlay',
  'slide',
  'penalty',
] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];

export interface ExampleStory {
  name: string;
  notes: string[];
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
 */
function wingSwitch(store: Store, story: ExampleStory) {
  const d = director(store);
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
  d.swim(black(2), 1.6, spot.y + 1.4);
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

const BUILDERS: Record<Exclude<ExampleId, 'neutral'>, typeof kickoff> = {
  kickoff,
  faceOff,
  rightAttack,
  wingSwitch,
  wallPlay,
  slide,
  penalty,
};

/** Un schéma d'exemple, par son identifiant et ses textes. */
export function buildExample(
  id: ExampleId,
  story: ExampleStory,
  options: { id: string; now?: string }
): Tactic {
  if (id === 'neutral') {
    const [a = '', b = '', c = ''] = story.notes;
    return exampleTactic({ name: story.name, notes: [a, b, c] }, options);
  }
  const store = createBoardStore(
    createTactic({ id: options.id, name: story.name, now: options.now })
  );
  BUILDERS[id](store, story);
  return store.getState().tactic;
}
