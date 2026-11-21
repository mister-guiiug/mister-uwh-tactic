# 0028 — Mon effectif : les prénoms du club, gardés sur l'appareil, posés d'un geste

## Contexte

Le modèle sépare l'identité de la position (ADR 0014) : le prénom, la main
de la crosse et l'apnée d'un joueur vivent dans le `roster` du schéma, une
fois pour toutes ses étapes. Mais une fois par **schéma**. Pour nommer ses
six joueurs, un entraîneur touche un jeton, tape un prénom dans l'onglet
« Jeton », et recommence cinq fois ; puis encore dans le schéma suivant.

Ce qui a été relevé avant d'écrire :

- **Les exemples nomment leurs Blancs par leur poste.** Sur les quatorze
  exemples, huit nomment les six Blancs (AG, AC, AD, PG, PD, AR) ; aucun ne
  nomme les Noirs. Les six autres n'ont aucun nom.
- **Un schéma reçu porte les prénoms de qui l'envoie** : par un carnet
  (ADR 0023) ou par un lien. Ce ne sont pas ceux du club qui le reçoit.
- **« À toi de jouer » (ADR 0022) nomme déjà le joueur** par son prénom dans
  la liste « Quel joueur êtes-vous ? » et dans le titre de la partie
  (`nameOf`), mais pas sur le jeton qu'on déplace.
- **La production n'a pas de backend** : les comptes existent dans le code,
  pas en ligne.
- **Le préchargé mesurait 232,2 kB pour une borne de 246.**

## Décision

**Un effectif par appareil**, dans un magasin versionné du socle
(`createVersionedStore`), sous la clé `mister-uwh-tacticeffectif` — préfixe
et clé collés, comme `mister-uwh-tacticbassin`.

**Par équipe et par numéro, comme le schéma.** Un schéma connaît « Blanc 3 »,
pas Paul : l'effectif dit qui porte le 3 chez les Blancs. Chaque numéro a un
prénom, une main et, dans l'eau (1 à 6), une apnée.

- **Les deux équipes.** On entraîne d'ordinaire les Blancs : l'écran s'ouvre
  sur eux, et les exemples ne nomment qu'eux. Mais un club s'entraîne
  souvent contre lui-même, ou aligne sa deuxième équipe en face. Les Noirs
  ont donc leur liste ; vide, elle ne touche à rien.
- **Les remplaçants (7 à 10) aussi** : ils entrent, et l'inspecteur les
  nomme. Ils n'ont pas d'apnée : la frise ne compte que les joueurs dans
  l'eau (`apnea.ts`), et l'inspecteur ne la leur demande pas.
- **Un numéro sans prénom n'est pas dans l'effectif.** Il ne pose ni main ni
  apnée, et laisse le schéma tel quel. La règle vaut dans les deux sens.

**Le remplir : un écran « Mon effectif », sous « Plus »** et au pied du rail
sur grand écran, à côté des notes. C'est la règle de l'ADR 0016 : « Plus »
range ce qu'on ouvre rarement, et un effectif se remplit une fois par
saison. Les Réglages parlent de l'appareil (apparence, langue, données) ; ce
sont des préférences, l'effectif est une liste qu'on tient.

- **Une liste au doigt** : une pastille à la couleur du bonnet, un champ
  « Prénom », puis la main et l'apnée une fois le prénom tapé. Rien à
  enregistrer : chaque lettre est gardée.
- **« Vider cette équipe »**, en contour, s'annule pendant huit secondes
  (ADR 0008).
- **Depuis un schéma, « Garder comme mon effectif »**, dans l'onglet
  Équipes, quand le schéma a des prénoms qui changeraient l'effectif.
  Chaque joueur nommé du schéma prend son numéro dans l'effectif ; un numéro
  que le schéma ne nomme pas garde ce qu'il avait. Un schéma en six contre
  six, remplaçants masqués et sans nom, n'efface donc pas les remplaçants.
  L'effectif n'est pas dans l'historique du tableau : la notification garde
  l'ancien, et « Annuler » le rend.

**L'appliquer : « Appliquer mon effectif »**, dans l'onglet Équipes. Il pose
d'un geste prénoms, mains et apnées (`applyIdentities` du magasin du
tableau). Il passe par `edit()` : un seul pas à défaire, par la barre du
schéma comme par la notification. Un joueur que l'effectif connaît sans
apnée reprend le seuil du schéma : son apnée est la sienne, pas celle de
celui qui portait le numéro avant lui.

**Le proposer, sans rien imposer.** Quand un schéma arrive au tableau, une
carte demande « Mettre les prénoms de votre effectif sur ce schéma ? ». Elle
offre deux boutons, « Appliquer mon effectif » et « Pas maintenant », et
jamais de boîte de dialogue : on peut jouer sans y répondre.

- **Elle paraît** pour un exemple, un schéma d'un carnet reçu, un lien
  partagé et un schéma neuf.
- **Elle ne paraît pas** quand l'effectif ne changerait rien : vide, ou déjà
  posé. Un entraîneur sans effectif ne la voit jamais.
- **Elle s'en va** quand un autre schéma s'ouvre. Un rechargement l'oublie.

