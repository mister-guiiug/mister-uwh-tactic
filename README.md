# mister-uwh-tactic

Tableau tactique de hockey subaquatique : placez joueurs, arbitres et palet, partagez vos schémas et visualisez-les en 3D.

**En ligne : <https://mister-guiiug.github.io/mister-uwh-tactic/>**

Application PWA de la famille `miss-*` / `mister-*`, née du squelette
[`pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit) et bâtie
sur [`@mister-guiiug/dev-pwa-config`](https://github.com/mister-guiiug/dev-pwa-config).

## Ce qu'elle fait

**Le tableau, vu de dessus.** Le terrain est tracé selon le règlement
international (CMAS, 12ᵉ édition) : zones de but de 3 m, zones de pénalité de
6 m en pointillé, points de pénalité, point central, buts de 3 m. Dimensions
et profondeur se règlent dans les bornes du règlement (21–25 m × 12–15 m,
2–3,65 m).

- jusqu'à 6 joueurs dans l'eau et 4 remplaçants par équipe, blancs et noirs :
  un nom (prénom ou poste), la main de la crosse, l'orientation, et la
  profondeur — en surface ou au fond ; les remplaçants attendent dans leur
  zone, le long du bord ;
- les compositions usuelles, lues d'avant en arrière — 3-2-1, 2-3-1, 2-2-2,
  1-2-1-2, 2-1-3, 1-2-3 —, placées en un geste, postes nommés au besoin ;
- 0, 2 ou 3 arbitres dans l'eau, leur champ de vision, la ligne entre deux
  d'entre eux avec sa distance en mètres, et l'arbitre de bord sur la plage ;
- le palet ;
- au doigt ou à la souris (glisser, poignée de rotation), ou au clavier
  (flèches, Q/E pour tourner, S pour la profondeur, Entrée pour l'inspecteur) ;
  pincer zoome jusqu'à ×4 sur un téléphone, Ctrl et la molette ailleurs.

**Les phases de jeu.** Une phase est une suite d'étapes, chacune avec sa
consigne et sa durée de jeu réel. Une étape naît copie de la précédente : on
ne déplace que ceux qui bougent. Ou bien on l'enregistre en direct : on fait
glisser les joueurs comme on raconte l'action, et chaque pause ouvre l'étape
suivante. Le fantôme de l'étape précédente montre qui a
bougé ; des flèches disent un déplacement, une passe ou un flick — qui fait
décoller le palet en 3D. Un déplacement se courbe : une poignée au milieu du
chemin du joueur choisi le fait contourner, deux touchers le redressent ; la
lecture, la 3D et la vidéo suivent la courbe, le palet porté reste au bout
de la crosse, et la vitesse se mesure sur la longueur nagée (ADR 0019).
La lecture enchaîne les étapes en animation, à trois vitesses, la consigne
affichée sur le tableau. Annuler / rétablir (Ctrl+Z, Ctrl+Y), sélection
multiple (Maj + clic) pour déplacer ou tourner un groupe, remplacement d'un
joueur par un remplaçant. Une position se garde aux étapes
suivantes d'un geste, une étape se place plus tôt ou plus tard, et la phase
entière se retourne côté gauche ↔ côté droit.

**À toi de jouer.** Pour apprendre une phase reçue de l'entraîneur, sous
« ⋯ » : on choisit son joueur (celui qu'on a touché sur le tableau, ou dans
la liste de ceux qui bougent). Chaque étape paraît, tous à leur place sauf
lui, resté où il était. On glisse son jeton — au doigt, à la souris ou aux
flèches —, on vérifie : la bonne place paraît, avec l'écart en mètres et
un verdict (juste à moins d'un mètre, presque à moins de deux, à revoir
au-delà). À la fin, un bilan et « Recommencer ». Ni flèche ni fantôme ne
soufflent la réponse, et la partie ne touche jamais au schéma
([ADR 0022](./docs/adr/0022-a-toi-de-jouer.md)).

**L'apnée.** Une frise par joueur dans l'eau : fond ou surface à chaque étape,
les secondes de fond d'affilée, un seuil réglable ; au-delà, un anneau rouge
sur le tableau. Le décompte par équipe dit qui tient le fond.

**Les situations du règlement.** Engagement (15.1), palet neutre (17.5),
palet d'avantage (17.6), tir de pénalité (17.8), placés en un geste d'après le
texte du règlement CMAS, et les six compositions usuelles.

**La 3D.** La même position dans le bassin, à sa vraie profondeur : depuis la
tribune, de dessus, sous l'eau, ou depuis les yeux du joueur ou de l'arbitre
sélectionné. Les jetons s'y saisissent et s'y déplacent aussi. Houle,
caustiques et battements de palmes s'arrêtent sous `prefers-reduced-motion`,
et le mode économie coupe ombres, caustiques et houle sur les téléphones
modestes. Sur grand écran, 2D et 3D côte à côte ; partout, un mode
présentation plein écran qui garde l'écran allumé.

**Emporter la phase.** Sous « ⋯ » : le lien de partage, l'image PNG de
l'étape (terrain et consigne, pour le groupe de l'équipe), la phase en
vidéo (un clip MP4 du tableau, qui se lit dans la conversation), une fiche à
imprimer (une vignette par étape), une vidéo enregistrée depuis la 3D, un QR
code du lien compressé, et le mode présentation — où un balayage ou une
télécommande change d'étape.

**Les schémas.** Une bibliothèque en vignettes — la première étape de
chacun —, une recherche, un tri, « Dupliquer », et des exemples pour qui
n'en a pas encore : des phases de jeu et des exercices d'entraînement.
Enregistrés sur l'appareil, ouverts, exportés en JSON
un par un ou toute la bibliothèque d'un coup,
importés, et partagés par un lien qui contient tout le schéma — dans le
fragment de l'adresse, que le navigateur n'envoie jamais au serveur. Avec
un compte (mode Supabase), ils se retrouvent aussi sur chaque appareil :
l'appareil reste la vérité, et ce qui a été écrit hors ligne part au retour
du réseau. Chaque compte a sa bibliothèque : le suivant ne voit rien du
précédent, et ce qu'on a enregistré avant de se connecter reste à part,
« hors de votre compte », jusqu'à ce qu'on l'y ajoute d'un geste.

**Les séances.** Enchaîner des schémas de la bibliothèque pour un
entraînement — une durée et une consigne par phase —, puis les présenter au
bord du bassin, une phase après l'autre (ADR 0018). Avec un compte, elles
le suivent comme les schémas ; et « Partager » donne un lien qui emporte la
séance ET ses schémas — chez qui l'ouvre, tout entre dans la bibliothèque.

**Le lexique, relié au tableau.** Une trentaine de mots du jeu, en français
et en anglais ; ceux d'une consigne s'ouvrent d'un toucher, pendant la
lecture et en présentation.

**La palette de commandes.** Ctrl+K (⌘K) : aller à un écran, ajouter une
étape, placer une composition, ouvrir un schéma, une séance, un mot.

**Les notes du coach.** L'écran de notes du squelette, gardé sous « Plus » :
consignes et retours de séance, avec sa persistance versionnée et sa
variante Supabase.

## L'écran

**Deux modes** (ADR 0020).

- **Simple, par défaut au téléphone** : six contre six en pions numérotés, toucher pour choisir, glisser pour déplacer, une barre en toutes lettres (« Descendre au fond », « Donner le palet », « Passe à… ») et une frise courte.
- **Complet, par défaut sur grand écran** : tout ce qui suit.
- **Sans perte** : le mode se change dans « ⋯ » ou dans Réglages, et un schéma passe de l'un à l'autre sans rien perdre.
- **Couché**, le téléphone donne tout l'écran au tableau.

L'accueil est un espace de travail qui tient dans l'écran, sans défiler
(ADR 0016, 0017) : une seule barre (le fil « Schémas › », le nom du schéma
et son état, annuler, rétablir, partager, enregistrer, « ⋯ »), le tableau et
ses outils étiquetés, « Calques » posé dessus, la frise des étapes avec la
lecture, sa vitesse et l'apnée, et un panneau à cinq onglets — Étape, Jeton,
Équipes, Règles, Bassin. À côté du tableau dès 768 px ; au téléphone, une
feuille du bas à crans dont les onglets restent visibles. La navigation a
quatre entrées au téléphone : Tableau, Schémas, Séances, et « Plus » pour
les notes, le lexique, les réglages, le compte et « À propos » ; sur grand
écran, un rail à gauche, ceux-là en pied.

L'interface parle la grammaire du design system Astryx (Meta) : six tailles
de texte, un espacement au pas de 4 px, des rayons, des ombres et des durées
nommés par leur usage, posés sur les rôles du socle (ADR 0017). Les couleurs
du domaine (le bassin, les équipes, les officiels, le palet, les flèches)
sont écrites une fois, dans `src/design/tokens.ts`. Deux tests refusent une
couleur ou une taille de texte écrite en dur.

## Ce que le modèle doit au sport

Au-delà du principe de départ, le modèle suit la présentation du sport par
UWH News (« This is underwater hockey ! ») : six joueurs et quatre
remplaçants par équipe, quatre arbitres — trois dans l'eau, un sur le bord —,
les compositions lues d'avant en arrière, et un bassin généralement de 2 m de
fond. Les dimensions et les marquages du terrain suivent le règlement CMAS.

Le palet est toujours au fond de l'eau, et celui qui le joue aussi : il est
au bout de la crosse de son porteur, qui le lâche s'il remonte ; un flick
ne le lève que de 50 cm. Un joueur plonge en canard au début de l'étape et
remonte à la fin ; son apnée, par défaut de 10 s (« 5 à 10 secondes sous
l'eau à chaque fois », manuel de la WUHA), peut lui être propre, et ne se
remet à zéro qu'après une vraie récupération. Les arbitres de l'eau, en
surface, voient le palet ou non — un joueur allongé tout près peut le leur
cacher —, et une étape peut porter leur arrêt de jeu (ADR 0019).

Les buts sont dessinés à la cote du règlement fédéral (FFESSM, formation
AN2 « Règles du jeu », d'après les règles CMAS vol. 2 v10.06) : un bac
d'acier posé contre le mur, au milieu de chaque ligne de but, ouvert sur
les côtés — une rampe de 180 mm à 11 %, une cuvette de 120 mm, une paroi
arrière de 180 mm, 3 m entre les deux limites où le but compte, 3,36 m avec
les pentes de côté. En 2D comme en 3D, la paroi porte la couleur de
l'équipe qui défend.

Les exemples de la bibliothèque se choisissent en deux groupes. Neuf
phases de jeu tirées des documents de formation, après celle d'ouverture :
l'engagement en 3-2-1, l'entre-deux, l'attaque à droite dans leur moitié, le
changement d'aile, le jeu de mur et sa sortie, la défense qui coulisse, la
pénalité à deux contre un, et le coup franc en deux variantes, parce que les
sources se contredisent — joué par les pivots seuls, avec une feinte chez
l'adversaire, selon « Tactique de base du hockey subaquatique » ; joué par
l'arrière, qui avance puis tire vers ses avants, selon la fiche « Le coup
franc » du CIBPL-FFESSM. L'aide de chacune nomme sa source. Puis quatre
exercices d'entraînement, qui ne mettent à l'eau que leurs joueurs : le deux
contre un (manuel de la WUHA, § 8.3), la passe à trois en apnée (fiche « La
passe à trois » du CIBPL-FFESSM, l'exercice à trois des « Fondamentaux », le
« Three Passing » de la WUHA, § 10.1), le relais sur le mur (fiche « Le
relais sur le mur » du CIBPL-FFESSM, « Comment jouer le mur ? » des
« Fondamentaux ») et le chat au milieu (« Piggy in the middle » de la WUHA,
§ 10.2).

Ces exemples, le lexique (une trentaine de mots, en français et en anglais)
et les sigles des postes (AG, AC, AD, PG, PD, AR) suivent des documents de
formation : les fiches du CIBPL-FFESSM (initiateur hockey subaquatique),
« Fondamentaux techniques et tactiques »,
« Tactique de base du hockey subaquatique », le guide du débutant de la
Tasmanian Underwater Hockey Association et le manuel de la Wellington
Underwater Hockey Association (WUHA). Les compositions 1-2-2-1 et 2-1-2-1
viennent des deux derniers. Les placements sont redessinés et les consignes
réécrites : rien n'en est recopié.

L'équipement est décrit une fois, dans `src/features/board/equipment.ts`, et
dessiné en 2D comme en 3D : les joueurs en slip de bain, un bonnet de
water-polo à protège-oreilles — blanc pour l'équipe blanche, bleu pour
l'équipe noire —, le masque et le tuba, un gant de laine enduite de silicone
sur la main de la crosse, une crosse à crochet de 28 cm (les crosses vont de
260 à 300 mm) blanche ou noire, et des palmes en carbone de 50 cm sur 24.

## Origine

Le principe — un tableau tactique de hockey subaquatique, ses joueurs en
surface ou au fond, ses arbitres et leur champ de vision — est celui de
l'application Android _UWH Coach_. Mister UWH Tactic le reprend en application
web installable, libre, et l'enrichit des phases animées et de la 3D. Aucun
code, aucun visuel n'en vient.

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

L'installation lit le socle sur GitHub Packages : exporter `NODE_AUTH_TOKEN`
(un jeton avec `read:packages`) avant `npm install`.

**L'application démarre sans configuration**, sur son stockage local. C'est une
propriété à conserver : elle rend possibles le hors-ligne, les tests sans
secrets, et la page publique qu'on ouvre sans compte.

## Vérifier

```bash
npm run build
```

Le build enchaîne `tsc -b`, Vite, le budget de poids et `pwa-doctor --strict` :
il échoue à la moindre dette de conformité au parc.

```bash
npm test
```

```bash
npm run test:e2e
```

## Où est quoi

| Dossier                 | Rôle                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/features/board/`   | le modèle (`model.ts`), l'image interpolée (`frame.ts`), le tracé (`pitch.ts`), le partage, le magasin, la 2D et la 3D |
| `src/features/home/`    | l'accueil : l'accroche, le tableau, le pied de page de la famille                                                      |
| `src/features/schemas/` | la bibliothèque de schémas et leur fichier d'export                                                                    |
| `src/features/seances/` | les séances : enchaîner des schémas, les présenter, les partager par un lien (ADR 0018)                                |
| `src/features/lexique/` | le lexique, et ses mots reconnus dans une consigne                                                                     |
| `src/features/palette/` | la palette de commandes (Ctrl+K)                                                                                       |
| `src/features/notes/`   | les notes du coach (l'exemple du squelette)                                                                            |
| `src/backend/`          | les ports `notes`, `schemas` et `seances`, l'adaptateur local, leurs variantes Supabase                                |

## Ce qui reste à faire

Rien d'ouvert ici : les dettes connues sont écrites dans leur ADR (0015,
0018), avec ce qui les lèverait.

## Les décisions

Héritées du squelette, et celle du tableau et de la 3D
([0014](./docs/adr/0014-tableau-et-3d.md)), et celle de la synchronisation
des schémas ([0015](./docs/adr/0015-schemas-synchronises.md)) : [`docs/adr/`](./docs/adr/README.md).

## Licence

MIT — voir [LICENSE](./LICENSE).
