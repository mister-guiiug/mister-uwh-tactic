# 0027 — Des variantes : « et si… », un document et des lignes

## Contexte

Une phase se joue selon ce que fait l'adversaire : « si leur 2 monte, on
passe par la gauche ; sinon, le relais au fond ». Jusqu'ici, un schéma
n'avait qu'une suite d'étapes. Pour montrer les deux suites, il fallait
deux schémas presque identiques. Une retouche des étapes communes ne se
faisait alors que dans l'un des deux.

Ce qui a été relevé avant d'écrire :

- **Presque tout le code lit `tactic.steps`** : `frameAt`, l'apnée, les
  contrôles, la 3D, la lecture, la vidéo, l'impression, « À toi de jouer ».
  Il faudrait apprendre les variantes à chacun d'eux, un par un.
- **Le schéma zod ne peut pas porter de raffinement.** `tacticSchema.extend`
  et `.omit` servent ailleurs, dans les tests et chez les lecteurs. Zod 4
  refuse les deux dès qu'un raffinement existe.
- **La frise ne laissait déjà presque rien aux pastilles** au téléphone, en
  mode complet. À 393 px de large, il restait 9 px pour les pastilles, et
  plus aucune étape ne se voyait. Un bouton de plus poussait « Lire » hors
  de l'écran.

## Décision

### Un document, des lignes

**Le schéma enregistré est un DOCUMENT.** Il porte la ligne principale
(`steps`) et, facultatives, ses variantes (`variants`). Une variante a un
identifiant, un nom, une étape de départ (`from`) et ses propres étapes. Les
étapes 0 à `from` de la ligne principale lui sont communes. Le nom de la
ligne principale est facultatif (`mainLine`). Un nom vide se lit
« Ligne principale » ou « Variante 2 », dans la langue de qui le lit.

**Pas de nouvelle version du schéma.** Un lecteur qui ignore le champ le
retire, et joue la ligne principale, entière : c'est ce que fait déjà zod.
Les règles qui croisent deux champs (`from` désigne une étape qui existe,
une ligne compte au plus trente étapes, un identifiant est unique, six
variantes au plus) sont tenues par `settleVariants`. Elles le sont comme le
palet est tenu par `settleTactic` : après chaque édition, et à chaque
lecture d'un lien.

**Un seul niveau.** Une variante part de la ligne principale, jamais d'une
autre variante. Sur une étape propre à une variante, « Nouvelle variante »
est grisé, et dit pourquoi.

### Le magasin expose la ligne choisie, aplatie

Le magasin garde le document (`doc`) et la ligne affichée (`line`). Il
expose comme `tactic` la ligne aplatie : les étapes communes, puis celles
de la variante. Tout ce qui lit `tactic` suit sans changer. La 3D le prouve
par un test (`Pool3D.variants.test.tsx`), la scène three.js remplacée par
un relevé.

**Une retouche s'écrit à sa place** (`writeLine`). Sur une étape commune,
elle va à la ligne principale, et toutes les lignes qui la partagent la
voient. Sur une étape de la variante, elle va à la variante seule. Le nom,
le bassin, l'effectif et l'affichage sont ceux de tout le document.

**Ajouter, retirer, déplacer une étape** passe par trois fonctions qui
savent où tombe l'embranchement (`variants.ts`) :

- une étape ajoutée après l'embranchement va à la variante. Avant, elle va
  à la ligne principale, et chaque variante qui part d'au moins là recule
  d'un cran : elle garde ses étapes communes ;
- retirer la dernière étape d'une variante retire la variante (« Annuler »
  la rend, ADR 0008). Retirer une étape commune fait partir la variante de
  l'étape précédente. Une ligne ne perd jamais sa seule étape commune ;
- un échange par-dessus l'embranchement est refusé. Sinon, une étape de la
  variante passerait dans la ligne principale. Une variante reste attachée
  à sa position : « elle part de l'étape 3 ».

**Le bassin et le miroir changent toutes les lignes** : c'est la phase
entière. « Garder aux étapes suivantes » ne change que la ligne affichée.

**Annuler rend le document ET la ligne** où le geste s'est fait. Passer
d'une ligne à l'autre ne s'annule pas : c'est une navigation, comme changer
d'étape. L'étape reste quand les deux lignes la partagent. Sinon, on arrive
à la première étape où elles diffèrent. **L'enregistrement en direct**
(ADR 0025) ouvre ses étapes sur la ligne affichée.

**Ce qui emporte le schéma prend le document** : le brouillon,
l'enregistrement, le lien, le QR code, le départ d'un compte, « Annuler »
après un tableau remplacé. La ligne aplatie ne porte pas les variantes.
Enregistrée par erreur, elle les perdrait, plutôt que de les rattacher à des
étapes qui ne sont plus les leurs.

### Le lien

Les variantes vont dans la clé `x` de `board/share.ts`, que les lecteurs
plus anciens ignorent : `x.vr` (nom, étape de départ, étapes compactes,
porteurs, arrêts de jeu et nages courbes de ces étapes) et `x.vm` (le nom
de la ligne principale). Un ancien lecteur trouve dans `s` une ligne
principale complète. La première étape d'une variante a un départ : sa nage
courbe voyage, celle de la première étape de la principale non. Une
variante illisible est ignorée seule. Les identifiants ne voyagent pas : ils
renaissent à la lecture. Le carnet (ADR 0023) et la séance (ADR 0018), qui
reprennent `toCompact`, les emportent aussi.

