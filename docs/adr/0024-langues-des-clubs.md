# 0024 — Cinq langues : l'espagnol, le néerlandais et l'allemand des clubs, traduits par une machine

## Contexte

Le hockey subaquatique se joue beaucoup en Colombie, en Espagne, en
Argentine, aux Pays-Bas et en Allemagne. L'application parlait français et
anglais (ADR 0003) ; l'anglais se charge à la demande depuis le 20/11/2026,
dans son propre morceau, pour que l'accueil ne porte que le français.

Ce qui existait déjà : les libellés des composants du socle en espagnol, en
néerlandais et en allemand, et un fournisseur `createI18n` qui monte les
sept langues du socle.

Ce qui a été mesuré avant d'écrire :

- **Le préchargé : 239,2 kB gzip**, sous une borne de 246. Un catalogue pèse
  11 à 12 kB gzip : trois de plus dans l'accueil, et la borne sautait.
- **Les règlements traduits.** La FEDAS publie la 10ᵉ édition du règlement
  CMAS en espagnol (2011), la NOB la 10.05 en néerlandais (2012). **Le VDST
  ne publie que l'anglais** : en Allemagne, on lit le règlement en anglais,
  et le vocabulaire allemand vient des clubs.
- **Les gestes et la tactique ne sont écrits nulle part** dans ces trois
  langues : ni le flick droit, ni le crochet, ni la sortie de mur, ni
  l'écran. Les joueurs les disent sans doute en anglais. C'est une
  hypothèse, pas un relevé.

## Décision

**Trois catalogues, `messages.es.ts`, `messages.nl.ts` et
`messages.de.ts`, typés `Messages` et chargés à la demande comme
l'anglais.** Le français reste dans l'accueil, langue de repli.
`initialLocale` reconnaît les cinq langues : `dwc_locale`, puis
`navigator.languages`. Le fournisseur du socle pose `<html lang>`.

**Le vocabulaire suit chaque fédération quand elle a écrit, les clubs
sinon.** Un mot que les joueurs disent en anglais reste en anglais.

| Notion            | Espagnol                | Néerlandais             | Allemand                    |
| ----------------- | ----------------------- | ----------------------- | --------------------------- |
| palet             | disco                   | puck                    | Puck                        |
| crosse            | stick                   | stick                   | Schläger                    |
| flick             | flick                   | flick                   | Flick                       |
| schéma            | jugada                  | tactiek                 | Spielzug                    |
| séance            | sesión                  | training                | Training                    |
| engagement        | salida                  | start                   | Spielbeginn                 |
| palet neutre      | entre dos               | scheidsrechterspuck     | neutraler Puck (Equal Puck) |
| palet d'avantage  | disco en ventaja        | vrije puck              | Freistoß                    |
| coup franc        | falta a favor           | vrije puck              | Freistoß                    |
| tir de pénalité   | tiro de penalti         | strafpuck               | Penalty                     |
| temps mort        | tiempo muerto           | time-out                | Auszeit                     |
| arbitre de bord   | árbitro principal       | hoofdscheidsrechter     | Hauptschiedsrichter         |
| arbitre aquatique | árbitro acuático        | waterscheidsrechter     | Wasserschiedsrichter        |
| remplaçant        | suplente                | wisselspeler            | Wechselspieler              |
| avants (sigles)   | delanteros (DI, DC, DD) | aanvallers (LV, MV, RV) | Stürmer (LS, MS, RS)        |
| pivots            | pívots (PI, PD)         | halfs (LH, RH)          | Pivots (LP, RP)             |
| arrière           | defensa (DF)            | achterste man (A)       | Verteidiger (V)             |
| Blancs, Noirs     | Blancos, Negros         | Wit, Zwart              | Weiß, Schwarz               |

Restent en anglais : « stick » et « flick » en espagnol ; « puck »,
« stick », « flick », « sandwich » et « time-out » en néerlandais ;
« Puck », « Flick », « Sandwich » et « Penalty » en allemand. En allemand,
« Equal Puck » et « Advantage Puck » accompagnent aussi le nom allemand
dans le lexique, puisque le règlement s'y lit en anglais.

**Le lexique (`terms.ts`) a les mêmes besoins, et les mêmes choix.** Une
virgule dans un terme sépare des synonymes, et chacun relie la consigne :
« Neutraler Puck, Equal Puck » relie l'un ou l'autre. La palette trouve
aussi un mot par son nom anglais ou français : un joueur allemand qui tape
« free puck » trouve le Freistoß.

**Une liste remplace le contrôle segmenté dans les Réglages.** Cinq codes
(« FR EN ES NL DE ») tenaient encore sur un téléphone. Mais un code ne se
lit que si l'on sait déjà qu'il est le sien. Dans la liste, chaque langue
est nommée dans la sienne (« Deutsch », « Nederlands »), avec `lang`, pour
que le lecteur d'écran la prononce juste. Les noms vivent dans
`i18n/names.ts`, hors de l'accueil.

