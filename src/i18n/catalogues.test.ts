import { describe, expect, it } from 'vitest';
import { fr } from './messages.ts';
import { en } from './messages.en.ts';
import { es } from './messages.es.ts';
import { nl } from './messages.nl.ts';
import { de } from './messages.de.ts';
import { LOCALES, type Locale } from './index.ts';
import { LOCALE_NAMES } from './names.ts';

/**
 * Ce que ces tests figent : UNE LANGUE EST COMPLÈTE, ET C'EST BIEN ELLE.
 *
 * Le type `Messages` refuse déjà une clé manquante. Il ne voit pas une
 * valeur vide, un `{paramètre}` mal recopié — que l'interpolation laisse
 * en clair à l'écran —, ni une chaîne restée en français par oubli. Pour
 * repérer les clés manquantes à l'intégration, avec le texte à traduire :
 * `node scripts/i18n-cles.mjs`.
 */

const CATALOGUES = { fr, en, es, nl, de } satisfies Record<Locale, unknown>;
const TRADUITES = LOCALES.filter(locale => locale !== 'fr');

/** Les feuilles d'un catalogue : `'board.carried.one' → 'Position…'`. */
function feuilles(
  objet: object,
  prefixe = '',
  sortie = new Map<string, string>()
) {
  for (const [cle, valeur] of Object.entries(objet)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === 'object') feuilles(valeur, chemin, sortie);
    else sortie.set(chemin, String(valeur));
  }
  return sortie;
}

const parametres = (texte: string) =>
  [...texte.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

/**
 * LES CHAÎNES QUI ONT LE DROIT D'ÊTRE CELLES DU FRANÇAIS, chacune avec sa
 * raison. Une chaîne identique hors de cette liste est un oubli de
 * traduction, jusqu'à preuve du contraire.
 */
const PARTOUT: Record<string, string> = {
  'app.name': 'un nom propre',
  'board.view2d': 'un sigle',
  'board.view3d': 'un sigle',
  'seances.minutesShort': 'une unité',
  'palette.formation': 'aucun mot',
  'arrows.describe': 'aucun mot',
  'arrows.flick': 'le mot que disent les joueurs, dans toutes les langues',
};
const PAR_LANGUE: Record<Exclude<Locale, 'fr'>, Record<string, string>> = {
  en: {
    'nav.notes': 'le même mot',
    'board.sideCentre': 'la même initiale',
    'board.pause': 'le même mot',
    'seances.summary.one': 'les mêmes mots',
    'seances.summary.other': 'les mêmes mots',
    'seances.phaseOf': 'le même mot',
    'apnea.surface': 'le même mot',
    'situations.pick': 'le même mot',
    'notes.count.one': 'le même mot',
    'notes.count.other': 'le même mot',
    'marks.toolZone': 'le même mot',
    'marks.ellipse': 'le même mot',
    'marks.rect': 'le même mot',
  },
  es: {
    'board.formationDone': 'la même tournure, « en »',
    'board.role': 'le même ordre : la ligne, puis le côté',
    'board.roleMiddle': 'P de « pívot »',
    'board.sideCentre': 'C de « centro »',
    'board.sideRight': 'D de « derecha »',
  },
  nl: {
    'board.cameraStand': 'le même mot',
    'marks.toolZone': 'le même mot',
  },
  de: {
    'board.roleMiddle': 'P de « Pivot »',
    'board.pause': 'le même mot',
    'seances.phaseOf': 'le même mot',
    'situations.pick': 'le même mot',
    'marks.toolZone': 'le même mot',
    'marks.ellipse': 'le même mot',
  },
};

const reference = feuilles(fr);

describe('les catalogues de langues', () => {
  it('cinq langues, chacune nommée dans la sienne', () => {
    expect(LOCALES).toEqual(['fr', 'en', 'es', 'nl', 'de']);
    expect(Object.keys(LOCALE_NAMES)).toEqual([...LOCALES]);
  });

  describe.each(TRADUITES)('%s', locale => {
    const traduction = feuilles(CATALOGUES[locale]);

    it('a exactement les clés du français', () => {
      expect([...traduction.keys()].sort()).toEqual(
        [...reference.keys()].sort()
      );
    });

    it('ne laisse aucune valeur vide', () => {
      const vides = [...traduction].filter(([, texte]) => texte.trim() === '');
      expect(vides).toEqual([]);
    });

    it('garde les {paramètres} du français, ni plus ni moins', () => {
      const ecarts = [...reference].flatMap(([cle, texte]) => {
        const attendu = parametres(texte);
        const obtenu = parametres(traduction.get(cle) ?? '');
        return attendu.join() === obtenu.join()
          ? []
          : [{ cle, attendu, obtenu }];
      });
      expect(ecarts).toEqual([]);
    });

    it('ne reprend le français que là où c’est voulu', () => {
      const permis = { ...PARTOUT, ...PAR_LANGUE[locale] };
      const oublis = [...reference]
        .filter(([cle, texte]) => traduction.get(cle) === texte)
        .map(([cle]) => cle)
        .filter(cle => !(cle in permis));
      expect(oublis).toEqual([]);
    });

    it('la liste des exceptions ne ment pas : chacune est bien identique', () => {
      const perimees = Object.keys(PAR_LANGUE[locale]).filter(
        cle => traduction.get(cle) !== reference.get(cle)
      );
      expect(perimees).toEqual([]);
    });
  });
});
