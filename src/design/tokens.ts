/**
 * LES COULEURS DU DOMAINE, ÉCRITES UNE FOIS.
 *
 * Le tableau 2D (SVG), la scène 3D (three.js), la texture du fond du bassin
 * et l'équipement lisent tous cette table. Avant elle, 76 valeurs
 * hexadécimales étaient semées dans les composants du tableau, et le même
 * « rouge arbitre » existait en trois nuances (audit UX du 18/11/2026) :
 * changer une couleur revenait à la chercher partout, et à en oublier une.
 *
 * DEUX COUCHES, DEUX RAISONS.
 *
 * - Ce qui suit le THÈME (la plage autour du bassin, la couleur de
 *   sélection) est une variable CSS `--uwh-*`, déclarée dans `index.css` :
 *   le SVG l'écrit `var(--uwh-deck)` et le thème sombre la repeint. La table
 *   `CSS_VARS` en garde la valeur claire, et `tokens.test.ts` vérifie que la
 *   feuille dit la même chose.
 * - Ce qui ne bouge pas avec le thème (l'eau, les équipes, les officiels, le
 *   palet, les flèches) reste une valeur : three.js ne lit pas une variable
 *   CSS, et un bassin garde ses couleurs de jour comme de nuit — les numéros
 *   se lisent sur l'eau, pas sur la surface de l'application.
 *
 * `src/design/no-hex.test.ts` refuse toute couleur écrite en dur dans
 * `src/features/board/` : une nouvelle teinte entre ici, avec un nom.
 */

/** L'eau, les lignes et ce qui entoure le terrain. */
export const POOL = {
  /** Le terrain, vu de dessus. */
  water: '#a8dff0',
  /** Le bassin hors du terrain : la même eau, un ton plus profond. */
  pool: '#93d2e6',
  /** L'eau de la texture 3D, éclairée par la scène. */
  water3d: '#9fdcec',
  /** La surface de l'eau en 3D, translucide. */
  surface3d: '#5cc4e0',
  /** Le tracé du terrain : 7,9:1 sur l'eau. */
  line: '#123e6b',
  /** L'encre des étiquettes, des déplacements et des fantômes. */
  ink: '#0b2545',
  /** Les carreaux du fond, en 3D. */
  tile: '#d9f1f7',
  /** La plage, en 3D. */
  deck3d: '#c9d3dc',
  /** Le ciel au-dessus de l'eau, et le fond d'une scène qui charge. */
  above: '#1d2a36',
  /** La teinte de l'eau vue d'en dessous. */
  below: '#0b5570',
  /** Le texte posé sur `above`. */
  onAbove: '#e8ecf2',
  /** L'armature des buts. */
  metal: '#9ca3af',
} as const;

/**
 * LES BUTS, VUS DE DESSUS : un bac en acier galvanisé. La cuvette, dans
 * l'ombre de la paroi, est plus sombre que la rampe qui prend la lumière ;
 * le contour se lit sur l'eau (6,9:1). La paroi arrière porte la couleur de
 * l'équipe qui défend ce but.
 */
export const GOAL = {
  ramp: '#d4dbe2',
  steel: '#b8c1ca',
  trough: '#66717d',
  edge: '#334155',
} as const;

/** La lumière de la scène 3D. */
export const LIGHT = {
  sky: '#e3f6ff',
  ground: '#0b3954',
  sun: '#ffffff',
} as const;

/** Ce qui distingue une équipe de l'autre, sur le tableau comme en 3D. */
export interface TeamColors {
  /** Le corps du nageur sur le tableau, et le but de l'équipe. */
  body: string;
  /** Son liseré, qui le détache de l'eau. */
  outline: string;
  /** Le liseré des palmes. */
  finOutline: string;
  /** Le numéro posé sur le corps. */
  number: string;
  /** La zone de remplacement, dessinée en transparence. */
  zone: string;
  /** Le bonnet de water-polo : blanc, ou BLEU pour les Noirs. */
  cap: string;
  /** La crosse, à la couleur de l'équipe. */
  stick: string;
  /** Le slip de bain. */
  briefs: string;
}

