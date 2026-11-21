import type { Locale } from '../../i18n/index.ts';

/**
 * LE LEXIQUE DU HOCKEY SUBAQUATIQUE, dans les cinq langues de l'application.
 *
 * Les termes sont ceux des documents de formation que l'utilisateur a
 * fournis (fiches du CIBPL-FFESSM pour l'initiateur, « Fondamentaux
 * techniques et tactiques », « Tactique de base du hockey subaquatique »,
 * guide du débutant de la Tasmanian Underwater Hockey Association, manuel de
 * la Wellington Underwater Hockey Association) et le règlement fédéral pour
 * le but. Les définitions sont RÉÉCRITES, en une ou deux phrases : aucune
 * n'est recopiée — ces documents ne portent pas de licence.
 *
 * L'ESPAGNOL, LE NÉERLANDAIS ET L'ALLEMAND SONT TRADUITS PAR UNE MACHINE et
 * attendent la relecture d'un joueur de chaque pays (ADR 0024). Les termes
 * de règlement suivent la traduction de chaque fédération quand elle existe
 * (FEDAS, NOB ; le VDST ne publie que l'anglais). Restent en anglais, parce
 * que les joueurs les disent ainsi : « stick » et « flick » en espagnol ;
 * « puck », « stick », « flick », « sandwich » et « time-out » en
 * néerlandais ; « Puck », « Flick », « Sandwich » et « Penalty » en
 * allemand, où « Equal Puck » et « Advantage Puck » suivent aussi le nom
 * allemand, le règlement n'étant lu là-bas qu'en anglais. Une virgule dans
 * un terme sépare des synonymes : chacun relie la consigne (`link.ts`).
 *
 * Une donnée et non des messages : quarante définitions dans `messages.ts`
 * y noieraient l'interface, et elles ne servent qu'à cet écran.
 */
export const TERM_GROUPS = ['gestes', 'collectif', 'postes', 'regles'] as const;
export type TermGroup = (typeof TERM_GROUPS)[number];

/** Un terme et sa définition, dans une langue. */
export interface TermEntry {
  term: string;
  definition: string;
}

export type Term = { id: string; group: TermGroup } & Record<Locale, TermEntry>;

