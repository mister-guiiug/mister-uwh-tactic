import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover } from './Popover.tsx';

/**
 * Ce que ces tests figent : LE PANNEAU EST RENDU AU NIVEAU DE LA PAGE, hors
 * de tout conteneur qui pourrait le rogner — dans une carte de la
 * bibliothèque, il ne se voyait plus (18/11/2026) —, et il rend la main au
 * clavier.
 */
function Exemple() {
  return (
    <div data-testid="carte" style={{ overflow: 'hidden' }}>
      <Popover
        label="Actions"
        trigger={props => (
          <button type="button" {...props}>
            Ouvrir
          </button>
        )}
      >
        {close => (
          <button type="button" onClick={close}>
            Dupliquer
          </button>
        )}
      </Popover>
    </div>
  );
}

describe('Popover', () => {
  it('rend le panneau hors du conteneur, et met le focus dedans', async () => {
    const user = userEvent.setup();
    render(<Exemple />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));

    const panneau = screen.getByRole('dialog', { name: 'Actions' });
    expect(screen.getByTestId('carte').contains(panneau)).toBe(false);
    expect(panneau.parentElement).toBe(document.body);
    expect(screen.getByRole('button', { name: 'Dupliquer' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Ouvrir' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('Échap le referme et rend le focus au bouton', async () => {
    const user = userEvent.setup();
    render(<Exemple />);
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir' })).toHaveFocus();
  });

  it('un clic au-dehors le referme', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Exemple />
        <p>ailleurs</p>
      </>
    );
    await user.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await user.click(screen.getByText('ailleurs'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('une demande nouvelle l’ouvre ; celle trouvée au montage, non', () => {
    const avec = (openRequest: number) => (
      <Popover
        label="Lignes"
        openRequest={openRequest}
        trigger={props => (
          <button type="button" {...props}>
            Ouvrir
          </button>
        )}
      >
        {() => <button type="button">Choisir</button>}
      </Popover>
    );
    // « Quoi de neuf » (ADR 0039) : une demande d'avant ne rouvre rien.
    const { rerender } = render(avec(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(avec(3));
    expect(screen.getByRole('dialog', { name: 'Lignes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir' })).toHaveFocus();
  });
});
