import { z } from 'zod';
import {
  isSubstitute,
  playerId,
  SQUAD_SIZE,
  TEAMS,
  type PlayerIdentity,
  type Tactic,
  type Team,
} from '../board/model.ts';

/**
 * MON EFFECTIF (ADR 0028) : les joueurs du club, gardés sur l'appareil, pour
 * ne plus retaper les mêmes prénoms dans chaque schéma, chaque exemple,
 * chaque carnet reçu.
 *
 * PAR ÉQUIPE ET PAR NUMÉRO, comme le schéma. Un schéma connaît « Blanc 3 »,
 * pas Paul : l'effectif dit qui porte le 3 chez les Blancs. Les deux équipes
 * ont leur liste, parce qu'un club s'entraîne souvent contre lui-même ; les
 * Noirs restent vides tant qu'on ne les remplit pas, et un schéma garde
 * alors ses Noirs tels quels. Les remplaçants (7 à 10) aussi : ils entrent.
 *
 * UN NUMÉRO SANS PRÉNOM N'EST PAS DANS L'EFFECTIF. Il ne touche à rien du
 * schéma — ni sa main, ni son apnée. La règle vaut dans les deux sens :
 * « Garder comme mon effectif » ne prend que les joueurs nommés du schéma,
 * et n'efface jamais un numéro qu'il ne connaît pas.
 */

export const EFFECTIF_VERSION = 1;

/** La longueur d'un nom dans le schéma (`playerIdentitySchema`). */
export const MEMBER_NAME_MAX = 24;

export const memberSchema = z.object({
  name: z.string().max(MEMBER_NAME_MAX),
  leftHanded: z.boolean(),
  /**
   * Son apnée, en secondes de fond d'affilée ; absente, le seuil du schéma.
   * Les remplaçants n'en ont pas : la frise ne compte que les joueurs dans
   * l'eau (`apnea.ts`), et l'inspecteur ne la leur demande pas.
   */
  apnea: z.number().min(5).max(60).optional(),
});
export type Member = z.infer<typeof memberSchema>;

export const effectifSchema = z.object({
  blanc: z.array(memberSchema).length(SQUAD_SIZE),
  noir: z.array(memberSchema).length(SQUAD_SIZE),
});
export type Effectif = z.infer<typeof effectifSchema>;

const blank = (): Member => ({ name: '', leftHanded: false });

export function emptyEffectif(): Effectif {
  return {
    blanc: Array.from({ length: SQUAD_SIZE }, blank),
    noir: Array.from({ length: SQUAD_SIZE }, blank),
  };
}

export const isNamed = (member: { name: string }) => member.name.trim() !== '';

/** Combien de joueurs nommés : d'une équipe, ou des deux. */
export function namedCount(effectif: Effectif, team?: Team): number {
  const teams: readonly Team[] = team ? [team] : TEAMS;
  let total = 0;
  for (const t of teams) total += effectif[t].filter(isNamed).length;
  return total;
}

/** Ce qu'un joueur porte, sans espaces autour, et sans apnée de remplaçant. */
function identity(
  member: Member,
  number: number
): Pick<PlayerIdentity, 'name' | 'leftHanded' | 'apnea'> {
  const name = member.name.trim();
  return member.apnea === undefined || isSubstitute({ number })
    ? { name, leftHanded: member.leftHanded }
    : { name, leftHanded: member.leftHanded, apnea: member.apnea };
}

/**
 * CE QUE L'EFFECTIF POSE SUR UN SCHÉMA, par identifiant de joueur : les
 * numéros nommés, et eux seuls. C'est l'argument d'`applyIdentities`.
 */
export function identitiesFrom(
  effectif: Effectif
): Record<string, Pick<PlayerIdentity, 'name' | 'leftHanded' | 'apnea'>> {
  const identities: Record<
    string,
    Pick<PlayerIdentity, 'name' | 'leftHanded' | 'apnea'>
  > = {};
  for (const team of TEAMS) {
    effectif[team].forEach((member, index) => {
      if (isNamed(member)) {
        identities[playerId(team, index + 1)] = identity(member, index + 1);
      }
    });
  }
  return identities;
}

const same = (
  a: Pick<PlayerIdentity, 'name' | 'leftHanded' | 'apnea'>,
  b: Pick<PlayerIdentity, 'name' | 'leftHanded' | 'apnea'>
) => a.name === b.name && a.leftHanded === b.leftHanded && a.apnea === b.apnea;

/**
 * Combien de joueurs du schéma l'effectif changerait. Zéro : rien à
 * proposer — l'effectif est vide, ou le schéma le porte déjà.
 */
export function applyChanges(tactic: Tactic, effectif: Effectif): number {
  const identities = identitiesFrom(effectif);
  return tactic.roster.players.filter(p => {
    const next = identities[p.id];
    return next !== undefined && !same(p, next);
  }).length;
}

/**
 * GARDER COMME MON EFFECTIF : chaque joueur nommé du schéma prend son numéro
 * dans l'effectif ; les autres numéros gardent ce qu'ils avaient. Un schéma
 * en six contre six, remplaçants masqués et sans nom, n'efface donc pas les
 * remplaçants de l'effectif.
 */
export function keptFrom(tactic: Tactic, effectif: Effectif): Effectif {
  const next: Effectif = {
    blanc: [...effectif.blanc],
    noir: [...effectif.noir],
  };
  for (const player of tactic.roster.players) {
    if (!isNamed(player)) continue;
    next[player.team][player.number - 1] = identity(player, player.number);
  }
  return next;
}

/** Combien de numéros de l'effectif « Garder » changerait. */
export function keepChanges(tactic: Tactic, effectif: Effectif): number {
  return tactic.roster.players.filter(player => {
    if (!isNamed(player)) return false;
    const before = effectif[player.team][player.number - 1];
    return (
      !before ||
      !same(identity(before, player.number), identity(player, player.number))
    );
  }).length;
}
