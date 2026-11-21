# 0029 — Des étiquettes pour ranger la bibliothèque

## Contexte

La bibliothèque des schémas grossit plus vite qu'on ne la remplit à la main :

- **quatorze exemples** (dix phases de jeu, quatre exercices), ouverts puis
  enregistrés ;
- **les carnets reçus** (ADR 0023), qui y rangent cinq ou dix schémas d'un
  coup ;
- les copies (« Dupliquer »), point de départ d'une variante.

Elle avait une recherche par nom et un tri, et aucun classement. Or un
entraîneur range par **intention** (l'attaque, la défense, les phases
arrêtées, les exercices) et par **public** (les cadets, l'équipe 1), et
le nom d'un schéma ne dit ni l'un ni l'autre.

Deux contraintes viennent d'ailleurs :

- **Cinq langues** (ADR 0024). Un schéma voyage d'un club à l'autre, par un
  lien ou un carnet. Envoyé d'Espagne en France, il doit garder un
  classement lisible.
- **La synchronisation par compte** (ADR 0015) et les versions déjà en cache
  chez les joueurs : un champ de plus ne doit casser aucune lecture.

## Décision

**Des étiquettes sur le schéma, de deux sortes.**

### Le modèle

`tags`, champ **facultatif** du schéma (`model.ts`) : une liste de textes,
**huit au plus, de 24 caractères chacun** (la longueur du nom d'un joueur).
Comme le porteur du palet, l'arrêt de jeu ou les nages courbes (ADR 0019) :
ni migration, ni changement de version.

- **Une étiquette proposée se range sous un identifiant neutre** :
  `attack`, jamais « Attaque ». L'écran la nomme dans sa langue. Un schéma
  étiqueté en Espagne arrive en France avec `attack`, et s'y lit
  « Attaque ».
- **Une étiquette libre se range sous son texte**, et se lit telle qu'on l'a
  écrite, dans toutes les langues. « Cadets » reste « Cadets » à Bogotá.
- **Taper le nom d'une proposée dans la langue de l'écran redonne la
  proposée** : « défense » en français, « Defensa » en espagnol. Le mot
  d'une autre langue reste une libre : on ne devine pas.
- **Un identifiant écrit autrement redevient l'identifiant** (« ATTACK »,
  « set piece ») : une seule puce, un seul nom à l'écran.
- **Deux étiquettes à la casse ou aux accents près n'en font qu'une**
  (« Défense haute », « defense HAUTE »).
- **`cleanTags` nettoie tout ce qui arrive** (lien forgé, fichier retouché) :
  un non-texte tombe, un doublon aussi, et au-delà de huit, le reste. Le
  schéma n'est jamais refusé pour ses étiquettes.

### Les proposées

Elles viennent du vocabulaire du jeu et des exemples.

| Identifiant | Français      | Anglais   | Espagnol          | Néerlandais    | Allemand          |
| ----------- | ------------- | --------- | ----------------- | -------------- | ----------------- |
| `kickoff`   | Engagement    | Kick-off  | Salida            | Start          | Spielbeginn       |
| `attack`    | Attaque       | Attack    | Ataque            | Aanval         | Angriff           |
| `defense`   | Défense       | Defence   | Defensa           | Verdediging    | Abwehr            |
| `setPiece`  | Phase arrêtée | Set piece | Disco parado      | Spelhervatting | Standardsituation |
| `wall`      | Jeu au mur    | Wall play | Juego en la pared | Muurspel       | Wandspiel         |
| `drill`     | Exercice      | Drill     | Ejercicio         | Oefening       | Übung             |

- **« Phase arrêtée », pas « coup de pied arrêté »** : le hockey
  subaquatique n'a pas de pied. Elle couvre le coup franc, le tir de
  pénalité et le palet neutre, que l'arbitre arrête puis relance.
- **« Engagement », « Salida », « Start », « Spielbeginn »** sont les mots de
  la table de l'ADR 0024.
- **Le jeu au mur** est un geste propre au sport, que trois exemples
  travaillent.

**Les exemples les portent** (`EXAMPLE_TAGS`, `examples.ts`) :

| Exemples                                    | Étiquettes             |
| ------------------------------------------- | ---------------------- |
| palet neutre et montée                      | Phase arrêtée, Attaque |
| engagement en 3-2-1                         | Engagement             |
| entre-deux, pénalité, les deux coups francs | Phase arrêtée          |
| attaque à droite, changement d'aile         | Attaque                |
| jouer le mur, puis sortir                   | Attaque, Jeu au mur    |
| défense qui coulisse                        | Défense                |
| deux contre un                              | Exercice, Attaque      |
| passe à trois, le chat au milieu            | Exercice               |
| relais sur le mur                           | Exercice, Jeu au mur   |

### Où on les pose : le menu de la vignette

**« ⋯ » › « Étiquettes »**, sur la vignette d'un schéma de la
bibliothèque, ouvre une feuille.

- **Une puce par étiquette offerte**, cochée si le schéma la porte :
  - les proposées ;
  - les libres déjà posées ailleurs dans la bibliothèque, pour retrouver
    « Cadets » sans la retaper ;
  - une libre décochée reste offerte tant que la feuille est ouverte : elle
    ne disparaît pas sous le doigt qui vient de la décocher.
- **Au doigt** : chaque puce fait 44 px de haut (`--size-element-lg`). Une
  vraie case à cocher, transparente, en couvre toute la surface : c'est
  elle que le doigt touche, et que le clavier et le lecteur d'écran
  trouvent. L'anneau du focus est tracé en dedans : le corps d'une feuille
  défile, et rognait un anneau tracé dehors.
- **Un champ en ajoute une**, Entrée ou « Ajouter ».
- **À huit, la feuille le dit** et grise ce qui en ajouterait.
- **Chaque geste est enregistré tout de suite**, comme une case qu'on coche.
  « Terminer » referme.

**Pas dans la barre du tableau, où l'on nomme un schéma.**

- C'est la barre la plus serrée de l'application au téléphone : l'audit du
  18/11/2026 y a déjà gagné la place du tableau. Le nom y est un titre
  éditable en place, rien de plus.
- Ranger est un geste de bibliothèque. Sur une vignette, on voit les
  étiquettes des autres schémas, et la feuille les offre.

**Le brouillon ouvert sur le tableau suit** (`setTags`, `store.ts`). Si le
schéma étiqueté est celui du tableau, le brouillon reçoit ses étiquettes :

- enregistré, il le reste, à la même date que la bibliothèque ;
- modifié, il le reste aussi, et garde sa date ;
- le prochain « Enregistrer » n'efface donc pas les étiquettes.

### Le filtre

**Une rangée de puces au-dessus de la liste** : « Toutes », puis chaque
étiquette que porte au moins un schéma. D'abord les proposées, dans l'ordre
de la table, puis les libres, dans l'ordre alphabétique de la langue.

- **Une seule à la fois**. Ce sont des boutons radio habillés en puces de
  44 px, comme dans la feuille : le clavier les parcourt aux flèches.
- **Elle se combine à la recherche et au tri.**
- **Une étiquette qui n'est plus portée par aucun schéma ne filtre plus** :
  « Toutes » reprend la main.
- **Absente** quand aucun schéma n'a d'étiquette, ou que la bibliothèque
  n'en compte qu'un.
- **Le mode sélection du carnet** (ADR 0023) :
  - « Tout sélectionner » vaut pour ce que le filtre montre, recherche
    comprise ;
  - un schéma coché puis masqué par le filtre reste coché, comme avec la
    recherche ;
  - le carnet suit l'ordre de la liste, toute la bibliothèque comptée.
- **Chaque vignette montre ses étiquettes**, en pastilles (`Badge` du
  socle), dans une liste nommée « Étiquettes ».

### Le lien, le carnet, la synchronisation

- **Le lien d'un schéma les porte dans `x.tg`**, la clé des ajouts
  (`share.ts`), telles que le schéma les range : identifiants et textes
  libres.
  - Un lecteur plus ancien ignore la clé, et ouvre le schéma sans
    étiquettes.
  - Le reste du lien est celui d'un schéma sans étiquettes, octet pour
    octet.
- **Le carnet et le lien d'une séance** passent par le même
  `toCompact` / `fromCompact` : ils les emportent sans rien de plus.
- **La synchronisation par compte n'a rien à changer.** La colonne `data`
  de la table `schemas` porte le schéma entier (`ligne()` dans
  `supabase-documents.ts` écrit `data: doc`). La relecture passe par
  `tacticSchema.safeParse`, qui connaît désormais `tags`. Aucune migration
  SQL.
- **Poser une étiquette date le schéma** (`updatedAt`). La fusion garde le
  plus récent : sans nouvelle date, l'appareil qui a déjà cette version ne
  verrait pas le changement.

## La longueur, mesurée

Sur les exemples dans leur ordre, consignes françaises comprises, nommé
« Semaine 47 : sorties de but », comme l'ADR 0023 :

| Schémas | `#zc=` sans étiquettes | `#zc=` avec | QR code |
| ------: | ---------------------: | ----------: | :------ |
|       3 |             1 694 oct. |  1 741 oct. | oui     |
|       5 |             2 741 oct. |  2 797 oct. | oui     |
|      10 |             5 317 oct. |  5 402 oct. | non     |

Un exemple seul, en `#s=` : 2 561 → 2 592 octets. Une ou deux étiquettes
proposées coûtent de 8 à 16 octets compressés par schéma ; cinq exemples
tiennent toujours dans un QR code.

## Le poids

L'écran Schémas **n'est pas** dans un morceau à part : `App.tsx` l'importe
dans l'accueil, avec le tableau. Le filtre et les pastilles comptent donc
dans le préchargé.

Relevé local du 21/11/2026 :

- **Préchargé : 232,2 → 234,8 kB**, sur une borne de 246.
  - Accueil : +1,1 kB. Ce sont le filtre, les pastilles des vignettes,
    l'entrée du menu, la mise à jour du schéma et du brouillon, et les
    étiquettes des exemples.
  - Feuille de style : +0,3 kB. Textes français : +0,2 kB.
  - `tags.ts` : 0,6 kB, dans un morceau à lui. Rolldown l'y met parce
    que le carnet et la feuille, paresseux, l'importent aussi.
  - Le modèle, le magasin du tableau et le morceau partagé qu'ils
    regroupent : +0,4 kB.
- **Total : 753,8 → 757,7 kB**, sur une borne de 830.
- **Paresseux** : le corps de la feuille (`TagEditor.tsx`, 1,0 kB gzip).
  - Il se précharge à l'approche d'un menu « ⋯ », sa seule porte.
  - Au repos, comme le carnet, il se chargeait pendant que l'écran attendait
    déjà le morceau du carnet. Sous charge, le test du carnet ne voyait plus
    arriver sa barre de sélection à temps.

## Ce qui est écarté

- **Plusieurs étiquettes à la fois dans le filtre** (toutes, ou l'une ou
  l'autre). Une puce, une question : « les exercices », « la défense ». La
  recherche affine.
- **Des dossiers.** Un schéma n'y est qu'à un endroit ; une phase arrêtée
  peut aussi être un exercice.
- **Ranger le nom traduit.** « Ataque » en France serait une étiquette
  libre, en espagnol, à côté d'« Attaque ».
- **Traduire les libres.** Personne ne sait ce que « Cadets » veut dire
  ailleurs.
- **Une colonne ou une table d'étiquettes en base.** `data` porte déjà tout,
  et le filtre se fait sur l'appareil, hors ligne compris.
- **Une couleur par étiquette.** Une couleur du domaine a un nom
  (`AGENTS.md`, règle 4) ; une étiquette est un mot. Six teintes de plus à
  tenir à 4,5:1, dans deux thèmes, pour un classement que le texte dit
  déjà.
- **Chercher aussi dans les étiquettes.** Les puces le font, et la
  recherche reste celle du nom.

## Conséquences

- **Une application plus ancienne** relit un schéma étiqueté sans planter :
  zod retire la clé. Si elle le réenregistre, les étiquettes sont perdues,
  comme le porteur et les courbes. C'est vrai aussi d'un second appareil du
  même compte, resté sur une version d'avant.
- **Étiqueter remonte le schéma en tête** du tri « Les plus récents ».
- **« Annuler », au tableau, peut les retirer** : posées sur le brouillon
  ouvert, elles entrent dans son historique.
- **Les tests** figent le modèle, le nettoyage, le filtre, le codec
  (aller-retour, ancien lecteur, étiquettes forgées), les identifiants
  neutres d'une langue à l'autre, le carnet, les exemples, la feuille et le
  brouillon qui suit. L'e2e étiquette deux schémas, filtre, envoie ce que le
  filtre montre en carnet, et l'ouvre dans un autre navigateur réglé en
  espagnol : « Ataque », « Ejercicio », et « Cadets » telle quelle.

## Relecture à faire

Traduites par la même machine que l'ADR 0024 :

- **Espagnol** : « Disco parado », calque de « balón parado » ; « Juego en
  la pared ».
- **Néerlandais** : « Spelhervatting » pour les phases arrêtées ;
  « Muurspel » ; « Labels ».
- **Allemand** : « Standardsituation » ; « Wandspiel » ; « Schlagwörter »
  plutôt que « Tags ».
- **Anglais** : « Defence », à l'anglaise, comme le reste du catalogue.
