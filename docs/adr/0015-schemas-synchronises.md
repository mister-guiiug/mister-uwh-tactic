# 0015 — Les schémas synchronisés : l'appareil d'abord, Supabase en écho

## Contexte

Un entraîneur prépare ses phases chez lui, sur un ordinateur, et les montre
au bord du bassin, sur une tablette ou un téléphone. Jusqu'ici, les schémas
ne vivaient que sur l'appareil qui les avait enregistrés ; le lien de partage
les transportait, un par un.

Le squelette a deux mécanismes pour un port distant : la file d'écritures
hors ligne (ADR 0010) et la copie de lecture datée (ADR 0013). Ils ont été
écrits pour les notes, une liste qu'on lit et qu'on complète.

## Décision

**Le port `schemas` gagne un adaptateur Supabase, par compte** : une table
`schemas` dont chaque ligne appartient à son auteur (`owner`), RLS refusant
tout par défaut avec le même double verrou que les notes, et un droit de mise
à jour par colonne qui interdit de changer de propriétaire.

**L'appareil reste la vérité ; Supabase en est l'écho.** Une écriture va
d'abord sur l'appareil, puis à la base. `list()` fusionne par identifiant :
la version la plus récente gagne, ce que seule la base connaît s'ajoute, ce
que seul l'appareil connaît n'est jamais retiré. Un petit magasin
d'écritures en attente, marquées du compte, rejoue ce qui n'a pas pu partir.

**Une panne de réseau se tait, un refus de la base se dit.** La différence
se lit au code de l'erreur ; le message seul ne suffit pas (« Load failed »
de Safari n'est pas reconnu par le classement du socle).

**Le compte se lit dans la session gardée sur l'appareil**, sans appel
réseau : hors ligne, `getUser()` ne voit personne et `getSession()` peut
attendre trente secondes un jeton expiré. Sans session, l'adaptateur se
comporte exactement comme le local, et ne charge pas le SDK.

**La suppression du compte efface aussi les schémas** : dans la base
(`delete_my_account`, migration 0006) et sur l'appareil, écritures en
attente comprises.

## Conséquences

- Les schémas suivent le compte d'un appareil à l'autre, et restent
  utilisables hors ligne.
- Le code ne réutilise ni la file (ADR 0010) ni la copie de lecture
  (ADR 0013) : un schéma est un document qu'on remplace en entier, pas une
  liste de mutations, et la fusion par date suffit.
- **Désagréable** : après une déconnexion, les schémas synchronisés restent
  dans la bibliothèque de l'appareil. L'ADR 0013 veut que le compte suivant
  ne voie rien du précédent ; il faudrait un magasin par compte. _Levée le
  18/11/2026 : voir le suivi._
- **Désagréable** : les schémas enregistrés avant la connexion ne montent
  pas d'eux-mêmes — ils peuvent appartenir à quelqu'un d'autre. Il faudrait
  un geste explicite « ajouter à mon compte ». _Levée le 18/11/2026 : voir
  le suivi._
