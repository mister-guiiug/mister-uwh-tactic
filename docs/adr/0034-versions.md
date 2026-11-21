# 0034 — Les versions d'un schéma, gardées sur l'appareil

## Contexte

Un entraîneur retouche une phase, l'enregistre, et regrette parfois. Rien ne
lui permet d'y revenir :

- **« Annuler » ne vit que dans la session du tableau.** L'historique des
  gestes (`past`, soixante au plus, `store.ts`) n'est pas rangé avec le
  brouillon, et ouvrir un schéma le remet à zéro.
- **La bibliothèque ne tient que la dernière version.** « Enregistrer »
  remplace le schéma par identifiant (`shelfIn`, `local.ts`), et la
  synchronisation par compte garde la plus récente (ADR 0015).

Ce qui existait :

- **Les étagères de l'appareil** (`casesOf`, `local.ts`) : une case pour
  l'appareil, une par compte, sur le magasin versionné du socle. Les schémas
  (ADR 0015) et les séances (ADR 0018) les partagent.
- **La synchronisation par compte** (`supabase-documents.ts`) : l'appareil
  d'abord, une ligne par document dans `schemas`, une pierre tombale pour une
  suppression. La production n'a pas de backend aujourd'hui, mais le code
  doit rester juste.
- **Un `localStorage` partagé.** Les vingt applications de la famille ont
  une seule origine (`mister-guiiug.github.io`), donc 5 Mo environ pour
  toutes.

Ce qui a été mesuré avant d'écrire, en caractères de JSON :

| Schéma                                  | Taille          |
| --------------------------------------- | --------------- |
| neuf, une étape                         | 3 293           |
| les quatorze exemples (3 à 5 étapes)    | 6 280 à 9 256   |
| trente étapes, le plafond (`MAX_STEPS`) | 41 805          |
| dix versions d'un exemple               | 63 000 à 93 000 |

## Décision

### Une étagère à part, sur l'appareil

**Les versions vivent dans leur propre case** : `schemas-versions` pour la
bibliothèque de l'appareil, `schemas-versions@<compte>` pour chaque compte
(`backend/versions.ts`). C'est la même forme que les schémas (`casesOf`) :
magasin versionné, copie de côté avant toute perte, validation par
`tacticSchema` après `migrateTactic`.

Une version est **un schéma entier**, tel qu'il était enregistré : son
identifiant est celui du schéma, sa date (`updatedAt`) celle de la version.
Elle se relit seule, et monte avec le modèle comme n'importe quel schéma.

**Pas dans le document synchronisé**, pour trois raisons.

- **Le poids.** La ligne `schemas` porte le schéma entier dans `data`. Dix
  versions la rendraient jusqu'à onze fois plus lourde, renvoyée en entier à
  chaque enregistrement, et comparée en entier à chaque fusion. Le lien de
  partage, le carnet et la séance (`toCompact`) devraient les retirer, sans
  quoi un QR code ne tiendrait plus.
- **Le compte.** Une case par compte, comme les schémas : sur une tablette
  de club, le compte suivant ne voit rien des versions du précédent, et
  l'effacement d'un compte vide la sienne d'un geste (`clear()`). Les
  versions marchent sans compte — la production n'a pas de backend — et
  sans réseau. Dans le document, elles auraient suivi le compte d'un
  appareil à l'autre : c'est le seul avantage qu'on perd.
- **Le RGPD.** Un schéma porte des prénoms de joueurs (ADR 0028), et il
  voyage : par un lien, un carnet, une séance. Rangées dans le document, des
  versions de travail partiraient avec la phase montrée aux joueurs, et
  vivraient sur le serveur. Sur l'appareil, rien de plus n'est rangé
  côté serveur : pas de table, pas de politique RLS, rien que
  `delete_my_account` doive apprendre à effacer. La minimisation est tenue
  par construction.

Ce qui en découle, désagréable : **les versions ne suivent pas le compte
d'un appareil à l'autre.** Celles du téléphone restent sur le téléphone.

### Quand une version est rangée

**À chaque enregistrement fait ici qui change le schéma.** Le local
(`localLibrary`) et la synchronisation (`repository().save`) lisent la
version d'avant dans la case qu'ils vont écrire, écrivent, puis préviennent
l'historique (`DocumentHistory.saved`). C'est vrai de tous les chemins :

- « Enregistrer » et Ctrl+S au tableau ;
- un fichier importé, un carnet ou une séance reçus, qui portent un schéma
  déjà dans la bibliothèque ;
