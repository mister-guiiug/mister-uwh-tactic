import { describe, expect, it } from 'vitest';
import { fr } from '../../i18n/messages.ts';
import { en } from '../../i18n/messages.en.ts';
import { es } from '../../i18n/messages.es.ts';
import { nl } from '../../i18n/messages.nl.ts';
import { de } from '../../i18n/messages.de.ts';
import { linkTerms as link, termsIn as find, type Lang } from './link.ts';
import { TERMS } from './terms.ts';

const CATALOGUES = { fr, en, es, nl, de } satisfies Record<Lang, unknown>;

const linkTerms = (text: string, lang: Lang) => link(text, lang, TERMS);
const termsIn = (text: string, lang: Lang) => find(text, lang, TERMS);

const ids = (text: string, lang: Lang = 'fr') =>
  termsIn(text, lang).map(term => term.id);

/**
 * Ce que ces tests figent : UN MOT DU LEXIQUE N'EST RELIÉ QUE S'IL EST BIEN
 * LUI. Un faux lien enseigne le mauvais sens à celui qui découvre le jeu.
 */
describe('les mots du lexique dans une consigne', () => {
  it('reconnaît un terme entier, sans casse, et garde le texte d’origine', () => {
    const segments = linkTerms('Le pivot fait un Relais vers l’arrière.', 'fr');
    expect(segments.map(s => s.text).join('')).toBe(
      'Le pivot fait un Relais vers l’arrière.'
    );
    const relais = segments.find(s => s.term);
    expect(relais?.text).toBe('Relais');
    expect(relais?.term?.id).toBe('relais');
  });

  it('les accents comptent : « il se retourne » n’est pas le geste « Retourné »', () => {
    expect(ids('Il se retourne et donne en retrait.')).not.toContain(
      'retourne'
    );
  });

  it('un mot n’est reconnu qu’entier, pluriel compris', () => {
    expect(ids('Deux écrans devant le but.')).toContain('ecran');
    expect(ids('Il faut écranter.')).not.toContain('ecran');
  });

  it('chaque morceau d’un terme composé compte, les sigles courts non', () => {
    expect(ids('Une passe courte au pivot.')).toEqual(['passe-longue-courte']);
    expect(ids('Il le pousse dans la cuvette : but.')).toEqual(['cuvette']);
    // « AD » se lirait dans trop de mots : il n'est pas une clé.
    expect(ids('AD remonte son aile.')).toEqual([]);
  });

  it('un terme n’est relié qu’une fois, à sa première apparition', () => {
    const segments = linkTerms(
      'Sortie de mur, puis une autre sortie de mur.',
      'fr'
    );
    expect(segments.filter(s => s.term)).toHaveLength(1);
    expect(segments[0]?.text).toBe('Sortie de mur');
  });

  it('lit l’anglais avec les termes anglais', () => {
    expect(ids('A quick relay to the back.', 'en')).toContain('relais');
  });

  it('lit l’espagnol, le néerlandais et l’allemand avec leurs termes', () => {
    expect(ids('El pívot da el relevo y el defensa sube.', 'es')).toEqual([
      'relais',
      'arriere',
    ]);
    expect(ids('De achterste man zet een scherm.', 'nl')).toEqual([
      'arriere',
      'ecran',
    ]);
    expect(ids('Er schiebt ihn in die Torrinne: Tor.', 'de')).toEqual([
      'cuvette',
    ]);
  });

  it('un synonyme anglais gardé en allemand relie le même mot', () => {
    // « Equal Puck » : le nom du règlement, que le VDST ne traduit pas.
    expect(ids('Equal Puck in der Mitte.', 'de')).toEqual(['entre-deux']);
    expect(ids('Neutraler Puck in der Mitte.', 'de')).toEqual(['entre-deux']);
  });

  it('les consignes des exemples relient le lexique dans chaque langue', () => {
    // Une consigne traduite qui ne relie plus rien dit que le lexique et
    // les catalogues ne parlent pas la même langue.
    for (const [lang, messages] of Object.entries(CATALOGUES)) {
      const { examples, exampleNote1, exampleNote2, exampleNote3 } =
        messages.schemas;
      const notes = [exampleNote1, exampleNote2, exampleNote3].concat(
        Object.values(examples).flatMap(example =>
          Object.entries(example)
            .filter(([key]) => key.startsWith('note'))
            .map(([, note]) => note)
        )
      );
      const linked = new Set(
        notes.flatMap(note => termsIn(note, lang as Lang).map(t => t.id))
      );
      expect(linked.size, lang).toBeGreaterThanOrEqual(8);
    }
  });

  it('un faux ami ne se relie pas : « ohne festzuhalten » n’est pas le Haken', () => {
    expect(
      ids('Die Stürmer bremsen, ohne sie festzuhalten.', 'de')
    ).not.toContain('crochet');
  });
});
