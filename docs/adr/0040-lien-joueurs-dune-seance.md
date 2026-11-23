# 0040 — Le lien « pour les joueurs » d'une séance

## Contexte

L'ADR 0035 a donné au schéma un second lien, qui s'ouvre en présentation :
le joueur tourne les étapes, il n'édite pas. La séance n'en avait pas.

Son lien (`#ss=` / `#zs=`, ADR 0018, suivi du 20/11/2026) la **range** dans
la bibliothèque de celui qui l'ouvre, avec ses schémas, puis ouvre son
**éditeur** : nom, durées, consignes, « Ajouter à la séance », « Supprimer
la séance ». C'est ce qu'il faut pour un autre entraîneur. Le joueur, lui,
veut ce que l'entraîneur montre au bord du bassin : la séance phase après
phase, la consigne, le chronomètre, et les étapes de chaque phase.

Et le QR code du bord du bassin est scanné par plusieurs joueurs, chaque
semaine.

## Décision

**Un second lien de séance, qui la présente au lieu de la ranger.**

- **Deux clés à lui** : `#ssp=` lisible, `#zsp=` compressé. Derrière, la
  même enveloppe et le même code que `#ss=` / `#zs=` : seule la clé change.
  - Chaque clé du fragment finit par `=` : aucune n'est le début d'une
    autre, quel que soit l'ordre où on les essaie. `#ss=` n'avale pas
    `#ssp=`, et l'inverse non plus. `seanceCodeFromHash` les lit d'une
    expression ; un test croise les dix clés du fragment — schéma et
    séance, pour modifier ou pour les joueurs, et carnet — avec les trois
    lecteurs.
  - Une version d'avant ne connaît pas ces clés : elle s'ouvre sur
    l'accueil, sans rien ranger de ce qu'on voulait seulement montrer.
- **À l'arrivée**, la séance est lue et validée comme une séance qu'on
  range : sous de nouveaux identifiants, refusée en entier si le lien est
  tronqué ou forgé. Puis sa première phase est chargée sur le tableau, et
  la présentation est demandée par le même chemin qu'une séance qu'on
  présente depuis l'écran Séances et que le lien d'un schéma (ADR 0035),
  `state.present` :
  - plein écran quand le navigateur l'accorde, écran allumé ;
  - balayage pour tourner les étapes ;
  - la barre de séance : « Phase 1 / 3 », la consigne, le chronomètre de la
    phase, la phase d'avant et d'après ;
  - un jeton ne s'y saisit pas.
- **La séance reçue est présentée, pas rangée.** Rien n'entre dans la
  bibliothèque : ni la séance, ni ses schémas. La présentation les porte
  (`useSeancePlay.guest`) le temps qu'elle dure, et la barre de séance les
  lit là avant de chercher dans la bibliothèque. Trois raisons :
  1. **C'est ce que fait le lien pour les joueurs d'un schéma.** L'ADR 0035
     charge le schéma reçu sur le tableau, sans l'enregistrer :
     « Enregistrez-le pour le garder ». Le lien pour les joueurs donne à
     voir ; garder est un geste.
  2. **Rien ne dédoublonne à l'arrivée**, et l'ADR 0023 l'écarte. Rangée,
     la séance du mardi, scannée chaque mardi, ajouterait chaque fois une
     séance et ses schémas — et avec un compte, tout partirait au serveur.
  3. **Le lien est la donnée.** Rouvert, même sans réseau (l'application
     est précachée), il présente de nouveau. Ranger n'ajoute rien à voir.
- **En quittant la présentation**, le joueur trouve l'application telle
  qu'elle est, avec sur le tableau la phase qu'il regardait, comme tout
  schéma reçu : il peut l'enregistrer. Pour garder la séance entière,
  l'entraîneur envoie le lien « pour modifier ». Le lien oriente, il ne
  verrouille pas (ADR 0035).
