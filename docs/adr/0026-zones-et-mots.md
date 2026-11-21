# 0026 — Des zones et des mots sur le terrain

## Contexte

Le tableau ne savait dire que trois choses, les flèches d'une étape : un
déplacement, une passe, un flick. Sur un tableau blanc, un entraîneur fait
deux gestes de plus, et souvent avant les flèches :

- il **ombre une zone** : « le couloir », « la zone de pressing », « ici on
  ferme » ;
- il **pose un mot** sur le terrain, là où il parle.

Sans eux, la consigne de l'étape devait décrire l'endroit en toutes
lettres (« entre la ligne des 5 m et le bord, côté Blancs »), et la phase
lue, imprimée ou envoyée en vidéo ne le montrait pas.

## Décision

### Le modèle

**Deux listes facultatives dans l'étape, comme les flèches** (`model.ts`) :

- `zones` : une ellipse ou un rectangle, décrits par la boîte qui les
  contient, en mètres (`x`, `y`, `w`, `h`), avec une étiquette facultative ;
- `words` : un texte centré sur son point, en mètres.

Dix de chaque au plus par étape, 32 caractères par texte. Comme le porteur
du palet et l'arrêt de jeu (ADR 0019), **ni migration ni version** : une
étape sans annotation reste celle d'avant, octet pour octet, et une liste
vidée disparaît (`withMarks`). Le schéma d'une zone n'a pas de taille
plancher : un bassin réduit réduit ses zones, et un brouillon ne doit pas
devenir illisible pour un demi-mètre. Le geste, lui, refuse une zone de
moins de 50 cm de côté (`ZONE_MIN`).

`marks.ts` rassemble ce que partagent le magasin, le lien et les deux vues,
dont `marksAt` : les annotations à l'écran à un instant donné, celles de
l'étape commencée, exactement comme les flèches.

### Une étape copiée les emporte, pas ses flèches

Une flèche part d'où sont les joueurs : copiée dans l'étape suivante, où ils
ont bougé, elle mentirait. Une zone ou un mot désigne **un endroit du
bassin**, qui reste le même d'une étape à l'autre — le couloir est encore
le couloir. Les redessiner à chaque étape coûterait un geste par étape ; les
retirer de la copie en coûte un, dans l'onglet « Étape ».

La même raison décide du reste :

- **le miroir** les passe sur l'autre aile avec la phase ;
- **un bassin redimensionné** les déplace avec le terrain, et les garde
  dedans ;
- **« Replacer à l'engagement » et les situations du règlement** les
  gardent, comme la consigne : ils replacent les joueurs, pas l'endroit.

### Le geste

**Deux outils à côté des flèches, en mode complet**. Comme elles, ils
agissent sur le tableau 2D, où le doigt pose un point en mètres ; la 3D les
montre :

- **« Zone »** : un glisser trace la boîte, coin à coin, dans la forme
  choisie juste à côté (ellipse ou rectangle, rectangle par défaut) ;
- **« Mot »** : un toucher ouvre un champ sous le point touché (au-dessus
  dans le bas du tableau, où monte le clavier d'un téléphone) ; Entrée ou
  « Poser » le pose, Échap ou un toucher au-dehors renonce.

**L'onglet « Étape »**, qui liste déjà les flèches, liste les zones et les
mots : forme et étiquette d'une zone, texte d'un mot, et une corbeille
chacun. Un mot vidé garde son texte au tableau et le reprend en quittant le
champ : un mot vide n'existe pas, « Supprimer » le retire. Cette liste est
aussi ce que lit un lecteur d'écran, le dessin étant muet.

**Le mode simple n'a pas d'outils** (ADR 0020) : rien n'y est ajouté. Il
**montre** zones et mots, puisqu'ils sont dessinés par `Board2D`.

**Six outils et la vue ne tiennent plus en largeur sur un téléphone.** Leur
rangée, qui ne se replie pas là (ADR 0017), défile au doigt au lieu
d'élargir la page — elle poussait « Enregistrer » sous le terrain. Le choix
de la forme vient sous le doigt quand on prend l'outil « Zone ».

### Les deux vues

- **En 2D, sous les jetons et sans geste** : les zones juste au-dessus du
  tracé du terrain, les mots au-dessus des flèches. Un glisser parti d'un
  joueur le déplace toujours. Mots et étiquettes restent droits à l'écran,
  terrain dressé compris (`UprightText`).
- **En 3D, au fond du bassin** : le fond translucide et le contour tireté
  d'une zone posés sur le carrelage, sous les flèches ; les mots et les
  étiquettes à plat, le haut des lettres vers le petit `y` du terrain, pour
  se lire depuis la tribune et de dessus comme le tableau couché.
- **L'impression, l'image d'étape et la vidéo de phase** passent par
  `Board2D` : elles les dessinent sans une ligne de plus.

**Un violet que rien d'autre ne porte sur le tableau** (`MARK` dans
`tokens.ts`) : ni les équipes, ni les officiels, ni le palet, ni la
sélection. L'eau ne change pas avec le thème ; seule la plage s'assombrit,
et un mot qui y déborde se lit par son liseré blanc. `marks-contrast.test.ts`
vérifie les rapports WCAG sur l'eau du terrain, du bassin et du fond en 3D :

