/**
 * LE LIEN D'UNE SÉANCE, dans le fragment comme celui d'un schéma : le
 * navigateur ne l'envoie jamais au serveur. Deux formes — `#ss=` lisible
 * partout, `#zs=` compressé (deflate) — et des clés à part : ni `#s=` ni
 * `#z=` ne les reconnaissent, un tableau d'avant ne prend pas une séance
 * pour un schéma, il l'ignore.
 *
 * Ce fichier est tout ce que l'accueil charge pour les reconnaître ; le
 * décodeur (`share.ts`) vient à la demande.
 */
export const SEANCE_PREFIX = '#ss=';
export const SEANCE_PREFIX_COMPRESSED = '#zs=';
/**
 * LE LIEN « POUR LES JOUEURS » D'UNE SÉANCE (ADR 0040) : la même séance,
 * présentée au lieu d'être rangée. Des clés à lui, comme celui d'un schéma
 * (ADR 0035) : une version d'avant ne les connaît pas et ne range pas à
 * moitié ce qu'on voulait seulement montrer.
 */
export const SEANCE_PLAYER_PREFIX = '#ssp=';
export const SEANCE_PLAYER_PREFIX_COMPRESSED = '#zsp=';

/**
 * Le code d'une séance porté par le fragment, s'il est compressé, et s'il
 * est « pour les joueurs » ; ou `null`. Chaque clé finit par `=` : aucune
 * n'est le début d'une autre, quel que soit l'ordre où on les essaie.
 */
export function seanceCodeFromHash(
  hash: string
): { code: string; compressed: boolean; player?: boolean } | null {
  const found = /^#([sz])s(p?)=/.exec(hash);
  if (!found) return null;
  const shared = {
    code: hash.slice(found[0].length),
    compressed: found[1] === 'z',
  };
  return found[2] ? { ...shared, player: true } : shared;
}
