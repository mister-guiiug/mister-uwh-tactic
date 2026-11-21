import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { I18nProvider } from '../../i18n/index.ts';
import { createTactic, playerId, type Tactic } from '../board/model.ts';
import { boardStore } from '../board/store.ts';
import { emptyEffectif } from './model.ts';
import { EffectifOffer } from './EffectifOffer.tsx';
import { EffectifSection } from './EffectifSection.tsx';
import { offerEffectif } from './offer.ts';
import { useEffectif } from './store.ts';

vi.mock('@mister-guiiug/dev-pwa-config/analytics', () => ({
  trackEvent: vi.fn(),
}));

const W1 = playerId('blanc', 1);
const W2 = playerId('blanc', 2);
const N1 = playerId('noir', 1);

const monter = (children: React.ReactNode) =>
  render(
    <I18nProvider>
      <ToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </ToastProvider>
    </I18nProvider>
  );

/** Un schéma déjà nommé : Léa (Blanc 1, gauchère), Max (Noir 1). */
function nomme(): Tactic {
  const tactic = createTactic({
    id: 'nomme',
    name: 'Sortie de mur',
    now: '2026-11-21T00:00:00Z',
  });
  Object.assign(
    tactic.roster.players.find(p => p.id === W1)!,
    {
      name: 'Léa',
      leftHanded: true,
    }
  );
  tactic.roster.players.find(p => p.id === N1)!.name = 'Max';
  return tactic;
}

const nomDe = (id: string) =>
  boardStore.getState().tactic.roster.players.find(p => p.id === id)!.name;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  useEffectif.getState().replace(emptyEffectif());
  vi.mocked(trackEvent).mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/**
 * Ce que ces tests figent : DEPUIS L'ONGLET ÉQUIPES, ON GARDE LES PRÉNOMS
 * D'UN SCHÉMA COMME EFFECTIF, ET ON APPLIQUE L'EFFECTIF À UN SCHÉMA — chacun
 * annulable, et chacun absent quand il ne changerait rien.
 */
describe('mon effectif, dans l’onglet Équipes', () => {
  it('garde les prénoms d’un schéma nommé, et « Annuler » rend l’ancien', async () => {
    const user = userEvent.setup();
    useEffectif.getState().setMember('blanc', 2, { name: 'Zoé' });
    boardStore.getState().load(nomme());
    monter(<EffectifSection />);

    await user.click(
      screen.getByRole('button', { name: 'Garder comme mon effectif' })
    );
    const { effectif } = useEffectif.getState();
    expect(effectif.blanc[0]).toEqual({ name: 'Léa', leftHanded: true });
    expect(effectif.noir[0]).toEqual({ name: 'Max', leftHanded: false });
    // Zoé n'est pas nommée dans le schéma : l'effectif la garde.
    expect(effectif.blanc[1]!.name).toBe('Zoé');
    expect(
      screen.getByText('2 joueurs gardés dans votre effectif.')
    ).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('effectif', { geste: 'garde' });
    // Gardé, il n'y a plus rien à garder.
    expect(
      screen.queryByRole('button', { name: 'Garder comme mon effectif' })
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(useEffectif.getState().effectif.blanc[0]!.name).toBe('');
    expect(useEffectif.getState().effectif.blanc[1]!.name).toBe('Zoé');
  });

  it('applique l’effectif d’un geste, que la barre du schéma défait', async () => {
    const user = userEvent.setup();
    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    useEffectif.getState().setMember('blanc', 2, { name: 'Zoé' });
    boardStore.getState().load(nomme());
    monter(<EffectifSection />);

    await user.click(
      screen.getByRole('button', { name: 'Appliquer mon effectif' })
    );
    expect(nomDe(W1)).toBe('Paul');
    expect(nomDe(W2)).toBe('Zoé');
    // Les Noirs ne sont pas dans l'effectif : Max reste.
    expect(nomDe(N1)).toBe('Max');
    expect(
      screen.getByText('Effectif appliqué : 2 joueurs.')
    ).toBeInTheDocument();
    expect(screen.getByText('Ce schéma porte déjà votre effectif.'));

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(nomDe(W1)).toBe('Léa');
    expect(nomDe(W2)).toBe('');
  });

  it('sans effectif, invite à le remplir', () => {
    boardStore.getState().load(createTactic({ id: 'vierge', name: '' }));
    monter(<EffectifSection />);
    expect(
      screen.getByText('Aucun prénom dans votre effectif.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Appliquer mon effectif' })
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Remplir mon effectif' })
    ).toHaveAttribute('href', '/effectif');
  });
});

/**
 * Ce que ces tests figent : À L'ARRIVÉE D'UN SCHÉMA, L'EFFECTIF EST PROPOSÉ
 * PAR UN BOUTON, JAMAIS IMPOSÉ, et seulement s'il changerait quelque chose.
 */
describe('la carte « Appliquer mon effectif ? »', () => {
  it('paraît pour le schéma arrivé, pose les prénoms, et disparaît', async () => {
    const user = userEvent.setup();
    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    boardStore.getState().load(nomme());
    offerEffectif('nomme');
    monter(<EffectifOffer />);

    const carte = screen.getByRole('region', { name: 'Votre effectif' });
    expect(carte).toHaveTextContent(
      'Mettre les prénoms de votre effectif sur ce schéma ?'
    );
    await user.click(
      screen.getByRole('button', { name: 'Appliquer mon effectif' })
    );
    expect(nomDe(W1)).toBe('Paul');
    expect(screen.queryByRole('region', { name: 'Votre effectif' })).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith('effectif', {
      geste: 'applique',
      origine: 'offre',
    });
  });

  it('« Pas maintenant » la ferme sans rien toucher', async () => {
    const user = userEvent.setup();
    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    boardStore.getState().load(nomme());
    offerEffectif('nomme');
    monter(<EffectifOffer />);

    await user.click(screen.getByRole('button', { name: 'Pas maintenant' }));
    expect(screen.queryByRole('region', { name: 'Votre effectif' })).toBeNull();
    expect(nomDe(W1)).toBe('Léa');
  });

  it('se tait pour un autre schéma, ou un effectif vide', () => {
    boardStore.getState().load(nomme());
    offerEffectif('nomme');
    monter(<EffectifOffer />);
    // Effectif vide : rien à proposer.
    expect(screen.queryByRole('region', { name: 'Votre effectif' })).toBeNull();
    cleanup();

    useEffectif.getState().setMember('blanc', 1, { name: 'Paul' });
    offerEffectif('un-autre-schema');
    monter(<EffectifOffer />);
    expect(screen.queryByRole('region', { name: 'Votre effectif' })).toBeNull();
  });
});
