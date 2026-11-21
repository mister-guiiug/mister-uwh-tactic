# 0033 — Le chrono de match : des instants, l'écran allumé

## Contexte

Aux entraînements, les clubs jouent des matchs : deux mi-temps, souvent
2 × 10 ou 2 × 15 minutes, des temps morts, des exclusions temporaires, un
score. Au bord du bassin, quelqu'un tient le chrono sur un téléphone, et
regarde le jeu plus que l'écran.

Ce qui existait avant d'écrire :

- **Un chronomètre fait d'instants**, `src/features/seances/clock.ts`, pour
  la phase d'une séance (ADR 0018, suivi du 20/11/2026). Il retient l'instant
  de départ et le temps passé en pause : un onglet en veille ne reçoit plus
  ses `setInterval`, et un décompte à la seconde y perdrait le temps passé.
- **`use-wake-lock` du socle**, déjà pris par la présentation du tableau.
- **Le magasin versionné du socle**, celui de l'effectif (ADR 0028) et du
  bassin du club.
- **Le règlement, tel que le lexique le dit** : un temps mort dure une
  minute, une fois par mi-temps et par équipe ; une exclusion dure 2 ou
  5 minutes, ou le reste du match, sans remplacement.
- **Le préchargé mesurait 242,8 kB** pour une borne de 271.

## Décision

**Un écran « Match », sous « Plus »**, et au pied du rail sur grand écran,
à côté de l'effectif. La route `/match` se charge à la demande, comme les
autres écrans de « Plus ». La palette y mène aussi (« Aller à › Match »).

**Le chronomètre de la séance devient celui de l'application.** Il passe de
`seances/clock.ts` à `src/app/clock.ts`, avec deux fonctions de plus :
`elapsed` (le temps couru, pauses ôtées) et `endsAt` (l'instant où une durée
est écoulée). Le relevé de l'heure sort de `SeanceNav` vers
`src/app/useNow.ts`. Il relit aussi l'heure au retour au premier plan :
sinon, l'écran rallumé montrerait une seconde durant le temps d'avant la
veille. Le motif de vibration (`END_SIGNAL`) est le même pour une phase et
pour un match.

**Des instants, partout.** Le match garde l'instant de départ et les pauses
de la mi-temps ou de la pause en cours, jamais un reste.

- `settle(match, now)` relève ce qui s'est terminé avant `now`, **à
  l'instant où c'est arrivé** (`endsAt`). Un téléphone réveillé deux minutes
  après la fin d'une mi-temps fait partir la pause de la fin, pas du réveil.
- Chaque fin n'est rendue qu'une fois : elle est marquée (`rang`) ou elle a
  changé la phase, et c'est gardé avec le match.
- Chaque geste commence par mettre le match à l'heure. Une mi-temps déjà
  finie ne se met donc pas en pause.

**Les exclusions comptent en temps de jeu**, comme au règlement. Une
exclusion retient le temps de jeu couru à son début, pas un instant. Quand
le chrono s'arrête (pause, temps mort, fin de mi-temps), elle s'arrête
aussi. Elle passe la pause et finit en seconde mi-temps. Les durées sont
celles du règlement, 2 et 5 minutes (`EXCLUSION_MINUTES`). L'exclusion pour
le reste du match n'a pas de compte à rebours : l'arbitre la tient.

**Quatre phases.**

- **Avant le match** : les durées se règlent (mi-temps de 1 à 45 minutes,
  10 par défaut ; pause de 1 à 15, 3 par défaut).
- **Pendant une mi-temps** : « Pause », « Reprendre », « Fin de mi-temps ».
  Ce dernier bouton compte le temps couru, pas la durée prévue.
- **Pendant la pause de mi-temps** : son compte à rebours, puis le
  dépassement (« +0:12 »). La seconde mi-temps part au toucher, pas d'elle-
  même : c'est l'arbitre qui la lance.
- **Fin du match** : le score reste, « Nouveau match » repart des mêmes
  durées et s'annule pendant huit secondes (ADR 0008).

**Les temps morts** : un bouton par équipe. Le chrono s'arrête, la minute
est décomptée et signalée à sa fin, et « Reprendre le jeu » relance. Ils
sont comptés par mi-temps (« Pris dans la mi-temps : 1 »), pas bloqués : à
l'entraînement, la règle d'un temps mort par mi-temps se discute.

**Le score** : un but de plus ou de moins par équipe, jamais sous zéro.

**Au bord du bassin.**

- **L'écran reste allumé** (`useWakeLock` du socle) tant que le match est
  commencé et pas fini, en pause comprise.
- **Une vibration à chaque fin** : mi-temps, pause, temps mort, exclusion.
  L'appel est `navigator.vibrate?.(END_SIGNAL)`, muet sur iOS. `haptics` du
  socle fait la même chose, mais il est « experimental » (un seul adoptant,
  retrait possible après le 04/01/2027), et `pwa-doctor --strict` le compte
  comme une info.
- **Le match survit à un rechargement** : un magasin versionné du socle,
  sous `mister-uwh-tacticmatch` (préfixe et clé collés). Il est écrit quand
  le match change, pas à chaque seconde. Une donnée illisible est gardée de
  côté par le socle, et l'écran repart d'un match neuf.

**L'accessibilité.**

- **`role="timer"`** sur le grand chiffre, sur le temps mort et sur chaque
  exclusion. Ce rôle se tait de lui-même : on le lit quand on y va.
- **Les fins sont dites une fois**, dans une région `aria-live="assertive"`.
  Une fin de mi-temps n'attend pas la fin d'une phrase. Le magasin la passe
  de « à dire » (`ends`) à « dite » (`said`), et l'oublie quand l'écran se
  ferme. Revenir sur l'écran ne la redit pas, un rechargement non plus.
