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

/** Le code d'une séance porté par le fragment, et s'il est compressé ; ou `null`. */
export function seanceCodeFromHash(
  hash: string
): { code: string; compressed: boolean } | null {
  if (hash.startsWith(SEANCE_PREFIX)) {
    return { code: hash.slice(SEANCE_PREFIX.length), compressed: false };
  }
  if (hash.startsWith(SEANCE_PREFIX_COMPRESSED)) {
    return {
      code: hash.slice(SEANCE_PREFIX_COMPRESSED.length),
      compressed: true,
    };
  }
  return null;
}
