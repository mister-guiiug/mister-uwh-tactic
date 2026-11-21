# 0019 — Le palet au fond, porté par une crosse ; joueurs et arbitres plus vrais

## Contexte

Une règle du sport, rappelée par le propriétaire le 20/11/2026 : **le palet
est toujours au fond de l'eau.** Le modèle la tenait à moitié. Le palet
était un point sans profondeur, mais rien n'empêchait un joueur en surface
de le « jouer », et un flick le montait à 1,2 m, plus de la moitié d'un
bassin de 2 m.

Les joueurs et les arbitres restaient sommaires :

- un joueur passait de la surface au fond en ligne droite pendant toute
  l'étape, traversant l'eau en diagonale ;
- l'apnée avait un seuil unique de 15 s, et une remontée d'une seconde
  remettait le compteur à zéro ;
- rien ne disait qu'un déplacement était impossible dans la durée de
  l'étape ;
- le champ de vision d'un arbitre était dessiné, sans rien dire de ce qu'il
  voit vraiment ;
- l'étape ne portait pas l'arrêt de jeu.

## Décision

**La règle est tenue par construction, pas vérifiée après coup.**

- **Le porteur** (`step.carrier`). Le palet est au bout de sa crosse, du côté
  de sa main, et le suit (`carry.ts`). Lui donner le palet le fait descendre.
  S'il remonte, il le lâche, et le palet reste au fond où il était. Déplacer
  le palet seul le lâche aussi.
  - Le palet ne revient jamais seul à une crosse voisine : un placement
    voulu (le palet dans la cuvette d'une pénalité) ne doit pas sauter.
- **Le flick** monte à 0,5 m : juste de quoi passer au-dessus d'un joueur
  allongé.
- **La plongée en trois temps.** Le canard se fait dans la première seconde
  de l'étape, presque vertical, comme le décrit le manuel de la WUHA. La
  remontée se fait dans la dernière seconde.
- **L'apnée.**
  - Le seuil par défaut passe à 10 s : « 5 à 10 secondes sous l'eau à chaque
    fois » en match, selon le manuel de la WUHA.
  - Chaque joueur peut avoir le sien.
  - Le compteur ne repart à zéro qu'après un temps en surface d'au moins la
    moitié du temps passé au fond. Ce ratio est un choix de l'application.
- **La vitesse.** Un déplacement plus rapide que `display.maxSpeed`
  (2 m/s par défaut) est signalé. Aucun document ne chiffre cette vitesse :
  c'est un réglage.
- **Les arbitres.**
  - Champ de vision affiché, l'étape dit si aucun arbitre de l'eau ne voit
    le palet.
  - Elle dit aussi si un joueur allongé près du palet le cache : la ligne de
    vue descend de la surface en biais, et passe sous un dos à moins de
    35 cm du fond.
  - « Placer les arbitres autour du palet » les met de part et d'autre, à
    3,5 m, face à lui.
- **L'arrêt de jeu** (`step.decision`) : coup franc, but, tir de pénalité ou
  temps mort. Il se lit sur le tableau, en présentation aussi.

Tous ces champs sont **facultatifs** : un schéma, un fichier ou un lien
d'avant se relit tel quel, sans migration. Le lien partagé les porte dans
une clé à part (`x`), qu'une application plus ancienne ignore sans perdre
le reste.

## Réglages (suivi du 20/11/2026)

Trois chiffres ne viennent d'aucun document : la récupération (la moitié du
temps passé au fond), la vitesse maximale (2 m/s) et la hauteur d'un flick
(50 cm). Plutôt que de les trancher à la place d'un entraîneur, ils se
règlent PAR SCHÉMA : la récupération et la vitesse à côté du seuil
d'apnée, la hauteur du flick dans « Règles ». Les défauts restent ceux-là ;
le lien partagé emporte les réglages.

## Conséquences

- L'onglet Étape liste les alertes de l'étape en clair, et la frise les
  marque. Les alertes d'arbitres ne jouent que champ de vision affiché :
  sinon, les phases écrites sans eux en porteraient à chaque étape.
- Les exemples ne nomment pas de porteur : ils placent le palet eux-mêmes,
  et rien ne change pour eux.
- La migration v2 → v3 garde son seuil historique de 15 s : un défaut qui
  bouge ne change pas ce qu'une migration rend.

## Suivi du 21/11/2026 — les nages courbes

### Contexte

D'une étape à l'autre, un joueur allait en ligne droite. Dans l'eau, on
contourne un adversaire, on décrit un arc pour prendre le palet à revers :
la phase lue ne montrait pas ce que l'entraîneur explique.

### Décision

