# 0023 — Le carnet de jeu : des schémas cochés, un seul lien

## Contexte

Le dimanche soir, l'entraîneur envoie les phases de la semaine dans le
groupe WhatsApp du club. Les joueurs les gardent sur leur téléphone et les
revoient au bord du bassin, souvent sans réseau.

Deux liens existaient :

- **un schéma** (`#s=` / `#z=`, `board/share.ts`) : cinq phases, cinq
  messages ;
- **une séance avec ses schémas** (`#zs=` / `#ss=`, ADR 0018) : elle porte
  des durées et des consignes, il faut d'abord la composer, et elle s'ouvre
  dans l'éditeur de séance, pas dans la bibliothèque.

Il manquait le geste le plus simple : _ces schémas-là, à toute l'équipe_.

## Décision

**Un mode de sélection dans l'écran Schémas, et un lien qui emporte la
sélection.**

- **« Sélectionner »**, au-dessus de la liste, met une case sur chaque
  vignette. La case fait 44 px, et toute la vignette coche. Ouvrir et « ⋯ »
  se taisent le temps de la sélection.
- **La barre de sélection** est collée au bas de l'écran, sous le pouce :
  - « Tout sélectionner » vaut pour ce que l'écran montre, recherche
    comprise, et paraît à demi coché quand une partie l'est ;
  - le compte ;
  - « Partager la sélection ».
- **L'ordre du carnet est celui de la liste**, au tri choisi, toute la
  bibliothèque comptée : un schéma coché puis masqué par la recherche en est.
- **La feuille** donne :
  - un nom facultatif (60 caractères) ;
  - le lien, et « Envoyer le lien », par `shareOrCopy` du socle ;
  - le QR code quand le lien tient dans `QR_CAPACITY` (2 953 octets), et
    sinon pourquoi il n'y en a pas ;
  - un avertissement au-delà de 4 096 caractères (`MESSAGE_LIMIT`).

**Le lien d'un carnet** :

- **Deux clés à lui** : `#zc=` compressé (deflate), `#sc=` lisible partout.
  Ni `#s=`, ni `#z=`, ni `#ss=`, ni `#zs=` ne les reconnaissent : un lecteur
  d'avant ignore le carnet, et s'ouvre sur l'accueil.
- **L'enveloppe** est `{ v: 1, n?: nom, t: [schémas] }`. Chaque schéma y est
  à la forme compacte d'un lien de schéma.
- **Le codec est celui de la séance** :
  - `encodeJson`, `encodeJsonCompressed`, `toCompact` / `fromCompact` ;
  - l'enveloppe vérifiée à la main, pas par zod, pour la raison que donne
    `lireEnveloppe` dans `seances/share.ts` : zod tirerait des morceaux
    dans l'accueil (+0,8 kB mesuré) ;
  - une clé inconnue est ignorée : un carnet d'une version future qui en
    ajouterait une reste lisible.
- **De 1 à 30 schémas** : la relecture ne s'engage pas sur une liste sans
  fin, et trente schémas tiennent dans un message WhatsApp (65 536
  caractères).

**À l'ouverture** :

- un crochet de la coquille reconnaît le lien et charge le décodeur ;
- **tout est validé avant que rien n'entre**, chaque schéma par le schéma
  zod du tableau. Un lien tronqué ou forgé est refusé en entier, une
  notification le dit, et la bibliothèque reste telle quelle ;
- les schémas entrent **sous de nouveaux identifiants**, par le magasin
  donc par le port : sur l'appareil d'abord, ce qui les laisse relire sans
  réseau, et avec un compte, ils le suivent ;
- le premier reçoit l'heure de l'ouverture, le suivant une milliseconde de
  moins : rangée par date, la bibliothèque les montre dans l'ordre du
  carnet ;
- l'écran Schémas s'ouvre sur un avis, qui dit combien de schémas sont
  arrivés et sous quel nom, et les vignettes reçues portent « Reçu ».

## La longueur, mesurée

