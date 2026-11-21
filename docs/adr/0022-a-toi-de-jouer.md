# 0022 — « À toi de jouer » : une copie, un calque, jamais le brouillon

## Contexte

Un entraîneur partage ses phases ; un joueur veut les apprendre entre deux
entraînements. Lire une phase n'est pas la savoir : il faut se demander
« où dois-je être maintenant ? », répondre, puis voir la bonne place.

Deux pièges dans l'application telle qu'elle est :

- **le tableau enregistre son brouillon tout seul** (`draftStore`, écriture
  différée de 300 ms). Charger dans son magasin un schéma dérivé — l'étape
  sans la place du joueur — écraserait le travail de l'entraîneur, ou le
  schéma qu'on vient de recevoir ;
- **un schéma souffle ses réponses** : la flèche de déplacement du joueur,
  son fantôme, le palet qu'il porte, qui est au bout de sa crosse.

## Décision

**Un jeu dans une feuille, sur une copie.**

- **L'entrée** est sous « ⋯ », groupe « Apprendre ». Une phase d'une seule
  étape la grise et dit pourquoi (« Il faut au moins deux étapes »).
- **Le joueur** : le jeton sélectionné au tableau, s'il y en a un. Sinon,
  une liste de ceux qui bougent pendant la phase (au-delà de 30 cm, le
  seuil du fantôme).
- **Une partie** : chaque étape à partir de la deuxième.
  - Tous sont à leur place, lui là où il était à l'étape d'avant.
  - Il glisse son jeton, ou touche l'endroit voulu, puis « Vérifier ».
  - La bonne place paraît, avec l'écart en mètres et un verdict.
  - L'étape suivante repart de sa VRAIE place, pas de celle qu'il avait
    choisie.
  - À la fin, un bilan : les étapes justes et l'écart moyen, puis
    « Recommencer ».
- **La consigne de l'étape** paraît avec la réponse : elle l'explique, et
  souvent la dit.

**Le verdict** (`learn/rounds.ts`) :

- **Juste à moins d'un mètre.** Le palet se joue à 1,25 m de la poitrine :
  d'un mètre, la crosse couvre la bonne place. Au tableau, les deux pions
  se recouvrent.
- **Presque à moins de deux mètres**, moins d'une longueur de nageur palmes
  comprises (2,4 m dans le dessin) : deux coups de palmes.
- **À revoir au-delà** : on nage dans le couloir d'un autre. À l'engagement,
  deux voisins sont à 1,6 m.

**Rien ne passe par le magasin du tableau :**

- le schéma et la sélection sont **figés au toucher** de l'entrée, et le
  jeu n'en relit rien ;
- `Board2D` dessine une copie d'une seule étape, en image (prop `tactic`) ;
- par-dessus, **un calque** à nous, dans le même cadre : le jeton qu'on
  déplace, la bonne place, le trait d'écart.

**La copie ne souffle rien** (`guessTactic`) :

- les flèches dont un bout est à moins de 1,5 m du joueur, avant ou après
  l'étape, sont retirées. Le palet qu'il porte est à 1,26 m de lui ; une
  passe qui lui arrive finit là ;
- le fantôme est éteint ;
- s'il porte le palet à l'étape, le palet reste au bout de SA crosse, là où
  on le pose.

**La géométrie du cadre s'écrit une fois.** `boardFrame.ts` porte la marge,
la boîte de vue et le quart de tour du terrain dressé. `Board2D` le
dessine ; le jeu en tire la conversion d'un point de l'écran en mètres
(`learn/screen.ts`, vérifiée sans navigateur). Il est hors du composant
parce que la règle `react-refresh/only-export-components` refuse qu'un
`.tsx` exporte une fonction. `Board2D` n'exporte que des constantes
(`PORTRAIT_BELOW`, les pas du clavier) et deux composants de dessin
(`Pawn`, `UprightText`).

**Au téléphone tenu droit, le terrain se dresse**, et la feuille prend tout
l'écran :

- couché sur 375 px, le terrain fait 200 px de haut, et un jeton de 44 px
  couvre 3,4 m : on ne place rien au demi-mètre ;
- dressé, l'échelle est une fois et demie plus grande ;
- la règle est celle du tableau (`PORTRAIT_BELOW`), lue à la largeur de
  l'écran ; au-delà, le paysage est imposé. Le calque et `Board2D` ne
  peuvent pas diverger.

**L'accessibilité** :

- le jeton est un élément HTML de 44 px au moins, posé en pourcentage du
  calque, qui a les proportions du terrain ;
- il se glisse au doigt et à la souris, se déplace aux flèches (un
  demi-mètre, un dixième avec Maj, comme au tableau), et Entrée vérifie ;
- une seule région annoncée (`role="status"`), présente dès l'ouverture,
  dit la consigne, le verdict, puis le bilan.

**La mesure** (avec consentement) compte `a_toi_de_jouer` au bilan : le
nombre d'étapes et d'étapes justes.

## Conséquences

- **Une fonctionnalité du seul tableau 2D**, contre la règle « un modèle,
  deux vues » (ADR 0014). Le jeu n'est pas une vue du schéma : c'est un
  exercice, et placer un jeton au demi-mètre se fait mieux de dessus.
- **Le poids** : le jeu est dans le morceau secondaire, avec le menu « ⋯ »
  (9,2 → 12,1 kB gzip), et sa feuille de style aussi (`learn/learn.css`,
  0,8 kB) : dans `index.css`, elle coûtait 0,4 kB au préchargé. Celui-ci ne
  gagne que les textes français : 239,2 → 239,3 kB pour 246 (relevé local).
- **Une partie ne s'enregistre pas** : fermer la feuille la perd.
- **Téléphone couché** : la feuille est plein écran, mais le terrain n'a que
  la hauteur qui reste sous le titre, la consigne et le bouton.

## Ce qui est écarté

- **Charger l'étape dérivée dans le tableau**, puis la remettre : le
  brouillon l'aurait enregistrée entre-temps, et un rechargement au milieu
  de la partie aurait perdu le schéma.
- **Un second magasin du tableau** (`createBoardStore`) : il n'est pas
  persisté, mais `Board2D` lit le magasin global, et le dessin d'une image
  n'a besoin d'aucun geste.
- **Masquer les seules flèches du joueur, par leur auteur** : une flèche ne
  connaît pas son joueur, seulement deux points. La règle du rayon retire
  parfois la flèche d'un voisin très proche : c'est un indice de moins, pas
  une réponse de plus.
- **Le verdict en couleur seule** : il est écrit (« Juste », « Presque »,
  « À revoir ») et annoncé.
