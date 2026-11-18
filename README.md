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
ne déplace que ceux qui bougent. Le fantôme de l'étape précédente montre qui a
bougé ; des flèches disent un déplacement, une passe ou un flick — qui fait
décoller le palet en 3D. La lecture enchaîne les étapes en animation, à trois
vitesses, la consigne affichée sur le tableau. Annuler / rétablir (Ctrl+Z,
Ctrl+Y), sélection multiple (Maj + clic) pour déplacer ou tourner un groupe,
remplacement d'un joueur par un remplaçant. Une position se garde aux étapes
suivantes d'un geste, une étape se place plus tôt ou plus tard, et la phase
entière se retourne côté gauche ↔ côté droit.

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
l'étape (terrain et consigne, pour le groupe de l'équipe), une fiche à
imprimer (une vignette par étape), une vidéo enregistrée depuis la 3D, un QR
code du lien compressé, et le mode présentation — où un balayage ou une
télécommande change d'étape.

**Les schémas.** Une bibliothèque en vignettes — la première étape de
chacun —, une recherche, un tri, « Dupliquer », et un schéma d'exemple pour
qui n'en a pas encore. Enregistrés sur l'appareil, ouverts, exportés en JSON
un par un ou toute la bibliothèque d'un coup,
importés, et partagés par un lien qui contient tout le schéma — dans le
fragment de l'adresse, que le navigateur n'envoie jamais au serveur. Avec
un compte (mode Supabase), ils se retrouvent aussi sur chaque appareil :
l'appareil reste la vérité, et ce qui a été écrit hors ligne part au retour
du réseau.

**Les notes du coach.** L'écran de notes du squelette, gardé : consignes et
retours de séance, avec sa persistance versionnée et sa variante Supabase.

## L'écran

L'accueil est un espace de travail à la hauteur de l'écran (ADR 0016) : la
barre du schéma (son nom, son état d'enregistrement, annuler, rétablir,
enregistrer, « ⋯ »), le tableau et ses commandes, la frise des étapes
épinglée dessous, et un panneau à six onglets — Sélection, Étape, Équipes,
Règles, Apnée, Bassin —, à droite du tableau sur grand écran, sous la frise
sur un téléphone. La navigation a quatre entrées : Tableau, Schémas, Notes,
et « Plus » pour les réglages, le compte et « À propos » ; sur grand écran,
elle devient un rail à gauche.

Les couleurs du domaine (le bassin, les équipes, les officiels, le palet,
les flèches) sont écrites une fois, dans `src/design/tokens.ts` ; un test
refuse toute couleur en dur dans le code du tableau.

## Ce que le modèle doit au sport

Au-delà du principe de départ, le modèle suit la présentation du sport par
UWH News (« This is underwater hockey ! ») : six joueurs et quatre
remplaçants par équipe, quatre arbitres — trois dans l'eau, un sur le bord —,
les compositions lues d'avant en arrière, et un bassin généralement de 2 m de
fond. Les dimensions et les marquages du terrain suivent le règlement CMAS.

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
| `src/features/notes/`   | les notes du coach (l'exemple du squelette)                                                                            |
| `src/backend/`          | les ports `notes` et `schemas`, l'adaptateur local, leurs variantes Supabase                                           |

## Ce qui reste à faire

1. régénérer les captures du manifeste : `npm run screenshots`.

## Les décisions

Héritées du squelette, et celle du tableau et de la 3D
([0014](./docs/adr/0014-tableau-et-3d.md)), et celle de la synchronisation
des schémas ([0015](./docs/adr/0015-schemas-synchronises.md)) : [`docs/adr/`](./docs/adr/README.md).

## Licence

MIT — voir [LICENSE](./LICENSE).
