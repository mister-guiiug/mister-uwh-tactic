import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LOT } from './model.ts';
import { createNews } from './store.ts';

/** La clé du socle : le préfixe de l'application, collé à la clé. */
const KEY = 'mister-uwh-tacticnouveautes';

const neuf = () => ({
  createdAt: '2026-11-23T10:00',
  updatedAt: '2026-11-23T10:00',
});

/** Une ouverture de l'application : la décision se prend à la lecture. */
const ouvrir = (lot = LOT, draft = neuf) => createNews(lot, draft);

const stored = () =>
  JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
    v: number;
    data: { seen: string | null };
  } | null;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

/**
 * Ce que ces tests figent : LA FERMETURE EST MÉMORISÉE, LE NOUVEAU VENU N'A
 * RIEN À VOIR, ET LA CARTE REVIENT AU LOT SUIVANT (ADR 0039).
 */
describe('le magasin de « Quoi de neuf »', () => {
  it('le nouveau venu ne la voit pas, et reçoit le lot réglé', () => {
    expect(ouvrir().getState().shown).toBe(false);
    expect(stored()).toEqual({ v: 1, data: { seen: LOT } });
    // Rouverte plus tard, ses propres schémas enregistrés depuis, rien.
    localStorage.setItem('mister-uwh-tacticschemas', '{}');
    expect(ouvrir().getState().shown).toBe(false);
  });

  it('le mode choisi seul ne fait pas un habitué', () => {
    localStorage.setItem('mister-uwh-tactic:mode', JSON.stringify('advanced'));
    expect(ouvrir().getState().shown).toBe(false);
  });

  it('l’habitué la voit, et la fermeture tient au rechargement', () => {
    localStorage.setItem('mister-uwh-tactic:premiers-pas', 'true');
    const news = ouvrir();
    expect(news.getState().shown).toBe(true);
    // Pas fermée : elle revient à chaque ouverture.
    expect(stored()).toBeNull();
    expect(ouvrir().getState().shown).toBe(true);

    news.getState().close();
    expect(news.getState().shown).toBe(false);
    expect(stored()?.data.seen).toBe(LOT);
    expect(ouvrir().getState().shown).toBe(false);
  });

  it('un brouillon travaillé suffit à faire un habitué', () => {
    const touche = () => ({ ...neuf(), updatedAt: '2026-11-23T10:05' });
    expect(ouvrir(LOT, touche).getState().shown).toBe(true);
  });

  it('revient au lot suivant, pour le nouveau venu d’hier aussi', () => {
    ouvrir(); // un nouveau venu : le lot est réglé sans rien montrer
    expect(ouvrir().getState().shown).toBe(false);
    const suivant = ouvrir('2027-02');
    expect(suivant.getState().shown).toBe(true);
    suivant.getState().close();
    expect(stored()?.data.seen).toBe('2027-02');
    expect(ouvrir('2027-02').getState().shown).toBe(false);
  });
});
