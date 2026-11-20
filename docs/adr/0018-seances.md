# 0018 — Des séances à la place des notes, dans la barre

## Contexte

La barre basse du téléphone a quatre places (ADR 0016) : Tableau, Schémas,
Notes, Plus. **Notes** est l'écran du squelette de la famille
(`pwa-starter-kit`) : une liste de textes libres, utile, mais sans lien avec
le tableau. Il occupait une des trois places « de tous les jours ».

Ce qu'un entraîneur prépare vraiment, c'est une **séance** : un
échauffement, une phase de jeu, un exercice, dans un ordre, avec une durée
et une consigne pour chacun. Puis il la montre au bord du bassin, une phase
après l'autre, la tablette passant de main en main. L'application savait
montrer UN schéma (mode présentation) ; rien ne les enchaînait.

## Décision

**Une séance enchaîne des schémas de la bibliothèque, et prend la place des
notes dans la barre.**

- Une séance = un nom, et jusqu'à vingt phases. Une phase désigne un schéma
  **par son identifiant**, avec une durée (1 à 60 min) et une consigne
  (280 caractères). Pas de copie : un schéma corrigé l'est aussi dans les
  séances qui l'emploient.
- **Présenter** ouvre la première phase sur le tableau, en présentation. La
  barre de présentation dit « Phase 2 / 5 · 8 min », la consigne de la phase,
  et offre la phase d'avant ou d'après. Une phase dont le schéma a disparu
  est signalée dans la séance, et sautée à la présentation.
- La barre : **Tableau, Schémas, Séances, Plus**. Les notes restent, rangées
  sous « Plus » au téléphone et au pied du rail sur grand écran — comme le
  lexique, les réglages, le compte.
- Ouvrir une séance remplace le brouillon du tableau comme le fait l'ouverture
  d'un schéma : la notification « Annuler » le rend (ADR 0008).

## Ce que la séance ne fait pas encore

- **Elle ne s'exporte pas dans un fichier.** Le lien (suivi du 20/11/2026)
  la transporte avec ses schémas ; un fichier ferait double emploi tant que
  personne ne le demande.

_Les deux autres manques de la première version — « elle reste sur
l'appareil », « elle ne se partage pas par un lien » — sont levés le
20/11/2026 : voir le suivi._

## Conséquences

- La présentation lancée depuis l'écran Séances demande le plein écran hors
  du geste qui l'a déclenchée ; le navigateur peut le refuser. Elle reste
  alors dans la page — elle s'arrêtait jusqu'ici au bout de 300 ms quand le
  plein écran manquait, croyant à un Échap.
- Le rail compte huit entrées (`navMaxVisible={8}`).
- Le test e2e de bout en bout prépare une séance de deux phases et passe de
  l'une à l'autre en présentation.

## Suivi

- **20/11/2026** — **La séance suit le compte, comme les schémas.** Préparée
  sur l'ordinateur, elle attend sur la tablette du bord du bassin ; c'est
  exactement le trajet que l'ADR 0015 a ouvert aux schémas, et la séance qui
  n'arrive pas en fait une demi-fonction.

  - Une table `seances` (`supabase/migrations/0007_seances.sql`) sur le
    modèle de `schemas`, à la lettre : propriétaire posé par la base, RLS
    « chacun les siennes » avec `with check`, mise à jour par colonne qui
    interdit de céder une ligne, effacée par la cascade ET nommée dans
    `delete_my_account()`. Pas de clé étrangère vers `schemas` : une phase
    désigne un schéma qui peut n'exister que sur un appareil, ou avoir été
    supprimé. La preuve : `supabase/tests/seances.test.sql`.
  - Un port `seances` (`LibraryRepository<Seance>`, celui des schémas rendu
    générique) : sans compte, l'appareil, sous la clé `seances` de toujours ;
    avec un compte, sa copie `seances@<compte>`, une écriture hors ligne qui
    attend et part au retour du réseau, ce qui est sur l'appareil hors du
    compte rangé à part avec « Ajouter à mon compte », et la copie réduite à
    la déconnexion à ce qui n'est pas parti.
  - **Le code de synchronisation n'est pas recopié** : celui des schémas est
    devenu `createDocumentSync` (`backend/supabase-documents.ts`), paramétré
    par la table, les étagères de l'appareil et la lecture d'une ligne. Une
    copie aurait fait deux endroits où corriger le prochain piège — et ce
    code en a déjà payé quatre (le « Load failed » de Safari, la session
    partie pendant une requête, la ligne d'une version future, l'envoi
    refusé qui ne doit pas se perdre). Les magasins des schémas
    (`schemas-sync`, `schemas-recus`) gardent leurs clés.
  - Ajoutée à un compte, **une séance emmène les schémas qu'elle présente**
    et que l'appareil gardait hors du compte : arrivée seule sur un autre
    appareil, elle n'aurait rien à montrer.
  - Le nom et les consignes s'enregistrent à la frappe ; avec un compte,
    chaque écriture partirait au serveur. **Une retouche s'écrit après une
    demi-seconde de calme** (`SAVE_DELAY_MS`), comme le brouillon du tableau
    — et tout de suite quand l'éditeur se ferme, quand la page se cache, et
    avant toute relecture : rien de tapé ne reste en mémoire seulement.

