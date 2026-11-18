import { useEffect } from 'react';

/**
 * CE QUE LE CADRE PREND À LA FENÊTRE, MESURÉ ET NON SUPPOSÉ.
 *
 * L'espace de travail du tableau prend la hauteur de l'écran moins celle de
 * l'en-tête et de la barre basse (ADR 0016). La première version les figeait
 * en CSS (61 et 57 px, relevés à la main) : un en-tête qui grandit — le
 * bandeau « hors ligne » qui s'intercale, un libellé plus long, une police
 * agrandie — faisait déborder le tableau sous la barre basse, sans que rien
 * ne le dise.
 *
 * On mesure donc, et on écrit deux variables sur la racine :
 *
 * - `--uwh-chrome-top` : le haut du `main`, c'est-à-dire l'en-tête et tout
 *   ce qui s'intercale avant le contenu ;
 * - `--uwh-chrome-bottom` : la barre basse quand elle est en bas, zéro quand
 *   elle est devenue un rail à gauche (grand écran).
 *
 * Les valeurs CSS de `index.css` restent le repli : elles valent avant le
 * premier rendu, et partout où `ResizeObserver` manque.
 */
export function useChromeMetrics(): void {
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const shell = document.querySelector<HTMLElement>("[data-dwc='app-shell']");
    if (!shell) return;

    // Mesuré tout de suite, pas au prochain `requestAnimationFrame` : un
    // onglet ouvert en arrière-plan n'en reçoit aucun, et le tableau y
    // restait sur les replis jusqu'au premier redimensionnement.
    const measure = () => {
      const main = shell.querySelector<HTMLElement>('main');
      const nav = shell.querySelector<HTMLElement>("[data-dwc='bottom-nav']");
      if (main) {
        const top = main.getBoundingClientRect().top + window.scrollY;
        root.style.setProperty('--uwh-chrome-top', `${Math.round(top)}px`);
      }
      if (nav) {
        const box = nav.getBoundingClientRect();
        // En rail, la barre est haute et étroite : elle ne prend rien en bas.
        const atBottom = box.width >= window.innerWidth * 0.6;
        root.style.setProperty(
          '--uwh-chrome-bottom',
          `${atBottom ? Math.round(box.height) : 0}px`
        );
      }
    };

    const resize = new ResizeObserver(measure);
    const watch = () => {
      resize.disconnect();
      for (const el of shell.querySelectorAll<HTMLElement>(
        "[data-dwc='app-header'], [data-dwc='bottom-nav']"
      )) {
        resize.observe(el);
      }
      measure();
    };
    // Un bandeau qui paraît entre l'en-tête et le contenu change le haut du
    // `main` sans changer la taille de l'en-tête : on surveille aussi la
    // liste des enfants du cadre.
    const children = new MutationObserver(watch);
    children.observe(shell, { childList: true });
    window.addEventListener('resize', measure);
    watch();

    return () => {
      resize.disconnect();
      children.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--uwh-chrome-top');
      root.style.removeProperty('--uwh-chrome-bottom');
    };
  }, []);
}
