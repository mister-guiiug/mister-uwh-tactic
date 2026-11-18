/**
 * Les dictionnaires de l'application, une entrée par locale et TOUTES DE MÊME
 * FORME : `createI18n` dérive le type des clés du dictionnaire de repli, et le
 * compilateur refuse ensuite `t('cle.qui.nexiste.pas')`.
 *
 * Deux locales seulement ici. En ajouter une se fait en copiant `fr` et en
 * traduisant : la forme, elle, est vérifiée à la compilation.
 *
 * CE FICHIER NE CONTIENT PAS LES LIBELLÉS DES COMPOSANTS DU SOCLE (« Fermer »,
 * « Réessayer », « Retour »…). Ils vivent dans `react/labels`, en sept langues,
 * et `I18nProvider` pose `LabelsProvider` avec la locale courante tout seul.
 * Les redéclarer ici, c'est le travail que sept apps ont fait dans huit
 * fichiers-pont d'environ quatre cents lignes, avant que le socle ne porte les
 * traductions.
 */
/**
 * PAS DE `as const` ICI, et c'est délibéré. Il figerait chaque chaîne
 * française comme son PROPRE type littéral, et le dictionnaire anglais devrait
 * alors contenir… les mêmes mots français. La forme est ce qui doit
 * correspondre, pas le contenu.
 */