- **Désagréable** : les écritures en attente ne partent qu'à la lecture
  suivante (l'écran Schémas), pas au retour du réseau.

## Écarté

- **La bibliothèque partagée d'un club** : elle demande un modèle de club
  (qui en est, qui écrit) avant que les politiques puissent s'élargir.
- **La base comme seule vérité** : la bibliothèque disparaîtrait au bord du
  bassin, là où le réseau manque le plus.

## Suivi

- **18/11/2026** — Les écritures en attente ne dépendent plus de l'écran
  Schémas : l'accueil lit la bibliothèque à l'ouverture (l'état
  d'enregistrement du schéma en a besoin, ADR 0016), et le retour du réseau
  (`online`) la relit — `syncOnReconnect` dans `features/schemas/store.ts`.
  Ce qui a été écrit au bord du bassin part dès que le téléphone retrouve le
  réseau. Les deux autres dettes demeurent.

- **18/11/2026** — **Une bibliothèque par compte.** Chaque compte range ses
  schémas sous sa propre clé sur l'appareil (`schemas@<compte>`,
  `accountSchemasStore` dans `backend/local.ts`) ; la clé `schemas` ne
  garde que ceux de l'appareil, enregistrés sans compte. Connecté, on lit
  la bibliothèque du compte ; déconnecté, celle de l'appareil. Le compte
  suivant ne voit donc rien du précédent, hors ligne compris, et le
  précédent, revenu sans réseau, retrouve la sienne. La session prévient
  (`SIGNED_IN`, `SIGNED_OUT` → `accountChanged`) et la bibliothèque se relit ;
  une lecture dépassée ne s'affiche pas.

  **Ce qui est déjà au compte le rejoint seul ; le reste attend un geste.**
  La lecture d'un compte reprend à l'appareil les schémas qui sont à lui —
  ceux que le serveur range sous son nom, ceux qu'il a écrits et qui
  attendent de partir. C'est aussi la migration : un appareil d'avant ce
  changement mêlait tout sous `schemas`. Ce qui reste s'affiche à part,
  « Sur cet appareil, hors de votre compte », avec « Ajouter à mon compte »
  (un par un, ou tous) : rangés dans la case du compte, notés, envoyés.
  Ce que la base refuse retourne sur l'appareil, avec sa raison.

  **L'effacement du compte** oublie sa case et ses envois en attente, et la
  bibliothèque de l'appareil, comme les notes ; les autres comptes de
  l'appareil gardent la leur.

  Restent :
  - **le brouillon du tableau survit à la déconnexion**, comme il survit à
    la fermeture de l'onglet (ADR 0016). _Levée le 20/11/2026 : voir plus
    bas._
  - **un appareil partagé avant ce changement** garde dans sa bibliothèque
    ce qu'un autre compte y avait synchronisé : il paraît « hors de votre
    compte », et l'y ajouter est refusé par la base (l'identifiant est à
    l'autre). « Dupliquer » en fait un schéma à soi.

- **18/11/2026** — **À la déconnexion, la copie d'un compte ne garde que ce
  qui n'est pas parti**, parce qu'une tablette de club passe de main en
  main. Ce que le serveur a déjà — la version qu'il a rendue à la dernière
  lecture ou acceptée depuis, notée schéma par schéma (`schemas-recus`) —
  quitte l'appareil ; le reste y demeure (écritures en attente, refus,
  identifiant hors UUID : la file seule ne dit pas tout ce qui manque au
  serveur), et ce qui attendait part à la reconnexion du même compte.

- **20/11/2026** — **Le brouillon quitte l'écran avec son compte, sans rien
  perdre.** Sur une tablette de club, la personne suivante trouvait au
  tableau la phase de l'entraîneur d'avant : le brouillon survivait à la
  déconnexion comme à la fermeture de l'onglet. À la sortie d'un compte —
  déconnexion, ou un autre compte qui prend sa place —, avant que sa copie
  ne soit réduite :
  - **identique** à un schéma que l'appareil tient pour lui (sa copie, que
    le serveur l'ait ou qu'il attende d'y partir, ou la bibliothèque de
    l'appareil) : il est simplement remplacé par un tableau neuf ;
  - **porteur d'un travail non parti** — modifié depuis son
    enregistrement, ou neuf et touché : la règle de `worthKeeping`, celle
    qui décide déjà s'il faut prévenir avant de le remplacer — : il est
    rangé dans la copie de CE compte comme une écriture en attente, que la
    réduction garde ; il partira à sa prochaine connexion sur cet appareil,
    puis il est remplacé ;
  - **vierge** : simplement remplacé.

  Le tableau neuf n'a pas d'historique — « Annuler » ne rend pas à la
  personne suivante le travail de la précédente — et il est écrit tout de
  suite sur l'appareil, sans attendre l'écriture différée du tableau.

  **La couche est respectée** : le backend n'importe pas le tableau. Il
  publie le départ d'un compte (`onAccountLeave`, dans `backend/index.ts`)
  avec ce qu'il sait — qui part, ce que l'appareil tient pour lui, et de
  quoi ranger un schéma en attente dans sa copie ; le tableau
  (`features/board/leaveDraft.ts`, branché par `main.tsx`) dit ce que vaut
  son brouillon. **Un compte effacé ne garde rien** : `forgetAccount` le
  marque, et sa sortie remplace le brouillon sans le ranger — l'écran de
  suppression promet que rien n'est conservé.