**Le modèle.** `step.curves`, facultatif : par joueur, le point de contrôle
d'une Bézier quadratique, en mètres, rangé dans l'étape d'ARRIVÉE
(`curve.ts`). Comme le porteur et l'arrêt de jeu, ni migration ni version.

- Le point est **absolu**, pas relatif à la corde : retoucher l'arrivée
  laisse la courbe tirer vers le même endroit, celui de l'adversaire qu'on
  contourne.
- Une courbe n'existe **que pour un joueur qui bouge**. Copiée avec une
  étape, gardée aux étapes suivantes, ou relâchée sur sa corde, elle
  disparaît : `settleCurves` passe après chaque édition, comme la règle du
  palet.
- Les arbitres et le palet n'en ont pas : une passe va droit.

**Le temps.** `frameAt` suit la courbe, gardée dans le bassin. À
mi-passage, le joueur est au milieu de la courbe, en B(½) : c'est là que se
pose la poignée.

- **La 3D** lit l'image ; ses traces au fond lisent les mêmes chemins que les
  fantômes du tableau (`swimsInto`), courbes comprises.
- **La vidéo de phase** dessine le tableau à chaque instant : elle suit la
  courbe sans rien de plus.
- **Le palet porté** reste au bout de la crosse quand le même joueur le porte
  aux deux étapes, au lieu de couper en ligne droite d'une crosse à l'autre.
  Cela vaut aussi pour un porteur qui tourne sur place.
- **La vitesse maximale** compare la longueur de la courbe, pas la corde :
  contourner, c'est nager plus.

**Le geste, en 2D.** Le joueur sélectionné qui a bougé depuis l'étape
précédente montre une poignée au milieu de son chemin.

- La glisser courbe la nage : le milieu suit le doigt.
- Deux touchers, ou « Redresser la nage » dans l'inspecteur, la redressent ;
  la relâcher sur la corde aussi. Annuler défait le glisser d'un coup.
- **44 px au doigt**, 32 à la souris, quel que soit le zoom : un trait d'un
  millimètre à bouts ronds, qui ne suit pas le zoom (`non-scaling-stroke`).
  Un cercle au rayon presque nul ne se dessinait qu'en anneau, et ne se
  touchait que sur son bord (sonde du 21/11/2026, Chromium).
- **Sous les jetons** : un glisser qui part d'un joueur le déplace toujours,
  même quand la poignée le touche.
- Le double-toucher est compté à la main : `dblclick` n'arrive pas au doigt
  sur tous les téléphones.

**Le mode simple garde la poignée** (ADR 0020).

- C'est un geste, pas un outil : la règle même du mode simple.
- Elle ne paraît que sur le joueur choisi qui a bougé : aucun contrôle
  permanent de plus, quand le problème mesuré était d'en montrer 54.
- Le mode simple lit les déplacements dans les fantômes, à l'endroit même
  où elle se pose.
- Sans inspecteur, on y redresse par le double-toucher, ou en relâchant la
  poignée sur la corde.

**Le lien** porte les courbes dans `x.cv` : `[étape, joueur, x, y]`, en
décimètres. Un lecteur plus ancien ignore la clé et joue la phase en lignes
droites.

### Ce qui est écarté

- **Une Bézier cubique, ou plusieurs points de passage** : deux poignées par
  nage, pour un geste qu'on veut d'un doigt. Un arc ou un contournement
  tiennent dans une quadratique.
- **Un point relatif à la corde** : il garde la forme quand l'arrivée bouge,
  mais perd l'endroit contourné.
- **Une vitesse constante le long de la courbe** : le joueur ne serait plus
  sur la poignée à mi-lecture, pour un écart faible sur un arc de bassin.
- **Le geste en 3D** : la 3D montre la courbe ; on la trace au tableau,
  comme les flèches et la rotation.

### Conséquences

- **L'impression et les images d'étape** dessinent chaque étape à l'arrêt,
  sans chemin : la courbe n'y paraît pas — la ligne droite n'y paraissait
  pas non plus.
- **Une application plus ancienne** relit un brouillon, un fichier ou une
  copie synchronisée qui porte des courbes sans planter : zod retire la clé.
  Si elle réenregistre le schéma, les courbes sont perdues, comme le porteur
  et l'arrêt de jeu.
- **Une courbe tirée contre un mur** : le joueur glisse le long du mur, mais
  le tracé du fantôme peut déborder du bassin.
- **Au clavier**, on redresse depuis l'inspecteur ; courber reste un geste
  du pointeur, comme tracer une flèche.
- **Le poids** : la courbe et sa poignée vivent avec le tableau, dans
  l'accueil. Relevé local du 21/11/2026 : le préchargé passe de 239,2 à
  240,8 kB (borne 246), le total de 700,7 à 702,4 kB (borne 764).