**La traduction est faite par une machine, et elle le dit.** Ici, et à un
seul endroit de l'écran : la ligne des sources, en bas du lexique. Le
lexique est le seul écran qui prétend enseigner un mot. Or « un faux lien
enseigne le mauvais sens » (`link.ts`). Ailleurs, un libellé maladroit se
corrige par le contexte : un avertissement sur chaque écran serait du bruit.

## Conséquences

**Le préchargé passe de 239,2 à 239,3 kB.** C'est 101 octets gzip, mesurés
fichier par fichier : 90 pour les trois chargeurs et la liste des langues,
19 pour ranger la liste de langues en ligne. Les catalogues pèsent 11,8,
11,8 et 12,3 kB gzip, hors du préchargé. Ils sont dans le précache du
service worker, comme l'anglais : un appareil les télécharge une fois, et
une langue choisie hors ligne s'affiche quand même.

**Le total passe de 700,7 à 742,1 kB, pour une borne de 764.** Le lexique
compte pour 5,4 kB de cette hausse : il passe de 3,7 à 9,1 kB gzip. Il ne
reste que 2,9 % de marge. Chaque clé ajoutée s'écrit désormais cinq fois :
le total est la borne qui rougira la première.

**Une clé s'écrit dans les cinq langues.** Le type refuse un catalogue
incomplet. `node scripts/i18n-cles.mjs` donne, pour chaque langue, les clés
absentes avec le texte français à traduire. `src/i18n/catalogues.test.ts`
refuse aussi une valeur vide, un `{paramètre}` qui n'est pas celui du
français, et une chaîne restée en français sans raison écrite.

**Deux tests figeaient « français et anglais seulement »** : les textes des
exemples (consigne de 280 caractères au plus) et le lexique (définition de
moins de 220). Ils parcourent désormais `LOCALES`. L'allemand est le plus
exposé à ces deux limites.

**Le sens de lecture des compositions est un piège en Colombie.** Là-bas,
on compte de l'arrière vers l'avant : « 1-3-2 », c'est un arrière, trois
milieux, deux avants. L'application lit d'avant en arrière.
`formationHint` le dit en espagnol (« se lee de adelante hacia atrás »).

**Une limite connue : la langue détectée.** `initialLocale` lit toute la
liste `navigator.languages`, le fournisseur du socle seulement
`navigator.language`. Prenons un navigateur réglé en portugais, puis en
espagnol : l'espagnol est chargé, mais l'écran reste en français. Le corriger
revient au socle. On le remontera si une seconde application le rencontre.

**Deux textes sont désormais inexacts : `lexique.intro` et
`plus.lexiqueHint`.** En français et en anglais, ils annoncent un lexique
« en français et en anglais ». Ils n'ont pas été touchés, parce que
d'autres branches écrivent dans ces deux catalogues. On les corrigera à
l'intégration.

## Relecture à faire

**Aucun joueur n'a encore relu ces trois langues.** Il en faut un par pays :
un Colombien et un Espagnol ou un Argentin, un Néerlandais et un Flamand,
un Allemand et un Suisse. Voici les termes dont la traduction n'est pas
sûre.

**Espagnol**

- **Mots qui changent selon le pays :**
  - « disco », qui se dit aussi « pastilla » en Colombie et « tejo » en
    Argentine ;
  - « portería » en Espagne, « arco » en Colombie et en Argentine ;
  - « tiro de penalti » en Espagne, « penal » en Colombie et en Argentine ;
  - « video », écrit « vídeo » en Espagne.
- **« Canaleta » et « rampa »** pour la cuvette et la rampe : le règlement
  espagnol dit « cajón ».
- **« Falta a favor »** pour le coup franc : l'Argentine dit « tiro libre ».
- **« Salida »** pour l'engagement : le règlement dit « comienzo del
  partido ».
- **« Suplente » pour le remplaçant**, parce qu'en Colombie et en
  Argentine « relevo » désigne le remplaçant, et « relevo » sert ici au
  relais.
- **Les postes et leurs sigles** : « delantero izquierdo, centro,
  derecho », « delanteros de banda », « defensa ». Les sigles DI, DC, DD,
  PI, PD et DF sont inventés.