- **20/11/2026** — **Une suppression suit le compte.** Supprimé sur un
  appareil, un schéma revenait d'un autre qui le gardait dans sa copie : la
  base effaçait la ligne, et la fusion, qui ne retire rien sur une absence,
  ne pouvait pas distinguer « supprimé ailleurs » de « jamais envoyé ». Les
  séances avaient la même dette (ADR 0018) ; elles sont levées ensemble.

  **Supprimer pose une pierre tombale**
  (`supabase/migrations/0008_pierres_tombales.sql`). La ligne reste, datée
  de l'instant du geste (`deleted_at`, à l'horloge de l'appareil, comme
  l'`updatedAt` d'un document), et vidée : nom `''`, données `{}` — la base
  refuse une ligne tombée qui garderait son contenu (`*_tombee_vide`). C'est
  une mise à jour, accordée colonne par colonne comme les autres, sous la
  même politique « chacun les siennes » ; jamais une insertion : une
  suppression ne crée pas de ligne. **Le droit `delete` est retiré aux
  comptes**, et sa politique avec lui : une ligne effacée sans trace est
  exactement le défaut levé ici, et un client d'avant cette version le
  reproduirait. Effacer en dur reste à la base seule : la purge, et
  `delete_my_account()`, qui emporte tout, pierres tombales comprises. La
  preuve : `supabase/tests/pierres-tombales.test.sql`.

  **La règle de conflit : entre une suppression et une écriture du même
  document, la plus récente gagne ; à égalité, la suppression.**
  - Une pierre tombale retire la copie de l'appareil — celle du compte, et
    celle que la bibliothèque d'avant le cloisonnement gardait encore.
  - **Seule une écriture en attente peut la défaire**, si elle est plus
    récente : elle repart, et ressuscite la ligne (`deleted_at` remis à
    `null`). Une copie sans écriture en attente ne défait rien, quelle que
    soit sa date : ce n'est qu'un reflet de ce que le serveur avait, et la
    suppression est venue après lui. Une horloge décalée ne peut donc pas
    faire revenir, depuis un appareil qui n'y a pas touché, un schéma jeté
    ailleurs.
  - Dans l'autre sens, une suppression faite ici hors ligne s'efface devant
    une version du serveur plus récente qu'elle — réécrite ailleurs après —,
    et part sinon. Les deux sens ensemble font que le résultat ne dépend pas
    de l'appareil qui retrouve le réseau le premier.
  - **Ce qui est comparé, c'est l'instant du geste**, pas la date du
    document. Chaque opération en attente le porte désormais (`at` ;
    `schemas-sync` passe en version 2, et une opération d'avant prend la
    date de la mise à jour, qui lui garde l'avantage qu'elle avait). La
    date du document ne suffisait pas : « Annuler » une suppression déjà
    partie remet le schéma avec sa date d'avant — c'est pourtant le dernier
    geste, et il gagne.
  - Une suppression est toujours datée d'au moins une milliseconde après la
    version qu'elle efface, un enregistrement jamais avant la version qu'il
    écrit : un appareil dont l'horloge retarde ne voit pas revenir ce qu'il
    vient de jeter.

  **La purge, par la base, sans pg_cron.** Une pierre tombale n'a à durer
  que le temps que chaque appareil la lise : **180 jours**, une intersaison
  et sa marge. Chaque écriture d'un compte — enregistrement ou suppression
  — emporte ses pierres tombales plus vieilles que cela, comptées à l'heure
  du serveur (`updated_at`), qu'aucun client ne fausse (déclencheur
  `purger_pierres_tombales`, `security definer`, borné au propriétaire de la
  ligne écrite). **pg_cron est écarté** : l'extension s'active projet par
  projet, aucun projet n'est branché aujourd'hui, et une purge qui dépend
  d'un réglage oublié n'a pas lieu. **La purge côté client aussi** : elle
  demanderait de rendre aux comptes le droit d'effacer, celui qu'on vient de
  retirer. Le prix : un compte qui n'écrit plus garde ses dernières pierres
  tombales — quelques dizaines d'octets chacune — jusqu'à sa prochaine
  écriture, ou l'effacement du compte.

  Restent :
  - **un appareil resté plus de 180 jours sans lire le serveur** garde sa
    copie d'un schéma supprimé entre-temps : la pierre tombale est purgée,
    et une absence ne prouve rien. Il ne le renvoie pas pour autant, sauf
    s'il y écrit — c'est alors un geste, et il gagne ;
  - **les horloges des appareils départagent** : deux gestes à quelques
    secondes d'écart, sous des horloges décalées d'autant, peuvent se
    départager à l'envers — comme deux enregistrements depuis l'origine ;
  - **la migration 0008 doit atteindre la base**, avec 0006 et 0007, le
    jour où un projet est branché. D'ici là, ce code dort : la production
    n'a pas de backend Supabase.