### La frise

Un bouton en forme de branche s'ajoute à la frise, « Variantes de la
phase ». Il ouvre un panneau ancré, « Lignes de la phase » : la
ligne qu'on voit, passer à une autre, en faire naître une de l'étape
courante, la nommer (le champ prend le focus à la naissance), la retirer.
Dès qu'il y a deux lignes, le bouton porte le nom de la ligne affichée. Sur
une variante, les étapes communes ont un contour en tirets, et
l'embranchement porte un losange. Le nom accessible de la pastille le dit
aussi : « Étape 1, commune à la ligne principale, la phase se sépare ici ».

**Étroite, la frise passe sur deux rangs** : les pastilles entre
« précédente » et « suivante », les gestes dessous. Elle est mesurée sur
elle-même, sous 640 px, et non sur l'écran : à côté du panneau, une tablette
la rend aussi étroite qu'un téléphone.

**Le mode simple lit les variantes d'un schéma reçu, sans en créer**
(ADR 0020). Le bouton n'y paraît que s'il y en a, et ne propose que de
passer d'une ligne à l'autre.

### La présentation

À l'étape où la phase se sépare, un bouton par suite, nommé. Celle qu'on
suivra est enfoncée. Toucher l'autre y passe, sans changer d'étape. Le nom
de la ligne affichée paraît dans la barre.

**La télécommande parcourt toutes les suites.** Une télécommande de
présentation n'envoie que « suivant » et « précédent ». « Suivant » suit la
suite enfoncée. Au bout d'une ligne, il revient à l'embranchement de la
ligne d'après, dans l'ordre de la frise, puis la suit (`tourNext`). Le
balayage et le bouton « suivant » de la présentation font de même. Au bout
de la dernière ligne, plus rien. « Précédent » remonte la ligne affichée.

### Les sorties

La vidéo de la phase, l'image de la phase, la fiche imprimée et « À toi de
jouer » prennent la ligne affichée. Ils le disent : le titre de la vidéo et
de l'image (« Sortie de mur · Leur 2 monte »), une ligne sur la fiche, une
phrase dans l'aide du menu. Le fichier de la vidéo porte aussi le nom de la
ligne.

## Conséquences

- **Le préchargé passe de 232,2 à 236,7 kB** (borne 246), et **le total de
  753,8 à 759,3 kB** (borne 830). Relevé local du 21/11/2026, sur `main` et
  sur la branche. `variants.ts` part dans un morceau partagé avec
  `carry.ts` et `curve.ts`, qu'il remet en règle : il est dans l'accueil,
  parce que le magasin en a besoin dès l'ouverture. Le panneau des lignes
  et les boutons de l'embranchement y sont aussi. Les charger à la demande
  rendrait environ 1 kB, au prix d'un premier clic sans focus.
- **Un ancien client qui enregistre le schéma perd ses variantes.** Il en va
  de même s'il le synchronise : zod retire le champ qu'il ne connaît pas.
  C'est le prix d'un champ facultatif sans changer de version. La ligne
  principale, elle, ne se perd jamais.
- **La bibliothèque ne montre que la ligne principale** : la vignette, le
  tri par nombre d'étapes, l'impression d'une séance.
- **Ouvrir un schéma, un lien ou un exemple affiche sa ligne principale.**
- **La frise étroite prend un rang de plus** au téléphone, en mode complet :
  le tableau perd une cinquantaine de pixels de haut. Les pastilles, elles,
  y passent de 9 à 255 px.
- **En présentation, la frise rétrécit enfin sous la largeur de ses
  pastilles** au téléphone. Avant, elle poussait « Lire » hors de l'écran.
- **Le panneau ancré se replace quand son contenu grandit** : le champ du
  nom paraît à la naissance d'une variante.

## Écarté

- **Deux schémas** au lieu d'un document : une retouche des étapes
  communes ne se fait que dans l'un des deux.
- **Apprendre les variantes à chaque lecteur** de `tactic.steps` : une
  dizaine de modules à toucher. Il suffirait d'en oublier un pour qu'il
  montre une autre ligne que celle de l'écran.
- **Un arbre de variantes** : deux « et si » imbriqués ne se présentent plus
  d'un coup d'œil, et la frise ne saurait plus les montrer.
- **Une version 4 du schéma**, avec sa migration : il n'y a rien à migrer.
  Un ancien client refuserait aussi un brouillon que le nouveau a écrit.
- **Une version 4 du lien** : un ancien lecteur refuserait le lien entier,
  ligne principale comprise.
- **Un raffinement zod sur le schéma** : il interdit `.extend()` et
  `.omit()`.
- **Une touche de télécommande dédiée au choix de la branche.** Les
  télécommandes n'envoient pas les mêmes touches pour « écran noir »
  (« B » ou « . »), et « . » est déjà « étape suivante » au clavier.
- **Une rangée de lignes toujours visible sous la frise** : la plupart des
  phases n'ont pas de variante, et le tableau perdrait de la hauteur pour
  rien.
