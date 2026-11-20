let probe: Promise<boolean> | null = null;

/**
 * CE NAVIGATEUR SAIT-IL FAIRE LA VIDÉO DE LA PHASE ? Sondé une fois, au
 * premier menu ouvert, par le module des codecs chargé à ce moment-là : rien
 * de la vidéo n'est dans l'accueil. Sans encodeur ni enregistreur, l'action
 * ne s'affiche pas — mieux vaut pas de bouton qu'un bouton qui échoue.
 */
export function videoSupported(): Promise<boolean> {
  probe ??= import('./codecs.ts')
    .then(m => m.chooseMethod())
    .then(Boolean, () => false);
  return probe;
}