- **Côté entraîneur**, la feuille « Partager » de la séance pose le même
  choix que la feuille du QR code d'un schéma : « Pour modifier » ou « Pour
  les joueurs », avec les mêmes mots.
  - Le choix est un composant, `board/AudienceChoice.tsx`, que les deux
    feuilles partagent : il n'est pas recopié.
  - Il gouverne le champ du lien (« Lien pour les joueurs »), « Envoyer le
    lien » et le QR code. Une phrase dit ce que le lien fera chez le joueur.
  - Les deux liens sont prêts à l'ouverture de la feuille, d'une seule
    compression (`seanceShareUrls`) : passer de l'un à l'autre n'attend
    rien, et l'envoi reste dans le geste, là où le téléphone accorde sa
    feuille de partage.
  - « Pour modifier » reste le choix d'ouverture : la feuille fait ce
    qu'elle faisait.

## La longueur

Le lien pour les joueurs a un octet de plus que l'autre (`#zsp=` contre
`#zs=`). Les mesures de l'ADR 0018 tiennent : trois phases d'exemples
restent loin sous la capacité d'un QR code (2 953 octets). Au-delà, la
feuille le dit, comme avant.

## Le poids

- **Préchargé** : 246,8 → 247,1 kB, sur une borne de 271.
  - Les textes français, langue de repli, dans l'accueil.
  - La reconnaissance des clés, `presentGuest` et la branche du crochet
    de la coquille : ce qui doit agir dès l'ouverture du lien.
- **`presentGuest` vit dans `play.ts`, dans l'accueil, pas dans
  `share.ts`**, qui vient à la demande. Faire dépendre `share.ts` du magasin
  du tableau sortait ce magasin de l'accueil dans un morceau à part,
  préchargé quand même : un fichier de plus à l'ouverture, et 247,2 kB.
- **Un seul `import()` dans le crochet**, pour les deux liens : chaque
  appel emporte dans l'accueil la liste des morceaux à précharger avec lui.
- **Total** : 790,6 → 791,8 kB, sur une borne de 830. `AudienceChoice` fait
  un morceau de 0,4 kB, partagé par le menu du tableau et l'écran Séances.

## Ce qui est écarté

- **Ranger la séance reçue**, comme le lien pour modifier. C'était le plus
  simple — la barre de séance n'aurait pas changé —, mais une copie par
  scan, un compte qui se remplit, et un lien pour les joueurs qui ne ferait
  pas la même chose pour une séance que pour un schéma.
- **Une étagère « Reçues », à part**, purgée au bout d'un temps : un
  stockage de plus, avec sa règle d'oubli, pour un besoin que personne n'a
  exprimé.
- **« Garder la séance » dans la présentation.** Personne ne l'a demandé,
  et l'entraîneur a le lien pour modifier. À reprendre si des joueurs le
  réclament.
- **Verrouiller.** Le lien n'ôte rien à l'application (ADR 0035).

## Conséquences

- **Le brouillon du joueur est remplacé** par la première phase, sans
  « Annuler » : c'est ce que fait tout lien de schéma, celui de l'ADR 0035
  compris. Un entraîneur qui essaie son propre lien pour les joueurs perd
  un brouillon non enregistré ; la dette est partagée avec les liens de
  schéma.
- **Recharger la page pendant la présentation l'arrête** : l'état de la
  présentation vit en mémoire, comme pour une séance rangée. Le tableau
  garde la phase en cours.
- Le choix de la feuille n'est pas retenu d'une ouverture à l'autre, comme
  celui du QR code d'un schéma.
- Les tests figent :
  - les clés : les dix croisées avec les trois lecteurs, `#ss=` contre
    `#ssp=` (`seances/link.test.ts`) ;
  - le même code derrière deux clés, la séance présentée sans rien ranger,
    le lien forgé refusé (`seances/share.test.ts`) ;
  - l'ouverture : la présentation demandée d'où qu'on arrive, rien de
    rangé, le lien pour modifier inchangé (`useSharedSeance.test.tsx`) ;
  - la barre de séance qui lit la séance reçue (`SeanceNav.test.tsx`) ;
  - le choix dans la feuille (`SeancesScreen.test.tsx`).
- L'e2e (`e2e/seance-joueurs.spec.ts`) ouvre le lien dans un navigateur
  vierge, tourne une étape, passe à la phase suivante, quitte la
  présentation, et ne trouve ni la séance ni ses schémas dans la
  bibliothèque ; puis il prend le lien dans la feuille de l'entraîneur et
  l'ouvre dans un autre contexte.
