# 0017 — La grammaire d'Astryx sur le socle, une région par écran

## Contexte

La refonte de l'ADR 0016 avait donné au tableau sa place. Le second audit
(18/11/2026, 36 captures, téléphone et bureau, clair et sombre) a mesuré ce
qui restait :

- au téléphone, **l'accueil faisait 1 346 px** pour un écran de 812, et le
  panneau commençait **sous** la barre basse : 0 px visible sans défiler ;
- **trois bandeaux** passaient avant le terrain (187 px), dont un en-tête de
  61 px qui ne disait que le nom de l'application ;
- **onze tailles de texte**, de 10,88 à 20 px : vingt `font-size` en dur, une
  trentaine de `text-sm`, et l'échelle fluide du socle qui glisse avec la
  fenêtre ;
- des rayons, des ombres et un `z-index` choisis au cas par cas ;
- des onglets qui mêlaient les sujets (la vitesse de lecture dans « Étape »,
  l'affichage dans « Bassin ») et des outils en icônes seules au téléphone.

**Astryx**, le design system open source de Meta (MIT, `@astryxdesign/core`
0.7.x), nomme chaque décision par son usage et range l'écran en régions.

## Décision

**On prend la grammaire d'Astryx, pas son paquet.**

- **Les noms et les échelles** : `--color-<élément>-<rôle>`, `--spacing-*`
  au pas de 4 px, six tailles de texte nommées (`display-3`, `h1`…`h4`,
  `body`, `label`, `supporting` ; base 14 px, 16 au doigt, 12 au plancher),
  `--radius-{inner,element,container,page,full}`, `--shadow-{low,med,high}`,
  `--duration-*` et `--ease-*`, `--size-element-{sm,md,lg}`. Déclarés dans
  `src/index.css`, les couleurs en **alias** des `--dwc-*` du socle : il n'y a
  qu'une source, et les composants du socle suivent.
- **L'échelle fluide du socle est ramenée sur les six crans** en surchargeant
  ses `--text-fluid-*`, sans toucher au socle.
- **Deux tests** : `scale.test.ts` refuse une taille de texte en dur (CSS et
  classes Tailwind), `no-hex.test.ts` une couleur — désormais dans tout `src/`.
- **Une région par écran au téléphone, deux dès 768 px, trois dès 1 024**
  (rail, terrain, panneau). L'accueil ne défile plus : l'espace de travail
  prend exactement ce que la fenêtre laisse.
- **Une seule barre sur le tableau** : l'en-tête de l'application reste dans
  la page (le `h1` que lisent les moteurs et les lecteurs d'écran) mais ne se
  voit plus ; la barre du schéma porte le fil « Schémas › » et « Partager »
  dès 768 px.
- **Le panneau devient une feuille du bas à crans au téléphone** (fermée :
  sa poignée et ses onglets ; mi-hauteur ; pleine), non modale.
- **Cinq onglets rangés par objet** : Étape (ouvert en arrivant), Jeton (au
  choix d'un joueur), Équipes, Règles, Bassin. La vitesse et l'apnée vont
  dans la frise (tout ce qui est temps), l'affichage dans « Calques », posé
  sur le terrain. Les outils sont étiquetés au téléphone.
- **Le rail du bureau prend la hauteur de l'écran** ; Réglages, Compte et À
  propos en pied ; « Plus » n'existe plus qu'au téléphone. Pas de retour sur
  un premier niveau ; le thème quitte les en-têtes pour Réglages (« Clair ·
  Sombre · Système »).
- **Menus** : « ⋯ » du tableau groupé (Partager, Montrer, Schéma) et posé
  sous son bouton sur bureau ; une carte de la bibliothèque = « Ouvrir » et
  un menu ; « (copie 2) » plutôt que « (copie) (copie) ».

## Conséquences

- L'accueil tient dans l'écran à 375 × 812 et à 1 440 × 900 ; le terrain
  gagne en hauteur malgré les onglets toujours visibles.
- Une couleur, une taille, un rayon, une ombre se changent à un endroit.
- **Revient sur un écarté de l'ADR 0016** (« un tiroir non modal glissé du
  bas ») : fermée, la feuille ne prend que la hauteur de ses onglets, que
  l'espace de travail réserve — le terrain entier reste au-dessus. Ouverte,
  elle recouvre le bas du terrain le temps qu'on règle ; c'était le prix
  payé, pire, en faisant défiler la page.
- L'onglet « Étape » est dans l'accueil, l'inspecteur du jeton dans le
  morceau des onglets secondaires : le préchargé ne grossit pas.
- **Désagréable** : la barre basse est rendue par l'application (dans
  `beforeMain`) et non par `navItems` d'`AppShell`, qui ne transmet pas
  `maxVisible` — six entrées sur le rail en auraient replié une sous
  « Plus ». À remonter au socle.
- **Désagréable** : `Popover` (« Calques », menus des cartes) est écrit dans
  l'application (`src/ui/Popover.tsx`) : le socle n'a qu'une boîte modale. Il
  montera si une sœur en a besoin.

## Écarté

- **Installer `@astryxdesign/core`** : StyleX y est une dépendance pair
  obligatoire, le parc est en Tailwind sur un socle commun à une trentaine
  d'applications — une seconde bibliothèque de composants dans une seule,
  c'est la divergence que la règle 3 du parc refuse. Le préchargé (214 kB
  sur 223) n'en a pas la place, et l'API est pré-1.0.
- **La taille de contrôle d'Astryx** (36 px au plus) : le parc exige 44 px
  au doigt ; Astryx ne publie pas de taille de cible.
- **Une barre d'onglets à la Astryx** : il n'en a pas en bas d'écran ; la
  barre basse du socle reste celle de toute la famille.

## Suivi

- **18/11/2026** — Le socle 6.36.0 transmet `navMaxVisible` à la barre
  (dev-pwa-config#516, relevé par cette application avec miss-supatool et
  mister-doc). La barre n'est plus rendue à part dans `beforeMain` :
  `navItems` et `navMaxVisible={6}` sur `AppShell`. La première conséquence
  « désagréable » est levée.
