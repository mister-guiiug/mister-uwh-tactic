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
  ne voie rien du précédent ; il faudrait un magasin par compte.
- **Désagréable** : les schémas enregistrés avant la connexion ne montent
  pas d'eux-mêmes — ils peuvent appartenir à quelqu'un d'autre. Il faudrait
  un geste explicite « ajouter à mon compte ».
- **Désagréable** : les écritures en attente ne partent qu'à la lecture
  suivante (l'écran Schémas), pas au retour du réseau.

## Écarté

- **La bibliothèque partagée d'un club** : elle demande un modèle de club
  (qui en est, qui écrit) avant que les politiques puissent s'élargir.
- **La base comme seule vérité** : la bibliothèque disparaîtrait au bord du
  bassin, là où le réseau manque le plus.
