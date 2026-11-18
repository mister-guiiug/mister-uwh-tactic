import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../i18n/index.ts';
import { TermText, TermsInNote } from './TermText.tsx';

beforeEach(() => {
  localStorage.setItem('dwc_locale', 'fr');
});

const renderIn = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );

describe('une consigne reliée au lexique', () => {
  it('un mot du lexique ouvre sa définition, et mène au lexique', async () => {
    const user = userEvent.setup();
    renderIn(
      <p>
        <TermText text="Le pivot fait un relais vers l’arrière." />
      </p>
    );
    expect(screen.getByText(/Le pivot fait un/)).toBeInTheDocument();

    // Les définitions arrivent dans leur morceau : le lien paraît ensuite.
    await user.click(await screen.findByRole('button', { name: 'relais' }));
    const panneau = screen.getByRole('dialog', {
      name: 'Définition de « Relais »',
    });
    expect(panneau).toHaveTextContent('Le porteur bloqué donne');
    expect(
      screen.getByRole('link', { name: 'Voir dans le lexique' })
    ).toHaveAttribute('href', '/lexique?terme=relais');
  });

  it('sous le champ, liste les mots trouvés ; rien sans mot', async () => {
    const { rerender } = renderIn(
      <TermsInNote text="Sortie de mur, puis un écran." />
    );
    expect(await screen.findByText('Dans le lexique :')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sortie de mur' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Écran' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <I18nProvider>
          <TermsInNote text="Tout le monde nage." />
        </I18nProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText('Dans le lexique :')).not.toBeInTheDocument();
  });
});
