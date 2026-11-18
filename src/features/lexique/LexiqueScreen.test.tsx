import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n/index.ts';
import { LexiqueScreen } from './LexiqueScreen.tsx';

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
});

describe('l’écran du lexique', () => {
  it('range les mots en familles, et la recherche ignore les accents', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <I18nProvider>
          <LexiqueScreen />
        </I18nProvider>
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Les gestes' })
    ).toBeInTheDocument();
    expect(screen.getByText('Tir latéral')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Chercher un mot'), 'tir lateral');
    expect(screen.getByText('Tir latéral')).toBeInTheDocument();
    expect(screen.queryByText('Sandwich')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Chercher un mot'));
    await user.type(screen.getByLabelText('Chercher un mot'), 'xyzzy');
    expect(screen.getByRole('status')).toHaveTextContent('xyzzy');
  });

  it('ouvert depuis une consigne (`?terme=`), il montre ce mot', () => {
    render(
      <MemoryRouter initialEntries={['/lexique?terme=sortie-de-mur']}>
        <I18nProvider>
          <LexiqueScreen />
        </I18nProvider>
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Chercher un mot')).toHaveValue(
      'Sortie de mur'
    );
    expect(screen.getByText('Sortie de mur')).toBeInTheDocument();
    expect(screen.queryByText('Sandwich')).not.toBeInTheDocument();
  });
});