const fr = {
  app: {
    name: 'Mister UWH Tactic',
    tagline:
      'Tableau tactique de hockey subaquatique : placez joueurs, arbitres et palet, partagez vos schémas et visualisez-les en 3D.',
    loadingScreen: 'Chargement de l’écran',
  },
  nav: {
    more: 'Plus',
    home: 'Tableau',
    schemas: 'Schémas',
    seances: 'Séances',
    notes: 'Notes',
  },
  board: {
    workspace: 'Espace de travail',
    statusSaved: 'Enregistré',
    layers: 'Calques',
    menuShare: 'Partager',
    menuShow: 'Montrer',
    menuSchema: 'Schéma',
    toolSelectShort: 'Choisir',
    toolMoveShort: 'Déplacer',
    cameraPovShort: 'Joueur',
    cameraUnderwaterShort: 'Plongée',
    speedCycle: 'Vitesse de lecture : {speed}, changer',
    apneaOpen: 'Apnée',
    breadcrumb: 'Fil d’Ariane',
    statusDirty: 'Modifié depuis l’enregistrement',
    statusDraft: 'Brouillon non enregistré',
    more: 'Plus d’actions',
    menuTitle: 'Actions du schéma',
    newHint: 'Repart d’un tableau vierge, à l’engagement.',
    presentHint: 'Plein écran, écran maintenu allumé.',
    steps: 'Étapes',
    stepChip: 'Étape {step}',
    stepWord: 'Étape',
    details: 'Détails du jeton',
    carryForward: 'Garder cette position aux étapes suivantes',
    carryForwardGroup: 'Garder ces positions aux étapes suivantes',
    carried: {
      one: 'Position recopiée sur l’étape suivante.',
      other: 'Position recopiée sur les {count} étapes suivantes.',
    },
    mirror: 'Retourner la phase : gauche ↔ droite',
    mirrorHint:
      'Les joueurs dans l’eau, le palet et les flèches changent de côté ; officiels et remplaçants restent en place.',
    mirrored: 'Phase retournée.',
    tipsTitle: 'Premiers pas',
    tip1: 'Touchez un joueur, puis faites-le glisser. Pincez le tableau pour zoomer.',
    tip2: '« + » sous le tableau ajoute une étape, copie de la courante : on ne déplace que ceux qui bougent.',
    tip3: '« ⋯ » partage le schéma : lien, image de l’étape, QR code, fiche à imprimer.',
    tipsDone: 'Compris',
    poolDefault:
      'Bassin des nouveaux schémas : {length} × {width} m, {depth} m de fond.',
    poolRemember: 'Retenir ce bassin pour les nouveaux schémas',
    poolRemembered: 'Ce bassin servira aux nouveaux schémas.',
    resetZoom: 'Vue entière',
    stepChipWarn: 'Étape {step}, apnée au-delà du seuil',
    playback: 'Lecture',
    selectionNone: 'Aucun jeton sélectionné.',
    keyboard: 'Au clavier',
    shortcuts:
      'Espace : lire ou mettre en pause. Virgule et point : étape précédente, suivante. Ctrl+Z et Ctrl+Y : annuler, rétablir. Ctrl+S : enregistrer. Ctrl+K : la palette de commandes. Pincer, Ctrl et la molette, ou + et − sur un jeton : zoomer ; 0 : bassin entier ; glisser le fond pour se déplacer.',
    officials: 'Officiels',
    display: 'Affichage',
    squad: 'Effectifs',
    ecoHint: 'Sans ombres ni reflets : pour un téléphone qui chauffe.',
    playingLocked: 'Lecture en cours : mettez en pause pour modifier.',
    title: 'Tableau',
    view: 'Vue',
    view2d: '2D',
    view3d: '3D',
    camera: 'Caméra',
    cameraStand: 'Tribune',
    cameraTop: 'Dessus',
    cameraUnderwater: 'Immersion',
    cameraPov: 'Vue subjective',
    cameraPovHint:
      'Touchez un joueur ou un arbitre : la caméra prend son point de vue.',
    loading3d: 'Chargement de la vue 3D',
    pool3d:
      'Vue 3D du bassin : joueurs, arbitres et palet à leur profondeur. Le tableau 2D décrit la même position.',
    unavailable3d:
      'La 3D n’est pas disponible sur cet appareil (WebGL inactif). Le tableau 2D reste utilisable.',
    pitch: 'Terrain de hockey subaquatique, vu de dessus',
    help: 'Flèches : déplacer d’un demi-mètre (Maj : dix centimètres). Q et E : tourner. S : surface ou fond. Entrée : modifier. Échap : désélectionner.',
    puck: 'Palet',
    puckSelected: 'Palet sélectionné : faites-le glisser.',
    whitePlayer: 'Blanc {number}',
    blackPlayer: 'Noir {number}',
    referee: 'Arbitre {number}',
    undo: 'Annuler',
    redo: 'Rétablir',
    undoKeys: 'Annuler (Ctrl+Z)',
    redoKeys: 'Rétablir (Ctrl+Y)',
    viewBoth: 'Côte à côte',
    present: 'Présenter',
    stopPresenting: 'Quitter la présentation',
    tool: 'Outil',
    toolSelect: 'Sélectionner',
    toolHint:
      'Outil {kind} : faites glisser sur le terrain, depuis un jeton ou un point, pour tracer la flèche.',
    eco: 'Mode économie',
    groupSelected: '{count} jetons sélectionnés',
    rotateGroupLeft: 'Tourner la sélection à gauche',
    rotateGroupRight: 'Tourner la sélection à droite',
    deselect: 'Désélectionner',
    selectWhite: 'Sélectionner les Blancs',
    selectBlack: 'Sélectionner les Noirs',
    duration: 'Durée de l’étape {step} (s)',
    ghosts: 'Fantôme de l’étape précédente',
    substituteWith: 'Remplacer par',
    substituteNone: 'Aucun remplaçant affiché',
    substituteDo: 'Faire entrer',
    deckReferee: 'Arbitre de bord',
    substitute: 'remplaçant',
    whiteSubs: 'Remplaçants blancs',
    blackSubs: 'Remplaçants noirs',
    deckRefereeShown: 'Arbitre de bord, sur la plage',
    formation: 'Composition',
    formationHint:
      'Place les six joueurs dans l’eau d’une équipe, dans sa moitié, sur l’étape en cours. Lue d’avant en arrière : 3-2-1, ce sont trois avants (ailier gauche, avant-centre, ailier droit), deux pivots, un arrière — AG, AC, AD, PG, PD, AR une fois nommés.',
    formationTeam: 'Équipe',
    formationPick: 'Composition',
    formationApply: 'Placer l’équipe',
    formationNames: 'Nommer les joueurs d’après leur poste',
    formationDone: '{team} en {formation}.',
    teamWhite: 'Blancs',
    teamBlack: 'Noirs',
    role: '{line}{side}',
    roleFront: 'A',
    roleMiddle: 'P',
    roleBack: 'AR',
    sideLeft: 'G',
    sideCentre: 'C',
    sideRight: 'D',
    surface: 'en surface',
    underwater: 'sous l’eau',
    leftHanded: 'gaucher',
    leftHandedSwitch: 'Gaucher',
    depthSurface: 'En surface',
    depthBottom: 'Sous l’eau',
    dive: 'Plonger',
    surfaceUp: 'Remonter',
    edit: 'Modifier',
    rotateLeft: 'Tourner à gauche',
    rotateRight: 'Tourner à droite',
    hint: 'Touchez un jeton pour le sélectionner, faites-le glisser pour le déplacer.',
    schemaName: 'Nom du schéma',
    untitled: 'Schéma sans titre',
    defaultName: 'Schéma du {date}',
    save: 'Enregistrer',
    saved: '« {name} » enregistré.',
    saveFailed: 'Enregistrement impossible : le stockage a refusé.',
    new: 'Nouveau schéma',
    newDone: 'Tableau vierge, à l’engagement.',
    sharedOpened: 'Schéma partagé ouvert. Enregistrez-le pour le garder.',
    sharedInvalid: 'Ce lien de partage est illisible ou incomplet.',
    previous: 'Étape précédente',
    next: 'Étape suivante',
    stepOf: 'Étape {step} / {total}',
    play: 'Lire',
    pause: 'Pause',
    speed: 'Vitesse de lecture',
    addStep: 'Ajouter une étape',
    removeStep: 'Supprimer l’étape',
    moveStepEarlier: 'Placer l’étape plus tôt',
    moveStepLater: 'Placer l’étape plus tard',
    kickoff: 'Replacer à l’engagement',
    note: 'Consigne de l’étape {step}',
    notePlaceholder: 'Ce que chacun doit faire à ce moment de la phase',
    stepCount: {
      one: '{count} étape',
      other: '{count} étapes',
    },
    setup: 'Effectifs, arbitres et bassin',
    whiteCount: 'Joueurs blancs dans l’eau',
    blackCount: 'Joueurs noirs dans l’eau',
    refereeCount: 'Arbitres dans l’eau',
    refereeLine: 'Ligne entre arbitres',
    refereeLineNone: 'Aucune',
    refereeLinePair: 'Arbitres {a} et {b}',
    fieldOfView: 'Champ de vision des arbitres',
    labels: 'Noms sous les jetons',
    pool: 'Bassin',
    length: 'Longueur (m)',
    width: 'Largeur (m)',
    depthField: 'Profondeur (m)',
    poolHint:
      'Règlement international : 21 à 25 m de long, 12 à 15 m de large, 2 à 3,65 m de profondeur.',
    name: 'Nom',
    nameHint: 'Prénom ou poste (« AG », « PD »). Vaut pour tout le schéma.',
    depth: 'Profondeur à l’étape {step}',
    heading: 'Orientation : {angle}° (étape {step})',
    done: 'Terminé',
  },
  panel: {
    label: 'Réglages du schéma',
    loading: 'Chargement de l’onglet',
    token: 'Jeton',
    step: 'Étape',
    teams: 'Équipes',
    rules: 'Règles',
    pool: 'Bassin',
    expand: 'Agrandir le panneau',
    collapse: 'Réduire le panneau',
    alerts: {
      one: '{count} alerte',
      other: '{count} alertes',
    },
  },
  lexique: {
    title: 'Lexique',
    intro:
      'Les mots du bord du bassin : les gestes, le jeu collectif, les postes et les règles, en français et en anglais.',
    search: 'Chercher un mot',
    none: 'Aucun mot ne correspond à « {query} ».',
    definitionOf: 'Définition de « {term} »',
    open: 'Voir dans le lexique',
    inNote: 'Dans le lexique :',
    sources:
      'Définitions réécrites d’après les documents de formation : fiches du CIBPL-FFESSM (initiateur hockey subaquatique), « Fondamentaux techniques et tactiques », « Tactique de base du hockey subaquatique », guides de la Tasmanian et de la Wellington Underwater Hockey Association, et le règlement fédéral pour le but.',
    groups: {
      gestes: 'Les gestes',
      collectif: 'Le jeu collectif',
      postes: 'Les postes',
      regles: 'Les règles et l’arbitrage',
    },
  },
  plus: {
    title: 'Plus',
    settingsHint: 'Apparence, langue, vos données, synchronisation.',
    accountHint: 'Connexion, quand une synchronisation est configurée.',
    aboutHint: 'Ce que fait l’application, et ses sœurs de la famille.',
    lexiqueHint: 'Les mots du jeu, en français et en anglais.',
    notesHint: 'Vos notes d’entraînement, au fil des séances.',
  },
  seances: {
    title: 'Séances',
    intro:
      'Enchaînez des schémas de la bibliothèque pour un entraînement — une durée et une consigne par phase —, puis présentez-les au bord du bassin, une phase après l’autre.',
    create: 'Nouvelle séance',
    empty: 'Préparez votre première séance',
    emptyHint:
      'Une séance enchaîne des schémas de la bibliothèque : l’échauffement, une phase de jeu, un exercice.',
    untitled: 'Séance sans titre',
    summary: {
      one: '{count} phase · {minutes} min',
      other: '{count} phases · {minutes} min',
    },
    presentNamed: 'Présenter « {name} »',
    present: 'Présenter la séance',
    nothingToPresent:
      'Aucune phase de cette séance n’a son schéma dans la bibliothèque.',
    notFound: 'Séance introuvable',
    notFoundHint: 'Elle a peut-être été supprimée.',
    back: 'Toutes les séances',
    name: 'Nom de la séance',
    namePlaceholder: 'Mardi : sortie de mur et relais',
    missing: 'Schéma introuvable dans la bibliothèque',
    up: 'Monter « {name} »',
    down: 'Descendre « {name} »',
    removeItem: 'Retirer « {name} » de la séance',
    minutes: 'Durée de la phase {n} (min)',
    note: 'Consigne de la phase {n}',
    notePlaceholder: 'Ce que les joueurs doivent retenir',
    noItems:
      'Aucune phase pour l’instant : ajoutez un schéma de la bibliothèque.',
    noSchemas:
      'La bibliothèque est vide : enregistrez d’abord un schéma ou un exemple.',
    toLibrary: 'Ouvrir la bibliothèque',
    pick: 'Schéma à ajouter',
    pickPlaceholder: 'Choisir un schéma…',
    add: 'Ajouter à la séance',
    full: 'Une séance compte au plus {max} phases.',
    remove: 'Supprimer la séance',
    removed: 'Séance « {name} » supprimée.',
    phaseOf: 'Phase {n} / {total}',
    minutesShort: '{n} min',
    previous: 'Phase précédente',
    next: 'Phase suivante',
  },
  palette: {
    label: 'Palette de commandes',
    placeholder: 'Une commande, un schéma, une séance, un mot…',
    results: 'Commandes',
    none: 'Aucune commande ne correspond.',
    escape: 'Échap',
    play: 'Lire la phase',
    present: 'Présenter le schéma',
    formation: '{formation} · {team}',
    open: 'Ouvrir « {name} »',
    groups: {
      go: 'Aller à',
      board: 'Tableau',
      formation: 'Composition',
      schema: 'Schéma',
      seance: 'Séance',
      term: 'Lexique',
    },
  },
  arrows: {
    move: 'Déplacement',
    pass: 'Passe',
    flick: 'Flick',
    listTitle: 'Flèches de l’étape {step}',
    describe: '{kind}, {length}',
    remove: 'Supprimer la flèche {index}',
  },
  apnea: {
    title: 'Apnée',
    hint: 'Qui est au fond, qui respire, et depuis combien de temps — d’après la durée de chaque étape.',
    limit: 'Seuil d’apnée (s)',
    bottomNow: 'Au fond à cette étape : Blancs {white}, Noirs {black}.',
    caption: 'Frise d’apnée : une ligne par joueur, une colonne par étape.',
    player: 'Joueur',
    surface: 'surface',
    warning: 'au-delà du seuil d’apnée',
  },
  situations: {
    title: 'Situations du règlement',
    hint: 'Replace l’étape en cours selon le règlement international (CMAS, 12ᵉ édition).',
    pick: 'Situation',
    apply: 'Placer',
    done: '{name} : étape replacée.',
    kickoff: 'Engagement',
    equal: 'Palet neutre',
    'advantage-blanc': 'Palet d’avantage pour les Blancs',
    'advantage-noir': 'Palet d’avantage pour les Noirs',
    'penalty-blanc': 'Tir de pénalité contre les Blancs',
    'penalty-noir': 'Tir de pénalité contre les Noirs',
    rule: {
      kickoff:
        'Règle 15.1 : chaque équipe en surface contre son mur, une main dessus ; arbitre de bord au milieu d’un côté, un arbitre aquatique face à lui, les deux autres près des croisements des lignes de 5 et 2 m.',
      equal:
        'Règle 17.5 : palet à l’endroit de la faute, jamais à moins de 2 m d’un bord ni de 5 m d’une ligne de but ; les deux équipes en surface, chacune de son côté de la ligne qui passe par le palet.',
      'advantage-blanc':
        'Règle 17.6 : l’équipe fautive (les Noirs) recule derrière une ligne à 3 m du palet ; les Blancs ont cinq secondes pour en prendre possession.',
      'advantage-noir':
        'Règle 17.6 : l’équipe fautive (les Blancs) recule derrière une ligne à 3 m du palet ; les Noirs ont cinq secondes pour en prendre possession.',
      'penalty-blanc':
        'Règle 17.8 : palet sur le point de pénalité des Blancs ; deux attaquants noirs en surface derrière lui, un défenseur blanc au mur, une main dessus ; tous les autres dans leur zone de remplacement.',
      'penalty-noir':
        'Règle 17.8 : palet sur le point de pénalité des Noirs ; deux attaquants blancs en surface derrière lui, un défenseur noir au mur, une main dessus ; tous les autres dans leur zone de remplacement.',
    },
  },
  export: {
    title: 'Emporter la phase',
    hint: 'Une fiche à imprimer, une vidéo à envoyer, un QR code à montrer.',
    image: 'Partager l’image de l’étape',
    imageHint:
      'Une image PNG du terrain et de la consigne, à envoyer à l’équipe.',
    imageWorking: 'Image en préparation…',
    link: 'Partager le lien',
    linkHint:
      'Le schéma entier dans l’adresse : il s’ouvre tel quel, sans compte.',
    linkFailed: 'Le lien n’a pas pu être partagé.',
    phaseImage: 'Partager l’image de toute la phase',
    phaseImageHint:
      'Toutes les étapes sur une image, deux par rang, avec leurs consignes.',
    imageSaved: 'Image enregistrée.',
    imageFailed: 'L’image n’a pas pu être créée.',
    print: 'Imprimer la fiche',
    video: 'Enregistrer une vidéo',
    recording: 'Enregistrement…',
    videoHint: 'La vidéo s’enregistre depuis la vue 3D : ouvrez-la d’abord.',
    videoNeeds3d: 'Ouvrez la vue 3D pour enregistrer la vidéo.',
    videoSaved: 'Vidéo enregistrée.',
    videoUnsupported: 'Ce navigateur ne sait pas enregistrer de vidéo.',
    qr: 'Afficher le QR code',
    qrTitle: 'Le schéma en QR code',
    qrAlt: 'QR code du lien vers ce schéma',
    qrSize: 'Lien de {bytes} octets, sur {max} possibles.',
    qrTooLong:
      'Ce schéma fait {bytes} octets : trop pour un QR code ({max} au plus). Retirez des étapes, ou partagez le lien.',
  },
  schemas: {
    create: 'Créer un schéma',
    example: 'Exemples',
    exampleNote1:
      'Palet neutre au centre : chaque équipe en surface, de son côté de la ligne.',
    exampleNote2:
      'Trois Blancs plongent ensemble et montent sur le palet, l’arrière reste en couverture.',
    exampleNote3:
      'Passe vers l’avant gauche, qui part dans l’axe ; les autres remontent respirer.',
    exampleOpened: 'Exemple ouvert dans le tableau.',
    examplePick: 'Ouvrir un exemple',
    exampleGroups: {
      plays: 'Phases de jeu',
      drills: 'Exercices',
    },
    examples: {
      neutral: {
        name: 'Exemple : palet neutre et montée',
        hint: 'Un palet neutre, trois Blancs qui plongent, une passe vers l’aile.',
      },
      kickoff: {
        name: 'Engagement en 3-2-1',
        hint: 'L’avant-centre plonge, les ailiers le suivent, la passe part sur une aile.',
        note1:
          'Engagement : chacun contre son mur. De gauche à droite : arrière, pivot gauche, ailier gauche, avant-centre, ailier droit, pivot droit.',
        note2:
          'Au signal, l’avant-centre plonge droit sur le palet ; les ailiers suivent, serrés, un peu en arrière ; les pivots s’étagent et l’arrière se centre derrière eux. Pas de demi-tour.',
        note3: 'L’avant-centre donne à l’ailier droit, qui remonte son aile.',
      },
      faceOff: {
        name: 'Entre-deux',
        hint: 'Tout le monde en surface, l’avant-centre plonge les pieds d’abord et sert une aile.',
        note1:
          'Entre-deux : tout le monde en surface jusqu’au signal. Les avants face à leurs vis-à-vis de part et d’autre de la ligne des arbitres ; les pivots derrière eux, l’arrière entre les pivots, un peu en retrait.',
        note2:
          'Au signal, l’avant-centre plonge les pieds d’abord, droit sur le palet : plus vite que tête la première.',
        note3:
          'Il donne à un ailier, ou passe son vis-à-vis ; il ne remonte pas avant que le palet soit parti sur l’aile.',
      },
      rightAttack: {
        name: 'Attaque à droite dans leur moitié',
        hint: 'L’ailier porte, l’avant-centre attend, la ligne d’arrière monte.',
        note1:
          'Attaque à droite dans leur moitié : l’ailier droit porte, l’avant-centre attend la passe, l’ailier gauche se démarque haut à gauche.',
        note2:
          'La ligne d’arrière monte, pour reprendre vite un palet perdu sans laisser de terrain à la contre-attaque.',
        note3:
          'Dans leur terrain, on va au centre du but : l’ailier donne à l’avant-centre.',
      },
      wallPlay: {
        name: 'Jouer le mur, puis sortir',
        hint: 'Le travail au mur entre ailier et pivot, puis la sortie vers l’aile opposée.',
        note1:
          'Le pivot droit bataille sur son mur ; l’ailier droit, tourné vers lui, alterne sandwichs et retournés. L’avant-centre, un peu en retrait, ratisse et fait écran ; l’arrière soutient. L’ailier gauche reste dehors.',
        note2:
          'Bloqué, le pivot relaie : il lève le palet vers l’arrière, qui part avec la sortie de mur. Le pivot se replace aussitôt.',
        note3: 'L’arrière donne à l’avant-centre, resté en embuscade.',
        note4:
          'Qui relance vers l’ailier gauche, resté hors du mur : c’est lui qui part en contre-attaque.',
      },
      slide: {
        name: 'Défense qui coulisse',
        hint: 'Les hauteurs de chacun selon la profondeur du palet, action à gauche.',
        note1:
          'Palet au niveau de nos avants, à gauche : l’ailier gauche presse, l’avant-centre soutient. Les pivots sont avancés, prêts à reculer très vite ; l’ailier opposé un peu devant l’avant-centre, pour éviter la passe à plat.',
        note2:
          'Palet au niveau du pivot : le pivot gauche s’engage ; le pivot opposé se place à hauteur de l’arrière, prêt à couvrir ou à soutenir. L’ailier opposé à hauteur de l’avant-centre.',
        note3:
          'Palet au niveau de l’arrière : le pivot opposé couvre le but, les avants reviennent très vite, l’ailier opposé plus bas que l’avant-centre.',
      },
      wingSwitch: {
        name: 'Changement d’aile',
        hint: 'Le palet repart en arrière et ressort sur l’aile laissée libre.',
        note1:
          'L’ailier droit, bloqué sur le mur, attire les Noirs de son côté.',
        note2: 'Il se retourne et donne en retrait au pivot droit.',
        note3: 'Le pivot droit transmet à l’arrière, qui traverse.',
        note4:
          'L’arrière donne au pivot gauche, un peu en retrait : le palet arrive toujours devant le receveur.',
        note5:
          'Le pivot gauche relance vers l’ailier gauche, seul sur son aile. À tenter quand la défense est collée au mur.',
      },
      penalty: {
        name: 'Pénalité à deux contre un',
        hint: 'Une feinte d’un côté, le palet levé derrière le défenseur, le second attaquant conclut.',
        note1:
          'Pénalité : les deux attaquants en surface, l’un derrière l’autre, à hauteur du palet ; le défenseur touche le mur au-dessus du but. Cinq secondes pour prendre le palet.',
        note2:
          'Le premier attaquant prend le palet et part d’un côté ; le défenseur le suit.',
        note3:
          'Il lève le palet derrière le défenseur ; le second attaquant, parti de l’autre côté, est déjà là.',
        note4: 'Il le pousse dans la cuvette : but.',
      },
      freePuckPivots: {
        name: 'Coup franc joué par les pivots',
        hint: 'Selon « Tactique de base du hockey subaquatique » : seuls les pivots le jouent, avec une feinte, et seulement dans leur moitié.',
        note1:
          'Coup franc dans leur moitié : les deux pivots au-dessus du palet, eux seuls le jouent. Les Noirs reculent à 3 m ; les avants attendent la passe, l’arrière couvre.',
        note2:
          'Au signal, un pivot plonge le premier et file vers le mur comme s’il emportait le palet ; un Noir mord à la feinte.',
        note3:
          'L’autre pivot, parti juste derrière, prend le palet et le passe à l’avant-centre. Dans notre moitié, pas de feinte : on joue simple.',
      },
      freePuckBack: {
        name: 'Coup franc joué par l’arrière',
        hint: 'Selon la fiche « Le coup franc » du CIBPL-FFESSM : l’arrière prend le palet, avance, puis tire vers ses avants.',
        note1:
          'Coup franc pour les Blancs : les avants face à leurs vis-à-vis, sur la ligne des 3 m que marquent les arbitres ; l’arrière au-dessus du palet, un pivot à côté de lui, l’autre en retrait, en couverture.',
        note2:
          'Au signal, l’arrière plonge, prend le palet et avance jusqu’au premier adversaire ; le pivot voisin le suit. Les avants freinent les Noirs en se plaçant entre eux et le palet, sans les accrocher ni les pousser.',
        note3:
          'Il tire vers ses avants, démarqués pour recevoir, et suit son palet : contré, il peut le reprendre. L’autre pivot reste en couverture : si le palet est perdu, c’est le dernier rempart.',
      },
      twoOnOne: {
        name: 'Deux contre un',
        hint: 'Deux attaquants passent un défenseur : le porteur le fixe, la passe part au bon moment.',
        note1:
          'Deux contre un : le porteur et son partenaire partent ensemble, à portée de passe l’un de l’autre ; le défenseur les attend au milieu du bassin.',
        note2:
          'Le porteur nage droit sur le défenseur pour l’obliger à s’engager ; le partenaire reste décalé sur le côté, prêt à recevoir.',
        note3:
          'Dès que le défenseur s’engage, la passe part devant lui : trop tôt, il n’aurait qu’un joueur à suivre ; trop tard, le porteur serait pris.',
        note4:
          'Le receveur accélère aussitôt, même si le palet est mal contrôlé. Le défenseur passé, la paire suivante part ; ensuite, on essaie la passe derrière lui, les feintes, les retournés.',
      },
      passThree: {
        name: 'Passe à trois en apnée',
        hint: 'Trois joueurs font avancer le palet de passe en passe, en se relayant au fond.',
        note1:
          'Par trois, numérotés : le palet avance en ligne droite, de passe en passe, d’une largeur de ligne d’eau à chaque fois. Il y a toujours un joueur au fond avec lui.',
        note2:
          '2 plonge devant 1, qui lui passe le palet puis remonte respirer en suivant l’action du regard ; 3 avance en surface.',
        note3:
          '3 plonge à son tour devant le receveur ; 2 lui passe et remonte. Porter le palet le moins possible : chaque apnée reste courte.',
        note4:
          '1, revenu en surface, redescend devant 3, et ainsi de suite. Pas de passe si personne n’est au fond devant : on attend. Variantes : passes latérales ou en arrière, changements de direction.',
      },
      wallRelay: {
        name: 'Relais sur le mur',
        hint: 'Deux joueurs se relaient au fond le long du mur pour garder le palet et user le défenseur.',
        note1:
          'Le long du mur, le porteur est arrêté par un défenseur ; son coéquipier le suit en surface, juste derrière lui.',
        note2:
          'Bloqué, il donne le palet en retrait à son coéquipier, descendu derrière lui, puis remonte respirer.',
        note3:
          'Il se replace aussitôt derrière son coéquipier, prêt à redescendre pour le relais suivant : tout tient à la vitesse de ce replacement.',
        note4:
          'À force de relais, le défenseur manque d’air et remonte : la paire gagne du terrain le long du mur, vers le but adverse.',
      },
      piggyInMiddle: {
        name: 'Le chat au milieu',
        hint: 'Deux paires se passent le palet à travers une bande gardée par une troisième.',
        note1:
          'Trois bandes marquées par les lignes d’eau du fond : une paire de Blancs de chaque côté, deux Noirs au milieu. Chacun reste dans sa bande, et n’en déborde que de la longueur d’un avant-bras.',
        note2:
          'Les paires du bord se passent le palet à travers la bande du milieu. Une seule passe entre partenaires, et pas question de garder le palet en attendant que l’adversaire remonte.',
        note3: 'La paire du milieu guette la passe et l’intercepte.',
        note4:
          'Le palet repris, elle tente de le lever par-dessus une paire du bord, au-delà de sa bande.',
      },
    },
    replaced: 'Le brouillon du tableau a été remplacé.',
    count: {
      one: '{count} schéma',
      other: '{count} schémas',
    },
    current: 'Ouvert dans le tableau',
    exportAll: 'Exporter la bibliothèque',
    importedMany: {
      one: '{count} schéma importé.',
      other: '{count} schémas importés.',
    },
    importSkipped: {
      one: '{count} schéma illisible ignoré.',
      other: '{count} schémas illisibles ignorés.',
    },
    search: 'Rechercher un schéma',
    sort: 'Trier',
    sortRecent: 'Les plus récents',
    sortName: 'Par nom',
    sortSteps: 'Par nombre d’étapes',
    countFiltered: '{shown} sur {total}',
    noMatch: 'Aucun schéma ne correspond à « {query} ».',
    duplicate: 'Dupliquer « {name} »',
    copySuffix: '(copie)',
    copySuffixN: '(copie {n})',
    moreActions: 'Plus d’actions',
    cardActions: 'Actions pour « {name} »',
    menuShare: 'Partager le lien',
    menuExport: 'Exporter le fichier',
    menuDuplicate: 'Dupliquer',
    menuRemove: 'Supprimer',
    duplicated: '« {name} » ajouté à la bibliothèque.',
    title: 'Schémas',
    loading: 'Chargement des schémas',
    empty: 'Aucun schéma enregistré.',
    emptyAccount: 'Aucun schéma dans votre compte.',
    emptyAccountHint:
      'Ceux de cet appareil sont plus bas : ajoutez-les à votre compte, ou commencez-en un sur le tableau.',
    outsideTitle: 'Sur cet appareil, hors de votre compte',
    outsideHint:
      'Enregistrés avant votre connexion, ou par quelqu’un d’autre sur cet appareil. Ils ne suivent pas votre compte et ne partent nulle part sans vous.',
    adopt: 'Ajouter à mon compte',
    adoptAll: {
      one: 'Ajouter ce schéma à mon compte',
      other: 'Ajouter les {count} à mon compte',
    },
    adopted: {
      one: '{count} schéma ajouté à votre compte.',
      other: '{count} schémas ajoutés à votre compte.',
    },
    emptyHint:
      'Un schéma est une phase de jeu en étapes. Commencez-en un sur le tableau, ou ouvrez un exemple pour voir ce qu’il sait montrer.',
    open: 'Ouvrir',
    share: 'Partager',
    shareText:
      'Un schéma de hockey subaquatique, à ouvrir dans Mister UWH Tactic',
    copied: 'Lien copié',
    export: 'Exporter',
    import: 'Importer un schéma',
    imported: '« {name} » importé.',
    importFailed: 'Fichier refusé : {error}',
    remove: 'Supprimer « {name} »',
    removed: '« {name} » supprimé',
    undo: 'Annuler',
  },
  notes: {
    title: 'Notes du coach',
    loading: 'Chargement des notes',
    empty: 'Aucune note pour le moment.',
    emptyHint:
      'Une consigne, un retour de séance, ce qu’il faudra dire au prochain entraînement.',
    add: 'Ajouter',
    field: 'Nouvelle note',
    placeholder: 'Consigne, retour de séance…',
    remove: 'Supprimer',
    removed: 'Note supprimée',
    undo: 'Annuler',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
    sync: {
      refused: {
        one: '{count} écriture refusée par la base : {error}',
        other: '{count} écritures refusées par la base : {error}',
      },
      retry: 'Réessayer',
    },
    stale:
      'Réseau indisponible : voici la copie enregistrée {when}. Les notes ont pu changer depuis.',
  },
  settings: {
    dataHint:
      'Vos schémas et vos notes, chacun dans un fichier à garder ou à porter sur un autre appareil. Un schéma seul s’exporte depuis l’écran Schémas.',
    sync: 'Synchronisation',
    syncLocal: 'Tout reste sur cet appareil : rien ne part sur un serveur.',
    syncRemote:
      'Notes et schémas se synchronisent avec {kind}, une fois le compte ouvert.',
    developers: 'Pour les développeurs',
    developersHint:
      'Les variables lues au build, et ce qui les remplace quand elles manquent.',
    title: 'Réglages',
    appearance: 'Apparence',
    language: 'Langue',
    theme: 'Thème',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeSystem: 'Système',
    exportSchemas: 'Exporter mes schémas',
    data: 'Vos données',
    export: 'Exporter mes notes',
    import: 'Importer mes notes',
    importConfirm: 'Remplacer les notes actuelles ?',
    importBody:
      'Le fichier remplacera tout ce qui est sur cet appareil. Exportez d’abord si vous voulez garder l’état actuel.',
    imported: {
      one: '{count} note importée.',
      other: '{count} notes importées.',
    },
    importFailed: 'Fichier refusé : {error}',
    reset: 'Effacer mes notes',
    resetConfirm: 'Effacer toutes les notes ?',
    resetBody: 'Cette action est définitive.',
    backend: 'Source de données',
    backendLocal: 'Cet appareil seulement',
    accountOpen: 'Ouvrir le compte',
  },
  account: {
    title: 'Compte',
    localMode: 'Mode local',
    localModeBody:
      'Les comptes ne sont pas activés sur cette installation : vos schémas et vos notes restent sur cet appareil. Pour les garder, exportez-les depuis les Réglages.',
    signOut: 'Se déconnecter',
    admin: 'Administration',
    linkIntro:
      'Un lien à usage unique arrive dans votre boîte : aucun mot de passe à retenir, ni à voler.',
    linkSentTitle: 'Lien envoyé',
    linkSentBody:
      "Un lien vient d'être envoyé à {email}. Ouvrez-le depuis cet appareil : il vous ramènera ici, connecté·e. Il n'est valable qu'une fois.",
    linkAgain: 'Recevoir un autre lien',
    usePassword: 'Se connecter avec un mot de passe',
    useLink: 'Recevoir un lien plutôt',
    danger: {
      title: 'Zone dangereuse',
      body: 'Supprimer votre compte efface vos notes, vos schémas enregistrés, votre profil et le compte lui-même. Rien n’est conservé, et cette action ne s’annule pas.',
      action: 'Supprimer mon compte',
      confirmLabel: 'Retapez votre adresse pour confirmer',
      confirmHint: 'L’adresse du compte est {email}.',
      confirm: 'Supprimer définitivement',
      cancel: 'Annuler',
      mismatch: 'L’adresse saisie ne correspond pas : rien n’a été supprimé.',
      failed: 'La suppression a échoué : {error}',
    },
  },

  about: {
    title: 'À propos',
    what: 'Un tableau tactique pour expliquer une phase de jeu au bord du bassin : le terrain tracé selon le règlement international, six joueurs par équipe à nommer, orienter, mettre en surface ou au fond, et quatre remplaçants dans leur zone ; les compositions usuelles (3-2-1, 2-2-2, 1-2-1-2…) ; trois arbitres dans l’eau avec leur champ de vision, et l’arbitre de bord. Une phase se décrit en étapes, se rejoue en animation, et se regarde aussi en 3D, à la vraie profondeur du bassin. Tout reste sur l’appareil ; un schéma se partage par un simple lien.',
  },
};

