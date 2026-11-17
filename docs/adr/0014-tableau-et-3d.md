# 0014 — Un modèle, deux vues : le tableau en SVG, la 3D en three.js nu

## Contexte

Mister UWH Tactic reprend le principe d'un tableau tactique de hockey
subaquatique — un terrain vu de dessus, des joueurs qu'on déplace, qu'on
oriente, qu'on met en surface ou au fond, des arbitres et leur champ de
vision — et l'enrichit d'une vue en trois dimensions. Le hockey subaquatique
est le seul sport d'équipe où la profondeur fait partie de la tactique : qui
remonte respirer laisse un trou au fond, et un schéma vu de dessus ne le
montre pas.

Trois contraintes du parc pèsent sur la 3D :

- le **budget de poids** : le squelette précharge 169 kB gzip ; three.js seul
  en pèse 150 ;
- la **CSP** du socle, sans `unsafe-eval` ;
- le **hors-ligne** : l'application doit démarrer et fonctionner sans réseau.

## Décision

**Un seul modèle, en mètres, et deux vues qui le lisent.** `model.ts` décrit
le schéma (identités, poses par étape, effectifs, affichage) ; `frame.ts` rend
l'image à un instant donné, interpolée entre deux étapes. Le tableau 2D et la
scène 3D dessinent cette image et rendent leurs gestes au même magasin. Le
tracé du terrain (`pitch.ts`) est écrit une fois et dessiné deux fois : en SVG,
et sur le canevas qui sert de texture au fond du bassin.

**Le tableau est en SVG, pas en canevas.** Chaque jeton est un élément du DOM :
il porte un rôle, un nom accessible, le focus clavier, et se teste avec
Testing Library. Le terrain se dresse sous 640 px de large.

**La 3D est en three.js nu**, sans React Three Fiber ni drei. La scène est un
objet impératif (`scene3d.ts`) que `Pool3D` crée, nourrit et détruit. Elle ne
possède aucun état métier.

**La 3D est un morceau à part**, chargé par `lazy()`, préchargé au repos
(`useIdlePrefetch`) avec le même thunk, et présent dans le précache du service
worker. La bascule 2D → 3D se fait dans une transition : le tableau reste à
l'écran tant que la scène n'est pas prête.

## Conséquences

- Le total gzip passe de 419 à 586 kB ; le préchargé de 169 à 187 kB, et ce
  sont le tableau et ses textes, pas three.js.
- three.js ne demande ni `eval` ni `wasm` : la CSP du socle n'a pas bougé.
- Sans WebGL, la vue 3D le dit et le tableau 2D reste entier.
- `prefers-reduced-motion` fige la houle, les caustiques et les battements de
  palmes, et rend les mouvements de caméra instantanés.
- **Désagréable** : une scène impérative ne se teste pas en jsdom. Ce qui
  compte s'y prouve ailleurs — l'image (`frame.test.ts`), le tracé
  (`pitch.test.ts`) — et la scène elle-même par un e2e qui l'ouvre sans erreur
  de page. Son rendu ne se vérifie qu'à l'œil.
- **Désagréable** : la scène redessine en continu, comme toute animation
  WebGL. Elle s'arrête quand on quitte la vue 3D (le composant la détruit), et
  le navigateur la ralentit quand l'onglet est caché.

## Écarté

- **React Three Fiber + drei** : une syntaxe déclarative agréable, mais un
  réconciliateur de plus et, avec drei, un poids que le budget ne permet pas
  pour un usage qui tient en quelques primitives.
- **Babylon.js** : moteur complet, deux à trois fois le poids de three.js.
- **Un canevas pour le tableau 2D** : plus rapide à grande échelle, mais quinze
  jetons n'en ont pas besoin, et on y perd l'accessibilité et les tests.
- **Des modèles 3D importés (glTF)** : des nageurs plus réalistes, mais un
  fichier à charger, une licence à vérifier, et une silhouette qu'il faudrait
  re-poser à chaque profondeur. Les primitives suffisent à lire une tactique.
