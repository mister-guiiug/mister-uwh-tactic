import { z } from 'zod';

/**
 * La version du modèle d'une séance — celle du magasin de l'appareil, et
 * celle que la ligne de `seances` (0007) note à côté de `data`.
 */
export const SEANCE_VERSION = 1;

/** Les bornes d'une séance : de quoi tenir un entraînement, pas davantage. */
export const SEANCE_LIMITS = {
  name: 80,
  items: 20,
  note: 280,
  minutes: { min: 1, max: 60, default: 5 },
} as const;

/**
 * UNE PHASE DE LA SÉANCE : un schéma de la bibliothèque, désigné par son
 * identifiant — pas une copie. Le schéma corrigé après coup l'est aussi
 * dans la séance.
 */
export const seanceItemSchema = z.object({
  schemaId: z.string().min(1),
  minutes: z
    .number()
    .int()
    .min(SEANCE_LIMITS.minutes.min)
    .max(SEANCE_LIMITS.minutes.max),
  note: z.string().max(SEANCE_LIMITS.note),
});

export const seanceSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(SEANCE_LIMITS.name),
  items: z.array(seanceItemSchema).max(SEANCE_LIMITS.items),
  /** ISO 8601, comme celui d'un schéma. */
  updatedAt: z.string(),
});

export const seancesSnapshotSchema = z.object({
  seances: z.array(seanceSchema),
});

export type SeanceItem = z.infer<typeof seanceItemSchema>;
export type Seance = z.infer<typeof seanceSchema>;
export type SeancesSnapshot = z.infer<typeof seancesSnapshotSchema>;

export function createSeance(
  id: string,
  name = '',
  now = new Date().toISOString()
): Seance {
  return {
    id,
    name: name.slice(0, SEANCE_LIMITS.name),
    items: [],
    updatedAt: now,
  };
}

/** La durée prévue : la somme des phases, en minutes. */
export const totalMinutes = (seance: Seance) =>
  seance.items.reduce((sum, item) => sum + item.minutes, 0);

/** Une phase déplacée d'un cran ; aux bords, rien ne bouge. */
export function moveItem(
  items: readonly SeanceItem[],
  from: number,
  to: number
) {
  if (from === to || to < 0 || to >= items.length || !items[from]) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
