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
