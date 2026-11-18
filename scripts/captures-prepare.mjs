/**
 * LES CAPTURES DU MANIFESTE MONTRENT UNE PHASE, PAS UN TABLEAU VIDE.
 *
 * `npm run screenshots -- --prepare scripts/captures-prepare.mjs` joue ce
 * module avant chaque photo : il ouvre un exemple de la bibliothèque PAR
 * L'INTERFACE — comme un utilisateur — et s'arrête à sa troisième étape, où
 * les flèches de passe se voient. La fiche d'installation montre alors ce
 * que fait l'application.
 */
export default async function prepare(page, { url }) {
  await page.evaluate(() => {
    localStorage.setItem('dwc_locale', 'fr');
    localStorage.setItem('dwc_theme', 'light');
    localStorage.setItem('mister-uwh-tactic:premiers-pas', 'true');
  });
  await page.goto(new URL('schemas', url).href, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Exemples', exact: true }).click();
  await page
    .getByRole('button', { name: /^Jouer le mur, puis sortir/ })
    .click();
  await page.getByLabel('Nom du schéma').waitFor();
  // La notification « exemple ouvert » ne doit pas être sur la photo.
  await page
    .locator('[data-dwc="toast"]')
    .first()
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => undefined);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.keyboard.press('.');
  await page.keyboard.press('.');
}
