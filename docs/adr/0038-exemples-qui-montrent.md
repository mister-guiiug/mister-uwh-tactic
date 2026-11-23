# 0038 — Des exemples qui montrent ce que l'application sait faire

## Contexte

La bibliothèque propose quatorze exemples (`board/examples.ts`). Relevé du
23/11/2026 : aucun n'utilisait les fonctions arrivées depuis leur écriture,
les variantes (ADR 0027), les zones et leurs étiquettes (ADR 0026), les
nages courbes (ADR 0019). Qui ouvre un exemple pour voir ce que le tableau
sait dire ne les rencontrait pas.

Le coup franc, surtout, contredisait sa propre raison. Le commentaire
au-dessus de `PLAY_IDS` disait « une phase, en deux variantes, parce que les
sources se contredisent » ; c'étaient deux exemples séparés, le coup franc
« joué par les pivots » et le coup franc « joué par l'arrière », chacun avec
son palet, à un endroit différent du bassin. C'est exactement le cas que
l'ADR 0027 écarte : deux schémas presque identiques.

## Décision

### Le coup franc devient une phase à deux lignes

**Un seul exemple, `freePuck`, un document à deux lignes**, construit par le
magasin du tableau comme les autres (`createVariant`, `renameLine`), jamais
écrit à la main.

- **Le tronc est ce que les deux documents supposent** : le règlement.
  L'arbitre arrête le jeu, l'étape s'ouvre sur l'arrêt de jeu « coup franc
  pour les Blancs » ; les Noirs reculent derrière la ligne des 3 m, vers leur
  but (17.6) ; les avants blancs leur font face. Personne n'est encore
  au-dessus du palet.
- **La phase se sépare là où les documents se séparent** : qui se place
  au-dessus du palet. La ligne principale suit « Tactique de base du hockey
  subaquatique » (les deux pivots, une feinte) ; la variante suit la fiche
  « Le coup franc » du CIBPL-FFESSM (l'arrière, un pivot à côté de lui,
  l'autre en retrait). Chacune garde ses trois étapes.
- **Le palet est au même endroit pour les deux, chez les Noirs.** La feinte
  des pivots ne se tente que dans la moitié adverse, dit leur document ; la
  fiche du CIBPL ne dit pas où le coup franc est sifflé. L'ancien exemple
  « par l'arrière » se jouait dans notre moitié : il glisse de 6 m, tout
  d'un bloc.
- **Le nom de chaque ligne dit sa source** (« Par les pivots, « Tactique de
  base » », « Par l'arrière, fiche CIBPL-FFESSM »), et la première consigne
  propre à chacune nomme le document en entier : l'aide qui nommait la
  source vit désormais dans la ligne. Un nom tient en 40 caractères dans les
  cinq langues.
- **L'exemple s'ouvre sur sa ligne principale**, comme tout schéma
  (ADR 0027).

### Un ancien identifiant ouvre ce qu'il ouvrait

`freePuckPivots` et `freePuckBack` ne nomment plus rien. `resolveExample`
les traduit : le premier ouvre le coup franc sur la ligne principale, le
second sur la variante de l'arrière (`lineAt`, puis `setLine`). Aucun état
gardé ni aucune adresse ne portait d'identifiant d'exemple au relevé : un
exemple ouvert devient un schéma sous un identifiant neuf. Le repli est là
pour un test, une adresse ou une version future qui en garderait un.

### Trois exemples montrent chacun une autre fonction

Une fonction par exemple, là où elle dit vrai dans l'eau, sans démonstration
plaquée :

- **Le changement d'aile ombre l'aile libre** : une zone étiquetée « aile
  libre », dès la première étape. C'est l'endroit que vise toute la phase,
  et il ne bouge pas ; l'ailier gauche y attend, et y reçoit à la fin.
- **Le second attaquant de la pénalité nage en arc.** Tout droit, il
  passerait dans le dos du premier et sur le défenseur ; il ouvre large de
  l'autre côté du but, pour arriver là où le palet retombe. Sa nage n'a pas
  de flèche : une flèche est droite, et dirait l'inverse du chemin que
  trace le fantôme.
- **Les trois bandes du chat au milieu sont des zones** : c'est la règle de
  l'exercice, une ligne d'eau tous les 2,5 m, et chaque paire dans la
  sienne.

Les textes de ces exemples se lisent dans le catalogue par clés numérotées
(`noteN`, `lineN`, `markN`), par `storyOf` : l'écran des schémas et les
tests lisent la même chose, et `note10` ne passe plus avant `note2`.

## Conséquences

- **Le préchargé passe de 246,8 à 247,2 kB** (borne 271), et **le total de
  790,6 à 791,4 kB** (borne 830). Relevé local du 23/11/2026, sur `5c99abb`
  puis sur la branche. Les exemples et leurs textes français sont dans
  l'accueil, avec l'écran des schémas : le coup franc y gagne une consigne,
  deux noms de ligne et les gestes de sa variante.
- **Le coup franc compte sept étapes** au lieu de deux fois trois. Le lien
  d'un carnet de dix exemples passe de 5 402 à 6 328 octets, relevés sur
  `5c99abb` puis sur la branche : le coup franc y entre avec ses deux
  lignes, et la passe à trois entre dans les dix. La borne du test passe de
  5 800 à 6 900. Cinq exemples tiennent toujours dans un QR code, mais de
  plus près : 2 852 octets sur 2 953, dont 55 pour l'aile libre ombrée
  (2 797 avant).
- **Le choix des exemples ne montre que la ligne principale**, comme toute
  la bibliothèque (ADR 0027) : la variante se découvre à la frise.
- **Les textes nouveaux sont traduits sans relecture** en espagnol, en
  néerlandais et en allemand (ADR 0024) : les noms de ligne, la consigne du
  tronc, et « aile libre » (« banda libre », « vrije vleugel », « freier
  Flügel »).
- **Un ancien exemple « par l'arrière » déjà enregistré ne change pas** :
  c'est un schéma de l'entraîneur, que la bibliothèque garde tel quel.

## Écarté

- **Garder deux exemples** : c'est le cas que l'ADR 0027 écarte, et ce que
  disait déjà le commentaire du code.
- **Un tronc qui serait déjà un placement** : les deux documents se séparent
  précisément sur qui se met au-dessus du palet. Un tronc à leurs deux
  placements serait faux pour l'un d'eux.
- **Une zone sur la défense qui coulisse** : ce qu'elle ombrerait, le danger
  autour du palet, se déplace d'une étape à l'autre. Une zone désigne un
  endroit qui reste (ADR 0026) ; il faudrait la retracer à chaque étape.
- **Une nage courbe au changement d'aile** : ses nages sont courtes, ou
  portent le palet, qui couperait en ligne droite sans porteur déclaré. Le
  second attaquant de la pénalité contourne vraiment quelqu'un.
- **Des mots posés sur le terrain** : aucun exemple n'en réclamait un que sa
  consigne ou une zone ne dise déjà mieux. Les exercices avaient déjà une
  consigne par étape.
- **Une étiquette sur la bande du milieu du chat** : centrée sur la zone,
  elle tomberait sous les deux Noirs, qui s'y tiennent.
