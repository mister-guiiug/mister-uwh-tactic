# 0019 — Le palet au fond, porté par une crosse ; joueurs et arbitres plus vrais

## Contexte

Une règle du sport, rappelée par le propriétaire le 20/11/2026 : **le palet
est toujours au fond de l'eau.** Le modèle la tenait à moitié. Le palet
était un point sans profondeur, mais rien n'empêchait un joueur en surface
de le « jouer », et un flick le montait à 1,2 m, plus de la moitié d'un
bassin de 2 m.

Les joueurs et les arbitres restaient sommaires :

- un joueur passait de la surface au fond en ligne droite pendant toute
  l'étape, traversant l'eau en diagonale ;
- l'apnée avait un seuil unique de 15 s, et une remontée d'une seconde
  remettait le compteur à zéro ;
- rien ne disait qu'un déplacement était impossible dans la durée de
  l'étape ;
- le champ de vision d'un arbitre était dessiné, sans rien dire de ce qu'il
  voit vraiment ;
- l'étape ne portait pas l'arrêt de jeu.

## Décision

**La règle est tenue par construction, pas vérifiée après coup.**

- **Le porteur** (`step.carrier`). Le palet est au bout de sa crosse, du côté
  de sa main, et le suit (`carry.ts`). Lui donner le palet le fait descendre.
  S'il remonte, il le lâche, et le palet reste au fond où il était. Déplacer
  le palet seul le lâche aussi.
  - Le palet ne revient jamais seul à une crosse voisine : un placement
    voulu (le palet dans la cuvette d'une pénalité) ne doit pas sauter.
- **Le flick** monte à 0,5 m : juste de quoi passer au-dessus d'un joueur
  allongé.
- **La plongée en trois temps.** Le canard se fait dans la première seconde
  de l'étape, presque vertical, comme le décrit le manuel de la WUHA. La
  remontée se fait dans la dernière seconde.
- **L'apnée.**
  - Le seuil par défaut passe à 10 s : « 5 à 10 secondes sous l'eau à chaque
    fois » en match, selon le manuel de la WUHA.
  - Chaque joueur peut avoir le sien.
  - Le compteur ne repart à zéro qu'après un temps en surface d'au moins la
    moitié du temps passé au fond. Ce ratio est un choix de l'application.
- **La vitesse.** Un déplacement plus rapide que `display.maxSpeed`
  (2 m/s par défaut) est signalé. Aucun document ne chiffre cette vitesse :
  c'est un réglage.
- **Les arbitres.**
  - Champ de vision affiché, l'étape dit si aucun arbitre de l'eau ne voit
    le palet.
  - Elle dit aussi si un joueur allongé près du palet le cache : la ligne de
    vue descend de la surface en biais, et passe sous un dos à moins de
    35 cm du fond.
  - « Placer les arbitres autour du palet » les met de part et d'autre, à
    3,5 m, face à lui.
- **L'arrêt de jeu** (`step.decision`) : coup franc, but, tir de pénalité ou
  temps mort. Il se lit sur le tableau, en présentation aussi.

Tous ces champs sont **facultatifs** : un schéma, un fichier ou un lien
d'avant se relit tel quel, sans migration. Le lien partagé les porte dans
une clé à part (`x`), qu'une application plus ancienne ignore sans perdre
le reste.

## Conséquences

- L'onglet Étape liste les alertes de l'étape en clair, et la frise les
  marque. Les alertes d'arbitres ne jouent que champ de vision affiché :
  sinon, les phases écrites sans eux en porteraient à chaque étape.
- Les exemples ne nomment pas de porteur : ils placent le palet eux-mêmes,
  et rien ne change pour eux.
- La migration v2 → v3 garde son seuil historique de 15 s : un défaut qui
  bouge ne change pas ce qu'une migration rend.
