# 0031 — Le feutre de la présentation

## Contexte

Au bord du bassin, l'entraîneur montre la phase sur la tablette, en
présentation (plein écran, écran allumé), et il parle : « toi, tu passes
là », « ici, on ferme ». Sur un tableau blanc, il entourerait le joueur et
tracerait le chemin. La présentation ne savait que tourner les pages.

## Décision

**Un feutre, en présentation seulement** (`workspace/PresentMarker.tsx`) :

- « Feutre » dans la barre de présentation l'allume. Un calque se pose
  sur le tableau et prend le doigt ou la souris ;
- les traits vivent en pixels d'écran : le même feutre marche par-dessus
  la 2D et par-dessus la 3D ;
- **rien ne s'enregistre** : c'est un feutre sur la vitre, pas une donnée du
  schéma ;
- les traits s'effacent à l'étape suivante et sur « Effacer le feutre » ;
- tant que le feutre est allumé, le balayage qui tourne les pages ne voit
  pas le geste : on dessine. Les boutons de la frise et une télécommande
  de présentation tournent toujours les pages ;
- le trait est rouge, la couleur de l'erreur, qui se lit sur le bleu du
  bassin.

## Écarté

- **Des traits enregistrés dans l'étape** : c'est le rôle des zones et des
  mots posés sur le terrain (ADR 0026). Le feutre accompagne la parole, et
  s'efface avec elle.
- **Le feutre hors présentation** : dans l'espace de travail, un glisser
  déplace un joueur ; il n'y aurait plus de geste sûr pour l'un ou l'autre.