- « Revenir à cette version » ;
- le brouillon rangé dans la copie de son compte quand celui-ci s'en va
  (`park`, ADR 0015) : il remplace la version enregistrée, qui passe dans
  l'historique ;
- un schéma « hors de votre compte », ouvert puis enregistré avec un
  compte : sa version de l'appareil entre dans l'historique du compte.

**« Qui change » se lit à la date et aux étiquettes près** (`sameVersion`).

- Un geste défait puis refait redate le schéma sans le changer.
- Une étiquette range le schéma, elle ne le change pas (ADR 0029). Or chaque
  case cochée dans sa feuille enregistre : trois étiquettes auraient chassé
  trois versions de la phase. « Revenir » garde donc les étiquettes de la
  courante.

**Ce qui arrive d'un autre appareil n'en fait pas.** Une version plus récente
venue de la fusion remplace la copie sans passer par l'historique : il garde
les gestes de cet appareil.

### Dix au plus, et un budget

- **Dix versions par schéma.** Au-delà, les plus anciennes tombent.
- **500 000 caractères par case** (`VERSIONS_BUDGET`), un dixième de
  l'origine : soixante-dix versions ordinaires. Au-delà, les plus anciennes
  tombent, tous schémas confondus.
- **Le stockage peut refuser quand même**, plein de ce qu'y rangent les
  autres applications. L'écriture recommence alors sans la plus ancienne
  version, jusqu'à passer. Le schéma est écrit **avant** son historique :
  l'historique cède la place, jamais le schéma.

### Suppression, déconnexion, effacement du compte

- **Une suppression emporte les versions** du schéma, dans sa case.
- **« Annuler » les rend** (ADR 0008). La notification remet le schéma tel
  qu'il est parti, et ses versions reviennent avec lui. Elles sont gardées
  en mémoire le temps de la page, sous le schéma supprimé : un autre schéma
  au même identifiant n'est pas une annulation. La page fermée, la
  suppression ne s'annule plus, et ses versions sont parties.