**En mode simple (ADR 0020), un geste au plus.** Le mode simple n'a pas
d'onglets, donc pas d'onglet Équipes. La carte y est le seul chemin, et elle
tient en un toucher. Elle paraît donc aussi sur un schéma neuf : sans elle,
un entraîneur en mode simple ne pourrait jamais poser son effectif sur ses
propres schémas. On n'ajoute rien à la barre du mode simple : elle montre ce
qu'on fait à chaque étape, et l'effectif se pose une fois par schéma.

**« À toi de jouer » le dit aussi sur le jeton** (« Votre jeton, Blanc 1 ·
Paul »), avec le `nameOf` du jeu. Le reste du jeu n'est pas touché : il
nommait déjà le joueur partout ailleurs.

### Pourquoi sur l'appareil, et pas au compte

Comme le bassin du club (`mister-uwh-tacticbassin`) et le mode du tableau,
l'effectif est un réglage de l'appareil, pas une donnée du compte.

- **Il sert là où l'on entraîne.** C'est le téléphone ou la tablette de
  l'entraîneur, au bord de son bassin : les mêmes prénoms, à chaque séance,
  sur le même appareil. C'est déjà la raison du bassin du club.
- **La production n'a pas de compte.** Lié au compte, l'effectif ne
  marcherait pour personne en ligne aujourd'hui.
- **Ce sont des prénoms, souvent d'enfants.** Sur l'appareil, ils ne partent
  que dans un schéma qu'on partage, comme quand on les tape à la main. Au
  compte, la liste du club serait copiée dans la base, et le chemin prendrait
  la longueur de celui des séances (ADR 0018) : une table et sa RLS, la
  suppression du compte qui l'efface, les mentions RGPD qui la nomment. Pour
  dix prénoms qu'on retape en une minute sur un appareil neuf, ce chemin
  coûte trop.
- **Il ne change pas de main** avec la déconnexion : sur une tablette de
  club partagée, l'effectif est celui du club, et les entraîneurs qui s'y
  succèdent ont les mêmes joueurs. Le brouillon, lui, part avec le compte
  (ADR 0015), parce qu'il est le travail d'une personne.

## Conséquences

**Le préchargé passe de 232,2 à 233,2 kB**, pour une borne de 246. Le
détail, mesuré en construisant `main` puis la branche dans la même copie :

| Ajout                                            | gzip   |
| ------------------------------------------------ | ------ |
| les textes français (accueil)                    | 0,4 kB |
| la route, le rail, « Plus », l'appel de la carte | 0,3 kB |
| `applyIdentities` dans le magasin du tableau     | 0,2 kB |
| un morceau du socle coupé en deux par Rolldown   | 0,1 kB |

Le reste vient à la demande :

- l'écran (1,45 kB, et 0,5 kB de feuille de style, sortie d'`index.css`) ;
- le modèle de l'effectif, son magasin et sa validation (0,96 kB), partagés
  par l'écran et le morceau secondaire ;
- la carte et la section de l'onglet Équipes (+0,66 kB au morceau
  secondaire, tiré au repos).

L'accueil ne porte de l'effectif que l'identifiant du schéma à qui on le
propose (`effectif/offer.ts`). **Le total passe de 753,8 à 759,6 kB**, pour
une borne de 830. Chaque catalogue traduit gagne 0,4 à 0,5 kB.

**Appliquer remplace les postes des exemples.** « AG » devient « Paul » :
le numéro garde la place, la consigne dit encore le poste. « Annuler » rend
les postes.

**L'effectif suit les numéros, pas les postes.** Celui qui porte le 2 prend
la place du 2 dans l'exemple, quel que soit son poste habituel. Pour le voir
à son poste, on le déplace — ou l'on donne à chacun, dans l'effectif, le
numéro de son poste.

**Changer d'appareil, c'est retaper l'effectif.** Il n'est ni dans l'export
de la bibliothèque, ni au compte. Effacer son compte ne l'efface pas : il
n'y est pas. « Vider cette équipe » l'efface de l'appareil.

**Un schéma de carnet n'est proposé qu'à son arrivée.** L'écran Schémas
reconnaît un schéma reçu par l'état de navigation que pose le carnet
(`arrivalFrom`). Rouvert plus tard, ce schéma est un schéma comme un autre :
l'onglet Équipes reste le chemin.

## Ce qu'on écarte

**Appliquer d'office.** À un exemple ou à un schéma reçu, ce serait écraser
sans demander ce qu'un autre a nommé. À un schéma neuf, ce serait plus
défendable, puisqu'il n'a rien à perdre. Mais un entraîneur dessine aussi le
jeu d'un adversaire, et ses prénoms n'y ont rien à faire.

**Une boîte de dialogue à l'ouverture.** Elle bloque le tableau pour une
question qu'on peut ignorer.

**Lier l'effectif au compte.** Voir plus haut ; à revoir si la production
branche un backend et qu'un club le demande.

**Un effectif par poste** (« Paul joue AC ») plutôt que par numéro. Le
schéma ne connaît que des numéros ; « Nommer les postes » nomme par les
numéros d'une composition. Il faudrait une correspondance poste → numéro
par composition, pour un gain que personne n'a encore demandé.

**Plusieurs effectifs** (les U14, les seniors). Un seul suffit à la
demande ; un sélecteur coûterait un écran de plus.

**Mettre l'effectif dans les Réglages.** Dix lignes de saisie y
noieraient le thème et la langue. Les Réglages restent ce que l'appareil
préfère.
