# 0021 — La phase en vidéo : WebCodecs dans un MP4, un repli qui suit l'horloge

## Contexte

Les entraîneurs partagent dans le groupe WhatsApp du club. Un lien demande
d'ouvrir l'application ; l'image de la phase ne montre pas le mouvement ;
un clip de quelques secondes se lit dans la conversation.

La vidéo qui existait filme la scène 3D (`exporting.ts`) : `MediaRecorder`
sur `captureStream`, 3D ouverte seulement. Pour le tableau 2D, ce procédé ne
tient pas. Dessiner une image coûte des dizaines de millisecondes :
`Board2D` hors écran, SVG sérialisé, puis canevas. Enregistré au fil de
l'horloge, le clip sort saccadé, ou ralenti, selon la machine.

## Décision

**Chaque image du clip a son instant, calculé avant la première**
(`video/timeline.ts`). Le passage d'une étape à la suivante suit le rythme
de « Lire » : 1,6 s à ×1 (`SECONDS_PER_STEP`), vitesse choisie comprise. La première
étape est tenue 1 s, la dernière 2 s. Le clip fait 1 280 × 720, à
30 images/s, avec le titre du schéma en tête, l'étape en cours et sa
consigne. Au-delà de 60 s, la phase est **accélérée** pour tenir, pas
coupée, et le sous-titre le dit (« accélérée ×1,8 »).

**WebCodecs d'abord** :

- `VideoEncoder` reçoit chaque image avec son horodatage, calculé depuis
  son index. Le temps de dessin n'entre nulle part dans le fichier.
- Le codec est sondé par `isConfigSupported` :
  - H.264, en profil Main puis Baseline, niveau 3.1 ;
  - puis VP9 ;
  - puis AV1.
- Toujours dans un **MP4** : `mp4-muxer` (MIT, 9 kB gzip).

**Le repli, `MediaRecorder`, suit l'horloge** :

- La phase est jouée en temps réel. À chaque tour, on dessine l'image que
  l'horloge attend (`frameDue`), et `requestFrame` la capture.
- Un rendu lent saute des images ; il ne ralentit jamais la phase.
- Le format est MP4 si l'enregistreur le sait, WebM sinon.

**Ni l'un ni l'autre** : l'action ne s'affiche pas. Le navigateur est sondé
à la première ouverture de « ⋯ ».

**Le partage attend un second geste.** `navigator.share` exige un geste
récent, et le rendu dure plus longtemps que ce délai. La feuille montre
l'avancement, « Annuler », puis le bouton : Web Share avec fichier là où
`canShare` le permet, téléchargement sinon.

**La mesure** (avec consentement) compte `video_phase` : le codec obtenu et
la durée du clip.

## Ce qui est écarté

- **`MediaRecorder` seul, au fil de l'horloge** : un clip juste sur un
  ordinateur, ralenti sur un téléphone modeste.
- **WebM pour VP9** : WhatsApp le reçoit en document, pas en vidéo. Le MP4
  vaut pour les trois codecs.
- **Mediabunny**, successeur de `mp4-muxer` par le même auteur :
  - il est maintenu, mais sous MPL-2.0 ;
  - il pèse 34 kB gzip pour le seul MP4, contre 9 ;
  - le budget total (677 kB sur 697 avant ce changement) ne le portait pas
    sans relever la borne.

  `mp4-muxer` est déclaré « remplacé » : il est figé. Migrer ne touche que
  `mp4Muxer` dans `video/encode.ts`.

- **ffmpeg.wasm** : plusieurs mégaoctets, et un encodeur logiciel là où le
  navigateur en offre un matériel.
- **Encoder sur un serveur** : le schéma ne quitte pas l'appareil.

## Conséquences

- **Le poids.** Le code vidéo se charge au clic :
  - `render-*.js` pèse 10,6 kB gzip, multiplexeur compris ;
  - le module des codecs (0,9 kB) se charge à l'ouverture du menu ;
  - le préchargé passe de 237,6 à 237,7 kB, et le total de 677,1 à 690,0
    kB, sur une borne de 697.
- **La vitesse est celle de « Lire », pas la durée de jeu.** Une première
  version suivait les durées des étapes (5 s par défaut) : le clip était
  trois fois plus lent que ce que l'entraîneur voit en lisant la phase, et
  trois fois plus lourd à envoyer. Il suit désormais `SECONDS_PER_STEP` et
  la vitesse choisie au tableau.
- **Deux vidéos dans « ⋯ ».** La phase en vidéo, tirée du tableau 2D, se
  range avec les partages, à côté de l'image de la phase. L'enregistrement
  de la 3D reste sous « Montrer ».
- **Le tableau hors écran est monté une fois** (`boardSnapshot` dans
  `stepImage.tsx`) et redessiné à chaque image. L'image de la phase s'en
  sert aussi.
- **Mesuré le 20/11/2026** sous Windows, dans le Chromium de Playwright :
  - 18 s de clip (quatre étapes de 5 s) rendues en 6,0 s : 540 images,
    2,2 Mo en H.264 ;
  - un clip de 4 s pèse 130 Ko en H.264, 305 Ko en VP9 ;
  - sous Windows, ce Chromium encode H.264 grâce à Media Foundation ; sous
    Linux (la CI), il prend VP9. L'e2e rejoue les deux cas, et le repli.
