import { schemaVersions } from '../../backend/index.ts';
import type { Tactic } from '../board/model.ts';
import { useSchemas } from './store.ts';

/**
 * « REVENIR À CETTE VERSION » (ADR 0034) : l'enregistre comme la nouvelle ;
 * la courante passe dans l'historique. Rend le schéma enregistré.
 *
 * REVENIR, C'EST ENREGISTRER : la version choisie devient le schéma par le
 * même chemin qu'« Enregistrer », qui range la courante dans l'historique.
 * Rien ne se perd, et revenir encore — à celle qu'on vient de quitter —
 * défait le geste. La version reprise quitte l'historique : elle est
 * désormais le schéma, elle n'y occupe plus une des dix places.
 *
 * Avec la feuille, dans son morceau : l'accueil n'en a pas besoin.
 */
export async function restoreVersion(version: Tactic): Promise<Tactic> {
  const { schemas, save } = useSchemas.getState();
  const current = schemas.find(s => s.id === version.id);
  // DATÉE DU GESTE, JAMAIS AVANT LA COURANTE : la synchronisation garde la
  // plus récente (ADR 0015), et une horloge en retard ferait revenir celle
  // qu'on quitte.
  const plancher = current ? Date.parse(current.updatedAt) + 1 : 0;
  const next: Tactic = {
    ...version,
    updatedAt: new Date(
      Math.max(Date.now(), Number.isNaN(plancher) ? 0 : plancher)
    ).toISOString(),
  };
  // Les étiquettes rangent le schéma, pas l'une de ses versions (ADR 0029).
  if (current?.tags) next.tags = current.tags;
  else delete next.tags;
  await save(next);
  schemaVersions.drop(version);
  return next;
}
