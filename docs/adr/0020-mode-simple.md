# 0020 — Un mode simple au téléphone, un mode complet

## Contexte

Les premiers retours de la version au téléphone : « difficile à utiliser ».
Relevé du 20/11/2026 sur la version en ligne, dans un Pixel 7 :

- **54 contrôles visibles** dès l'arrivée :
  - 35 jetons — dix joueurs par équipe avec les remplaçants, quatre
    arbitres, le palet ;
  - un joueur fait environ 20 px de large, serré contre son voisin le long
    du mur ;
- **quatre outils** au sens trompeur : « Déplacer » trace une flèche de
  déplacement, il ne déplace pas un joueur ;
- une frise de sept commandes, dont la vitesse et l'apnée ;
- une barre de jeton en icônes seules ;
- cinq onglets ;
- un défaut : la feuille fermée défilait de l'intérieur au premier focus
  (icônes coupées, une bande du panneau sous les onglets).

## Décision

**Deux modes, qui affichent plus ou moins le même schéma — sans rien en
effacer.**

- **Le mode simple**, par défaut au téléphone :
  - **Six contre six et le palet** : un schéma neuf, ou le brouillon intact
    du premier lancement, part sans remplaçants ni arbitres. Ils existent
    dans le schéma, masqués.
  - **Des pions** : ronds, numérotés en gros, une encoche pour la direction.
  - **Des gestes, pas d'outils** : toucher choisit, glisser déplace. Les
    flèches de déplacement se lisent dans les fantômes des étapes.
  - **Une barre en toutes lettres**, sous le tableau : « Descendre au fond
    / Remonter », « Donner le palet », « Passe à… », puis le receveur d'un
    toucher.
  - **Une frise courte** : étapes, ajout, lecture.
  - **Pas d'onglets** : « Tous les réglages » passe en mode complet. La 3D
    se regarde depuis « ⋯ ».
- **Le mode complet** : l'interface d'avant, inchangée. Par défaut sur
  grand écran.
- **Le choix** : une carte au premier lancement en mode simple, non
  bloquante ; puis « ⋯ » et Réglages. Il est retenu par appareil.

**Dans les deux modes :**

- **La feuille fermée est en `overflow: clip`.** Une boîte `hidden` se
  laisse faire défiler par le focus.
- **Un toucher qui atteint plusieurs jetons demande lequel**, au lieu de
  deviner. Un glisser déplace toujours le jeton du dessus.
- **Couché, le téléphone donne l'écran au tableau.** La barre basse part ;
  on la retrouve en se remettant debout.
- **La mesure** (PostHog, avec consentement) compte le mode choisi et d'où
  (`mode_choisi`). Elle compte aussi les passes tracées ou annulées
  (`passe`) et le choix entre jetons : proposé, fait ou abandonné
  (`choix_jeton`). Rien de personnel ; c'est elle qui dira si le mode
  simple règle le problème.

## Conséquences

- La suite e2e tourne en mode complet par défaut (`storageState` de
  `playwright.config.ts`) : elle décrit l'interface qu'elle teste.
  `e2e/mode-simple.spec.ts` choisit le mode simple elle-même.
- Le chargé à l'ouverture passe à 241,6 kB pour 246 : la prochaine
  fonctionnalité de l'accueil devra se charger à la demande.
