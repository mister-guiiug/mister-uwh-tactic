/**
 * LE LEXIQUE DU HOCKEY SUBAQUATIQUE, en français et en anglais.
 *
 * Les termes sont ceux des documents de formation que l'utilisateur a
 * fournis (fiches du CIBPL-FFESSM pour l'initiateur, « Fondamentaux
 * techniques et tactiques », « Tactique de base du hockey subaquatique »,
 * guide du débutant de la Tasmanian Underwater Hockey Association, manuel de
 * la Wellington Underwater Hockey Association) et le règlement fédéral pour
 * le but. Les définitions sont RÉÉCRITES, en une ou deux phrases : aucune
 * n'est recopiée — ces documents ne portent pas de licence.
 *
 * Une donnée et non des messages : quarante définitions dans `messages.ts`
 * y noieraient l'interface, et elles ne servent qu'à cet écran.
 */
export const TERM_GROUPS = ['gestes', 'collectif', 'postes', 'regles'] as const;
export type TermGroup = (typeof TERM_GROUPS)[number];

export interface Term {
  id: string;
  group: TermGroup;
  fr: { term: string; definition: string };
  en: { term: string; definition: string };
}

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
  },
];
