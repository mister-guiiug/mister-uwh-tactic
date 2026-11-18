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
  'wingSwitch',
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

const BUILDERS: Record<Exclude<ExampleId, 'neutral'>, typeof kickoff> = {
  kickoff,
  wingSwitch,
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
