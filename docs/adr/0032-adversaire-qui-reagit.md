# 0032 — Un adversaire qui réagit : une aide au placement, en trois phrases

## Contexte

Un entraîneur dessine souvent son équipe seulement. L'autre reste à
l'engagement, contre son mur, ou se place à la main, jeton par jeton : six
glissers de plus par étape. Au téléphone, un joueur fait environ 20 px de
large (ADR 0020). Or une phase où l'adversaire n'a pas bougé ne montre rien
de ce qu'on travaille : contre qui l'on passe, où est l'espace.

Ce qui existait déjà :

- **les compositions** (`formations.ts`) placent une équipe dans sa moitié,
  sans regarder l'autre ;
- **les situations du règlement** (`situations.ts`) replacent tout le monde,
  mais pour un arrêt de jeu ;
- **le sens d'attaque se lit sur le schéma** : `attackSign`, dans
  `describe.ts`, pour l'étape racontée (ADR 0030).

## Décision

### Une règle qui se dit en trois phrases

**Un geste place une équipe en défense sur l'étape en cours**
(`features/board/defense.ts`) :

1. **Le défenseur le plus proche de l'axe le garde** : entre le palet et le
   milieu de son but, à 3 m du but — à mi-chemin si le palet est plus près.
2. **Chaque attaquant est pris par le défenseur libre le plus proche**, le
   porteur du palet d'abord, puis du plus proche au plus loin du but. Le
   défenseur se place entre lui et le but, à 1,5 m, à sa profondeur ; pour
   le porteur, à 1 m devant son palet. Il ne quitte pas sa moitié : un
   attaquant resté chez lui est attendu sur la ligne médiane, en face de
   lui.
3. **Le but défendu se lit sur la première étape**, comme le sens d'attaque
   de l'étape racontée. Un attaquant de trop reste libre ; un défenseur de
   trop se range à côté de celui de l'axe, tous les 2 m. Tout reste dans le
   bassin (`clampFor`).

Ne bougent que les joueurs dans l'eau de l'équipe qui défend : ni les
attaquants, ni les remplaçants, ni les arbitres. Un défenseur qui portait
le palet le lâche, là où il est.

Pourquoi chacun de ces choix :

- **L'axe d'abord.** C'est le but qu'on défend. Sans lui, cinq marqueurs
  attirés du même côté laisseraient le but ouvert.
- **Le porteur, devant son palet.** Marqué au corps à 1 m, le défenseur se
  posait sur le palet, qui est au bout de la crosse, 1,25 m devant le
  porteur (`carry.ts`). Le danger, c'est le palet.
- **Le plus proche du but est servi le premier**, et celui qui reste libre
  est le plus loin : celui de l'axe le couvre.
- **Sa moitié, pour deux raisons.**
  - Marquer à 1,5 m un attaquant contre son mur, c'est presser
    l'engagement : aucune défense ne s'y place.
  - Le sens d'attaque se lit sur la moyenne d'une équipe à la première
    étape. Cinq défenseurs posés dans l'autre moitié le faisaient basculer,
    et un second geste envoyait l'équipe défendre le but adverse. Dans sa
    moitié, le geste rejoué sur son propre résultat ne change rien : un test
    le vérifie.
- **Le défenseur libre le plus proche**, plutôt qu'une affectation optimale :
  la règle se dit en une phrase, et l'entraîneur prévoit qui ira où.
- **La profondeur suit l'attaquant marqué.** Un défenseur en surface
  au-dessus d'un attaquant au fond ne marque rien. Celui de l'axe et ceux
  de trop gardent la leur.
- **Chacun regarde ce qu'il garde** : son attaquant, ou le palet pour le
  porteur, celui de l'axe et ceux de trop.

**C'est une aide au placement, pas une intelligence de jeu, et l'écran le
dit** en une phrase, au-dessus des boutons. La règle n'anticipe pas la
passe, ne ferme pas les lignes de passe, ne fait pas tourner les défenseurs
et ne compte pas l'apnée : elle ne sait que ce que montre l'étape.

### Une action du magasin, à sa place dans les lignes

**`placeDefense(team)`**, comme `applyFormation` : un seul pas à défaire, et
aucun si l'équipe n'a personne dans l'eau. L'action ne change pas le nombre
d'étapes. Elle rend donc la ligne retouchée (`{ tactic }`), que `writeLine`
range à sa place (ADR 0027) :

