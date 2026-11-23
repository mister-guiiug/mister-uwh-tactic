import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { USAGE, noteUsage, resetUsageForTests } from './usage.ts';

vi.mock('@mister-guiiug/dev-pwa-config/analytics', () => ({
  trackEvent: vi.fn(() => true),
}));

const track = vi.mocked(trackEvent);

describe('noteUsage', () => {
  beforeEach(() => {
    resetUsageForTests();
    track.mockReset();
    track.mockReturnValue(true);
  });

  it('envoie le geste du socle et sa propriété énumérée', () => {
    noteUsage('zone');
    expect(track).toHaveBeenCalledWith('creation', { objet: 'zone' });
  });

  it("n'envoie un geste qu'une fois par session", () => {
    noteUsage('pen');
    noteUsage('pen');
    noteUsage('pen');
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('compte chaque fois ce qui se compte vraiment', () => {
    noteUsage('matchStarted', { once: false });
    noteUsage('matchStarted', { once: false });
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith('partie', {
      objet: 'match',
      etape: 'demarree',
    });
  });

  it("un geste fait avant l'accord ne cache pas le suivant", () => {
    track.mockReturnValueOnce(false);
    expect(noteUsage('follow')).toBe(false);
    expect(noteUsage('follow')).toBe(true);
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('ne porte aucune valeur libre : ni espace, ni plus de 40 caractères', () => {
    for (const [, params] of Object.values(USAGE)) {
      for (const value of Object.values(params)) {
        expect(value).toMatch(/^[a-z_]{1,40}$/);
      }
    }
  });
});
