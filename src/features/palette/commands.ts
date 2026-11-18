/** Une commande de la palette : un libellé, ce qu'elle fait, où elle se range. */
export interface Command {
  id: string;
  group: string;
  label: string;
  /** Des mots en plus, cherchés mais pas affichés. */
  keywords?: string;
  /** Ne paraît que si l'on tape quelque chose (les quarante mots du lexique). */
  onlyWhenSearching?: boolean;
  run: () => void;
}

/** « tir lateral » trouve « Tir latéral » : sans accents ni casse. */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

/** Au-delà, la liste n'aide plus : on affine la recherche. */
export const MAX_RESULTS = 40;

/**
 * LES COMMANDES QUI RÉPONDENT À LA RECHERCHE. Chaque mot tapé doit se
 * trouver dans le libellé, le groupe ou les mots-clés — dans n'importe quel
 * ordre : « noirs 3-2 » trouve « 3-2-1 · Noirs ». Celles dont le libellé
 * COMMENCE par la recherche passent devant.
 */
export function filterCommands(commands: readonly Command[], query: string) {
  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return commands.filter(c => !c.onlyWhenSearching).slice(0, MAX_RESULTS);
  }
  const first = words.join(' ');
  return commands
    .filter(command => {
      const haystack = fold(
        `${command.label} ${command.group} ${command.keywords ?? ''}`
      );
      return words.every(word => haystack.includes(word));
    })
    .map((command, order) => ({
      command,
      order,
      starts: fold(command.label).startsWith(first) ? 0 : 1,
    }))
    .sort((a, b) => a.starts - b.starts || a.order - b.order)
    .slice(0, MAX_RESULTS)
    .map(({ command }) => command);
}
