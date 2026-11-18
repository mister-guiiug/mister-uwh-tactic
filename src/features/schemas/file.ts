import { migrateTactic, tacticSchema, type Tactic } from '../board/model.ts';

/**
 * LE FICHIER D'UN SCHÉMA. Il porte le nom de l'application et une version,
 * pour qu'un fichier d'une autre app de la famille soit refusé avec une raison
 * lisible plutôt qu'avec une erreur de schéma incompréhensible.
 */
export const TACTIC_FILE_APP = 'mister-uwh-tactic';
export const TACTIC_FILE_VERSION = 2;

export interface TacticFile {
  app: typeof TACTIC_FILE_APP;
  v: number;
  tactic: Tactic;
}

/**
 * LA BIBLIOTHÈQUE ENTIÈRE, dans un seul fichier : de quoi changer de
 * téléphone sans compte, ou garder une copie avant une saison. Même
 * application, même version ; `tactics` au lieu de `tactic`.
 */
export interface LibraryFile {
  app: typeof TACTIC_FILE_APP;
  v: number;
  tactics: Tactic[];
}

export function toTacticFile(tactic: Tactic): TacticFile {
  return { app: TACTIC_FILE_APP, v: TACTIC_FILE_VERSION, tactic };
}

export function toLibraryFile(tactics: readonly Tactic[]): LibraryFile {
  return {
    app: TACTIC_FILE_APP,
    v: TACTIC_FILE_VERSION,
    tactics: [...tactics],
  };
}

/**
 * Un fichier d'un schéma OU d'une bibliothèque. Dans une bibliothèque, un
 * schéma illisible est compté et écarté : il ne coûte pas les autres.
 */
export function parseTacticFiles(value: unknown): {
  tactics: Tactic[];
  rejected: number;
} {
  const file = (value ?? {}) as Partial<LibraryFile>;
  if (!Array.isArray(file.tactics)) {
    return { tactics: [parseTacticFile(value)], rejected: 0 };
  }
  if (file.app !== TACTIC_FILE_APP) {
    throw new Error('ce fichier ne vient pas de Mister UWH Tactic');
  }
  const tactics: Tactic[] = [];
  let rejected = 0;
  for (const tactic of file.tactics) {
    try {
      tactics.push(parseTacticFile({ app: file.app, v: file.v, tactic }));
    } catch {
      rejected += 1;
    }
  }
  if (tactics.length === 0) throw new Error('aucun schéma lisible');
  return { tactics, rejected };
}

export function parseTacticFile(value: unknown): Tactic {
  if (!value || typeof value !== 'object') {
    throw new Error('fichier vide ou illisible');
  }
  const file = value as Partial<TacticFile>;
  if (file.app !== TACTIC_FILE_APP) {
    throw new Error('ce fichier ne vient pas de Mister UWH Tactic');
  }
  if (file.v !== 1 && file.v !== TACTIC_FILE_VERSION) {
    throw new Error(`version de fichier inconnue : ${String(file.v)}`);
  }
  // Un fichier de la version 1 se relit : remplaçants et arbitre de bord
  // arrivent masqués, le schéma s'affiche comme il a été exporté.
  const tactic = file.v === 1 ? migrateTactic(file.tactic) : file.tactic;
  const parsed = tacticSchema.safeParse(tactic);
  if (!parsed.success) {
    throw new Error('schéma incomplet ou invalide');
  }
  return parsed.data;
}