| Ce qui se lit                  | Sur l'eau | Dans une zone | Seuil |
| ------------------------------ | --------- | ------------- | ----- |
| Contour d'une zone (`stroke`)  | 4,9:1     | —             | 3:1   |
| Mot, étiquette (`ink`)         | 7,5:1     | 5,9:1         | 4,5:1 |
| Mot sur son liseré, à la plage | 11:1      | —             | 4,5:1 |

### Le lien

Les annotations voyagent dans la clé `x` des ajouts (`share.ts`) :

- `zn` : `[étape, forme, x, y, largeur, hauteur]` en décimètres, et
  l'étiquette en septième place s'il y en a une ;
- `mt` : `[étape, x, y, texte]`.

**Un lecteur plus ancien ignore la clé** et ouvre la phase sans elles : les
étapes compactes du lien sont celles d'une phase sans annotation, octet pour
octet.
Un schéma d'avant, dans un brouillon, un fichier ou une copie synchronisée,
les laisse tomber à la validation sans refuser le reste. Une entrée
illisible, ou de trop pour son étape, est ignorée ; le lien s'ouvre.

Le carnet de jeu (ADR 0023) et la séance (ADR 0018) embarquent la forme
compacte d'un schéma : ils suivent sans rien de plus, et un test le vérifie.

### « À toi de jouer »

La partie (ADR 0022) retire déjà les flèches qui partent du joueur ou y
mènent. Elle retire aussi **un mot posé à son départ ou à son arrivée** :
« ici » soufflerait la réponse. Les zones restent : elles ombrent un
endroit, elles ne désignent pas une place.

## Conséquences

- **Le préchargé passe de 232,2 à 236,5 kB** (borne 246), relevé local le
  21/11/2026 sur `fc2ca16` puis sur la branche. Le tableau, l'onglet
  « Étape » et le magasin sont l'accueil ; Rolldown range en plus trois
  petits morceaux à part, `marks`, `field` et `button` (0,6 kB chacun),
  partagés entre l'accueil et des morceaux différés.
- **Le total passe de 753,8 à 759,5 kB** (borne 830). Le reste de la
  hausse est chargé à la demande : la 3D, dans son morceau, et les quatre
  catalogues traduits.
- **Chaque clé s'écrit dans les cinq langues** : 18 clés, dans un bloc
  `marks` à part.
- **Les outils restent au pointeur**, comme les flèches : ni zone ni mot ne
  se trace au clavier. L'onglet « Étape » les modifie et les supprime au
  clavier.

## Écarté

- **Déplacer ou redimensionner une zone au doigt.** Le doigt saisit déjà
  les jetons, et une zone est souvent sous eux : il aurait fallu choisir à
  chaque toucher entre le joueur et la zone. Une zone mal placée se
  supprime et se retrace d'un geste.
- **Une couleur par zone.** Une seule teinte suffit à dire « annotation »,
  et l'étiquette dit laquelle. Des couleurs auraient concurrencé celles des
  équipes et du palet, déjà au nombre de trois sur l'eau.
- **Des étiquettes face à la caméra en 3D.** Elles se seraient confondues
  avec les numéros des joueurs, et une zone est au fond, pas dans l'eau.
- **Peindre les annotations dans la texture du fond.** Le canevas du
  carrelage fait 1 296 × 816 px ; le repeindre à chaque étape, pendant la
  lecture, aurait coûté plus que quelques maillages.
- **Une version 4 du modèle ou du lien.** Rien ne l'exige : des champs
  facultatifs et une clé ignorée par les anciens lecteurs suffisent, comme
  pour le porteur, l'arrêt de jeu et les nages courbes.

## Relecture à faire

L'outil « Mot » s'appelle « Text » en anglais, « Texto » en espagnol,
« Tekst » en néerlandais et « Text » en allemand : c'est le nom de l'outil
sur les tableaux tactiques de ces langues, où « Word » sonne faux. À faire
confirmer par un joueur de chaque pays (ADR 0024), avec :

- **espagnol** : « pasillo » pour le couloir, « zona de presión » pour la
  zone de pressing, « sombrear » pour ombrer ;
- **néerlandais** : « baan » pour le couloir, « arceren » pour ombrer ;
- **allemand** : « Gasse » pour le couloir, « schattieren » pour ombrer.
