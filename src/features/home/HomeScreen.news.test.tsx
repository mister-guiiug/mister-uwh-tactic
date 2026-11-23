import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@mister-guiiug/dev-pwa-config/react/auth-provider';
import { ToastProvider } from '@mister-guiiug/dev-pwa-config/react/toast';
import { I18nProvider } from '../../i18n/index.ts';
import { authAdapter } from '../../auth/index.ts';
import { createTactic } from '../board/model.ts';
import { boardStore } from '../board/store.ts';
import { LOT } from '../nouveautes/model.ts';
import { useNews } from '../nouveautes/store.ts';
import { HomeScreen } from './HomeScreen.tsx';

/** L'écran où mène un lien, relevé à côté de l'accueil. */
function Where() {
  return <p data-testid="ou">{useLocation().pathname}</p>;
}

function monter() {
  render(
    <I18nProvider>
      <AuthProvider adapter={authAdapter()}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

const carte = () => screen.findByRole('region', { name: 'Quoi de neuf' });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
  // Le mode complet, choisi : ni carte d'accueil, ni guide devant elle.
  localStorage.setItem('mister-uwh-tactic:mode', JSON.stringify('advanced'));
  act(() => boardStore.getState().load(createTactic({ id: 'x', name: '' })));
  useNews.setState({ shown: true });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/**
 * Ce que ces tests figent : « QUOI DE NEUF » SUR L'ACCUEIL (ADR 0039) — un
 * titre, une croix nommée, des liens nommés par leur texte qui mènent là où
 * l'on s'en sert ; fermée, elle ne revient pas ; absente pour qui n'a rien à
 * retrouver ; et une carte à la fois au-dessus du terrain.
 */
describe('« Quoi de neuf » sur l’accueil', () => {
  it('sur un téléphone court, une ligne, que le titre déplie', async () => {
    const user = userEvent.setup();
    const avant = window.matchMedia;
    // Seule la requête de la carte parle de hauteur : elle seule répond oui.
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('max-height'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
    try {
      monter();
      const region = within(await carte());
      const titre = region.getByRole('button', { name: 'Quoi de neuf' });
      expect(titre).toHaveAttribute('aria-expanded', 'false');
      expect(region.queryAllByRole('link')).toHaveLength(0);
      await user.click(titre);
      expect(titre).toHaveAttribute('aria-expanded', 'true');
      expect(region.getAllByRole('link')).toHaveLength(5);
    } finally {
      window.matchMedia = avant;
    }
  });

  it('un titre, une croix, cinq liens nommés par leur texte', async () => {
    monter();
    const region = within(await carte());
    expect(
      region.getByRole('heading', { name: 'Quoi de neuf' })
    ).toBeInTheDocument();
    expect(
      region.getByRole('button', { name: 'Masquer les nouveautés' })
    ).toBeInTheDocument();
    const liens = region.getAllByRole('link');
    expect(liens.map(lien => lien.textContent)).toEqual([
      'Les variantes : une phase, plusieurs suites',
      'Le lien pour les joueurs, en présentation',
      'Le carnet imprimé, une phase par page',
      'Mon effectif : les prénoms sur les jetons',
      'Le chrono de match et ses temps morts',
    ]);
    expect(region.getByRole('link', { name: /^Mon effectif/ })).toHaveAttribute(
      'href',
      '/effectif'
    );
  });

  it('absente pour le nouveau venu', () => {
    useNews.setState({ shown: false });
    monter();
    expect(screen.queryByRole('region', { name: 'Quoi de neuf' })).toBeNull();
  });

  it('fermée, elle part et le lot est réglé', async () => {
    const user = userEvent.setup();
    monter();
    const region = within(await carte());
    await user.click(
      region.getByRole('button', { name: 'Masquer les nouveautés' })
    );
    expect(screen.queryByRole('region', { name: 'Quoi de neuf' })).toBeNull();
    expect(
      JSON.parse(localStorage.getItem('mister-uwh-tacticnouveautes')!)
    ).toEqual({ v: 1, data: { seen: LOT } });
  });

  it('un lien mène à l’écran où l’on s’en sert', async () => {
    const user = userEvent.setup();
    monter();
    const region = within(await carte());
    await user.click(region.getByRole('link', { name: /^Le chrono de match/ }));
    expect(screen.getByTestId('ou')).toHaveTextContent('/match');
  });

  it('le lien pour les joueurs ouvre le menu où il est', async () => {
    const user = userEvent.setup();
    monter();
    const region = within(await carte());
    await user.click(region.getByRole('link', { name: /^Le lien pour les/ }));
    const menu = await screen.findByRole('dialog', {
      name: 'Actions du schéma',
    });
    expect(
      within(menu).getByRole('button', { name: /^Lien pour les joueurs/ })
    ).toBeInTheDocument();
  });

  it('les variantes ouvrent les lignes de la phase, dans la frise', async () => {
    const user = userEvent.setup();
    monter();
    const region = within(await carte());
    await user.click(region.getByRole('link', { name: /^Les variantes/ }));
    expect(
      await screen.findByRole('dialog', { name: 'Lignes de la phase' })
    ).toBeInTheDocument();
  });

  it('en mode simple, pas de variantes, et le guide passe d’abord', async () => {
    const user = userEvent.setup();
    localStorage.setItem('mister-uwh-tactic:mode', JSON.stringify('simple'));
    monter();
    // Le guide de la première phase est là : une carte à la fois.
    expect(
      screen.getByRole('region', { name: 'Votre première phase' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Quoi de neuf' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Passer le guide' }));
    const region = within(await carte());
    expect(region.getAllByRole('link')).toHaveLength(4);
    expect(region.queryByRole('link', { name: /^Les variantes/ })).toBeNull();
  });
});
