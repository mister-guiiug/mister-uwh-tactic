# 0030 — L'étape racontée

## Contexte

La plupart des étapes n'ont pas de consigne : on déplace les joueurs, on
passe à la suivante. Une étape sans texte reste muette à trois endroits :

- **l'impression**, où la vignette paraît sans un mot dessous ;
- **le lecteur d'écran**, pour qui le tableau ne se parcourait que jeton
  par jeton, sans rien qui dise ce qui se passe ;
- **la consigne elle-même**, qu'un entraîneur remplirait volontiers s'il
  n'avait pas à l'écrire depuis rien.

## Décision

**Un texte écrit à partir du schéma lui-même** (`features/board/describe.ts`).
Il dit ce que montre le passage de l'étape d'avant à celle-ci :

- la première étape : la position de départ, et qui a le palet ;
- puis le palet (passe, flick s'il est fléché à l'étape d'avant, prise,
  lâcher), les plongées et remontées, et les plus grands déplacements : au
  plus quatre, le reste compté ;
- un déplacement « avance » vers le but adverse, « recule » vers le sien,
  « se décale » sur le côté. Le sens d'attaque de chaque équipe est lu sur
  la première étape, car une phase peut être dessinée les Blancs à droite
  (« Retourner la phase » échange les ailes, pas les camps) ;
- le prénom quand le schéma en a un, sinon « Blanc 3 ».

**Une phrase par fait** (« Blanc 3 descend au fond. Blanc 3 avance de
4 m. »), plutôt qu'une phrase composée que chaque langue accorderait
autrement. Le module ne connaît que le schéma : les mots viennent du
catalogue, en cinq langues (`useDescribeStep`).

Trois usages :

- **la consigne vide** : « Écrire à partir du tableau » dans l'onglet
  « Étape » la remplit ; on la retouche ensuite ;
- **le lecteur d'écran** : le tableau porte la description de l'étape en
  `aria-describedby`, à l'arrêt seulement, car en lecture la phrase
  changerait sous l'oreille ;
- **l'impression** de la phase et de la séance : une étape sans consigne
  y porte sa description.

## Écarté

- **Remplir les consignes d'office** : une consigne est la voix de
  l'entraîneur. Le texte se propose, il ne s'impose pas.
- **Un modèle de langue** : il faudrait un serveur, et le texte devrait se
  vérifier. Les faits du schéma suffisent à dire qui bouge, où va le palet,
  et qui plonge.
