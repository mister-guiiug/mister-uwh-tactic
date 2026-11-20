import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../../i18n/index.ts';
import { ASK_AFTER, SimpleFeedback } from './SimpleFeedback.tsx';

const monter = () =>
  render(
    <I18nProvider>
      <SimpleFeedback />
    </I18nProvider>
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('dwc_locale', 'fr');
});

/**
 * Ce que ces tests figent : LA QUESTION SE POSE APRÈS QUELQUES OUVERTURES,
 * UNE FOIS. Trop tôt, elle dérange ; répétée, elle lasse.
 */
describe('le retour en un geste', () => {
  it('ne demande rien avant quelques ouvertures', () => {
    monter();
    expect(
      screen.queryByText('Le tableau est-il facile à utiliser ?')
    ).toBeNull();
  });

  it('demande à la troisième ouverture ; « Oui » ne revient plus', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'mister-uwh-tactic:usages-simple',
      String(ASK_AFTER - 1)
    );
    monter();
    expect(
      await screen.findByText('Le tableau est-il facile à utiliser ?')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Oui' }));
    expect(
      screen.queryByText('Le tableau est-il facile à utiliser ?')
    ).toBeNull();
    expect(localStorage.getItem('mister-uwh-tactic:avis-simple')).toContain(
      'oui'
    );
  });

  it('« Pas encore » propose de dire ce qui bloque', async () => {
    const user = userEvent.setup();
    localStorage.setItem('mister-uwh-tactic:usages-simple', String(ASK_AFTER));
    sessionStorage.setItem('mister-uwh-tactic:usage-compte', '1');
    monter();
    await user.click(await screen.findByRole('button', { name: 'Pas encore' }));
    expect(
      screen.getByText(
        'Dites-nous ce qui bloque : chaque retour change la suite.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Proposer sur GitHub' })
    ).toHaveAttribute('href', expect.stringContaining('template=feature.yml'));
  });
});
