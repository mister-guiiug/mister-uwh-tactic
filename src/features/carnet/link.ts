/**
 * LE LIEN D'UN CARNET DE JEU (ADR 0023) : plusieurs schémas, dans le fragment
 * comme le lien d'un schéma ou d'une séance — le navigateur ne l'envoie
 * jamais au serveur. Deux formes, `#sc=` lisible partout et `#zc=` compressé,
 * et des clés à lui : ni `#s=`, ni `#z=`, ni `#ss=`, ni `#zs=` ne les
 * reconnaissent. Un tableau d'avant ne prend pas un carnet pour un schéma ;
 * il l'ignore, et s'ouvre sur l'accueil.
 *
 * Ce fichier est tout ce que l'accueil charge du carnet : le reconnaître, et
 * dire à l'écran Schémas ce qui vient d'arriver. Le reste vient à la demande.
 */
export const CARNET_PREFIX = '#sc=';
export const CARNET_PREFIX_COMPRESSED = '#zc=';

/** Le code d'un carnet porté par le fragment, et s'il est compressé ; ou `null`. */
export function carnetCodeFromHash(
  hash: string
): { code: string; compressed: boolean } | null {
  const found = /^#([sz])c=/.exec(hash);
  return found
    ? { code: hash.slice(found[0].length), compressed: found[1] === 'z' }
    : null;
}

/**
 * CE QUI VIENT D'ARRIVER, porté par l'état de navigation jusqu'à l'écran
 * Schémas : le nom du carnet et les identifiants qu'y ont reçus ses schémas.
 * L'état d'historique survit à un rechargement, pas à une autre visite.
 */
export interface CarnetArrival {
  name: string;
  ids: string[];
}

/** L'arrivée posée par `useSharedCarnet`, ou `null`. */
export function arrivalFrom(state: unknown): CarnetArrival | null {
  const carnet = (state as { carnet?: CarnetArrival } | null)?.carnet;
  return carnet && Array.isArray(carnet.ids) ? carnet : null;
}