export const TEAM: { blanc: TeamColors; noir: TeamColors } = {
  blanc: {
    body: '#f8fafc',
    outline: '#0f172a',
    finOutline: '#0f172a',
    number: '#0f172a',
    zone: '#ffffff',
    cap: '#f8fafc',
    stick: '#f1f5f9',
    briefs: '#e5e7eb',
  },
  noir: {
    body: '#111827',
    outline: '#e5e7eb',
    finOutline: '#94a3b8',
    number: '#ffffff',
    zone: '#111827',
    cap: '#1d4ed8',
    stick: '#111827',
    briefs: '#111827',
  },
};

/** Les officiels : un rouge, partout le même. */
export const OFFICIAL = {
  shirt: '#c81e1e',
  /** Le liseré du maillot, au repos. */
  outline: '#7f1d1d',
  /** Le texte d'un officiel posé sur l'eau (nom, distance) : 6,5:1. */
  label: '#9b1c1c',
  trousers: '#1f2937',
  /** Le sifflet, et le masque de l'arbitre aquatique. */
  whistle: '#111827',
} as const;

/** Le matériel, d'après le vrai (`features/board/equipment.ts`). */
export const GEAR = {
  skin: '#d9a07a',
  /** Les palmes de carbone de 50 cm. */
  fin: '#16181d',
  /** Le gant de laine enduit de silicone. */
  glove: '#4fb3e8',
  /** Le poignet du gant. */
  cuff: '#9ca3af',
  mask: '#38bdf8',
  snorkel: '#facc15',
} as const;

/** Le palet : rose sur le tableau, plomb gainé en 3D, halo rose. */
export const PUCK = {
  fill: '#fbcfe8',
  stroke: '#be185d',
  body3d: '#111111',
  halo: '#f472b6',
} as const;

/** Les flèches d'une étape : le déplacement à l'encre, le palet en rose. */
export const ARROW = {
  move: POOL.ink,
  pass: PUCK.stroke,
  flick: PUCK.stroke,
} as const;

/**
 * LES ZONES ET LES MOTS DE L'ENTRAÎNEUR (ADR 0026) : un violet, que rien
 * d'autre ne porte sur le tableau — ni les équipes, ni les officiels, ni le
 * palet, ni la sélection. Sur l'eau, qui ne change pas avec le thème ; un
 * mot qui déborde sur la plage sombre se lit par son liseré blanc. Les
 * rapports sont vérifiés par `marks-contrast.test.ts`.
 */
export const MARK = {
  /** Le fond d'une zone, posé à `fillOpacity`. */
  fill: '#7c3aed',
  fillOpacity: 0.18,
  /** Son contour : 4,9:1 sur l'eau du terrain, 4,3:1 sur le bassin. */
  stroke: '#6d28d9',
  /** Un mot, l'étiquette d'une zone : 7,5:1 sur l'eau, 5,9:1 dans une zone. */
  ink: '#4c1d95',
} as const;

/** Les signaux posés par-dessus le jeu. */
export const SIGNAL = {
  /** Un joueur resté trop longtemps au fond. */
  apnea: '#dc2626',
  /** Le halo d'un jeton sélectionné, en 3D (la 2D suit le thème). */
  selection3d: '#f59e0b',
  /** Le blanc qui détache une poignée, une onde, un champ de vision. */
  light: '#ffffff',
} as const;

/**
 * LES VARIABLES QUI SUIVENT LE THÈME, en valeur claire. `index.css` les
 * déclare ; le test vérifie que les deux disent la même chose.
 */
export const CSS_VARS = {
  '--uwh-water': POOL.water,
  '--uwh-pool': POOL.pool,
  '--uwh-line': POOL.line,
  '--uwh-ink': POOL.ink,
  '--uwh-deck': '#d5e1e8',
  '--uwh-accent': '#d97706',
  '--uwh-above': POOL.above,
  '--uwh-on-above': POOL.onAbove,
  '--uwh-team-blanc': TEAM.blanc.body,
  '--uwh-team-noir': TEAM.noir.body,
  '--uwh-arrow-move': ARROW.move,
  '--uwh-arrow-pass': ARROW.pass,
  '--uwh-apnea': SIGNAL.apnea,
} as const;

/** `var(--uwh-…)`, pour un attribut SVG qui suit le thème. */
export const cssVar = (name: keyof typeof CSS_VARS) => `var(${name})`;
