# 0039 — « Quoi de neuf » : une carte pour qui revient, une fois par lot

## Contexte

Depuis le 20/11/2026, une vingtaine de fonctions sont arrivées (ADR 0019 à
0037). Rien dans l'application ne le dit à l'entraîneur qui revient : les
variantes sont un bouton en forme de branche dans la frise, le lien pour les
joueurs une ligne du menu « ⋯ », le carnet imprimé un bouton de la barre de
sélection, l'effectif et le match deux entrées sous « Plus ».

Ce qui existait déjà sur l'accueil, pour les premières fois :

- **la carte du choix du mode** (ADR 0020), au téléphone, tant qu'aucun mode
  n'est choisi ;
- **le guide de la première phase**, en mode simple, puis l'avis sur le mode
  simple après trois ouvertures ;
- **les premiers pas**, en tête de l'onglet « Étape » du mode complet ;
- **la carte de l'effectif** quand un schéma arrive (ADR 0028).

L'accueil est le tableau et ne défile pas (ADR 0017). Le préchargé était à
246,8 kB, mesuré en local le 23/11/2026, pour une borne de 271.

## Décision

### Ce que la carte montre

**Cinq nouveautés, une ligne chacune, et la ligne est le lien** : son nom
accessible est son texte, la cible fait toute la largeur.

| Ligne                                       | Où elle mène                              |
| ------------------------------------------- | ----------------------------------------- |
| Les variantes : une phase, plusieurs suites | le tableau, « Lignes de la phase » ouvert |
| Le lien pour les joueurs, en présentation   | le tableau, le menu « ⋯ » ouvert          |
| Le carnet imprimé, une phase par page       | la bibliothèque (`/schemas`)              |
| Mon effectif : les prénoms sur les jetons   | « Mon effectif » (`/effectif`)            |
| Le chrono de match et ses temps morts       | « Match » (`/match`)                      |

- **Pourquoi celles-là** : dans l'ordre où un entraîneur s'en sert. Écrire la
  phase et ses suites, l'envoyer aux joueurs, l'emporter sur papier, y mettre
  ses joueurs, puis le match. Les zones, le feutre, les nages courbes,
  l'étape racontée, l'enregistrement en direct, suivre un joueur,
  l'adversaire, les versions se trouvent en se servant du tableau. Les
  langues aussi : la carte est déjà dans celle du lecteur.
- **Quatre en mode simple** : il ne crée pas de variante (ADR 0027), la
  ligne n'y paraît pas.
- **La fonction ouverte, quand c'est le tableau** : la carte est déjà dessus,
  un lien vers lui seul ne mènerait nulle part. Le lien porte une demande
  dans l'état du routeur (`menu`, `lines`, `board/request.ts`), comme la
  présentation d'une séance (`present`). Le tableau l'efface de l'historique,
  puis l'exécute : le menu s'ouvre, ou la frise ouvre ses lignes
  (`openRequest` de `ui/Popover.tsx`).
- **Suivre un lien ne ferme pas la carte** : on revient essayer la suivante.
  La croix (« Masquer les nouveautés ») la ferme.
- **La mesure** : `nouveautes`, avec le lot, le geste (`lien`, `fermee`) et
  la nouveauté. Rien de personnel, rien sans consentement (ADR 0012).

### Où elle se pose

**Au-dessus du terrain, à la place des autres cartes de l'accueil, une à la
fois.** Elle attend que le choix du mode et le guide soient passés. L'avis
sur le mode simple attend qu'elle soit fermée. `BoardScreen` reçoit la carte
en `notice` et décide de l'ordre.

- **Sur grand écran**, les lignes vont côte à côte : deux rangées, 150 px à
  1 280 × 800.
- **Au téléphone**, une colonne, et au plus 45 % de l'espace de travail.
- **Sur un écran étroit OU bas** (moins de 48 rem de large, ou moins de
  50 rem de haut), une seule ligne. Le titre est un bouton qui déplie la
  liste (`aria-expanded`), comme le guide du 21/11/2026 est passé à une
  ligne. Mesuré à 375 × 667 en mode complet, la carte dépliée laissait 44 px
  au terrain ; repliée, elle lui en laisse 218. Et à 1 024 × 768, la tablette
  en paysage du bord du bassin, dépliée, elle prenait 194 px de haut au
  tableau, qui se règle sur la hauteur : l'un des deux suffit à la replier.

Les composants sont ceux du socle : `Card`, `CardHeader`, `Button`. Le lien
prend `.uwh-link`, la teinte d'accent : 6,1:1 sur la surface en clair, 8,2:1
en sombre (AA demande 4,5).

### Le lot, pas la version