- **Les gestes, qu'aucune source espagnole ne nomme** : « flick », « gancho »,
  « giro », « golpe de riñón » (mot de l'apnée), « inmersión de pies »,
  « pase horizontal », « pantalla », « cobertura », « salida de pared »,
  « cambio de banda », « sándwich ».
- **« Rondo en el medio »** pour le chat au milieu.

**Néerlandais**

- **« Tactiek » pour un schéma** : aucun terme n'est attesté.
- **Les postes et leurs sigles** : « linksvoor », « midvoor »,
  « rechtsvoor », « linkshalf », « rechtshalf », « halfs », « achterste
  man ». Les sigles LV, MV, RV, LH, RH et A sont inventés.
- **Les gestes** : « flick » (les clubs écrivent « schieten »), « haak »,
  « draai », « voeten eerst duiken », « breedtepass », « rugdekking »,
  « aflossing », « vleugelwissel », « wegspelen van de muur ».
- **« Scherm » pour l'écran.** « Afblokken » et « afschermen » sont des
  termes du règlement, dans un autre sens.
- **« Doelbak » et « helling »** : la rampe n'a pas de nom attesté.
- **« Wisselzone »** : la traduction de 2012 dit « wisselbank ».
- **Les règles suivent cette traduction de 2012**, faite sur la 10ᵉ
  édition. Les arbitres disent peut-être aujourd'hui « equal puck ».
- **« Apneu »**, qui s'écrit « apnea » en Flandre.
- **« Lummelen »** pour le chat au milieu.

**Allemand**

- **Les termes de règlement, faute de texte allemand** : « neutraler Puck »,
  « Penaltypunkt », « Torraum », « Penaltyraum », « Torlinie » et
  « Stirnwand ».
- **« Freistoß »** sert au coup franc comme au palet d'avantage : les clubs
  n'ont qu'un mot.
- **« Pivot »**, faute de terme allemand.
- **Les autres postes et leurs sigles** : « Verteidiger » pour le poste,
  « Abwehrspieler » pour un défenseur quelconque, « Außenstürmer ». Les
  sigles LS, MS, RS, LP, RP et V sont inventés.
- **« Schläger »**, qui se dit « Stick » en Suisse.
- **Les gestes** : « Haken », « Wende » (les clubs disent aussi « Curl »),
  « Querpass », « Abschirmen », « Absicherung », « Ablösung »,
  « Flügelwechsel », « Befreiung von der Wand », « Flicken und
  nachsetzen ».
- **« Schweinchen in der Mitte »** pour le chat au milieu.
- **Le tutoiement**, choisi comme dans les clubs.
- **L'orthographe suisse** (« ss » pour « ß ») n'est pas traitée.

## Ce qu'on écarte

**Un avertissement de traduction automatique sur chaque écran.** C'est du
bruit : un bouton mal nommé se comprend par ce qu'il fait. Le lexique, lui,
enseigne.

**Garder le contrôle segmenté.** Il tenait en largeur, mais il ne se lisait
pas.

**Des variantes régionales (es-CO, es-AR, de-CH).** `localeTags` épinglerait
les formats, pas le vocabulaire : « arco » ou « portería » demanderait un
catalogue de plus. On garde un espagnol neutre, jusqu'à ce qu'un club le
demande.

**Mettre les catalogues dans l'accueil.** Ce serait 36 kB préchargés pour
un visiteur qui n'en lit qu'un.

**Attendre la relecture pour livrer.** Un club colombien lit mieux un
espagnol à corriger qu'un français qu'il ne lit pas. Et la liste ci-dessus
dit au relecteur où regarder d'abord.

## Suivi

- **21/11/2026** — **Les trois catalogues rattrapent le français : 57 clés
  de plus par langue.** Quatre fonctionnalités avaient écrit leurs textes en
  français et en anglais seulement : le carnet de jeu (ADR 0023), « À toi de
  jouer » (ADR 0022), les nages courbes (ADR 0019) et l'enregistrement en
  direct (ADR 0025). Le projet ne compilait plus. Elles sont traduites par la
  même machine, avec le vocabulaire de la table ci-dessus.

  - **Le registre de chaque catalogue l'emporte sur celui du français.** En
    français, « À toi de jouer » tutoie et ses consignes vouvoient. Les
    trois catalogues tutoient partout (« tú », « je », « du ») : les
    consignes tutoient aussi.
  - **`lexique.intro` et `plus.lexiqueHint` disent « en cinq langues »**,
    dans les cinq catalogues. L'espagnol, le néerlandais et l'allemand ne
    nommaient aucune langue (« con su definición ») ; ils disent maintenant
    la même chose que le français.
  - **Le relevé local** : 754,2 kB au total pour une borne de 764, soit
    1,3 % de marge ; 243,2 kB préchargés sur 246. Les catalogues pèsent
    12,6 (espagnol), 12,7 (néerlandais) et 13,1 kB gzip (allemand), hors du
    préchargé. Le total reste la borne qui rougira la première.
  - **À faire relire, en plus de la liste ci-dessus :**
    - **Espagnol**
      - « cuaderno de jugadas » pour le carnet : « libro de jugadas »
        traduit d'ordinaire « playbook », mais il dit un recueil, pas
        l'envoi de la semaine ;
      - « grabación en vivo », qui se dit « en directo » en Espagne ;
      - « trayecto » pour la nage d'un joueur, « punto de control » pour la
        poignée qui la courbe ;
      - « A repasar » pour le verdict « À revoir ».
    - **Néerlandais**
      - « bundel » et « tactiekbundel » pour le carnet : aucun terme
        attesté, et les clubs disent peut-être « playbook » ;
      - « zwemroute » pour la nage, « greep » pour la poignée ;
      - « live-opname » pour l'enregistrement en direct ;
      - « Nog oefenen » pour « À revoir ».
    - **Allemand**
      - « Sammlung » et « Spielzugsammlung » pour le carnet : peut-être
        « Playbook », ou « Spielzugheft » ;
      - « Schwimmweg biegen » et « begradigen », « Griff » pour la poignée ;
      - « Live-Aufnahme » pour l'enregistrement en direct ;
      - « Noch üben » pour « À revoir ».
