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

- **Elle reste sur l'appareil.** Elle est dans le magasin versionné du socle
  (`seances`), pas derrière un port : une séance se prépare et se joue sur la
  tablette du bord du bassin. La faire suivre le compte, comme les schémas
  (ADR 0015), demandera une table, ses politiques et sa file d'attente — à
  faire quand un club le demandera, pas avant.
- **Elle ne s'exporte pas** dans un fichier, ni ne se partage par un lien.

## Conséquences

- La présentation lancée depuis l'écran Séances demande le plein écran hors
  du geste qui l'a déclenchée ; le navigateur peut le refuser. Elle reste
  alors dans la page — elle s'arrêtait jusqu'ici au bout de 300 ms quand le
  plein écran manquait, croyant à un Échap.
- Le rail compte huit entrées (`navMaxVisible={8}`).
- Le test e2e de bout en bout prépare une séance de deux phases et passe de
  l'une à l'autre en présentation.
