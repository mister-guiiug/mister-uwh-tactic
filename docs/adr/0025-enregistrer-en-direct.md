# 0025 — Enregistrer une phase en direct

## Contexte

Créer une phase, c'était la découper soi-même : ajouter une étape (une copie
de la précédente), y déplacer chaque joueur qui bouge, recommencer. Au
téléphone, c'est le geste le plus long de l'application, et le premier retour
des testeurs disait justement « difficile à utiliser au téléphone »
(ADR 0020). Un entraîneur, lui, raconte l'action : « le 3 part au fond, le 1
le suit, puis le 3 passe ».

## Décision

**Un bouton « Enregistrement en direct » dans la frise** (le rond, à côté de
« + »), en mode simple comme en mode complet, en 2D comme en 3D.

- **Le premier glisser ouvre une étape** : celle de départ reste intacte.
- **Des glissers rapprochés font une seule étape.** Déplacer deux ou trois
  joueurs à la suite, sans pause, les fait bouger « ensemble ».
- **Une pause de plus de 1,2 s** (`RECORD_PAUSE_MS`), et le glisser suivant
  ouvre l'étape d'après.
- **Un toucher ne crée jamais d'étape** : le geste n'est compté qu'au-delà
  du tremblement d'un toucher (`TAP_SLOP`), comme pour déplacer un jeton.
- **Lire, ouvrir un autre schéma, repartir de zéro ou présenter**
  arrêtent l'enregistrement : on regarde ce qu'on vient de faire.

Le magasin du tableau porte l'état (`recording`), ainsi que deux gestes,
`recordGestureStart` et `recordGestureEnd`. Le tableau 2D les appelle au
premier vrai mouvement et au lâcher ; la scène 3D aussi (`onGestureStart`,
`onGestureEnd`), car une fonctionnalité n'existe pas dans une seule vue
(ADR 0014). La pause n'est pas un état à dessiner : elle vit hors de l'état,
dans le magasin.

Un geste interrompu sans fin (un second doigt, un `pointercancel`) est daté
dès son début : il ne fige pas la pause pour toujours.

## Conséquences

- La durée de jeu d'une étape enregistrée est celle de l'étape copiée (5 s
  par défaut) : le temps passé à glisser n'est pas un temps de jeu.
- Annuler défait l'étape ouverte et les déplacements, geste par geste.
- Au-delà de 30 étapes (`MAX_STEPS`), les glissers modifient la dernière.

## Écarté

- **Découper au temps** (une étape toutes les N secondes) : on hésite, on
  regarde le tableau. Une pause de réflexion aurait fait des étapes vides.
- **Un enregistrement continu**, chaque position échantillonnée : une phase
  de jeu se lit en étapes, avec une consigne par étape, et l'apnée se compte
  par étape.
