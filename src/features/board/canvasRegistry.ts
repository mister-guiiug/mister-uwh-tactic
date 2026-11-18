/**
 * LE CANEVAS DE LA SCÈNE 3D, pour qui veut l'enregistrer.
 *
 * Un module à part, sans three.js : le bouton « Vidéo » vit dans l'écran
 * principal, qui ne doit pas tirer la 3D dans son morceau. La scène s'y
 * inscrit quand elle se monte, s'en retire quand elle se démonte.
 */
let current: HTMLCanvasElement | null = null;

export function registerCanvas(canvas: HTMLCanvasElement | null): void {
  current = canvas;
}

export function sceneCanvas(): HTMLCanvasElement | null {
  return current;
}
