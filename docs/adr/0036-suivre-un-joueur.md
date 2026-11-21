# 0036 — Suivre un joueur, voir toute la phase

## Contexte

Le tableau montre une étape à la fois. Le fantôme dit d'où vient chaque
joueur, mais seulement depuis l'étape d'avant. Un joueur qui apprend sa
partition veut voir **toute sa nage** ; un entraîneur qui présente veut la
**phase entière d'un coup d'œil**, sur une image ou une feuille.

## Décision

**La phase en traits** (`pathsOf` dans `frame.ts`) : pour chaque joueur qui
bouge, ses nages d'une étape à la suivante, courbes comprises. C'est la
liste même des fantômes (`swimsInto`), prise étape après étape : le tableau,
les fantômes et la 3D tracent le même chemin.

Trois usages :

- **Suivre un joueur** : « Suivre sa nage » dans l'inspecteur, « Sa nage »
  dans la barre du mode simple. Son chemin se dessine en trait plein,
  numéroté par étape, et les autres s'estompent. Une pastille « Nage de… »
  le dit en bas du terrain et le lâche d'un toucher. C'est un état de
  l'écran, pas du schéma : ouvrir un autre schéma l'efface.
- **Toutes les nages** : « Les nages de toute la phase » dans « Calques ».
  Un trait fin par joueur, rangé dans l'affichage du schéma (`display.paths`,
  facultatif, sans migration), comme les noms et le fantôme.
- **La vue d'ensemble imprimée** : la fiche de la phase commence par une
  image de toutes les nages, avant les vignettes des étapes.

## Écarté

- **Les traits en 3D** : la 3D dessine déjà la nage de l'étape (ses traces
  au fond, ADR 0019 suivi). Toute la phase en 3D chargerait le fond du
  bassin sans rien montrer de plus que la vue de dessus.
- **Suivre plusieurs joueurs à la fois** : « Toutes les nages » le couvre,
  et un seul joueur suivi reste lisible au téléphone.