- **20/11/2026** — **Une séance se partage par un lien.** « Partager », dans
  l'éditeur, ouvre le lien et son QR code.

  - **Le lien emporte les schémas.** Une séance désigne ses schémas par
    identifiant : seule, elle n'aurait rien à présenter chez qui la reçoit.
    Chaque schéma y figure une fois, à la forme compacte d'un lien de schéma
    (`board/share.ts`, dont l'encodage JSON et la compression deflate sont
    désormais partagés), et chaque phase y renvoie par sa place. Une phase
    dont le schéma a disparu ne part pas.
  - **Dans le fragment, sous une clé à part** — `#zs=` compressé, `#ss=`
    lisible partout. Le fragment ne part jamais au serveur ; une clé à part
    évite qu'un tableau d'avant ne prenne une séance pour un schéma. Le lien
    vise la racine, la seule adresse que GitHub Pages sert sans son repli
    404 ; la coquille le reconnaît sur toutes les routes, et le décodeur se
    charge à la demande.
  - **À l'ouverture, tout entre sous de nouveaux identifiants**, les phases
    recâblées, par les magasins — donc par les ports : avec un compte, la
    séance reçue et ses schémas le suivent. Reprendre les identifiants de
    l'expéditeur ferait d'un second envoi un écrasement, et réclamerait au
    serveur des lignes qui sont à quelqu'un d'autre.
  - **La longueur, mesurée** sur trois vrais exemples de la bibliothèque
    (engagement 3-2-1, attaque à droite, jeu au mur : dix étapes, consignes
    comprises) : **1 909 octets**, sous la capacité d'un QR code (2 953).
    Quatre exemples : 2 385 ; cinq : 2 872. Trois schémas vierges : 385. Au
    delà de la capacité, la feuille ne propose pas le QR code — un code
    illisible au bord du bassin coûte plus qu'un lien envoyé par message —
    et le dit.

  Restent :
  - **la migration 0007 doit atteindre la base de production** — à la
    fusion, par `supabase-migrations.yml`, quand le dépôt a ses variables :
    à vérifier ce jour-là. Sans elle, une séance écrite avec un compte reste
    sur l'appareil, et la base refuse l'envoi (table inconnue) — c'est dit à
    l'écran ;
  - **une séance supprimée sur un appareil revient sur un autre qui
    l'ignorait** : c'est le prix de la fusion des schémas, payé du côté qui
    ne perd rien (ADR 0015). _Levée le 20/11/2026 : voir plus bas._

- **20/11/2026** — **Une séance supprimée ne revient plus.** La dette était
  celle des schémas ; elle est levée pour les deux à la fois, par la même
  règle, écrite une fois dans `createDocumentSync` (ADR 0015, suivi du même
  jour) :

  - **supprimer pose une pierre tombale** dans `seances`
    (`supabase/migrations/0008_pierres_tombales.sql`) : la ligne reste,
    vidée de son nom et de ses phases, datée de l'instant du geste ; le
    droit d'effacer est retiré aux comptes ;
  - **la plus récente gagne, la suppression comprise ; à égalité, la
    suppression** — et seule une écriture en attente peut défaire une
    pierre tombale. La séance retouchée au bord du bassin APRÈS avoir été
    supprimée sur l'ordinateur revient, et sa ligne avec elle ; la copie
    restée intacte sur la tablette s'en va ;
  - **la purge** : chaque écriture d'un compte emporte ses pierres tombales
    de plus de 180 jours, par la base, sans pg_cron ;
  - `seances-sync` passe en version 2, comme `schemas-sync` : chaque
    opération en attente porte l'instant de son geste.

  La preuve : `supabase/tests/pierres-tombales.test.sql` joue chaque geste
  sur les deux tables, `backend/supabase-seances.test.ts` le branchement.
  Comme pour 0007, **la migration 0008 doit atteindre la base** le jour où
  un projet est branché.

- **20/11/2026** — **Au bord du bassin, un chronomètre par phase, et la
  séance sur papier.**

  - **Le chronomètre** vit dans la barre de présentation (`SeanceNav.tsx`) :
    il part avec la phase, se met en pause, et vibre une fois quand les
    minutes prévues sont écoulées. Il compte ensuite le dépassement, en
    rouge, et « Phase suivante » passe au premier plan. Il compte des
    instants, pas des secondes (`seances/clock.ts`) : un onglet en veille ne
    reçoit plus ses `setInterval`, l'écart à l'instant de départ reste juste.
    Le lecteur d'écran entend « Temps écoulé » une fois, pas chaque seconde.
  - **La séance en cours de présentation quitte le magasin des séances**
    (`seances/play.ts`) : le tableau, dans l'accueil, n'a besoin que de
    savoir si une séance se présente. La barre de séance, et la bibliothèque
    avec elle, passent dans le morceau secondaire du tableau. Mesuré :
    238,5 kB préchargés, contre 238,9 en morceau à part et 239,5 dans
    l'accueil — un morceau de plus coûte en compression ce qu'il retire.
  - **« Imprimer »** monte une feuille (`SeancePrint.tsx`) : le nom et la
    durée de la séance, puis chaque phase avec son schéma, ses minutes, sa
    consigne et une vignette par étape, deux par rangée. C'est ce qu'on
    plastifie pour le bord du bassin, là où le téléphone ne va pas. La
    mécanique « monter, imprimer, démonter » est partagée avec la fiche de
    la phase (`app/usePrinting.ts`).
