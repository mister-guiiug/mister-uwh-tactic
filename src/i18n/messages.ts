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
    givePuck: 'Donner le palet',
    whichToken: 'Plusieurs jetons ici : lequel ?',
    dropPuck: 'Lâcher le palet',
    carrying:
      'Il porte le palet : au bout de sa crosse, au fond. S’il remonte, il le lâche.',
    puckCarried: 'Palet, porté par {name}',
    playerApnea: 'Son apnée (s)',
    playerApneaHint: 'Vide : le seuil du schéma, {seconds} s.',
    decision: 'Arrêt de jeu',
    decisionNone: 'Aucun',
    decisionStage: 'Arrêt de jeu · {decision}',
    decisions: {
      free: 'Coup franc pour les {team}',
      goal: 'But des {team}',
      penalty: 'Tir de pénalité pour les {team}',
      timeout: 'Temps mort',
    },
    followPuck: 'Placer les arbitres autour du palet',
    flickHeight: 'Hauteur d’un flick (cm)',
    flickHeightHint:
      'Juste de quoi passer au-dessus d’un joueur allongé ; aucun document ne la chiffre.',
    puckSection: 'Le palet',
    followPuckHint:
      'Deux arbitres de part et d’autre du palet, à 3,5 m, face à lui ; le troisième en retrait, du côté où il y a le plus d’eau.',
    alertsTitle: 'Alertes de l’étape {step}',
    alertApnea: '{name} dépasse son apnée : {seconds} s pour {limit} s.',
    alertFast:
      '{name} : {speed} m/s pour rejoindre cette étape, au-delà de {limit} m/s.',
    alertBlind: 'Aucun arbitre de l’eau ne voit le palet.',
    alertMasked:
      '{referee} a le palet dans son champ, mais {player} le lui cache.',
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
  guide: {
    title: 'Votre première phase',
    progress: 'Votre première phase : geste {n} sur {total}',
    dive: 'Touchez un joueur blanc, puis « Descendre au fond ».',
    puck: 'Toujours ce joueur choisi : « Donner le palet ».',
    step: 'Ajoutez une étape avec « + » sous le tableau, puis glissez le porteur vers l’avant.',
    play: 'Touchez « ▶ Lire » : les joueurs nagent d’une étape à l’autre.',
    done: 'C’est une phase de jeu ! Enregistrez-la pour la retrouver.',
    finish: 'Terminer',
    skip: 'Passer le guide',
  },
  feedback: {
    title: 'Votre avis sur le mode simple',
    question: 'Le tableau est-il facile à utiliser ?',
    yes: 'Oui',
    notYet: 'Pas encore',
    tellUs: 'Dites-nous ce qui bloque : chaque retour change la suite.',
    byMail: 'Écrire par courriel',
    onGithub: 'Proposer sur GitHub',
    close: 'Fermer',
    issueTitle: 'Mode simple : ce qui bloque',
    mailIntro: 'Ce qui est difficile sur le tableau, et sur quel appareil :',
  },
  simple: {
    title: 'Mode simple',
    hint: 'Touchez un joueur pour le régler ; glissez-le pour le déplacer.',
    allSettings: 'Tous les réglages',
    dive: 'Descendre au fond',
    surface: 'Remonter',
    pass: 'Passe à…',
    passPick: 'Touchez le joueur qui reçoit la passe.',
    passDone: 'Passe de {from} à {to}.',
    cancel: 'Annuler',
    deselect: 'Ne plus choisir ce joueur',
    welcome:
      'Mode simple : six contre six, des pions, l’essentiel au doigt. Le mode complet garde tout le reste.',
    keep: 'Garder le mode simple',
    toAdvanced: 'Mode complet',
    toSimple: 'Mode simple',
    modeHint:
      'Simple : des pions, des gestes, une frise courte. Complet : outils, 3D, onglets, arbitres, apnée. Rien ne se perd en passant de l’un à l’autre.',
    modeLabel: 'Affichage du tableau',
    view3d: 'Voir en 3D',
    view2d: 'Revenir en 2D',
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
    maxSpeed: 'Vitesse maximale (m/s)',
    recovery: 'Récupération en surface',
    recoveryOption: '{pct} % du temps passé au fond',
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

export { fr };
export type Messages = typeof fr;