**`LOT = '2026-11'`** (`nouveautes/model.ts`). Le magasin versionné du socle
garde le dernier lot réglé, `{ seen }`, sous `mister-uwh-tacticnouveautes`
(préfixe et clé collés, comme l'effectif). Fermer la carte règle le lot. Elle
revient quand `LOT` change, et seulement alors : l'application se publie
plusieurs fois par jour.

### Le signal de l'entraîneur qui revient

**Décidé une fois, à la première lecture de la page** (`createNews`), avant
que la session n'écrive quoi que ce soit. Lues plus tard, ses propres
écritures feraient passer le nouveau venu pour un habitué : un lien partagé
range un schéma, et le mode simple réécrit le brouillon en six contre six
dès la première ouverture.

Trois issues (`verdict`) :

- **réglé** : ce lot a été fermé, ou reçu en nouveau venu. Rien ;
- **à montrer** : un lot d'avant est réglé, ou l'appareil porte une trace
  d'usage ;
- **nouveau venu** : ni l'un ni l'autre. Rien n'est montré, et **le lot est
  marqué réglé**.

**Une trace d'usage** (`usedBefore`), c'est une clé que seul un geste écrit,
sous le préfixe de l'application :

- un schéma (`schemas`, et `schemas@…` pour un compte), une séance, une
  note ;
- l'effectif, un match, le bassin du club ;
- les premiers pas ou le guide fermés, l'économie d'énergie ;
- ou bien **un brouillon touché depuis sa création** (`updatedAt` différent
  de `createdAt`). C'est la règle qui décide déjà s'il faut demander avant
  de le remplacer (`worthKeeping`).

Ce qui n'en est pas une, et pourquoi :

- **le mode choisi** (`:mode`) : un toucher sur la carte d'accueil. Toute la
  suite e2e le pose d'office (`playwright.config.ts`) : compté, chaque test
  aurait vu la carte ;
- **le brouillon nu** (`tableau`) : le mode simple l'écrit tout seul ;
- **les clés du socle** (`dwc_*`) : elles ne sont pas préfixées, et toute la
  famille partage l'origine. `dwc_app_version` dit qu'une application du
  parc a été ouverte ici, pas celle-ci.

**Le nouveau venu marqué rend le signal plus sûr à chaque lot.** Dès ce
lot-ci, quiconque ouvre l'application a un lot réglé, et sera reconnu au
suivant sans regarder ses traces. Les traces ne servent qu'aux appareils qui
ont servi avant cette carte.

Ses limites :

- **Le lot commence au déploiement de la carte, pas au 20/11.** Un
  entraîneur venu le 22 voit annoncées des fonctions qu'il a peut-être déjà
  trouvées.
- **Par appareil et par navigateur**, comme tout `localStorage`. Un autre
  appareil, des données effacées, et c'est un nouveau venu : pas de carte.
  Sur une tablette de club partagée, le premier qui ferme la carte la ferme
  pour tous.
- **Sans stockage** (navigation privée stricte, données de sites bloquées),
  rien ne se garde : l'appareil est un nouveau venu à chaque ouverture, et ne
  voit jamais la carte.
- **Un brouillon touché compte**, d'où qu'il vienne : un joueur qui a
  retouché une phase reçue par un lien passe pour un entraîneur. Un visiteur
  qui a seulement regardé ne compte pas.

### Le poids

Mesuré avec `npm run build`, sur le même code :

| La carte                   | Préchargé           | Total    |
| -------------------------- | ------------------- | -------- |
| avant la carte             | 246,8 kB            | 790,6 kB |
| dans l'accueil             | 248,0 kB (+1,27 kB) | 792,1 kB |
| **à la demande (retenue)** | 247,5 kB (+0,79 kB) | 792,7 kB |

L'accueil ne porte que la décision (`model.ts`, `store.ts`), les demandes du
tableau et les sept textes français. La carte, la liste (`news.ts`) et leur
feuille de style forment un morceau de 1,4 kB, chargé quand elle paraît, et
dans le précache. Ici, `lazy()` fait baisser le préchargé : la liste suit la
carte, au lieu de rester dans le modèle que l'accueil importe. Laissée dans
`model.ts`, elle ne retirait que 0,16 kB.

### Préparer le lot suivant

1. Changer `LOT` dans `nouveautes/model.ts` : `'2027-01'`, par exemple.
2. Réécrire `NEWS` dans `nouveautes/news.ts` : cinq au plus, chacune avec
   son écran (`to`), la fonction à ouvrir si l'écran sait le faire (`state`),
   et `advancedOnly` si le mode simple ne s'en sert pas.
3. Réécrire les textes `news.*` dans les cinq catalogues, puis
   `node scripts/i18n-cles.mjs`, qui doit sortir à 0.
4. Une fonction du tableau à ouvrir en arrivant : un champ de plus dans
   `BoardRequest`, lu par `BoardScreen`. Ailleurs, l'écran le lit dans
   l'état du routeur.
5. Mettre à jour les textes attendus par `HomeScreen.news.test.tsx` et
   `e2e/nouveautes.spec.ts`.

Rien à migrer : un appareil qui a réglé `2026-11` revoit la carte au lot
suivant, et le nouveau venu d'aujourd'hui aussi.

## Conséquences

- L'entraîneur qui revient voit cinq nouveautés, et chacune le mène où l'on
  s'en sert. Le nouveau venu ne voit rien de plus que son guide.
- Le préchargé prend 0,8 kB, et il reste 23,5 kB sous la borne.
- `BoardScreen` sait ouvrir son menu et les lignes de la phase en arrivant,
  et la palette pourra s'en servir.
- **Désagréable** : dépliée sur un téléphone court, la carte prend presque
  tout le terrain le temps qu'on la lise. Elle part repliée pour cette
  raison.
- **Désagréable** : la carte paraît après le premier rendu, le temps de son
  morceau. Le terrain rapetisse une fois, sous les yeux.
- **Désagréable** : le signal est façonné par la suite e2e autant que par
  l'usage. Le mode choisi en est exclu aussi parce que chaque test le pose.

## Écarté

- **Une carte par version de l'application** (`dwc_app_version`) : elle
  reviendrait plusieurs fois par jour, et la clé est celle de toute la
  famille.
- **Une boîte de dialogue** : elle bloque le tableau et prend le focus pour
  une annonce qu'on peut lire plus tard.
- **Une carte posée par-dessus le terrain** au téléphone, hors du flux : le
  terrain ne rapetisse plus, mais elle recouvre des contrôles que le clavier
  atteint encore (WCAG 2.4.11, AA).
- **Dans l'onglet « Étape »**, comme les premiers pas : invisible en mode
  simple, qui n'a pas d'onglets, et au téléphone, où la feuille est fermée.
- **Les vingt fonctions**, ou une page des nouveautés : une liste qu'on ne
  lit pas, et un écran de plus à tenir dans cinq langues.