- **Supprimé sur un autre appareil** (la pierre tombale de l'ADR 0015), le
  schéma emporte aussi ses versions d'ici.
- **« Ajouter à mon compte »**, et la reprise d'une ancienne bibliothèque à
  la lecture d'un compte, font passer les versions avec le schéma. Un ajout
  refusé par la base les ramène sur l'appareil.
- **L'effacement du compte** (`forgetAccount`) efface sa case, copies de côté
  comprises. `deleteMyAccount` vide aussi celle de l'appareil, comme il en
  vide les schémas. Les autres comptes gardent les leurs.
- **La déconnexion ne touche pas aux versions du compte.** La règle de
  l'ADR 0015 est que la copie d'un compte ne garde que ce que le serveur n'a
  pas, puisqu'il rendra le reste. Or le serveur n'a jamais les versions :
  les retirer, ce serait les perdre, et « rien ne se perd sur une
  déconnexion ». Aucun écran ne lit la case d'un compte sous un autre.

### Revenir à une version

**« ⋯ » › « Versions »** sur la vignette d'un schéma ouvre une feuille, comme
« Étiquettes ». Une rangée par version, la plus récente d'abord :

- la première étape, dessinée par `Board2D` et sa prop `tactic`. C'est une
  image tue au lecteur d'écran, puisque le texte dit la version ;
- la date, en clair (« 21 nov. 2026, 10:32 ») ;
- le nombre d'étapes ;
- le nom, s'il a changé depuis.

**« Revenir à cette version » est un enregistrement** (`restoreVersion.ts`).

- La version choisie devient le schéma, par le même chemin
  qu'« Enregistrer ». La courante passe donc dans l'historique : rien ne se
  perd.
- Elle est datée du geste, et jamais avant la courante. La synchronisation
  garde la plus récente : une horloge en retard ferait revenir celle qu'on
  quitte.
- La version reprise quitte l'historique. Elle est désormais le schéma, et
  n'occupe plus une des dix places.
- **Annulable**, sans dialogue (ADR 0008) : la notification porte
  « Annuler » pendant huit secondes, c'est-à-dire revenir à celle qu'on
  vient de quitter. Plus tard, la feuille la montre encore.

**Si ce schéma est ouvert au tableau, le tableau suit.**

- Il passe par `useReplaceDraft`, comme l'ouverture d'un schéma. Un
  brouillon modifié, que la bibliothèque n'avait pas, se rend d'un geste.
- « Annuler » ramène aussi le tableau, s'il montre encore, telle quelle, la
  version reprise. S'il a été retouché depuis, on n'y touche pas.

**Pas un port.** `schemaVersions` (`backend/index.ts`) lit la case de la
bibliothèque ouverte : celle du compte connecté en mode distant, celle de
l'appareil sinon. Les versions ne quittent jamais l'appareil, et aucun
adaptateur distant n'a à les servir. Le local et la synchronisation les
tiennent à jour par `DocumentHistory`, un crochet facultatif : les séances
n'en ont pas.

## Le poids

Relevé local du 21/11/2026, `npm run build` :

- **Préchargé : 242,8 → 244,0 kB**, sur une borne de 271.
  - `backend` : +1,0 kB. C'est l'étagère, et les crochets du local et de la
    synchronisation : le strict nécessaire pour ranger une version au
    moment où le schéma s'écrit.
  - Accueil : +0,3 kB. L'entrée du menu, son icône, le chargeur de la
    feuille, et les textes français.
- **Total : 775,2 → 778,1 kB**, sur une borne de 830.
- **Paresseux** : la feuille (`SchemaVersions.tsx`, 1,2 kB gzip),
  `restoreVersion.ts` avec elle, et sa feuille de style (`versions.css`,
  0,3 kB). Elles se préchargent à l'approche d'un menu « ⋯ », avec
  l'éditeur d'étiquettes, comme lui.

## Ce qui est écarté

- **Les versions dans le document synchronisé** : le poids, le voyage, le
  RGPD (voir plus haut).
- **Une table `schema_versions` sur Supabase.** Elle ferait suivre les
  versions d'un appareil à l'autre. Elle coûterait une migration, une
  politique RLS, un effacement de plus pour `delete_my_account`, et des
  données personnelles de plus sur un serveur. La production n'a pas de
  backend. Si elle vient un jour, `DocumentHistory` est l'endroit où la
  brancher.
- **IndexedDB**, dont le quota est bien plus large. Mais il est asynchrone :
  la version doit être rangée dans le geste même qui écrit le schéma. Un
  « Revenir » fait juste après un enregistrement trouverait sinon un
  historique en retard. Le magasin versionné apporte déjà les migrations et
  la copie de côté, et les étagères y vivent.
- **Ranger des différences** plutôt que des schémas entiers. Ce serait plus
  léger, mais un maillon abîmé casse la chaîne, revenir demande de rejouer,
  et une version entière se relit et se migre seule.
- **Une version à chaque geste du tableau.** C'est le rôle d'« Annuler ».
- **Une confirmation avant de revenir** : annuler plutôt que confirmer
  (ADR 0008).
- **Une limite par âge** (trente jours). Un entraîneur revient à la phase de
  la saison passée ; dix versions par schéma bornent déjà le volume.

## Conséquences

- **Les versions ne suivent pas le compte** sur un autre appareil. C'est le
  prix de les garder hors du serveur.
- **L'export de la bibliothèque, le lien, le carnet et la séance ne les
  emportent pas** : ils emportent le schéma.
- **Sur une tablette partagée**, les versions d'un compte déconnecté restent
  dans le `localStorage`, dans sa case. Aucun écran ne les montre à un autre
  compte. Elles partent quand le compte est effacé, ou quand elles tombent
  de la limite.
- **Une application plus ancienne** ignore la clé `schemas-versions` : rien
  à migrer.
- **Les tests** figent :
  - la version rangée à l'enregistrement, et pas pour un geste défait ou
    une étiquette ;
  - la limite de dix, et le budget ;
  - le stockage plein, où l'historique cède et le schéma reste ;
  - revenir sans rien perdre, et défaire ce retour ;
  - les étiquettes gardées ;
  - la suppression qui emporte, et « Annuler » qui rend ;
  - les comptes séparés, l'effacement de l'un sans les autres ;
  - l'ajout au compte, la pierre tombale, le brouillon rangé au départ ;
  - aucune version dans la ligne envoyée au serveur ;
  - la feuille, et le tableau qui suit.

  L'e2e enregistre une phase, la retouche, la réenregistre, ouvre les
  versions et y revient : le tableau montre l'ancienne. axe audite la
  feuille ouverte.

## Relecture à faire

Traduites par la même machine que l'ADR 0024 :

- **Anglais** : « Version history » pour l'entrée du menu, plus courant que
  « Versions » seul dans un menu.
- **Espagnol** : « recuperada » pour une version reprise.
- **Néerlandais** : « teruggezet ».
- **Allemand** : « wiederhergestellt », et « Zu dieser Version
  zurückkehren », long sur un téléphone.
