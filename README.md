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
  (flèches, Q/E pour tourner, S pour la profondeur, Entrée pour la fiche).

**Les phases de jeu.** Une phase est une suite d'étapes, chacune avec sa
consigne. Une étape naît copie de la précédente : on ne déplace que ceux qui
bougent. La lecture enchaîne les étapes en animation, à trois vitesses, et les
joueurs plongent ou remontent entre deux étapes.

**La 3D.** La même position dans le bassin, à sa vraie profondeur : depuis la
tribune, de dessus, sous l'eau, ou depuis les yeux du joueur ou de l'arbitre
sélectionné. Les jetons s'y saisissent et s'y déplacent aussi. Houle,
caustiques et battements de palmes s'arrêtent sous `prefers-reduced-motion`.

**Les schémas.** Enregistrés sur l'appareil, ouverts, exportés en JSON,
importés, et partagés par un lien qui contient tout le schéma — dans le
fragment de l'adresse, que le navigateur n'envoie jamais au serveur.

**Les notes du coach.** L'écran de notes du squelette, gardé : consignes et
retours de séance, avec sa persistance versionnée et sa variante Supabase.

## Ce que le modèle doit au sport

Au-delà du principe de départ, le modèle suit la présentation du sport par
UWH News (« This is underwater hockey ! ») : six joueurs et quatre
remplaçants par équipe, quatre arbitres — trois dans l'eau, un sur le bord —,
les compositions lues d'avant en arrière, le blanc et le noir portés par le
bonnet ET la crosse, l'équipement (masque, tuba, bonnet à protège-oreilles,
palmes, gant, crosse) et un bassin généralement de 2 m de fond. Les
dimensions et les marquages du terrain suivent le règlement CMAS.

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
| `src/backend/`          | les ports `notes` et `schemas`, l'adaptateur local, la variante Supabase des notes                                     |

## Ce qui reste à faire

1. régénérer les captures du manifeste : `npm run screenshots` ;
2. si un jour les schémas doivent se partager entre appareils : un adaptateur
   Supabase du port `schemas`, à ajouter dans `src/backend/index.ts` sans
   toucher aux écrans.

## Les décisions

Héritées du squelette, et celle du tableau et de la 3D
([0014](./docs/adr/0014-tableau-et-3d.md)) : [`docs/adr/`](./docs/adr/README.md).

## Licence

MIT — voir [LICENSE](./LICENSE).