Le 21/11/2026, sur les exemples de la bibliothèque dans leur ordre
(engagement, entre-deux, attaque à droite, changement d'aile, jeu au mur,
défense qui coulisse, pénalité, deux coups francs, deux contre un),
consignes françaises comprises, nommé « Semaine 47 : sorties de but » :

| Schémas | Étapes | `#zc=` (compressé) | `#sc=` (lisible) | QR code | Messagerie    |
| ------: | -----: | -----------------: | ---------------: | :------ | :------------ |
|       3 |      9 |         1 694 oct. |       7 469 oct. | oui     | oui           |
|       5 |     18 |         2 741 oct. |      14 044 oct. | oui     | oui           |
|      10 |     35 |         5 317 oct. |      28 230 oct. | non     | avertissement |

- Un schéma de plus coûte environ 500 octets compressé. Seul, un exemple
  pèse 876 octets dans un carnet, 2 561 dans un lien `#s=`.
- **Le seuil de 4 096 caractères** est la longueur d'un message Telegram.
  D'autres messageries replient un texte plus long, ou le coupent ; un lien
  coupé est refusé à l'ouverture. Sept exemples passent (3 737 octets),
  huit non (4 174). WhatsApp porte 65 536 caractères : la feuille prévient,
  elle n'interdit pas.
- La forme lisible ne sert qu'aux navigateurs sans `CompressionStream`.

## Le poids

- **Préchargé** : 239,2 → 240,4 kB, sur une borne de 246.
  - Textes français (langue de repli, dans l'accueil) : +0,35 kB.
  - Feuille de style : +0,22 kB.
  - Accueil : +0,6 kB. C'est la case des vignettes, la reconnaissance du
    lien et les marques « Reçu ».
- **Paresseux** : la barre de sélection, le corps de la feuille, l'avis
  d'arrivée et le codeur forment un morceau (`carnet/parts.ts`, 2,2 kB
  gzip). Il est tiré au repos depuis l'écran Schémas, et précaché.
- **Total** : 700,7 → 704,5 kB, sur une borne de 764.
- **La feuille (`Sheet`) est posée par l'écran, pas par le morceau.** Tirée
  du morceau paresseux, elle faisait sortir le piège de focus du socle
  (`use-dialog`, `a11y`) de l'accueil dans un morceau à part, préchargé
  quand même : +0,4 kB. Une première version, tout dans l'écran Schémas,
  coûtait +2,2 kB.

## Ce qui est écarté

- **La séance comme véhicule.** Elle impose des durées et une consigne, et
  s'ouvre dans son éditeur. Un carnet n'est que des schémas : il va dans la
  bibliothèque.
- **zod pour l'enveloppe** : son poids dans l'accueil, comme pour la séance.
- **Un raccourcisseur de lien, un serveur.** Le lien EST la donnée, et il
  ne passe par aucun serveur. Un service tiers lirait chaque carnet, et le
  carnet mourrait avec lui.
- **Découper un carnet trop long en plusieurs liens.** Un message, un lien :
  la feuille dit la longueur, l'entraîneur choisit.
- **Dédoublonner à l'arrivée.** Un second carnet qui reprend un schéma en
  ajoute une copie, comme une séance reçue deux fois. Reconnaître « le même
  schéma » d'un appareil à l'autre demanderait une identité qui n'existe pas.

## Conséquences

- **Une version d'avant ignore `#zc=`** : restée en cache, l'application
  s'ouvre sur l'accueil sans rien recevoir. Le bandeau de mise à jour
  (ADR 0005) propose la nouvelle ; le lien, rouvert, fonctionne.
- **L'avis d'arrivée vit dans l'état de navigation** : il survit à un
  rechargement, pas à une autre visite ; « Compris » le retire.
- Les tests figent l'aller-retour, le refus d'un lien forgé ou tronqué,
  l'ignorance des anciens lecteurs et les longueurs. L'e2e coche deux
  schémas, ouvre le lien dans un autre contexte de navigateur, à
  bibliothèque vide, et y retrouve les deux, et eux seuls.