export const TERMS: readonly Term[] = [
  // ── Les gestes ────────────────────────────────────────────────────────
  {
    id: 'tir-droit',
    group: 'gestes',
    fr: {
      term: 'Tir droit',
      definition:
        'Lever le palet devant soi d’un coup de poignet, pour qu’il passe au-dessus d’un adversaire.',
    },
    en: {
      term: 'Straight flick',
      definition:
        'Lifting the puck forward with a flick of the wrist so it clears an opponent.',
    },
    es: {
      term: 'Flick recto',
      definition:
        'Levantar el disco hacia delante con un golpe de muñeca, para que pase por encima de un rival.',
    },
    nl: {
      term: 'Rechte flick',
      definition:
        'De puck met een polsbeweging recht vooruit optillen, zodat hij over een tegenstander heen gaat.',
    },
    de: {
      term: 'Flick nach vorn',
      definition:
        'Den Puck mit einer Bewegung aus dem Handgelenk nach vorn anheben, damit er über einen Gegner fliegt.',
    },
  },
  {
    id: 'tir-lateral',
    group: 'gestes',
    fr: {
      term: 'Tir latéral',
      definition:
        'Le même geste vers le côté, pour changer d’axe ou servir un partenaire.',
    },
    en: {
      term: 'Side flick',
      definition:
        'The same stroke sideways, to change direction or feed a teammate.',
    },
    es: {
      term: 'Flick lateral',
      definition:
        'El mismo gesto hacia un lado, para cambiar de eje o servir a un compañero.',
    },
    nl: {
      term: 'Zijwaartse flick',
      definition:
        'Dezelfde beweging opzij, om van richting te veranderen of een teamgenoot te bedienen.',
    },
    de: {
      term: 'Seitlicher Flick',
      definition:
        'Dieselbe Bewegung zur Seite, um die Richtung zu wechseln oder einen Mitspieler zu bedienen.',
    },
  },
  {
    id: 'tir-arriere',
    group: 'gestes',
    fr: {
      term: 'Tir arrière',
      definition:
        'Lever le palet derrière soi, vers un coéquipier placé en soutien.',
    },
    en: {
      term: 'Back flick',
      definition: 'Lifting the puck behind you, to a supporting teammate.',
    },
    es: {
      term: 'Flick hacia atrás',
      definition:
        'Levantar el disco detrás de uno, hacia un compañero colocado en apoyo.',
    },
    nl: {
      term: 'Achterwaartse flick',
      definition:
        'De puck achter je optillen, naar een teamgenoot die je ondersteunt.',
    },
    de: {
      term: 'Rückwärts-Flick',
      definition:
        'Den Puck hinter sich anheben, zu einem Mitspieler, der absichert.',
    },
  },
  {
    id: 'tirer-a-suivre',
    group: 'gestes',
    fr: {
      term: 'Tirer à suivre',
      definition:
        'Lever le palet puis nager dessus pour le reprendre soi-même.',
    },
    en: {
      term: 'Flick and chase',
      definition:
        'Flicking the puck, then swimming after it to win it back yourself.',
    },
    es: {
      term: 'Flick y seguir',
      definition:
        'Levantar el disco y nadar tras él para recuperarlo uno mismo.',
    },
    nl: {
      term: 'Flicken en nazwemmen',
      definition:
        'De puck optillen en er dan achteraan zwemmen om hem zelf terug te winnen.',
    },
    de: {
      term: 'Flicken und nachsetzen',
      definition:
        'Den Puck anheben und ihm dann nachschwimmen, um ihn selbst zurückzuholen.',
    },
  },
  {
    id: 'crochet',
    group: 'gestes',
    fr: {
      term: 'Crochet',
      definition:
        'Ramener ou protéger le palet avec le bout recourbé de la crosse. Avancer en le protégeant crochet en arrière est sanctionné comme obstruction.',
    },
    en: {
      term: 'Hook',
      definition:
        'Drawing or shielding the puck with the curved end of the stick. Moving forward while shielding it behind you counts as obstruction.',
    },
    es: {
      term: 'Gancho',
      definition:
        'Atraer o proteger el disco con la punta curva del stick. Avanzar protegiéndolo con el gancho hacia atrás se sanciona como obstrucción.',
    },
    nl: {
      term: 'Haak',
      definition:
        'De puck naar je toe halen of afschermen met het gebogen uiteinde van de stick. Vooruitgaan terwijl je hem achter je afschermt, geldt als obstructie.',
    },
    de: {
      term: 'Haken',
      definition:
        'Den Puck mit dem gebogenen Ende des Schlägers heranziehen oder abschirmen. Wer ihn so hinter sich abschirmt und vorwärts schwimmt, begeht eine Behinderung.',
    },
  },
  {
    id: 'retourne',
    group: 'gestes',
    fr: {
      term: 'Retourné',
      definition:
        'Un demi-tour avec le palet, pour repartir dans l’autre sens.',
    },
    en: {
      term: 'Turn',
      definition: 'A half-turn with the puck, to set off the other way.',
    },
    es: {
      term: 'Giro',
      definition:
        'Una media vuelta con el disco, para salir en el otro sentido.',
    },
    nl: {
      term: 'Draai',
      definition: 'Een halve draai met de puck, om de andere kant op te gaan.',
    },
    de: {
      term: 'Wende',
      definition:
        'Eine halbe Drehung mit dem Puck, um in die andere Richtung zu starten.',
    },
  },
  {
    id: 'canard',
    group: 'gestes',
    fr: {
      term: 'Canard',
      definition:
        'Plongeon tête la première, le plus rapide pour rejoindre une action en mouvement.',
    },
    en: {
      term: 'Duck dive',
      definition: 'A head-first dive, the fastest way to join moving play.',
    },
    es: {
      term: 'Golpe de riñón',
      definition:
        'Inmersión de cabeza, la más rápida para unirse a una acción en movimiento.',
    },
    nl: {
      term: 'Eendenduik',
      definition:
        'Duiken met het hoofd eerst, de snelste manier om bij een bewegende actie te komen.',
    },
    de: {
      term: 'Kopfwärts abtauchen',
      definition:
        'Mit dem Kopf voran abtauchen: der schnellste Weg in eine laufende Aktion.',
    },
  },
  {
    id: 'phoque',
    group: 'gestes',
    fr: {
      term: 'Phoque',
      definition:
        'Plongeon les pieds d’abord, pour descendre droit sur un point fixe : un entre-deux, un coup franc.',
    },
    en: {
      term: 'Feet-first dive',
      definition:
        'A feet-first dive, to drop straight onto a fixed point such as a neutral restart or free puck.',
    },
    es: {
      term: 'Inmersión de pies',
      definition:
        'Inmersión con los pies por delante, para bajar recto a un punto fijo: un entre dos, una falta a favor.',
    },
    nl: {
      term: 'Voeten eerst duiken',
      definition:
        'Duiken met de voeten eerst, om recht naar een vast punt te zakken: een scheidsrechterspuck, een vrije puck.',
    },
    de: {
      term: 'Fußwärts abtauchen',
      definition:
        'Mit den Füßen voran abtauchen, um gerade auf einen festen Punkt zu sinken: neutraler Puck, Freistoß.',
    },
  },
  {
    id: 'passe-a-plat',
    group: 'gestes',
    fr: {
      term: 'Passe à plat',
      definition:
        'Une passe entre deux joueurs côte à côte. Une seule interception les élimine tous les deux : à éviter.',
    },
    en: {
      term: 'Flat pass',
      definition:
        'A pass between two players level with each other. One block takes both out: avoid it.',
    },
    es: {
      term: 'Pase horizontal',
      definition:
        'Un pase entre dos jugadores a la misma altura. Una sola intercepción los elimina a los dos: hay que evitarlo.',
    },
    nl: {
      term: 'Breedtepass',
      definition:
        'Een pass tussen twee spelers naast elkaar. Eén onderschepping schakelt ze allebei uit: te vermijden.',
    },
    de: {
      term: 'Querpass',
      definition:
        'Ein Pass zwischen zwei Spielern auf gleicher Höhe. Ein einziges Abfangen schaltet beide aus: vermeiden.',
    },
  },
  {
    id: 'passe-longue-courte',
    group: 'gestes',
    fr: {
      term: 'Passe longue, passe courte',
      definition:
        'La longue indique la direction à prendre ; la courte, dans la crosse, prévient d’un danger.',
    },
    en: {
      term: 'Long pass, short pass',
      definition:
        'A long pass shows the way forward; a short one into the stick warns of danger.',
    },
    es: {
      term: 'Pase largo, pase corto',
      definition:
        'El largo indica la dirección que tomar; el corto, al stick, avisa de un peligro.',
    },
    nl: {
      term: 'Lange pass, korte pass',
      definition:
        'De lange geeft de richting aan; de korte, in de stick, waarschuwt voor gevaar.',
    },
    de: {
      term: 'Langer Pass, kurzer Pass',
      definition:
        'Der lange zeigt die Richtung an; der kurze, in den Schläger, warnt vor einer Gefahr.',
    },
  },
  // ── Le jeu collectif ──────────────────────────────────────────────────
  {
    id: 'relais',
    group: 'collectif',
    fr: {
      term: 'Relais',
      definition:
        'Le porteur bloqué donne au coéquipier derrière lui, remonte respirer, puis revient derrière pour le relais suivant.',
    },
    en: {
      term: 'Relay',
      definition:
        'The blocked carrier passes to the teammate behind, surfaces to breathe, then comes back behind for the next relay.',
    },
    es: {
      term: 'Relevo',
      definition:
        'El portador bloqueado pasa al compañero que tiene detrás, sube a respirar y vuelve detrás de él para el relevo siguiente.',
    },
    nl: {
      term: 'Aflossing',
      definition:
        'De vastgezette puckdrager geeft af aan de teamgenoot achter hem, gaat ademhalen en komt terug achter hem voor de volgende aflossing.',
    },
    de: {
      term: 'Ablösung',
      definition:
        'Der blockierte Puckführer gibt an den Mitspieler hinter ihm ab, taucht zum Atmen auf und kommt für die nächste Ablösung hinter ihn zurück.',
    },
  },
  {
    id: 'changement-d-aile',
    group: 'collectif',
    fr: {
      term: 'Changement d’aile',
      definition:
        'Faire repasser le palet par l’arrière pour attaquer de l’autre côté, quand la défense est collée à un mur.',
    },
    en: {
      term: 'Switching wings',
      definition:
        'Moving the puck back through the team to attack on the other side while the defence is pinned on one wall.',
    },
    es: {
      term: 'Cambio de banda',
      definition:
        'Hacer volver el disco por atrás para atacar por el otro lado, cuando la defensa está pegada a una pared.',
    },
    nl: {
      term: 'Vleugelwissel',
      definition:
        'De puck via achteren terugspelen om aan de andere kant aan te vallen, als de verdediging tegen één muur kleeft.',
    },
    de: {
      term: 'Flügelwechsel',
      definition:
        'Den Puck über hinten zurückspielen, um auf der anderen Seite anzugreifen, wenn die Abwehr an einer Wand klebt.',
    },
  },
  {
    id: 'sortie-de-mur',
    group: 'collectif',
    fr: {
      term: 'Sortie de mur',
      definition:
        'Faire sortir le palet de la bataille contre le mur, vers l’arrière ou l’avant-centre.',
    },
    en: {
      term: 'Wall break-out',
      definition:
        'Getting the puck out of the fight along the wall, to the back or the centre forward.',
    },
    es: {
      term: 'Salida de pared',
      definition:
        'Sacar el disco de la lucha contra la pared, hacia el defensa o el delantero centro.',
    },
    nl: {
      term: 'Wegspelen van de muur',
      definition:
        'De puck uit het gevecht langs de muur halen, naar de achterste man of de midvoor.',
    },
    de: {
      term: 'Befreiung von der Wand',
      definition:
        'Den Puck aus dem Kampf an der Wand herausspielen, zum Verteidiger oder zum Mittelstürmer.',
    },
  },
  {
    id: 'sandwich',
    group: 'collectif',
    fr: {
      term: 'Sandwich',
      definition:
        'Deux joueurs se referment de part et d’autre du porteur pour lui prendre le palet au passage.',
    },
    en: {
      term: 'Sandwich',
      definition:
        'Two players close in on either side of the carrier to take the puck as he passes.',
    },
    es: {
      term: 'Sándwich',
      definition:
        'Dos jugadores se cierran a ambos lados del portador para quitarle el disco al pasar.',
    },
    nl: {
      term: 'Sandwich',
      definition:
        'Twee spelers sluiten de puckdrager van weerszijden in om hem de puck afhandig te maken.',
    },
    de: {
      term: 'Sandwich',
      definition:
        'Zwei Spieler schließen den Puckführer von beiden Seiten ein, um ihm im Vorbeischwimmen den Puck abzunehmen.',
    },
  },
  {
    id: 'ecran',
    group: 'collectif',
    fr: {
      term: 'Écran',
      definition:
        'Se placer entre un adversaire et le palet, de face ou par l’arrière, pour le ralentir.',
    },
    en: {
      term: 'Screen',
      definition:
        'Getting between an opponent and the puck, from the front or behind, to slow him down.',
    },
    es: {
      term: 'Pantalla',
      definition:
        'Ponerse entre un rival y el disco, de frente o por detrás, para frenarlo.',
    },
    nl: {
      term: 'Scherm',
      definition:
        'Je tussen een tegenstander en de puck plaatsen, van voren of van achteren, om hem af te remmen.',
    },
    de: {
      term: 'Abschirmen',
      definition:
        'Sich zwischen einen Gegner und den Puck schieben, von vorn oder von hinten, um ihn zu bremsen.',
    },
  },
  {
    id: 'couverture',
    group: 'collectif',
    fr: {
      term: 'Couverture',
      definition:
        'Le rôle du dernier défenseur : retarder l’attaquant pendant que les autres se replacent.',
    },
    en: {
      term: 'Cover',
      definition:
        'The last defender’s job: holding up the attacker while the others get back.',
    },
    es: {
      term: 'Cobertura',
      definition:
        'La tarea del último defensor: retrasar al atacante mientras los demás se recolocan.',
    },
    nl: {
      term: 'Rugdekking',
      definition:
        'De taak van de laatste verdediger: de aanvaller ophouden terwijl de anderen zich terugtrekken.',
    },
    de: {
      term: 'Absicherung',
      definition:
        'Die Aufgabe des letzten Abwehrspielers: den Angreifer aufhalten, während die anderen sich neu ordnen.',
    },
  },
  {
    id: 'jeu-ouvert-ferme',
    group: 'collectif',
    fr: {
      term: 'Jeu ouvert, jeu fermé',
      definition:
        'Ouvrir, c’est relancer vers le centre ; fermer, c’est garder le palet contre le mur. On choisit selon le score et le temps.',
    },
    en: {
      term: 'Open and closed play',
      definition:
        'Opening means moving the puck towards the centre; closing means keeping it on the wall. The score and the clock decide.',
    },
    es: {
      term: 'Juego abierto, juego cerrado',
      definition:
        'Abrir es relanzar hacia el centro; cerrar es mantener el disco contra la pared. Se elige según el marcador y el tiempo.',
    },
    nl: {
      term: 'Open spel, gesloten spel',
      definition:
        'Openen is naar het midden spelen; sluiten is de puck tegen de muur houden. De stand en de tijd beslissen.',
    },
    de: {
      term: 'Offenes Spiel, geschlossenes Spiel',
      definition:
        'Öffnen heißt, zur Mitte zu spielen; schließen heißt, den Puck an der Wand zu halten. Spielstand und Zeit entscheiden.',
    },
  },
  {
    id: 'apnee-courte',
    group: 'collectif',
    fr: {
      term: 'Apnée de jeu',
      definition:
        'Quelques secondes au fond, cinq à dix au plus : on plonge pour une action, on remonte, on replonge. L’hyperventilation est inutile et dangereuse.',
    },
    en: {
      term: 'Playing breath-hold',
      definition:
        'A few seconds down, five to ten at most: dive for one action, surface, dive again. Hyperventilating is useless and dangerous.',
    },
    es: {
      term: 'Apnea de juego',
      definition:
        'Unos segundos en el fondo, de cinco a diez como mucho: se baja para una acción, se sube, se vuelve a bajar. Hiperventilar es inútil y peligroso.',
    },
    nl: {
      term: 'Spelapneu',
      definition:
        'Een paar seconden op de bodem, vijf tot tien hoogstens: duiken voor één actie, naar boven, opnieuw duiken. Hyperventileren is zinloos en gevaarlijk.',
    },
    de: {
      term: 'Spiel-Apnoe',
      definition:
        'Ein paar Sekunden am Boden, höchstens fünf bis zehn: für eine Aktion abtauchen, auftauchen, wieder abtauchen. Hyperventilieren ist nutzlos und gefährlich.',
    },
  },
  // ── Les postes ────────────────────────────────────────────────────────
  {
    id: 'avants',
    group: 'postes',
    fr: {
      term: 'AG, AC, AD — les avants',
      definition:
        'Ailier gauche, avant-centre, ailier droit. Les ailiers écartent le jeu par les côtés ; l’avant-centre lie les lignes et distribue.',
    },
    en: {
      term: 'Forwards (LW, CF, RW)',
      definition:
        'Left wing, centre forward, right wing. The wings spread play down the sides; the centre forward links the lines and distributes.',
    },
    es: {
      term: 'DI, DC, DD — los delanteros',
      definition:
        'Delantero izquierdo, centro y derecho. Los de banda abren el juego por los lados; el delantero centro une las líneas y distribuye.',
    },
    nl: {
      term: 'LV, MV, RV — de aanvallers',
      definition:
        'Linksvoor, midvoor, rechtsvoor. De twee buitenste spreiden het spel over de zijkanten; de midvoor verbindt de linies en verdeelt.',
    },
    de: {
      term: 'LS, MS, RS — die Stürmer',
      definition:
        'Linker Stürmer, Mittelstürmer, rechter Stürmer. Die Außenstürmer ziehen das Spiel über die Seiten auseinander; der Mittelstürmer verbindet die Reihen und verteilt.',
    },
  },
  {
    id: 'pivots',
    group: 'postes',
    fr: {
      term: 'PG, PD — les pivots',
      definition:
        'Pivot gauche et pivot droit, chacun responsable de son mur. Le pivot opposé à l’action se tient en couverture.',
    },
    en: {
      term: 'Pivots (LP, RP)',
      definition:
        'Left and right pivot, each responsible for one wall. The pivot away from the play stays in cover.',
    },
    es: {
      term: 'PI, PD — los pívots',
      definition:
        'Pívot izquierdo y pívot derecho, cada uno responsable de su pared. El pívot del lado contrario a la acción se queda en cobertura.',
    },
    nl: {
      term: 'LH, RH — de halfs',
      definition:
        'Linkshalf en rechtshalf, elk verantwoordelijk voor een muur. De half aan de andere kant dan de actie blijft in rugdekking.',
    },
    de: {
      term: 'LP, RP — die Pivots',
      definition:
        'Linker und rechter Pivot, jeder für seine Wand zuständig. Der Pivot auf der Seite fern der Aktion bleibt zur Absicherung.',
    },
  },
  {
    id: 'arriere',
    group: 'postes',
    fr: {
      term: 'AR — l’arrière',
      definition:
        'Le pilier de l’équipe : il voit tout le jeu, soutient le pivot engagé, distribue et surveille les contre-attaques.',
    },
    en: {
      term: 'Back',
      definition:
        'The team’s anchor: sees the whole game, supports the pivot in action, distributes and watches for counter-attacks.',
    },
    es: {
      term: 'DF — el defensa',
      definition:
        'El pilar del equipo: ve todo el juego, apoya al pívot que entra, distribuye y vigila los contraataques.',
    },
    nl: {
      term: 'A — de achterste man',
      definition:
        'De pijler van het team: ziet het hele spel, steunt de half die erop afgaat, verdeelt en let op counters.',
    },
    de: {
      term: 'V — der Verteidiger',
      definition:
        'Der Pfeiler der Mannschaft: sieht das ganze Spiel, unterstützt den angreifenden Pivot, verteilt und achtet auf Konter.',
    },
  },
  {
    id: 'droitier-gaucher',
    group: 'postes',
    fr: {
      term: 'Droitier, gaucher',
      definition:
        'Un droitier joue de préférence à gauche, un gaucher à droite : l’angle de tir s’ouvre vers le centre.',
    },
    en: {
      term: 'Right- and left-handed',
      definition:
        'A right-hander usually plays on the left, a left-hander on the right: the shooting angle opens towards the centre.',
    },
    es: {
      term: 'Diestro, zurdo',
      definition:
        'Un diestro juega preferentemente a la izquierda, un zurdo a la derecha: el ángulo de tiro se abre hacia el centro.',
    },
    nl: {
      term: 'Rechtshandig, linkshandig',
      definition:
        'Een rechtshandige speelt bij voorkeur links, een linkshandige rechts: de schiethoek opent zich naar het midden.',
    },
    de: {
      term: 'Rechtshänder, Linkshänder',
      definition:
        'Ein Rechtshänder spielt am liebsten links, ein Linkshänder rechts: Der Schusswinkel öffnet sich zur Mitte.',
    },
  },
  // ── Les règles et l'arbitrage ─────────────────────────────────────────
  {
    id: 'engagement',
    group: 'regles',
    fr: {
      term: 'Engagement',
      definition:
        'Le départ, au début de chaque mi-temps et après un but : chaque équipe contre son mur, une main sur la ligne de but, le palet au centre.',
    },
    en: {
      term: 'Kick-off',
      definition:
        'The start of each half and the restart after a goal: each team against its wall, a hand on the goal line, the puck in the middle.',
    },
    es: {
      term: 'Salida',
      definition:
        'El comienzo de cada tiempo y tras un gol: cada equipo contra su pared, una mano en la línea de fondo, el disco en el centro.',
    },
    nl: {
      term: 'Start',
      definition:
        'Het begin van elke helft en na een doelpunt: elk team tegen de eigen achterwand, een hand op de achterlijn, de puck in het midden.',
    },
    de: {
      term: 'Spielbeginn',
      definition:
        'Der Start jeder Halbzeit und nach einem Tor: jede Mannschaft an ihrer Stirnwand, eine Hand auf der Torlinie, der Puck in der Mitte.',
    },
  },
  {
    id: 'entre-deux',
    group: 'regles',
    fr: {
      term: 'Entre-deux',
      definition:
        'Une remise en jeu neutre : le palet au point de la faute, chaque équipe de son côté, tout le monde en surface jusqu’au signal.',
    },
    en: {
      term: 'Neutral restart',
      definition:
        'A neutral restart: the puck at the spot of the foul, each team on its own side, everyone on the surface until the signal.',
    },
    es: {
      term: 'Entre dos',
      definition:
        'Una reanudación neutral: el disco en el lugar de la falta, cada equipo a su lado, todos en la superficie hasta la señal.',
    },
    nl: {
      term: 'Scheidsrechterspuck',
      definition:
        'Een neutrale hervatting: de puck op de plek van de overtreding, elk team aan de eigen kant, iedereen aan de oppervlakte tot het signaal.',
    },
    de: {
      term: 'Neutraler Puck, Equal Puck',
      definition:
        'Eine neutrale Spielfortsetzung: der Puck an der Stelle des Fouls, jede Mannschaft auf ihrer Seite, alle an der Oberfläche bis zum Signal.',
    },
  },
  {
    id: 'coup-franc',
    group: 'regles',
    fr: {
      term: 'Coup franc',
      definition:
        'Le palet est donné à l’équipe qui a subi la faute ; les fautifs reculent de 3 m et elle a 5 secondes pour le prendre.',
    },
    en: {
      term: 'Free puck',
      definition:
        'The puck goes to the team that was fouled; the offenders move 3 m back and the team has 5 seconds to take it.',
    },
    es: {
      term: 'Falta a favor, disco en ventaja',
      definition:
        'El disco se da al equipo que sufrió la falta; los infractores retroceden 3 m y ese equipo tiene 5 segundos para tomarlo.',
    },
    nl: {
      term: 'Vrije puck',
      definition:
        'De puck gaat naar het team dat de overtreding onderging; de overtreders wijken 3 m terug en dat team heeft 5 seconden om hem te nemen.',
    },
    de: {
      term: 'Freistoß, Advantage Puck',
      definition:
        'Der Puck geht an die gefoulte Mannschaft; die Foulenden weichen 3 m zurück, und sie hat 5 Sekunden, um ihn zu nehmen.',
    },
  },
  {
    id: 'penalite',
    group: 'regles',
    fr: {
      term: 'Tir de pénalité',
      definition:
        'Pour une faute qui empêche un but presque sûr : les attaquants partent à 3 m du but, le défenseur une main au mur, 5 secondes pour prendre le palet.',
    },
    en: {
      term: 'Penalty shot',
      definition:
        'For a foul that stops a near-certain goal: the attackers start 3 m from goal, the defender with a hand on the wall, 5 seconds to take the puck.',
    },
    es: {
      term: 'Tiro de penalti',
      definition:
        'Por una falta que impide un gol casi seguro: los atacantes salen a 3 m de la portería, el defensor con una mano en la pared, 5 segundos para tomar el disco.',
    },
    nl: {
      term: 'Strafpuck',
      definition:
        'Voor een overtreding die een bijna zeker doelpunt verhindert: de aanvallers starten op 3 m van het doel, de verdediger met een hand aan de wand, 5 seconden om de puck te nemen.',
    },
    de: {
      term: 'Penalty',
      definition:
        'Für ein Foul, das ein fast sicheres Tor verhindert: Die Angreifer starten 3 m vor dem Tor, der Abwehrspieler mit einer Hand an der Wand, 5 Sekunden, um den Puck zu nehmen.',
    },
  },
  {
    id: 'temps-mort',
    group: 'regles',
    fr: {
      term: 'Temps mort',
      definition: 'Une minute d’arrêt, une fois par mi-temps et par équipe.',
    },
    en: {
      term: 'Time-out',
      definition: 'A one-minute stop, once per half for each team.',
    },
    es: {
      term: 'Tiempo muerto',
      definition: 'Un minuto de parada, una vez por tiempo y por equipo.',
    },
    nl: {
      term: 'Time-out',
      definition: 'Een minuut onderbreking, één keer per helft en per team.',
    },
    de: {
      term: 'Auszeit',
      definition:
        'Eine Minute Unterbrechung, einmal pro Halbzeit und Mannschaft.',
    },
  },
  {
    id: 'exclusion',
    group: 'regles',
    fr: {
      term: 'Exclusion, zone de pénalité',
      definition:
        'Le joueur exclu attend la fin de sa sanction (2 ou 5 minutes, ou le reste du match) dans la zone de pénalité, sans être remplacé.',
    },
    en: {
      term: 'Exclusion, penalty area',
      definition:
        'An excluded player waits out the sanction (2 or 5 minutes, or the rest of the match) in the penalty area and is not replaced.',
    },
    es: {
      term: 'Expulsión, zona de castigo',
      definition:
        'El jugador expulsado espera el final de su sanción (2 o 5 minutos, o el resto del partido) en la zona de castigo, sin ser sustituido.',
    },
    nl: {
      term: 'Tijdstraf, strafbank',
      definition:
        'De uitgesloten speler wacht het einde van zijn straf af (2 of 5 minuten, of de rest van de wedstrijd) op de strafbank, zonder vervangen te worden.',
    },
    de: {
      term: 'Zeitstrafe, Strafbank',
      definition:
        'Der hinausgestellte Spieler wartet das Ende seiner Strafe (2 oder 5 Minuten oder den Rest des Spiels) auf der Strafbank ab und wird nicht ersetzt.',
    },
  },
  {
    id: 'remplacement',
    group: 'regles',
    fr: {
      term: 'Remplacement',
      definition:
        'À tout moment, dans la zone de remplacement : le remplaçant n’entre que lorsque le joueur sortant a les palmes hors de l’eau.',
    },
    en: {
      term: 'Substitution',
      definition:
        'At any time, in the substitution area: the incoming player enters only once the outgoing player’s fins are out of the water.',
    },
    es: {
      term: 'Sustitución',
      definition:
        'En cualquier momento, en la zona de sustitución: el suplente solo entra cuando el jugador que sale tiene las aletas fuera del agua.',
    },
    nl: {
      term: 'Wissel',
      definition:
        'Op elk moment, in de wisselzone: de wisselspeler gaat er pas in als de speler die eruit gaat zijn vinnen boven water heeft.',
    },
    de: {
      term: 'Wechsel',
      definition:
        'Jederzeit, in der Wechselzone: Der Wechselspieler geht erst ins Wasser, wenn der auswechselnde Spieler die Flossen aus dem Wasser hat.',
    },
  },
  {
    id: 'zones',
    group: 'regles',
    fr: {
      term: 'Zone de but, zone de pénalité',
      definition:
        'Les deux arcs devant chaque but : 3 m (trait plein) et 6 m (pointillé). Le point de pénalité est à 3 m du milieu de la ligne de but.',
    },
    en: {
      term: 'Goal area, penalty area',
      definition:
        'The two arcs in front of each goal: 3 m (solid) and 6 m (dashed). The penalty spot is 3 m from the middle of the goal line.',
    },
    es: {
      term: 'Área de gol, área de penalti',
      definition:
        'Los dos arcos delante de cada portería: 3 m (trazo continuo) y 6 m (discontinuo). El punto de penalti está a 3 m del centro de la línea de fondo.',
    },
    nl: {
      term: 'Doelgebied, strafpuckgebied',
      definition:
        'De twee bogen voor elk doel: 3 m (doorgetrokken) en 6 m (gestippeld). De strafpuckstip ligt op 3 m van het midden van de achterlijn.',
    },
    de: {
      term: 'Torraum, Penaltyraum',
      definition:
        'Die beiden Bögen vor jedem Tor: 3 m (durchgezogen) und 6 m (gestrichelt). Der Penaltypunkt liegt 3 m vor der Mitte der Torlinie.',
    },
  },
  {
    id: 'cuvette',
    group: 'regles',
    fr: {
      term: 'Cuvette, rampe',
      definition:
        'Le but est un bac d’acier contre le mur : le palet monte la rampe (11 %) et doit tomber dans la cuvette, entre les deux limites des 3 m.',
    },
    en: {
      term: 'Goal tray',
      definition:
        'The goal is a steel tray against the wall: the puck rides up the ramp (11 %) and must drop into the trough, between the two 3 m limits.',
    },
    es: {
      term: 'Canaleta, rampa',
      definition:
        'La portería es una bandeja de acero contra la pared: el disco sube la rampa (11 %) y debe caer en la canaleta, entre los dos límites de 3 m.',
    },
    nl: {
      term: 'Doelbak, helling',
      definition:
        'Het doel is een stalen bak tegen de wand: de puck gaat de helling op (11 %) en moet in de bak vallen, tussen de twee grenzen van 3 m.',
    },
    de: {
      term: 'Torrinne, Rampe',
      definition:
        'Das Tor ist eine Stahlwanne an der Wand: Der Puck rollt die Rampe hinauf (11 %) und muss in die Rinne fallen, zwischen den beiden 3-m-Grenzen.',
    },
  },
];
