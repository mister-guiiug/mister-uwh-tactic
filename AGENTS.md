# Instructions pour les agents

Mister UWH Tactic est un tableau tactique de hockey subaquatique, en 2D et en
3D. Il est né du squelette de la famille (`pwa-starter-kit`) et en garde la
composition : ce fichier dit ce qui est propre à l'application.

## Les règles

**1. Un modèle, deux vues.** Le schéma est décrit dans
`src/features/board/model.ts`, en mètres ; `frame.ts` rend l'image à un
instant donné. Le tableau 2D (`Board2D.tsx`) et la scène 3D (`scene3d.ts`)
dessinent cette image et rendent leurs gestes au même magasin (`store.ts`).
Une fonctionnalité qui n'existerait que dans une vue est un écart : la
décision est dans [`docs/adr/0014-tableau-et-3d.md`](./docs/adr/0014-tableau-et-3d.md).

**2. Le tracé du terrain s'écrit une fois.** `pitch.ts` le décrit d'après le
règlement international ; le SVG et la texture du fond du bassin le lisent.
Ne jamais dessiner une ligne du terrain ailleurs.

**3. three.js reste dans son morceau.** Aucun module chargé par l'accueil
n'importe `three` ou `scene3d.ts` autrement qu'en `import type`. Le budget de
poids (`bundleBudget` de `package.json`) le vérifie : le préchargé ne doit pas
bouger quand la 3D grossit.

**4. La porte doit rester passable.** `npm run build` enchaîne le budget de
poids et `pwa-doctor --strict` : **zéro défaut, zéro dette, zéro info**.

## Ce qui vient du socle, et ne se réécrit pas

Avant d'écrire quoi que ce soit, chercher dans
[`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config) :
manifeste PWA, CSP, SEO, repli 404, primitives d'interface et leur habillage,
i18n et formateurs, libellés en sept langues, magasin versionné, sélecteur de
backend, journal, observabilité, mise à jour du service worker, workflows.

**`components.css` est le prérequis de toute adoption de `/react`.** Elle est
importée dans `src/index.css` — ne pas la retirer.

## Modifier

Une pull request, la CI verte, et un ADR si la modification change une
décision.

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org/fr/),
sujet en français, à l'impératif. Le corps explique **pourquoi** : le diff dit
déjà quoi. **Aucune signature d'assistant**, nulle part : ni `Co-Authored-By`
d'un robot, ni « Généré par… ».