- sur une étape commune, toutes les variantes la voient ;
- sur une étape d'une variante, elle seule.

`store.defense.test.ts` le vérifie, avec « Annuler » et « Rétablir ».

### Où est le geste

- **Mode complet** : l'onglet « Équipes », sous la composition. On place son
  équipe, puis l'autre réagit. Deux boutons, « Placer les Noirs en défense »
  et « Placer les Blancs en défense » : le nom dit l'équipe, sans contrôle à
  régler avant.
- **Mode simple** : sous « ⋯ », un groupe « L'adversaire qui réagit », avec
  la même phrase.
  - Le mode simple part en six contre six à l'engagement, et n'a pas de
    compositions : c'est là que l'autre équipe reste le plus souvent à son
    mur, et que six glissers coûtent le plus.
  - Pas dans la barre : sa hauteur fixe est une décision mesurée sur cinq
    téléphones (ADR 0020, suivi du 21/11/2026).
- **La palette** (Ctrl+K) : les deux commandes, trouvées aussi par
  « adversaire » ou « marquage ».

**Un modèle, deux vues** (ADR 0014) : le geste écrit le schéma, la 2D et la
3D le dessinent. Les boutons sont dans le panneau, qui sert les deux vues.

**Les textes** forment un bloc `defense` dans les cinq catalogues, avec le
vocabulaire de l'ADR 0024 : « portador » et « portería », « puckdrager » et
« doel », « Puckführer », « Abwehrspieler » et « Tor ».

## Conséquences

- **Le poids**, mesuré en local le 21/11/2026 sur `main` puis sur la
  branche :
  - préchargé 242,8 → 243,7 kB, pour une borne de 271. La règle, l'action
    et les textes français vont dans l'accueil, avec le magasin ;
  - total 775,2 → 777,1 kB, pour une borne de 830. Les boutons vont dans
    le morceau secondaire (13,6 → 14,0 kB), les quatre autres catalogues
    dans le leur ;
  - `pwa-doctor --strict` reste à 0/0/0.
- **`attackSign` est exporté de `describe.ts`.** Son commentaire disait
  qu'« une phase retournée (`mirror`) change les camps ». Or « Retourner la
  phase » échange les ailes, pas les camps. Ce qui change les camps, c'est
  un schéma dessiné les Blancs à droite. Le commentaire le dit désormais.
- **Une limite connue : le but se lit sur la première étape**, sur la
  moyenne de l'équipe qui défend. Une équipe dessinée tout entière dans la
  moitié adverse à la première étape, un pressing dès l'ouverture, est lue
  à l'envers, par le geste comme par l'étape racontée. Comparer les deux
  équipes trancherait mieux. Mais ce serait changer aussi l'étape racontée :
  une autre décision.
- **Deux défenseurs peuvent se recouvrir** quand deux attaquants se collent,
  ou quand un marqueur tombe sur l'axe. La règle ne les écarte pas :
  l'entraîneur les déplace ensuite.
- **Les marqueurs descendent avec leur attaquant.** La frise d'apnée le
  compte comme n'importe quel geste.

## Écarté

- **Une intelligence de jeu** (lignes de passe, anticipation, un modèle) :
  il faudrait la valider auprès d'entraîneurs, et elle déciderait à leur
  place. La règle se dit, et se corrige à la main.
- **Une affectation optimale** (méthode hongroise) : quelques croisements de
  moins, mais plus personne ne prévoit qui va où.
- **Un sélecteur d'équipe et un bouton « Réagir »**, comme la composition :
  un contrôle de plus à régler, et un bouton dont le nom ne dit pas qui
  bouge.
- **Deviner l'équipe qui défend** (celle qui n'a pas le palet) : c'est faux
  quand le palet est libre, et le bouton ne dirait plus ce qu'il fait.
- **Le geste dans la barre du mode simple** : sa hauteur est fixe, et
  mesurée.
- **Réagir sur toutes les étapes d'un coup** : étape par étape,
  l'entraîneur garde la main sur la suite. « Garder aux étapes suivantes »
  existe déjà.
- **Un module nommé `react.ts`** : dans une application React, le nom
  tromperait.