const en: typeof fr = {
  app: {
    name: 'Mister UWH Tactic',
    tagline:
      'Underwater hockey tactics board: place players, referees and puck, share your plays and see them in 3D.',
    loadingScreen: 'Loading the screen',
  },
  nav: {
    more: 'More',
    home: 'Board',
    schemas: 'Plays',
    seances: 'Sessions',
    notes: 'Notes',
  },
  board: {
    workspace: 'Workspace',
    statusSaved: 'Saved',
    layers: 'Layers',
    menuShare: 'Share',
    menuShow: 'Show',
    menuSchema: 'Play',
    toolSelectShort: 'Select',
    toolMoveShort: 'Move',
    cameraPovShort: 'Player',
    cameraUnderwaterShort: 'Dive',
    speedCycle: 'Playback speed: {speed}, change',
    apneaOpen: 'Breath-hold',
    breadcrumb: 'Breadcrumb',
    statusDirty: 'Changed since saved',
    statusDraft: 'Unsaved draft',
    more: 'More actions',
    menuTitle: 'Play actions',
    newHint: 'Starts again from a blank board, at the start of play.',
    presentHint: 'Full screen, screen kept awake.',
    steps: 'Steps',
    stepChip: 'Step {step}',
    stepWord: 'Step',
    details: 'Token details',
    carryForward: 'Keep this position in the next steps',
    carryForwardGroup: 'Keep these positions in the next steps',
    carried: {
      one: 'Position copied to the next step.',
      other: 'Position copied to the next {count} steps.',
    },
    mirror: 'Flip the play: left ↔ right',
    mirrorHint:
      'Players in the water, the puck and the arrows switch sides; officials and substitutes stay put.',
    mirrored: 'Play flipped.',
    tipsTitle: 'First steps',
    tip1: 'Tap a player, then drag it. Pinch the board to zoom.',
    tip2: '“+” under the board adds a step, a copy of the current one: move only those who move.',
    tip3: '“⋯” shares the play: link, step image, QR code, printable sheet.',
    tipsDone: 'Got it',
    poolDefault: 'Pool for new plays: {length} × {width} m, {depth} m deep.',
    poolRemember: 'Use this pool for new plays',
    poolRemembered: 'This pool will be used for new plays.',
    resetZoom: 'Whole pool',
    stepChipWarn: 'Step {step}, breath-hold over the limit',
    playback: 'Playback',
    selectionNone: 'No token selected.',
    keyboard: 'Keyboard',
    shortcuts:
      'Space: play or pause. Comma and period: previous, next step. Ctrl+Z and Ctrl+Y: undo, redo. Ctrl+S: save. Ctrl+K: the command palette. Pinch, Ctrl and the wheel, or + and − on a token: zoom; 0: whole pool; drag the background to move around.',
    officials: 'Officials',
    display: 'Display',
    squad: 'Squads',
    ecoHint: 'No shadows or reflections: for a phone that runs hot.',
    playingLocked: 'Playing: pause to edit.',
    title: 'Board',
    view: 'View',
    view2d: '2D',
    view3d: '3D',
    camera: 'Camera',
    cameraStand: 'Stand',
    cameraTop: 'Top',
    cameraUnderwater: 'Underwater',
    cameraPov: 'Point of view',
    cameraPovHint:
      'Tap a player or a referee: the camera takes their point of view.',
    loading3d: 'Loading the 3D view',
    pool3d:
      '3D view of the pool: players, referees and puck at their depth. The 2D board shows the same position.',
    unavailable3d:
      '3D is not available on this device (WebGL is off). The 2D board still works.',
    pitch: 'Underwater hockey pitch, seen from above',
    help: 'Arrows: move by half a metre (Shift: ten centimetres). Q and E: rotate. S: surface or bottom. Enter: edit. Escape: deselect.',
    puck: 'Puck',
    puckSelected: 'Puck selected: drag it.',
    whitePlayer: 'White {number}',
    blackPlayer: 'Black {number}',
    referee: 'Referee {number}',
    undo: 'Undo',
    redo: 'Redo',
    undoKeys: 'Undo (Ctrl+Z)',
    redoKeys: 'Redo (Ctrl+Y)',
    viewBoth: 'Side by side',
    present: 'Present',
    stopPresenting: 'Leave presentation',
    tool: 'Tool',
    toolSelect: 'Select',
    toolHint:
      '{kind} tool: drag on the pitch, from a token or a point, to draw the arrow.',
    eco: 'Power saving',
    groupSelected: '{count} tokens selected',
    rotateGroupLeft: 'Rotate selection left',
    rotateGroupRight: 'Rotate selection right',
    deselect: 'Deselect',
    selectWhite: 'Select White',
    selectBlack: 'Select Black',
    duration: 'Step {step} duration (s)',
    ghosts: 'Ghost of the previous step',
    substituteWith: 'Replace with',
    substituteNone: 'No substitute shown',
    substituteDo: 'Bring on',
    deckReferee: 'Deck referee',
    substitute: 'substitute',
    whiteSubs: 'White substitutes',
    blackSubs: 'Black substitutes',
    deckRefereeShown: 'Deck referee, on the pool side',
    formation: 'Line-up',
    formationHint:
      'Places a team’s six players in the water in its own half, on the current step. Read front to back: 3-2-1 is three forwards, two mids, one back.',
    formationTeam: 'Team',
    formationPick: 'Line-up',
    formationApply: 'Place the team',
    formationNames: 'Name players after their position',
    formationDone: '{team} in {formation}.',
    teamWhite: 'White',
    teamBlack: 'Black',
    role: '{side}{line}',
    roleFront: 'F',
    roleMiddle: 'M',
    roleBack: 'B',
    sideLeft: 'L',
    sideCentre: 'C',
    sideRight: 'R',
    surface: 'at the surface',
    underwater: 'underwater',
    leftHanded: 'left-handed',
    leftHandedSwitch: 'Left-handed',
    depthSurface: 'At the surface',
    depthBottom: 'Underwater',
    dive: 'Dive',
    surfaceUp: 'Surface',
    edit: 'Edit',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    hint: 'Tap a token to select it, drag it to move it.',
    schemaName: 'Play name',
    untitled: 'Untitled play',
    defaultName: 'Play of {date}',
    save: 'Save',
    saved: '“{name}” saved.',
    saveFailed: 'Could not save: storage refused.',
    new: 'New play',
    newDone: 'Blank board, at the start of play.',
    sharedOpened: 'Shared play opened. Save it to keep it.',
    sharedInvalid: 'This share link is unreadable or incomplete.',
    previous: 'Previous step',
    next: 'Next step',
    stepOf: 'Step {step} / {total}',
    play: 'Play',
    pause: 'Pause',
    speed: 'Playback speed',
    addStep: 'Add a step',
    removeStep: 'Delete step',
    moveStepEarlier: 'Move the step earlier',
    moveStepLater: 'Move the step later',
    kickoff: 'Back to kick-off',
    note: 'Cue for step {step}',
    notePlaceholder: 'What everyone should do at this point of the play',
    stepCount: {
      one: '{count} step',
      other: '{count} steps',
    },
    setup: 'Squads, referees and pool',
    whiteCount: 'White players in the water',
    blackCount: 'Black players in the water',
    refereeCount: 'Referees in the water',
    refereeLine: 'Line between referees',
    refereeLineNone: 'None',
    refereeLinePair: 'Referees {a} and {b}',
    fieldOfView: 'Referees’ field of view',
    labels: 'Names under tokens',
    pool: 'Pool',
    length: 'Length (m)',
    width: 'Width (m)',
    depthField: 'Depth (m)',
    poolHint:
      'International rules: 21 to 25 m long, 12 to 15 m wide, 2 to 3.65 m deep.',
    name: 'Name',
    nameHint: 'First name or position (“LF”, “RB”). Applies to the whole play.',
    depth: 'Depth at step {step}',
    heading: 'Heading: {angle}° (step {step})',
    done: 'Done',
  },
  panel: {
    label: 'Play settings',
    loading: 'Loading the tab',
    token: 'Token',
    step: 'Step',
    teams: 'Teams',
    rules: 'Rules',
    pool: 'Pool',
    expand: 'Expand the panel',
    collapse: 'Collapse the panel',
    alerts: {
      one: '{count} alert',
      other: '{count} alerts',
    },
  },
  lexique: {
    title: 'Glossary',
    intro:
      'The words of the poolside: strokes, team play, positions and rules, in French and English.',
    search: 'Find a word',
    none: 'No word matches “{query}”.',
    definitionOf: 'Definition of “{term}”',
    open: 'See in the glossary',
    inNote: 'In the glossary:',
    sources:
      'Definitions rewritten from the training documents: CIBPL-FFESSM sheets (underwater hockey instructor), “Fondamentaux techniques et tactiques”, “Tactique de base du hockey subaquatique”, the Tasmanian and Wellington Underwater Hockey Association guides, and the federal rules for the goal.',
    groups: {
      gestes: 'Strokes',
      collectif: 'Team play',
      postes: 'Positions',
      regles: 'Rules and refereeing',
    },
  },
  plus: {
    title: 'More',
    settingsHint: 'Appearance, language, your data, sync.',
    accountHint: 'Sign-in, when a sync backend is configured.',
    aboutHint: 'What the app does, and its sister apps.',
    lexiqueHint: 'The words of the game, in French and English.',
    notesHint: 'Your training notes, session after session.',
  },
  seances: {
    title: 'Sessions',
    intro:
      'Chain plays from the library into a training session — a duration and a cue per phase — then present them at the poolside, one phase after another.',
    create: 'New session',
    empty: 'Plan your first session',
    emptyHint:
      'A session chains plays from the library: the warm-up, a game phase, a drill.',
    untitled: 'Untitled session',
    summary: {
      one: '{count} phase · {minutes} min',
      other: '{count} phases · {minutes} min',
    },
    presentNamed: 'Present “{name}”',
    present: 'Present the session',
    nothingToPresent:
      'None of this session’s phases has its play in the library.',
    notFound: 'Session not found',
    notFoundHint: 'It may have been deleted.',
    back: 'All sessions',
    name: 'Session name',
    namePlaceholder: 'Tuesday: wall exits and relays',
    missing: 'Play missing from the library',
    up: 'Move “{name}” up',
    down: 'Move “{name}” down',
    removeItem: 'Remove “{name}” from the session',
    minutes: 'Phase {n} duration (min)',
    note: 'Phase {n} cue',
    notePlaceholder: 'What the players should remember',
    noItems: 'No phase yet: add a play from the library.',
    noSchemas: 'The library is empty: save a play or an example first.',
    toLibrary: 'Open the library',
    pick: 'Play to add',
    pickPlaceholder: 'Choose a play…',
    add: 'Add to the session',
    full: 'A session holds at most {max} phases.',
    remove: 'Delete the session',
    removed: 'Session “{name}” deleted.',
    phaseOf: 'Phase {n} / {total}',
    minutesShort: '{n} min',
    previous: 'Previous phase',
    next: 'Next phase',
  },
  palette: {
    label: 'Command palette',
    placeholder: 'A command, a play, a session, a word…',
    results: 'Commands',
    none: 'No command matches.',
    escape: 'Esc',
    play: 'Play the phase',
    present: 'Present the play',
    formation: '{formation} · {team}',
    open: 'Open “{name}”',
    groups: {
      go: 'Go to',
      board: 'Board',
      formation: 'Formation',
      schema: 'Play',
      seance: 'Session',
      term: 'Glossary',
    },
  },
  arrows: {
    move: 'Run',
    pass: 'Pass',
    flick: 'Flick',
    listTitle: 'Arrows of step {step}',
    describe: '{kind}, {length}',
    remove: 'Delete arrow {index}',
  },
  apnea: {
    title: 'Breath-hold',
    hint: 'Who is on the bottom, who is breathing, and for how long — from each step’s duration.',
    limit: 'Breath-hold limit (s)',
    bottomNow: 'On the bottom at this step: White {white}, Black {black}.',
    caption: 'Breath-hold timeline: one row per player, one column per step.',
    player: 'Player',
    surface: 'surface',
    warning: 'beyond the breath-hold limit',
  },
  situations: {
    title: 'Rule situations',
    hint: 'Repositions the current step according to the international rules (CMAS, 12th edition).',
    pick: 'Situation',
    apply: 'Place',
    done: '{name}: step repositioned.',
    kickoff: 'Start of play',
    equal: 'Equal puck',
    'advantage-blanc': 'Advantage puck for White',
    'advantage-noir': 'Advantage puck for Black',
    'penalty-blanc': 'Penalty shot against White',
    'penalty-noir': 'Penalty shot against Black',
    rule: {
      kickoff:
        'Rule 15.1: each team at the surface against its end wall, one hand on it; chief referee mid-side on deck, one water referee in front of him, the other two near the 5 m and 2 m line crossings.',
      equal:
        'Rule 17.5: puck where the foul happened, never within 2 m of a side or 5 m of an end line; both teams at the surface, each on its own side of the line through the puck.',
      'advantage-blanc':
        'Rule 17.6: the offending team (Black) retreats behind a line 3 m from the puck; White has five seconds to take possession.',
      'advantage-noir':
        'Rule 17.6: the offending team (White) retreats behind a line 3 m from the puck; Black has five seconds to take possession.',
      'penalty-blanc':
        'Rule 17.8: puck on White’s penalty spot; two Black attackers at the surface behind it, one White defender at the wall, one hand on it; everyone else in their substitution area.',
      'penalty-noir':
        'Rule 17.8: puck on Black’s penalty spot; two White attackers at the surface behind it, one Black defender at the wall, one hand on it; everyone else in their substitution area.',
    },
  },
  export: {
    title: 'Take the play with you',
    hint: 'A sheet to print, a video to send, a QR code to show.',
    image: 'Share the step as an image',
    imageHint: 'A PNG of the pitch and the cue, to send to the team.',
    imageWorking: 'Preparing the image…',
    link: 'Share the link',
    linkHint:
      'The whole play in the address: it opens as is, no account needed.',
    linkFailed: 'The link could not be shared.',
    phaseImage: 'Share the whole play as an image',
    phaseImageHint: 'Every step on one image, two per row, with their cues.',
    imageSaved: 'Image saved.',
    imageFailed: 'The image could not be created.',
    print: 'Print the sheet',
    video: 'Record a video',
    recording: 'Recording…',
    videoHint: 'The video records from the 3D view: open it first.',
    videoNeeds3d: 'Open the 3D view to record the video.',
    videoSaved: 'Video saved.',
    videoUnsupported: 'This browser cannot record video.',
    qr: 'Show the QR code',
    qrTitle: 'The play as a QR code',
    qrAlt: 'QR code of the link to this play',
    qrSize: 'Link of {bytes} bytes, out of {max} possible.',
    qrTooLong:
      'This play is {bytes} bytes: too much for a QR code ({max} at most). Remove steps, or share the link.',
  },
  schemas: {
    create: 'Create a play',
    example: 'Examples',
    exampleNote1:
      'Neutral puck in the middle: each team on the surface, on its own side of the line.',
    exampleNote2:
      'Three Whites dive together and push onto the puck; the back stays in cover.',
    exampleNote3:
      'Pass to the left forward, who drives down the middle; the others go up to breathe.',
    exampleOpened: 'Example opened on the board.',
    examplePick: 'Open an example',
    exampleGroups: {
      plays: 'Phases of play',
      drills: 'Drills',
    },
    examples: {
      neutral: {
        name: 'Example: neutral puck and push forward',
        hint: 'A neutral puck, three Whites diving, a pass to the wing.',
      },
      kickoff: {
        name: 'Kick-off in 3-2-1',
        hint: 'The centre forward dives, the wings follow, the pass goes wide.',
        note1:
          'Kick-off: everyone against their wall. Left to right: back, left pivot, left wing, centre forward, right wing, right pivot.',
        note2:
          'On the signal, the centre forward dives straight at the puck; the wings follow, close and slightly behind; the pivots stagger and the back centres behind them. No half-turn.',
        note3:
          'The centre forward passes to the right wing, who carries up the wing.',
      },
      faceOff: {
        name: 'Neutral restart',
        hint: 'Everyone on the surface, the centre forward dives feet first and feeds a wing.',
        note1:
          'Neutral restart: everyone on the surface until the signal. The forwards face their opposite numbers across the referees’ line; the pivots behind them, the back between the pivots, slightly behind.',
        note2:
          'On the signal, the centre forward dives feet first, straight onto the puck: faster than head first.',
        note3:
          'He passes to a wing or beats his opposite number; he does not surface before the puck has gone wide.',
      },
      rightAttack: {
        name: 'Attacking on the right in their half',
        hint: 'The wing carries, the centre forward waits, the back line moves up.',
        note1:
          'Attacking on the right in their half: the right wing carries, the centre forward waits for the pass, the left wing gets free high on the left.',
        note2:
          'The back line moves up, to win back a lost puck quickly without giving ground to a counter-attack.',
        note3:
          'In their half, go for the middle of the goal: the wing passes to the centre forward.',
      },
      wallPlay: {
        name: 'Playing the wall, then breaking out',
        hint: 'Wing and pivot working the wall, then the break-out to the far wing.',
        note1:
          'The right pivot fights on his wall; the right wing, facing him, alternates sandwiches and turns. The centre forward, slightly behind, sweeps and screens; the back supports. The left wing stays out.',
        note2:
          'Blocked, the pivot relays: he flicks the puck to the back, who carries the break-out. The pivot gets back at once.',
        note3: 'The back passes to the centre forward, lying in wait.',
        note4:
          'Who sends it on to the left wing, who stayed off the wall: he is the one who counter-attacks.',
      },
      slide: {
        name: 'Sliding defence',
        hint: 'Everyone’s depth as the puck comes deeper, play on the left.',
        note1:
          'Puck at our forwards, on the left: the left wing presses, the centre forward supports. The pivots are up, ready to drop back fast; the far wing slightly ahead of the centre forward, to avoid a flat pass.',
        note2:
          'Puck at our pivot: the left pivot engages; the far pivot drops level with the back, ready to cover or support. The far wing level with the centre forward.',
        note3:
          'Puck at our back: the far pivot covers the goal, the forwards race back, the far wing deeper than the centre forward.',
      },
      wingSwitch: {
        name: 'Switching wings',
        hint: 'The puck goes back and comes out on the free wing.',
        note1:
          'The right wing, pinned on the wall, draws the Blacks to that side.',
        note2: 'He turns and passes back to the right pivot.',
        note3: 'The right pivot passes to the back, who crosses over.',
        note4:
          'The back passes to the left pivot, slightly behind: the puck always lands in front of the receiver.',
        note5:
          'The left pivot sends it on to the left wing, alone on that side. Only when the defence is pinned on the wall.',
      },
      penalty: {
        name: 'Two-on-one penalty',
        hint: 'A feint one way, the puck lifted behind the defender, the second attacker finishes.',
        note1:
          'Penalty: both attackers on the surface, one behind the other, level with the puck; the defender touches the wall above the goal. Five seconds to take the puck.',
        note2:
          'The first attacker takes the puck and goes one way; the defender follows.',
        note3:
          'He lifts the puck behind the defender; the second attacker, gone the other way, is already there.',
        note4: 'He pushes it into the trough: goal.',
      },
      freePuckPivots: {
        name: 'Free puck taken by the pivots',
        hint: 'From “Tactique de base du hockey subaquatique”: only the pivots take it, with a feint, and only in their half.',
        note1:
          'Free puck in their half: both pivots above the puck, and only they take it. The Blacks move 3 m back; the forwards wait for the pass, the back covers.',
        note2:
          'On the signal, one pivot dives first and heads for the wall as if carrying the puck; a Black falls for the feint.',
        note3:
          'The other pivot, right behind, takes the puck and passes to the centre forward. In our own half, no feint: keep it simple.',
      },
      freePuckBack: {
        name: 'Free puck taken by the back',
        hint: 'From the CIBPL-FFESSM “Le coup franc” sheet: the back takes the puck, pushes on, then shoots to the forwards.',
        note1:
          'Free puck for White: the forwards face their opposite numbers on the 3 m line marked by the referees; the back above the puck, one pivot beside him, the other further back, in cover.',
        note2:
          'On the signal, the back dives, takes the puck and pushes on until the first opponent; the nearby pivot follows. The forwards slow the Blacks by getting between them and the puck, without hooking or pushing.',
        note3:
          'He shoots to his forwards, free to receive, and follows his puck: if it is blocked, he can win it back. The other pivot stays in cover: if the puck is lost, he is the last line of defence.',
      },
      twoOnOne: {
        name: 'Two on one',
        hint: 'Two attackers get past a defender: the carrier commits him, the pass goes at the right moment.',
        note1:
          'Two on one: the carrier and his partner set off together, within passing distance of each other; the defender waits for them in the middle of the pool.',
        note2:
          'The carrier swims straight at the defender to make him commit; the partner stays wide, ready to receive.',
        note3:
          'As soon as the defender commits, the pass goes in front of him: too early, and he has only one player to follow; too late, and the carrier is caught.',
        note4:
          'The receiver accelerates at once, even if the puck is not cleanly controlled. Once past the defender, the next pair goes; then try the pass behind him, dummies, turns.',
      },
      passThree: {
        name: 'Passing in threes',
        hint: 'Three players move the puck forward pass after pass, taking turns on the bottom.',
        note1:
          'In threes, numbered: the puck moves in a straight line, pass after pass, one lane width at a time. There is always a player on the bottom with it.',
        note2:
          '2 dives in front of 1, who passes to him, then goes up to breathe while following the play with his eyes; 3 moves up on the surface.',
        note3:
          '3 dives in turn in front of the receiver; 2 passes and goes up. Carry the puck as little as possible: every breath-hold stays short.',
        note4:
          '1, back on the surface, drops in front of 3, and so on. No pass if nobody is down in front: wait. Variations: sideways or backward passes, changes of direction.',
      },
      wallRelay: {
        name: 'Relay along the wall',
        hint: 'Two players take turns on the bottom along the wall to keep the puck and wear the defender down.',
        note1:
          'Along the wall, the carrier is stopped by a defender; his teammate follows on the surface, just behind him.',
        note2:
          'Blocked, he passes the puck back to his teammate, who has dropped down behind him, then goes up to breathe.',
        note3:
          'He gets back behind his teammate at once, ready to drop down for the next relay: everything depends on how fast he does it.',
        note4:
          'Relay after relay, the defender runs out of air and goes up: the pair gains ground along the wall, towards the opposing goal.',
      },
      piggyInMiddle: {
        name: 'Piggy in the middle',
        hint: 'Two pairs pass the puck across a band guarded by a third.',
        note1:
          'Three bands marked by the lane lines on the bottom: a pair of Whites on each side, two Blacks in the middle. Everyone stays in their band, reaching out of it no further than a forearm.',
        note2:
          'The outer pairs pass the puck across the middle band. One pass only between partners, and no holding the puck while waiting for the opponents to go up.',
        note3: 'The middle pair watches for the pass and intercepts it.',
        note4:
          'With the puck won, they try to flick it over an outer pair, beyond its band.',
      },
    },
    replaced: 'The board draft was replaced.',
    count: {
      one: '{count} play',
      other: '{count} plays',
    },
    current: 'Open on the board',
    exportAll: 'Export the library',
    importedMany: {
      one: '{count} play imported.',
      other: '{count} plays imported.',
    },
    importSkipped: {
      one: '{count} unreadable play skipped.',
      other: '{count} unreadable plays skipped.',
    },
    search: 'Search plays',
    sort: 'Sort',
    sortRecent: 'Most recent',
    sortName: 'By name',
    sortSteps: 'By number of steps',
    countFiltered: '{shown} of {total}',
    noMatch: 'No play matches “{query}”.',
    duplicate: 'Duplicate “{name}”',
    copySuffix: '(copy)',
    copySuffixN: '(copy {n})',
    moreActions: 'More actions',
    cardActions: 'Actions for “{name}”',
    menuShare: 'Share the link',
    menuExport: 'Export the file',
    menuDuplicate: 'Duplicate',
    menuRemove: 'Delete',
    duplicated: '“{name}” added to the library.',
    title: 'Plays',
    loading: 'Loading plays',
    empty: 'No saved play yet.',
    emptyAccount: 'No play in your account yet.',
    emptyAccountHint:
      'The ones on this device are below: add them to your account, or start one on the board.',
    outsideTitle: 'On this device, outside your account',
    outsideHint:
      'Saved before you signed in, or by someone else on this device. They do not follow your account and go nowhere without you.',
    adopt: 'Add to my account',
    adoptAll: {
      one: 'Add this play to my account',
      other: 'Add all {count} to my account',
    },
    adopted: {
      one: '{count} play added to your account.',
      other: '{count} plays added to your account.',
    },
    emptyHint:
      'A play is a phase of the game, step by step. Start one on the board, or open an example to see what it can show.',
    open: 'Open',
    share: 'Share',
    shareText: 'An underwater hockey play, to open in Mister UWH Tactic',
    copied: 'Link copied',
    export: 'Export',
    import: 'Import a play',
    imported: '“{name}” imported.',
    importFailed: 'File rejected: {error}',
    remove: 'Delete “{name}”',
    removed: '“{name}” deleted',
    undo: 'Undo',
  },
  notes: {
    title: 'Coach notes',
    loading: 'Loading notes',
    empty: 'No notes yet.',
    emptyHint: 'A cue, a session debrief, what to say at the next practice.',
    add: 'Add',
    field: 'New note',
    placeholder: 'Cue, session debrief…',
    remove: 'Delete',
    removed: 'Note deleted',
    undo: 'Undo',
    count: {
      one: '{count} note',
      other: '{count} notes',
    },
    sync: {
      refused: {
        one: '{count} write refused by the database: {error}',
        other: '{count} writes refused by the database: {error}',
      },
      retry: 'Retry',
    },
    stale:
      'Network unavailable: this is the copy saved {when}. Notes may have changed since.',
  },
  settings: {
    dataHint:
      'Your plays and your notes, each in a file to keep or carry to another device. A single play is exported from the Plays screen.',
    sync: 'Sync',
    syncLocal: 'Everything stays on this device: nothing goes to a server.',
    syncRemote: 'Notes and plays sync with {kind} once you are signed in.',
    developers: 'For developers',
    developersHint:
      'Variables read at build time, and what replaces them when missing.',
    title: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    exportSchemas: 'Export my plays',
    data: 'Your data',
    export: 'Export my notes',
    import: 'Import my notes',
    importConfirm: 'Replace the current notes?',
    importBody:
      'The file will replace everything on this device. Export first if you want to keep the current state.',
    imported: {
      one: '{count} note imported.',
      other: '{count} notes imported.',
    },
    importFailed: 'File rejected: {error}',
    reset: 'Erase my notes',
    resetConfirm: 'Erase all notes?',
    resetBody: 'This cannot be undone.',
    backend: 'Data source',
    backendLocal: 'This device only',
    accountOpen: 'Open the account',
  },
  account: {
    title: 'Account',
    localMode: 'Local mode',
    localModeBody:
      'Accounts are not enabled on this installation: your plays and notes stay on this device. To keep them, export them from Settings.',
    signOut: 'Sign out',
    admin: 'Admin',
    linkIntro:
      'A one-time link lands in your inbox: no password to remember, none to steal.',
    linkSentTitle: 'Link sent',
    linkSentBody:
      'A link was just sent to {email}. Open it from this device: it brings you back here, signed in. It only works once.',
    linkAgain: 'Send another link',
    usePassword: 'Sign in with a password',
    useLink: 'Send me a link instead',
    danger: {
      title: 'Danger zone',
      body: 'Deleting your account erases your notes, your saved schemas, your profile and the account itself. Nothing is kept, and this cannot be undone.',
      action: 'Delete my account',
      confirmLabel: 'Type your address again to confirm',
      confirmHint: 'The account address is {email}.',
      confirm: 'Delete permanently',
      cancel: 'Cancel',
      mismatch: 'The address does not match: nothing was deleted.',
      failed: 'Deletion failed: {error}',
    },
  },

  about: {
    title: 'About',
    what: 'A tactics board to explain a play by the pool: the pitch drawn to the international rules, six players per team to name, turn, bring to the surface or send to the bottom, and four substitutes in their zone; the usual line-ups (3-2-1, 2-2-2, 1-2-1-2…); three water referees with their field of view, and the deck referee. A play is described in steps, replayed as an animation, and also seen in 3D, at the real depth of the pool. Everything stays on the device; a play is shared with a plain link.',
  },
};

export const messages = { fr, en };
export type Messages = typeof fr;