- **Le score est dit après chaque but**, en `polite`.
- **44 px au doigt** : les boutons du socle (2,75 rem).
- **« En pause » est écrit**, pas seulement montré par une teinte.

**Le grand chiffre a son jeton** : `--text-scoreboard-size`, dans la
grammaire de `index.css`. Il vaut quatre fois le plus grand cran (116 px),
ramené à 26 % de la largeur, soit environ 97 px sur un téléphone de 375 px.
« 45:00 » y tient. C'est un écart à l'ADR 0017 et à ses six tailles, et il
est assumé : ce n'est pas un cran de lecture, c'est un affichage.
`scale.test.ts` compte les crans `--font-size-*`, et celui-ci n'en est pas
un.

**Les textes** sont dans un bloc `match`, dans les cinq catalogues, avec le
vocabulaire de l'ADR 0024 et du lexique :

| Notion         | Espagnol      | Néerlandais     | Allemand      |
| -------------- | ------------- | --------------- | ------------- |
| match          | partido       | wedstrijd       | Spiel         |
| mi-temps       | tiempo        | helft           | Halbzeit      |
| pause mi-temps | descanso      | rust            | Halbzeitpause |
| temps mort     | tiempo muerto | time-out        | Auszeit       |
| exclusion      | expulsión     | tijdstraf       | Zeitstrafe    |
| exclure        | expulsar      | tijdstraf geven | hinausstellen |

« Pause », « {n} min », « Blancs » et « Noirs » reprennent les clés qui
existaient (`board.pause`, `seances.minutesShort`, `board.teamWhite`,
`board.teamBlack`). L'anglais garde deux mots du français, « Match » et
« Exclusions », écrits dans les exceptions de `catalogues.test.ts`.

## Conséquences

**Le préchargé passe de 242,8 à 243,6 kB**, pour une borne de 271. C'est
0,7 kB pour les textes français (le catalogue de repli est dans l'accueil),
la route, l'entrée de « Plus » et celle de la palette, et 0,1 kB pour
l'écran lui-même. Celui-ci pèse 4,8 kB gzip, plus 0,9 kB de feuille de
style et 0,3 kB pour `useNow`, tous hors du préchargé.

**Le total passe de 775,2 à 783,4 kB**, pour une borne de 830. Les quatre
catalogues traduits grandissent chacun d'un bloc.

**Un piège de Rolldown, mesuré en isolant les imports un à un.** L'écran
importait d'abord `Play` et `Pause` de `lucide-react`. Ces deux icônes sont
déjà dans l'accueil (la frise) et dans la barre de séance. Partagées par un
troisième morceau, Rolldown les sortait de l'accueil. Pour éviter un cycle,
il en sortait aussi `createLucideIcon`, les composants du socle et l'i18n :
trois morceaux préchargés de plus (`i18n-*`, `toast-*`,
`createLucideIcon-*`), soit 244,6 kB au lieu de 243,6. L'écran prend donc
`CirclePlay` et `CirclePause`. Le piège reste ouvert pour la suite : si ces
trois noms reparaissent sous « Référencé par index.html » dans la sortie de
`pwa-bundle-budget`, une icône de l'accueil est partagée par deux morceaux.

**Hors de l'écran « Match », rien ne vibre.** Le chrono continue, puisqu'il
est fait d'instants. La fin est relevée et dite au retour sur l'écran. Un
téléphone verrouillé gèle la page : c'est pour ça que l'écran reste allumé.
Aucune notification n'est envoyée ; on y reviendra si un club la demande.

**iOS ne vibre pas** : l'API n'y existe pas. L'écran allumé y dépend de la
version de Safari, et `useWakeLock` se tait là où l'API manque.

**Un match à la fois, sur l'appareil**, pas au compte, et sans historique.
Comme l'effectif, il sert là où l'on entraîne.

**Une exclusion terminée reste dans la liste**, marquée « Peut revenir »,
jusqu'à ce qu'on la retire. Retirer une exclusion s'annule pendant huit
secondes.

## Ce qu'on écarte

**Un décompte par `setInterval`.** Il perd le temps passé en veille, et
c'est exactement ce qui arrive à un téléphone posé au bord du bassin.

**Des exclusions à l'horloge murale.** Elles continueraient pendant un
temps mort, et le règlement les arrête.

**Un relevé global, dans la coquille, pour vibrer hors de l'écran.** Il
pèserait dans l'accueil pour un écran qu'on ouvre au bord du bassin et
qu'on y laisse.

**`haptics` du socle.** Il est « experimental », et `pwa-doctor` le dit.

**Bloquer le second temps mort d'une mi-temps.** C'est le règlement, mais
pas toujours l'entraînement. Le compte reste affiché.

**Lancer la seconde mi-temps à la fin de la pause.** Ce serait le chrono
qui décide, pas l'arbitre.

**Un septième cran `--font-size-*`.** Les six crans servent à la lecture.
Le grand chiffre est un affichage, avec son propre jeton.

## Relecture à faire

Ces textes sont traduits par la même machine que l'ADR 0024. Voici les
termes à relire d'abord :

- **Espagnol** : « tiempo » pour la mi-temps (« 1.er tiempo ») ;
  « descanso » ; « Pedidos en este tiempo » pour les temps morts pris.
- **Néerlandais** : « helft » et « rust » ; « Tijdstraf geven » pour
  exclure ; « stand » pour le score.
- **Allemand** : « Spiel » plutôt que « Match » ; « hinausstellen » (le
  lexique dit « der hinausgestellte Spieler ») ; « Spieluhr ».
