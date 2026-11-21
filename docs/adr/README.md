# Les décisions, et pourquoi elles sont écrites

Un gabarit donne des fichiers. Un squelette donne des **décisions déjà prises**,
avec leur raison — c'est la seule différence qui compte, et c'est elle qui évite
que chaque application refasse le même arbitrage sans savoir qu'il a déjà été
tranché ailleurs.

Le parc a mesuré ce que coûte l'absence de ces pages : **neuf applications
routent par `#` et six par chemin**, sans qu'aucune ne dise pourquoi ; trois
rechargeaient la page en pleine saisie ; quatre-vingt-huit endroits figeaient la
locale en dur. Aucun de ces écarts n'est une faute de code. Ce sont des
décisions jamais prises, donc reprises au hasard.

## Ce qu'une décision doit contenir

Le contexte mesuré, la décision, ses conséquences — **y compris désagréables**
— et ce qu'elle écarte. Une décision qui ne dit pas ce qu'elle refuse n'aide
personne à la rediscuter.

| #                                                | Décision                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| [0001](./0001-routeur.md)                        | Routeur par CHEMIN, pas par `#`                                         |
| [0002](./0002-etat-et-persistance.md)            | Zustand pour l'état vivant, magasin versionné pour ce qui survit        |
| [0003](./0003-i18n.md)                           | i18n du socle, deux langues, formateurs liés à la locale                |
| [0004](./0004-backend.md)                        | Un port, un repli local, une migration port par port                    |
| [0005](./0005-mise-a-jour-du-service-worker.md)  | `prompt`, jamais `autoUpdate`                                           |
| [0006](./0006-observabilite.md)                  | Journal toujours, Sentry seulement s'il est configuré                   |
| [0007](./0007-comptes-et-droits.md)              | La base décide des droits ; l'interface se contente d'obéir             |
| [0008](./0008-annuler-plutot-que-confirmer.md)   | Annuler remplace confirmer : un sursis de huit secondes                 |
| [0009](./0009-supprimer-son-compte.md)           | Effacer son compte, pas seulement ses données — et le prouver           |
| [0010](./0010-ecrire-hors-ligne.md)              | Écrire hors ligne : une file sur le port, pas dans l'adaptateur         |
| [0011](./0011-mesure-audience.md)                | Une propriété GA4 pour le parc, l'application en dimension              |
| [0012](./0012-posthog-en-europe.md)              | PostHog en Europe remplace GA4 — l'outil, pas la forme                  |
| [0013](./0013-lire-hors-ligne.md)                | Lire hors ligne : le dernier état connu, copié derrière le port         |
| [0014](./0014-tableau-et-3d.md)                  | Un modèle, deux vues : le tableau en SVG, la 3D en three.js nu          |
| [0015](./0015-schemas-synchronises.md)           | Les schémas synchronisés : l'appareil d'abord, Supabase en écho         |
| [0016](./0016-espace-de-travail.md)              | Un espace de travail, un panneau à onglets, quatre entrées              |
| [0017](./0017-grammaire-astryx.md)               | La grammaire d'Astryx sur le socle, une région par écran                |
| [0018](./0018-seances.md)                        | Des séances à la place des notes, dans la barre                         |
| [0019](./0019-palet-au-fond-joueurs-arbitres.md) | Le palet au fond, porté par une crosse ; joueurs et arbitres plus vrais |
| [0020](./0020-mode-simple.md)                    | Un mode simple au téléphone, un mode complet                            |
| [0021](./0021-phase-en-video.md)                 | La phase en vidéo : WebCodecs dans un MP4, un repli qui suit l'horloge  |
| [0022](./0022-a-toi-de-jouer.md)                 | « À toi de jouer » : une copie, un calque, jamais le brouillon          |
| [0023](./0023-carnet-de-jeu.md)                  | Le carnet de jeu : des schémas cochés, un seul lien                     |
| [0024](./0024-langues-des-clubs.md)              | Cinq langues : l'espagnol, le néerlandais et l'allemand des clubs       |
| [0025](./0025-enregistrer-en-direct.md)          | Enregistrer une phase en direct                                         |
| [0026](./0026-zones-et-mots.md)                  | Des zones et des mots sur le terrain, dans l'étape                      |
| [0027](./0027-variantes.md)                      | Des variantes : un document, des lignes, la ligne choisie aplatie       |
| [0028](./0028-mon-effectif.md)                   | Mon effectif : les prénoms du club, sur l'appareil, posés d'un geste    |
| [0029](./0029-etiquettes.md)                     | Des étiquettes rangent la bibliothèque, sous un identifiant neutre      |
| [0030](./0030-etape-racontee.md)                 | L'étape racontée, écrite à partir du schéma                             |
| [0031](./0031-feutre-en-presentation.md)         | Le feutre de la présentation                                            |
| [0032](./0032-adversaire-qui-reagit.md)          | Un adversaire qui réagit : une aide au placement, en trois phrases      |
| [0035](./0035-lien-pour-les-joueurs.md)          | Le lien « pour les joueurs », qui s'ouvre en présentation               |
| [0036](./0036-suivre-un-joueur.md)               | Suivre un joueur, voir toute la phase                                   |
| [0037](./0037-carnet-imprime.md)                 | Le carnet imprimé, une phase par page                                   |

## Quand une application s'écarte

Elle le fait, et elle l'écrit. Une exception documentée reste une décision ;
une exception silencieuse devient une dette que le prochain relevé comptera
sans pouvoir dire si elle est voulue. C'est la leçon des `GARDES` de la
campagne d'adoption : vingt-quatre copies sur trente-quatre n'étaient pas des
dettes, mais rien ne permettait de le dire avant de les avoir lues une à une.
