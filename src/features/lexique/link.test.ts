import { describe, expect, it } from 'vitest';
import { linkTerms as link, termsIn as find } from './link.ts';
import { TERMS } from './terms.ts';

const linkTerms = (text: string, lang: 'fr' | 'en') => link(text, lang, TERMS);
const termsIn = (text: string, lang: 'fr' | 'en') => find(text, lang, TERMS);

const ids = (text: string, lang: 'fr' | 'en' = 'fr') =>
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
});
