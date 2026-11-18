# 0016 — Un espace de travail, un panneau à onglets, quatre entrées

## Contexte

L'audit UX du 18/11/2026 (`_audit-ux-mister-uwh-tactic-2026-11-18.md`, à la
racine de l'espace de travail du compte) a mesuré l'application après douze
fonctions ajoutées en une passe :

- **sur un téléphone (375 × 812)**, l'accueil faisait 3 144 px de haut, soit
  3,9 écrans. Le tableau allait de 396 à 912 px : il sortait du premier
  écran, sous un champ de nom à libellé et six boutons sur deux lignes ;
- huit cartes s'empilaient sous le tableau — sélection, étapes, apnée,
  composition, situations, export, effectifs — et la suite d'étapes, qui EST
  la phase de jeu, se trouvait à 1 400 px du haut ;
- 53 contrôles, dont 16 cibles sous 44 px (segments de 30 à 36 px, cases à
  cocher de 13 px) ;
- **sur un grand écran (1 440 × 900)**, la colonne `xl` laissait 416 px
  inutilisés, et le tableau finissait à 967 px ;
- 76 couleurs hexadécimales dans les composants du tableau, dont trois
  nuances du même rouge d'arbitre ;
- une barre basse de cinq entrées, dont deux qu'on visite une fois
  (Réglages, À propos), et le compte caché au fond des réglages.

## Décision

**L'accueil est un espace de travail à la hauteur de l'écran** : une barre
du schéma (le nom, éditable en place, et son état d'enregistrement ;
annuler, rétablir, enregistrer ; le reste sous « ⋯ »), les commandes de la
vue collées au tableau, le tableau qui remplit ce qui reste, et la frise des
étapes épinglée dessous. Sur un téléphone, tout tient dans le premier écran.

**Les fonctions vont dans un panneau à six onglets**, rangées par ce sur
quoi elles agissent : Sélection (l'inspecteur du jeton, qui remplace la
barre de sélection et la fiche modale), Étape, Équipes, Règles, Apnée,
Bassin. Le panneau est à droite du tableau à partir de 1 024 px, sous la
frise en dessous. Toucher un jeton ouvre l'onglet Sélection.

**Les gestes rares vont sous « ⋯ »** : partager, QR code, imprimer, vidéo,
présenter, nouveau schéma — chacun avec la phrase qui dit ce qu'il fait.

**La barre basse a quatre entrées** : Tableau, Schémas, Notes, et « Plus »,
une page qui range Réglages, Compte et À propos, chacun avec une ligne de
description. À partir de 1 024 px, la même barre devient un rail à gauche,
par les attributs publics du composant du socle (`data-dwc`,
`data-placement`) : aucun composant de navigation n'est réécrit.

**Les couleurs du domaine ont une seule source**, `src/design/tokens.ts`,
que lisent le SVG, la scène 3D, la texture du fond et l'équipement. Ce qui
suit le thème (la plage, la sélection) reste en variable CSS `--uwh-*` ; un
test vérifie que la feuille et la table s'accordent, un autre refuse toute
couleur écrite en dur dans `src/features/board/`.

**Les cibles font 44 px au doigt** : les contrôles segmentés du socle sont
relevés sous `pointer: coarse`, les cases à cocher deviennent des bascules
dont la ligne entière est la cible.

**La bibliothèque montre des vignettes** : la première étape de chaque
schéma, dessinée par le même `Board2D`. Vide, elle propose de créer un
schéma ou d'ouvrir un exemple, construit geste par geste par le magasin du
tableau. Ouvrir un schéma ou repartir à zéro agit tout de suite, et une
notification garde de quoi rendre le brouillon pendant huit secondes
(ADR 0008), quand il porte des modifications que la bibliothèque n'a pas.

## Conséquences

- Mesuré après la refonte : à 375 × 812, la barre, le tableau et la frise
  tiennent entre l'en-tête et la barre basse ; à 1 440 × 900, le tableau
  prend 929 px de large et le panneau 360 à côté.
- Les réglages parlent à un entraîneur : « Vos données », « Synchronisation »
  en une phrase, et le diagnostic des variables `VITE_*` replié sous « Pour
  les développeurs ». « Tout effacer », qui n'effaçait que les notes, devient
  « Effacer mes notes ».
- L'accroche de l'accueil passe sous l'espace de travail : au-dessus, elle
  repoussait le bassin hors du premier écran. La page servie aux robots la
  porte toujours.
- **Désagréable** : sur un téléphone, le panneau est sous la ligne de
  flottaison. Toucher un jeton bascule l'onglet, mais il faut faire défiler
  pour le voir ; un double-toucher y mène directement, le nom en main.
- La hauteur de l'espace de travail se calcule d'après celles de l'en-tête
  et de la barre basse, **mesurées** au rendu (`src/app/useChromeMetrics.ts`)
  : un bandeau « hors ligne » qui s'intercale, une police agrandie ou une
  barre devenue rail sont pris en compte. Les valeurs relevées à la main
  (61 et 57 px) ne restent qu'en repli CSS.
- **Désagréable** : sur grand écran, les notifications restent relevées de
  la hauteur de la barre basse, devenue rail. La variable qui le décide est
  privée au socle (`--_dwc-bottom-clearance`) ; elle n'est pas surchargée.

## Écarté

- **Un panneau en feuille modale sur téléphone** : le tableau aurait été
  recouvert pendant qu'on règle le jeton qu'on regarde.
- **Un tiroir non modal glissé du bas** : sur un terrain dressé, il aurait
  caché le but du bas, et ce motif n'existe pas dans le socle.
- **Le tiroir « Plus » intégré de `BottomNav`** : `AppShell` ne transmet pas
  `maxVisible`, et cinq entrées visibles ne réglaient pas le problème. Une
  page dit en plus ce que contient chaque destination.
- **Une palette par thème pour le bassin** : l'eau garde ses couleurs de
  jour comme de nuit, pour que les numéros se lisent pareil.
