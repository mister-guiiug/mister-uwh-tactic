import type { Team } from './model.ts';

/**
 * L'ÉQUIPEMENT D'UN JOUEUR, décrit une fois et dessiné deux fois : vu de
 * dessus sur le tableau, en volume dans le bassin. Mesures en mètres.
 *
 * - LA CROSSE : 260 à 300 mm selon les modèles, 143 à 185 g (gamme 6aA :
 *   Juggernaut 260, Mako 262, Dingo et Cronus 265, Koala 270, Platypus 275,
 *   Ronin 280, Python 300). Un manche droit tenu dans le gant, prolongé d'un
 *   crochet qui ramène le palet ; on la prend ici au milieu de la gamme.
 * - LES PALMES : en fibre de carbone, 500 mm de voilure sur 240 de large
 *   (Breier, UH 500 C8), noires, chausson fermé.
 * - LE BONNET : un bonnet de water-polo à protège-oreilles, BLANC pour
 *   l'équipe blanche, BLEU pour l'équipe noire. La crosse, elle, porte le
 *   blanc ou le noir.
 * - LE GANT : de laine enduite de silicone, sur la main de la crosse (bleu
 *   ciel, poignet gris, comme le gant More-Sport).
 * - Les joueurs jouent en slip de bain : la peau, le slip à la couleur de
 *   l'équipe, le masque et le tuba.
 */
export const STICK = {
  length: 0.28,
  /** La partie droite, du talon au début du crochet. */
  handle: 0.19,
  width: 0.032,
  tipWidth: 0.05,
  thickness: 0.025,
  /** L'angle dont tourne le crochet, en degrés. */
  hookAngle: 75,
} as const;

export const FIN = {
  length: 0.5,
  width: 0.24,
  /** Le chausson, avant la voilure. */
  pocket: 0.18,
} as const;

export const GLOVE = {
  length: 0.2,
  silicone: '#4fb3e8',
  cuff: '#9ca3af',
} as const;

export const SKIN = '#d9a07a';
export const FIN_COLOR = '#16181d';

export const TEAM_GEAR: Record<
  Team,
  { cap: string; stick: string; briefs: string }
> = {
  blanc: { cap: '#f8fafc', stick: '#f1f5f9', briefs: '#e5e7eb' },
  noir: { cap: '#1d4ed8', stick: '#111827', briefs: '#111827' },
};

export type Outline = [number, number][];

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * LE CONTOUR DE LA CROSSE, vu à plat : le talon à l'origine, le manche vers
 * les `x` croissants, le crochet qui tourne vers les `y` NÉGATIFS — vers
 * l'intérieur pour un droitier, qui la tient de la main droite (`y` positif).
 * Un gaucher en prend le miroir.
 */
export function stickOutline(spec = STICK, samples = 10): Outline {
  const sweep = rad(spec.hookAngle);
  // Le rayon qui amène le bout du crochet, bord compris, à `length`.
  const radius =
    (spec.length - spec.handle) / Math.sin(sweep) - spec.tipWidth / 2;
  type Sample = { x: number; y: number; nx: number; ny: number; w: number };
  const centre: Sample[] = [
    { x: 0, y: 0, nx: 0, ny: 1, w: spec.width },
    { x: spec.handle, y: 0, nx: 0, ny: 1, w: spec.width },
  ];
  for (let i = 1; i <= samples; i++) {
    const phi = (sweep * i) / samples;
    centre.push({
      x: spec.handle + radius * Math.sin(phi),
      y: -radius * (1 - Math.cos(phi)),
      // La normale « gauche » de la tangente (cos φ, −sin φ).
      nx: Math.sin(phi),
      ny: Math.cos(phi),
      w: spec.width + ((spec.tipWidth - spec.width) * i) / samples,
    });
  }
  const left = centre.map(
    c => [c.x + (c.nx * c.w) / 2, c.y + (c.ny * c.w) / 2] as [number, number]
  );
  const right = centre.map(
    c => [c.x - (c.nx * c.w) / 2, c.y - (c.ny * c.w) / 2] as [number, number]
  );
  return [...left, ...right.reverse()];
}

/**
 * LE CONTOUR D'UNE PALME, vu à plat : le chausson à l'origine, la voilure
 * vers les `x` NÉGATIFS (derrière le nageur), qui s'évase jusqu'à la largeur
 * de la pale et se termine en arrondi.
 */
export function finOutline(spec = FIN): Outline {
  const pocketHalf = 0.05;
  const half = spec.width / 2;
  const tip = -spec.pocket - spec.length;
  return [
    [0, -pocketHalf],
    [-spec.pocket, -pocketHalf * 1.2],
    [tip + 0.06, -half],
    [tip, -half * 0.6],
    [tip, half * 0.6],
    [tip + 0.06, half],
    [-spec.pocket, pocketHalf * 1.2],
    [0, pocketHalf],
  ];
}

/** Le chemin SVG d'un contour fermé. */
export function outlinePath(outline: Outline, scaleY = 1): string {
  const f = (n: number) => Number(n.toFixed(4));
  return (
    outline
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${f(x)} ${f(y * scaleY)}`)
      .join(' ') + ' Z'
  );
}
