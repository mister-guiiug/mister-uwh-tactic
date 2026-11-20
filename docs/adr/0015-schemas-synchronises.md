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
