import type { Messages } from './messages.ts';

/**
 * LES TEXTES ALLEMANDS, chargés à la demande comme l'anglais (`loadLocale`).
 *
 * TRADUITS PAR UNE MACHINE, PAS ENCORE RELUS PAR UN JOUEUR : la relecture et
 * les termes douteux sont listés dans l'ADR 0024. Le VDST ne publie le
 * règlement CMAS qu'en anglais ; les termes viennent donc de l'usage des
 * clubs (« Puck », « Schläger », « Torrinne », « Freistoß », « Penalty »,
 * « Wasserschiedsrichter », « Hauptschiedsrichter », « Wechselzone »), et
 * « Puck », « Flick », « Penalty » restent tels que les joueurs les disent.
 * Un « schéma » est un « Spielzug ». Tutoiement, comme dans les clubs.
 */
export const de: Messages = {
  app: {
    name: 'Mister UWH Tactic',
    tagline:
      'Taktiktafel für Unterwasserhockey: Spieler, Schiedsrichter und Puck platzieren, Spielzüge teilen und in 3D ansehen.',
    loadingScreen: 'Bildschirm wird geladen',
  },
  nav: {
    more: 'Mehr',
    home: 'Tafel',
    schemas: 'Spielzüge',
    seances: 'Trainings',
    notes: 'Notizen',
  },
  board: {
    workspace: 'Arbeitsbereich',
    statusSaved: 'Gespeichert',
    layers: 'Ebenen',
    menuShare: 'Teilen',
    menuShow: 'Zeigen',
    menuSchema: 'Spielzug',
    toolSelectShort: 'Wählen',
    toolMoveShort: 'Bewegen',
    cameraPovShort: 'Spieler',
    cameraUnderwaterShort: 'Tauchen',
    speedCycle: 'Wiedergabetempo: {speed}, ändern',
    apneaOpen: 'Apnoe',
    breadcrumb: 'Brotkrümelpfad',
    statusDirty: 'Seit dem Speichern geändert',
    statusDraft: 'Ungespeicherter Entwurf',
    more: 'Weitere Aktionen',
    menuTitle: 'Aktionen für den Spielzug',
    newHint: 'Beginnt neu mit einer leeren Tafel, in Startaufstellung.',
    presentHint: 'Vollbild, der Bildschirm bleibt an.',
    steps: 'Schritte',
    stepChip: 'Schritt {step}',
    stepWord: 'Schritt',
    details: 'Details zum Spielstein',
    carryForward: 'Diese Position in den folgenden Schritten behalten',
    carryForwardGroup: 'Diese Positionen in den folgenden Schritten behalten',
    carried: {
      one: 'Position in den nächsten Schritt übernommen.',
      other: 'Position in die nächsten {count} Schritte übernommen.',
    },
    mirror: 'Spielzug spiegeln: links ↔ rechts',
    mirrorHint:
      'Die Spieler im Wasser, der Puck und die Pfeile wechseln die Seite; Offizielle und Wechselspieler bleiben, wo sie sind.',
    mirrored: 'Spielzug gespiegelt.',
    tipsTitle: 'Erste Schritte',
    tip1: 'Tippe einen Spieler an und zieh ihn. Zum Zoomen die Tafel mit zwei Fingern aufziehen.',
    tip2: '„+“ unter der Tafel fügt einen Schritt hinzu, eine Kopie des aktuellen: Du bewegst nur, wer sich bewegt.',
    tip3: '„⋯“ teilt den Spielzug: Link, Bild des Schritts, QR-Code, Blatt zum Ausdrucken.',
    tipsDone: 'Verstanden',
    poolDefault:
      'Becken für neue Spielzüge: {length} × {width} m, {depth} m tief.',
    poolRemember: 'Dieses Becken für neue Spielzüge merken',
    poolRemembered: 'Dieses Becken wird für neue Spielzüge verwendet.',
    resetZoom: 'Ganzes Becken',
    stepChipWarn: 'Schritt {step}, Apnoe über der Grenze',
    playback: 'Wiedergabe',
    selectionNone: 'Kein Spielstein ausgewählt.',
    keyboard: 'Mit der Tastatur',
    shortcuts:
      'Leertaste: abspielen oder anhalten. Komma und Punkt: vorheriger, nächster Schritt. Strg+Z und Strg+Y: rückgängig, wiederholen. Strg+S: speichern. Strg+K: die Befehlspalette. Zwei Finger, Strg und Mausrad oder + und − auf einem Spielstein: zoomen; 0: ganzes Becken; den Hintergrund ziehen, um sich zu bewegen.',
    officials: 'Offizielle',
    display: 'Anzeige',
    squad: 'Spieler',
    ecoHint: 'Ohne Schatten und Spiegelungen: für ein Handy, das heiß wird.',
    playingLocked: 'Wiedergabe läuft: zum Bearbeiten anhalten.',
    title: 'Tafel',
    view: 'Ansicht',
    view2d: '2D',
    view3d: '3D',
    camera: 'Kamera',
    cameraStand: 'Tribüne',
    cameraTop: 'Von oben',
    cameraUnderwater: 'Unter Wasser',
    cameraPov: 'Spielersicht',
    cameraPovHint:
      'Tippe einen Spieler oder Schiedsrichter an: Die Kamera übernimmt seine Sicht.',
    loading3d: '3D-Ansicht wird geladen',
    pool3d:
      '3D-Ansicht des Beckens: Spieler, Schiedsrichter und Puck in ihrer Tiefe. Die 2D-Tafel zeigt dieselbe Stellung.',
    unavailable3d:
      '3D ist auf diesem Gerät nicht verfügbar (WebGL ist aus). Die 2D-Tafel funktioniert weiter.',
    pitch: 'Unterwasserhockey-Spielfeld, von oben gesehen',
    help: 'Pfeiltasten: einen halben Meter bewegen (Umschalt: zehn Zentimeter). Q und E: drehen. S: Oberfläche oder Boden. Enter: bearbeiten. Esc: Auswahl aufheben.',
    puck: 'Puck',
    puckSelected: 'Puck ausgewählt: Zieh ihn.',
    whitePlayer: 'Weiß {number}',
    blackPlayer: 'Schwarz {number}',
    referee: 'Schiedsrichter {number}',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    undoKeys: 'Rückgängig (Strg+Z)',
    redoKeys: 'Wiederholen (Strg+Y)',
    viewBoth: 'Nebeneinander',
    present: 'Präsentieren',
    stopPresenting: 'Präsentation beenden',
    tool: 'Werkzeug',
    toolSelect: 'Auswählen',
    toolHint:
      'Werkzeug {kind}: Zieh über das Spielfeld, von einem Spielstein oder einem Punkt aus, um den Pfeil zu zeichnen.',
    eco: 'Energiesparmodus',
    groupSelected: '{count} Spielsteine ausgewählt',
    rotateGroupLeft: 'Auswahl nach links drehen',
    rotateGroupRight: 'Auswahl nach rechts drehen',
    deselect: 'Auswahl aufheben',
    selectWhite: 'Weiß auswählen',
    selectBlack: 'Schwarz auswählen',
    duration: 'Dauer von Schritt {step} (s)',
    ghosts: 'Geist des vorherigen Schritts',
    substituteWith: 'Ersetzen durch',
    substituteNone: 'Kein Wechselspieler angezeigt',
    substituteDo: 'Einwechseln',
    deckReferee: 'Hauptschiedsrichter',
    substitute: 'Wechselspieler',
    whiteSubs: 'Wechselspieler Weiß',
    blackSubs: 'Wechselspieler Schwarz',
    deckRefereeShown: 'Hauptschiedsrichter, am Beckenrand',
    formation: 'Aufstellung',
    formationHint:
      'Stellt die sechs Spieler einer Mannschaft im Wasser auf, in ihrer Hälfte, im aktuellen Schritt. Von vorn nach hinten gelesen: 3-2-1 sind drei Stürmer (links, Mitte, rechts), zwei Pivots und ein Verteidiger – LS, MS, RS, LP, RP und V, sobald benannt.',
    formationTeam: 'Mannschaft',
    formationPick: 'Aufstellung',
    formationApply: 'Mannschaft aufstellen',
    formationNames: 'Spieler nach ihrer Position benennen',
    formationDone: '{team} im {formation}.',
    teamWhite: 'Weiß',
    teamBlack: 'Schwarz',
    role: '{side}{line}',
    roleFront: 'S',
    roleMiddle: 'P',
    roleBack: 'V',
    sideLeft: 'L',
    sideCentre: 'M',
    sideRight: 'R',
    surface: 'an der Oberfläche',
    underwater: 'unter Wasser',
    leftHanded: 'Linkshänder',
    leftHandedSwitch: 'Linkshänder',
    depthSurface: 'An der Oberfläche',
    depthBottom: 'Unter Wasser',
    dive: 'Abtauchen',
    surfaceUp: 'Auftauchen',
    edit: 'Bearbeiten',
    rotateLeft: 'Nach links drehen',
    rotateRight: 'Nach rechts drehen',
    hint: 'Tippe einen Spielstein an, um ihn auszuwählen; zieh ihn, um ihn zu bewegen.',
    schemaName: 'Name des Spielzugs',
    untitled: 'Spielzug ohne Titel',
    defaultName: 'Spielzug vom {date}',
    save: 'Speichern',
    saved: '„{name}“ gespeichert.',
    saveFailed: 'Speichern nicht möglich: Der Speicher hat abgelehnt.',
    new: 'Neuer Spielzug',
    newDone: 'Leere Tafel, in Startaufstellung.',
    sharedOpened:
      'Geteilter Spielzug geöffnet. Speichere ihn, um ihn zu behalten.',
    sharedInvalid: 'Dieser Link ist unlesbar oder unvollständig.',
    previous: 'Vorheriger Schritt',
    next: 'Nächster Schritt',
    stepOf: 'Schritt {step} / {total}',
    play: 'Abspielen',
    pause: 'Pause',
    speed: 'Wiedergabetempo',
    addStep: 'Schritt hinzufügen',
    removeStep: 'Schritt löschen',
    moveStepEarlier: 'Schritt nach vorn verschieben',
    moveStepLater: 'Schritt nach hinten verschieben',
    kickoff: 'Zurück zum Spielbeginn',
    givePuck: 'Puck geben',
    whichToken: 'Mehrere Spielsteine hier: welcher?',
    dropPuck: 'Puck loslassen',
    carrying:
      'Er führt den Puck: am Ende seines Schlägers, am Boden. Taucht er auf, lässt er ihn los.',
    puckCarried: 'Puck, geführt von {name}',
    playerApnea: 'Eigene Apnoe (s)',
    playerApneaHint: 'Leer: die Grenze des Spielzugs, {seconds} s.',
    decision: 'Spielunterbrechung',
    decisionNone: 'Keine',
    decisionStage: 'Spielunterbrechung · {decision}',
    decisions: {
      free: 'Freistoß für {team}',
      goal: 'Tor für {team}',
      penalty: 'Penalty für {team}',
      timeout: 'Auszeit',
    },
    followPuck: 'Schiedsrichter um den Puck stellen',
    flickHeight: 'Höhe eines Flicks (cm)',
    flickHeightHint:
      'Gerade genug, um über einen am Boden liegenden Spieler zu kommen; kein Dokument nennt eine Zahl.',
    puckSection: 'Der Puck',
    followPuckHint:
      'Zwei Schiedsrichter beiderseits des Pucks, 3,5 m entfernt, ihm zugewandt; der dritte weiter hinten, auf der Seite mit mehr Wasser.',
    alertsTitle: 'Warnungen in Schritt {step}',
    alertApnea:
      '{name} überschreitet die eigene Apnoe: {seconds} s bei {limit} s.',
    alertFast:
      '{name}: {speed} m/s, um diesen Schritt zu erreichen, mehr als {limit} m/s.',
    alertBlind: 'Kein Wasserschiedsrichter sieht den Puck.',
    alertMasked: '{referee} hat den Puck im Blick, aber {player} verdeckt ihn.',
    note: 'Anweisung für Schritt {step}',
    notePlaceholder: 'Was jeder in diesem Moment des Spielzugs tun soll',
    stepCount: {
      one: '{count} Schritt',
      other: '{count} Schritte',
    },
    setup: 'Spieler, Schiedsrichter und Becken',
    whiteCount: 'Weiße Spieler im Wasser',
    blackCount: 'Schwarze Spieler im Wasser',
    refereeCount: 'Schiedsrichter im Wasser',
    refereeLine: 'Linie zwischen Schiedsrichtern',
    refereeLineNone: 'Keine',
    refereeLinePair: 'Schiedsrichter {a} und {b}',
    fieldOfView: 'Sichtfeld der Schiedsrichter',
    labels: 'Namen unter den Spielsteinen',
    pool: 'Becken',
    length: 'Länge (m)',
    width: 'Breite (m)',
    depthField: 'Tiefe (m)',
    poolHint:
      'Internationale Regeln: 21 bis 25 m lang, 12 bis 15 m breit, 2 bis 3,65 m tief.',
    name: 'Name',
    nameHint:
      'Vorname oder Position („LS“, „RP“). Gilt für den ganzen Spielzug.',
    depth: 'Tiefe in Schritt {step}',
    heading: 'Ausrichtung: {angle}° (Schritt {step})',
    done: 'Fertig',
  },
  panel: {
    label: 'Einstellungen des Spielzugs',
    loading: 'Reiter wird geladen',
    token: 'Spielstein',
    step: 'Schritt',
    teams: 'Mannschaften',
    rules: 'Regeln',
    pool: 'Becken',
    expand: 'Bereich vergrößern',
    collapse: 'Bereich verkleinern',
    alerts: {
      one: '{count} Warnung',
      other: '{count} Warnungen',
    },
  },
  lexique: {
    title: 'Glossar',
    intro:
      'Die Wörter vom Beckenrand: Techniken, Zusammenspiel, Positionen und Regeln.',
    search: 'Wort suchen',
    none: 'Kein Wort passt zu „{query}“.',
    definitionOf: 'Bedeutung von „{term}“',
    open: 'Im Glossar ansehen',
    inNote: 'Im Glossar:',
    sources:
      'Definitionen neu geschrieben nach Ausbildungsunterlagen: Blätter der CIBPL-FFESSM (Übungsleiter Unterwasserhockey), „Fondamentaux techniques et tactiques“, „Tactique de base du hockey subaquatique“, Leitfäden der Tasmanian und der Wellington Underwater Hockey Association sowie die Verbandsregeln zum Tor. Die deutsche Übersetzung hat noch kein Spieler gegengelesen.',
    groups: {
      gestes: 'Die Techniken',
      collectif: 'Das Zusammenspiel',
      postes: 'Die Positionen',
      regles: 'Regeln und Schiedsrichter',
    },
  },
  plus: {
    title: 'Mehr',
    settingsHint: 'Darstellung, Sprache, deine Daten, Synchronisierung.',
    accountHint: 'Anmeldung, wenn eine Synchronisierung eingerichtet ist.',
    aboutHint: 'Was die App macht, und ihre Schwestern aus der Familie.',
    lexiqueHint: 'Die Wörter des Spiels, mit ihrer Bedeutung.',
    notesHint: 'Deine Trainingsnotizen, Einheit für Einheit.',
  },
  seances: {
    title: 'Trainings',
    intro:
      'Reihe Spielzüge aus der Bibliothek zu einem Training — eine Dauer und eine Anweisung pro Phase — und präsentiere sie am Beckenrand, eine Phase nach der anderen.',
    create: 'Neues Training',
    empty: 'Plane dein erstes Training',
    emptyHint:
      'Ein Training reiht Spielzüge aus der Bibliothek aneinander: das Aufwärmen, eine Spielphase, eine Übung.',
    untitled: 'Training ohne Titel',
    summary: {
      one: '{count} Phase · {minutes} min',
      other: '{count} Phasen · {minutes} min',
    },
    presentNamed: '„{name}“ präsentieren',
    present: 'Training präsentieren',
    nothingToPresent:
      'Keine Phase dieses Trainings hat ihren Spielzug in der Bibliothek.',
    notFound: 'Training nicht gefunden',
    notFoundHint: 'Vielleicht wurde es gelöscht.',
    back: 'Alle Trainings',
    name: 'Name des Trainings',
    namePlaceholder: 'Dienstag: Befreiung von der Wand und Ablösungen',
    missing: 'Spielzug nicht in der Bibliothek gefunden',
    up: '„{name}“ nach oben',
    down: '„{name}“ nach unten',
    removeItem: '„{name}“ aus dem Training entfernen',
    minutes: 'Dauer von Phase {n} (min)',
    note: 'Anweisung für Phase {n}',
    notePlaceholder: 'Was die Spieler sich merken sollen',
    noItems: 'Noch keine Phase: Füge einen Spielzug aus der Bibliothek hinzu.',
    noSchemas:
      'Die Bibliothek ist leer: Speichere zuerst einen Spielzug oder ein Beispiel.',
    toLibrary: 'Bibliothek öffnen',
    pick: 'Spielzug zum Hinzufügen',
    pickPlaceholder: 'Spielzug wählen…',
    add: 'Zum Training hinzufügen',
    full: 'Ein Training hat höchstens {max} Phasen.',
    remove: 'Training löschen',
    removed: 'Training „{name}“ gelöscht.',
    phaseOf: 'Phase {n} / {total}',
    minutesShort: '{n} min',
    previous: 'Vorherige Phase',
    next: 'Nächste Phase',
    clockLeft: 'Verbleibende Zeit der Phase: {time}',
    clockOver: 'Zeit der Phase um {time} überschritten',
    timeUp: 'Die Zeit ist um: Weiter zur nächsten Phase.',
    pauseClock: 'Stoppuhr anhalten',
    resumeClock: 'Stoppuhr fortsetzen',
    print: 'Drucken',
    printStep: 'Schritt {n}',
    loading: 'Trainings werden geladen',
    outsideHint:
      'Vor deiner Anmeldung vorbereitet oder von jemand anderem auf diesem Gerät. Zu deinem Konto hinzugefügt, nehmen sie die Spielzüge mit, die sie präsentieren.',
    adoptAll: {
      one: 'Dieses Training zu meinem Konto hinzufügen',
      other: 'Alle {count} zu meinem Konto hinzufügen',
    },
    adopted: {
      one: '{count} Training zu deinem Konto hinzugefügt.',
      other: '{count} Trainings zu deinem Konto hinzugefügt.',
    },
    share: 'Teilen',
    shareTitle: 'Training teilen',
    shareLink: 'Link zum Training',
    shareSend: 'Link senden',
    sharePreparing: 'Link wird vorbereitet…',
    shareText: 'Ein Unterwasserhockey-Training, zu öffnen in Mister UWH Tactic',
    shareHint: {
      one: 'Der Link trägt das Training und seinen Spielzug in der Adresse selbst: Er läuft über keinen Server.',
      other:
        'Der Link trägt das Training und seine {count} Spielzüge in der Adresse selbst: Er läuft über keinen Server.',
    },
    shareMissing: {
      one: '{count} Phase ohne Spielzug wird nicht mitgeschickt.',
      other: '{count} Phasen ohne Spielzug werden nicht mitgeschickt.',
    },
    shareQrAlt: 'QR-Code des Links zu diesem Training',
    shareQrTooLong:
      'Zu lang für einen QR-Code ({bytes} Byte von {max}): Sende den Link.',
    sharedOpened: 'Training „{name}“ empfangen, mit seinen Spielzügen.',
    sharedInvalid: 'Dieser Trainingslink ist unlesbar oder unvollständig.',
  },
  guide: {
    title: 'Dein erster Spielzug',
    progress: 'Dein erster Spielzug: Handgriff {n} von {total}',
    dive: 'Tippe einen weißen Spieler an, dann „Zum Boden tauchen“.',
    puck: 'Mit demselben Spieler: „Puck geben“.',
    step: 'Füge mit „+“ unter der Tafel einen Schritt hinzu und zieh den Puckführer nach vorn.',
    play: 'Tippe auf „▶ Abspielen“: Die Spieler schwimmen von einem Schritt zum nächsten.',
    done: 'Das ist ein Spielzug! Speichere ihn, um ihn wiederzufinden.',
    finish: 'Fertig',
    skip: 'Anleitung überspringen',
  },
  feedback: {
    title: 'Deine Meinung zum einfachen Modus',
    question: 'Ist die Tafel einfach zu bedienen?',
    yes: 'Ja',
    notYet: 'Noch nicht',
    tellUs: 'Sag uns, was hakt: Jede Rückmeldung verändert, was kommt.',
    byMail: 'Per E-Mail schreiben',
    onGithub: 'Auf GitHub vorschlagen',
    close: 'Schließen',
    issueTitle: 'Einfacher Modus: was hakt',
    mailIntro: 'Was an der Tafel schwierig ist, und auf welchem Gerät:',
  },
  simple: {
    title: 'Einfacher Modus',
    hint: 'Tippe einen Spieler an, um ihn einzustellen; zieh ihn, um ihn zu bewegen.',
    allSettings: 'Alle Einstellungen',
    dive: 'Zum Boden tauchen',
    surface: 'Auftauchen',
    pass: 'Pass zu…',
    passPick: 'Tippe den Spieler an, der den Pass bekommt.',
    passDone: 'Pass von {from} zu {to}.',
    cancel: 'Abbrechen',
    deselect: 'Diesen Spieler abwählen',
    welcome:
      'Einfacher Modus: sechs gegen sechs, Spielsteine, das Wichtigste unter dem Finger. Der vollständige Modus behält alles andere.',
    keep: 'Einfachen Modus behalten',
    toAdvanced: 'Vollständiger Modus',
    toSimple: 'Einfacher Modus',
    modeHint:
      'Einfach: Spielsteine, Gesten, eine kurze Zeitleiste. Vollständig: Werkzeuge, 3D, Reiter, Schiedsrichter, Apnoe. Beim Wechseln geht nichts verloren.',
    modeLabel: 'Anzeige der Tafel',
    view3d: 'In 3D ansehen',
    view2d: 'Zurück zu 2D',
  },
  palette: {
    label: 'Befehlspalette',
    placeholder: 'Ein Befehl, ein Spielzug, ein Training, ein Wort…',
    results: 'Befehle',
    none: 'Kein Befehl passt.',
    escape: 'Esc',
    play: 'Phase abspielen',
    present: 'Spielzug präsentieren',
    formation: '{formation} · {team}',
    open: '„{name}“ öffnen',
    groups: {
      go: 'Gehe zu',
      board: 'Tafel',
      formation: 'Aufstellung',
      schema: 'Spielzug',
      seance: 'Training',
      term: 'Glossar',
    },
  },
  arrows: {
    move: 'Schwimmweg',
    pass: 'Pass',
    flick: 'Flick',
    listTitle: 'Pfeile in Schritt {step}',
    describe: '{kind}, {length}',
    remove: 'Pfeil {index} löschen',
  },
  apnea: {
    title: 'Apnoe',
    hint: 'Wer am Boden ist, wer atmet und seit wann — nach der Dauer jedes Schritts.',
    limit: 'Apnoe-Grenze (s)',
    maxSpeed: 'Höchstgeschwindigkeit (m/s)',
    recovery: 'Erholung an der Oberfläche',
    recoveryOption: '{pct} % der Zeit am Boden',
    bottomNow: 'Am Boden in diesem Schritt: Weiß {white}, Schwarz {black}.',
    caption:
      'Apnoe-Zeitleiste: eine Zeile pro Spieler, eine Spalte pro Schritt.',
    player: 'Spieler',
    surface: 'Oberfläche',
    warning: 'über der Apnoe-Grenze',
  },
  situations: {
    title: 'Situationen aus dem Regelwerk',
    hint: 'Stellt den aktuellen Schritt nach den internationalen Regeln auf (CMAS, 12. Ausgabe).',
    pick: 'Situation',
    apply: 'Aufstellen',
    done: '{name}: Schritt aufgestellt.',
    kickoff: 'Spielbeginn',
    equal: 'Neutraler Puck',
    'advantage-blanc': 'Freistoß für Weiß',
    'advantage-noir': 'Freistoß für Schwarz',
    'penalty-blanc': 'Penalty gegen Weiß',
    'penalty-noir': 'Penalty gegen Schwarz',
    rule: {
      kickoff:
        'Regel 15.1: Jede Mannschaft an der Oberfläche an ihrer Stirnwand, eine Hand daran; der Hauptschiedsrichter mittig an einer Längsseite, ein Wasserschiedsrichter ihm gegenüber, die beiden anderen nahe den Kreuzungen der 5- und 2-m-Linien.',
      equal:
        'Regel 17.5: Puck an der Stelle des Fouls, nie näher als 2 m an einer Längsseite oder 5 m an einer Stirnwand; beide Mannschaften an der Oberfläche, jede auf ihrer Seite der Linie durch den Puck.',
      'advantage-blanc':
        'Regel 17.6: Die foulende Mannschaft (Schwarz) zieht sich hinter eine Linie 3 m vom Puck zurück; Weiß hat fünf Sekunden, um ihn in Besitz zu nehmen.',
      'advantage-noir':
        'Regel 17.6: Die foulende Mannschaft (Weiß) zieht sich hinter eine Linie 3 m vom Puck zurück; Schwarz hat fünf Sekunden, um ihn in Besitz zu nehmen.',
      'penalty-blanc':
        'Regel 17.8: Puck auf dem Penaltypunkt von Weiß; zwei schwarze Angreifer an der Oberfläche dahinter, ein weißer Abwehrspieler an der Wand, eine Hand daran; alle anderen in ihrer Wechselzone.',
      'penalty-noir':
        'Regel 17.8: Puck auf dem Penaltypunkt von Schwarz; zwei weiße Angreifer an der Oberfläche dahinter, ein schwarzer Abwehrspieler an der Wand, eine Hand daran; alle anderen in ihrer Wechselzone.',
    },
  },
  export: {
    title: 'Den Spielzug mitnehmen',
    hint: 'Ein Blatt zum Drucken, ein Video zum Senden, ein QR-Code zum Zeigen.',
    image: 'Bild des Schritts teilen',
    imageHint:
      'Ein PNG-Bild des Spielfelds und der Anweisung, zum Senden an die Mannschaft.',
    imageWorking: 'Bild wird erstellt…',
    link: 'Link teilen',
    linkHint:
      'Der ganze Spielzug in der Adresse: Er öffnet sich so, wie er ist, ohne Konto.',
    linkFailed: 'Der Link konnte nicht geteilt werden.',
    phaseImage: 'Bild des ganzen Spielzugs teilen',
    phaseImageHint:
      'Alle Schritte auf einem Bild, zwei pro Reihe, mit ihren Anweisungen.',
    imageSaved: 'Bild gespeichert.',
    imageFailed: 'Das Bild konnte nicht erstellt werden.',
    print: 'Blatt drucken',
    video: 'Video aufnehmen',
    recording: 'Aufnahme läuft…',
    videoHint:
      'Das Video wird aus der 3D-Ansicht aufgenommen: Öffne sie zuerst.',
    videoNeeds3d: 'Öffne die 3D-Ansicht, um das Video aufzunehmen.',
    videoSaved: 'Video gespeichert.',
    videoUnsupported: 'Dieser Browser kann kein Video aufnehmen.',
    qr: 'QR-Code anzeigen',
    qrTitle: 'Der Spielzug als QR-Code',
    qrAlt: 'QR-Code des Links zu diesem Spielzug',
    qrSize: 'Link mit {bytes} Byte, von {max} möglichen.',
    qrTooLong:
      'Dieser Spielzug hat {bytes} Byte: zu viel für einen QR-Code (höchstens {max}). Entferne Schritte oder teile den Link.',
  },
  video: {
    action: 'Spielzug als Video teilen',
    hint: 'Ein Clip von wenigen Sekunden, der direkt im Chat läuft.',
    title: 'Der Spielzug als Video',
    preparing: 'Wird vorbereitet…',
    progress: 'Bild {done} von {total}',
    progressLabel: 'Fortschritt des Videos',
    cancel: 'Abbrechen',
    ready: 'Video fertig: {seconds} s, {size}.',
    share: 'Video teilen',
    save: 'Video speichern',
    saved: 'Video gespeichert.',
    failed: 'Das Video konnte nicht erstellt werden.',
    faster: 'beschleunigt ×{speed}',
  },
  schemas: {
    create: 'Spielzug erstellen',
    example: 'Beispiele',
    exampleNote1:
      'Neutraler Puck in der Mitte: jede Mannschaft an der Oberfläche, auf ihrer Seite der Linie.',
    exampleNote2:
      'Drei Weiße tauchen gemeinsam ab und gehen auf den Puck; der Verteidiger bleibt zur Absicherung hinten.',
    exampleNote3:
      'Pass zum linken Stürmer, der durch die Mitte startet; die anderen tauchen zum Atmen auf.',
    exampleOpened: 'Beispiel auf der Tafel geöffnet.',
    examplePick: 'Beispiel öffnen',
    exampleGroups: {
      plays: 'Spielphasen',
      drills: 'Übungen',
    },
    examples: {
      neutral: {
        name: 'Beispiel: neutraler Puck und Vorstoß',
        hint: 'Ein neutraler Puck, drei Weiße tauchen ab, ein Pass auf den Flügel.',
      },
      kickoff: {
        name: 'Spielbeginn im 3-2-1',
        hint: 'Der Mittelstürmer taucht ab, die Außenstürmer folgen, der Pass geht auf einen Flügel.',
        note1:
          'Spielbeginn: alle an ihrer Stirnwand. Von links nach rechts: Verteidiger, linker Pivot, linker Stürmer, Mittelstürmer, rechter Stürmer, rechter Pivot.',
        note2:
          'Auf das Signal taucht der Mittelstürmer direkt zum Puck; die Außenstürmer folgen, eng und etwas dahinter; die Pivots staffeln sich, und der Verteidiger stellt sich mittig hinter sie. Keine halbe Drehung.',
        note3:
          'Der Mittelstürmer passt zum rechten Stürmer, der seinen Flügel hinaufzieht.',
      },
      faceOff: {
        name: 'Neutraler Puck',
        hint: 'Alle an der Oberfläche; der Mittelstürmer taucht fußwärts ab und bedient einen Flügel.',
        note1:
          'Neutraler Puck: alle an der Oberfläche bis zum Signal. Die Stürmer ihren Gegenspielern gegenüber, beiderseits der Linie der Schiedsrichter; die Pivots hinter ihnen, der Verteidiger zwischen den Pivots, etwas zurück.',
        note2:
          'Auf das Signal taucht der Mittelstürmer fußwärts ab, direkt auf den Puck: schneller als kopfwärts.',
        note3:
          'Er passt zu einem Außenstürmer oder lässt seinen Gegenspieler stehen; er taucht nicht auf, bevor der Puck auf dem Flügel ist.',
      },
      rightAttack: {
        name: 'Angriff rechts in ihrer Hälfte',
        hint: 'Der Außenstürmer führt, der Mittelstürmer wartet, die hintere Reihe rückt auf.',
        note1:
          'Angriff rechts in ihrer Hälfte: Der rechte Stürmer führt den Puck, der Mittelstürmer wartet auf den Pass, der linke Stürmer macht sich links vorn frei.',
        note2:
          'Die hintere Reihe rückt auf, um einen verlorenen Puck schnell zurückzuerobern, ohne dem Konter Raum zu lassen.',
        note3:
          'In ihrer Hälfte geht es zur Mitte des Tors: Der Außenstürmer passt zum Mittelstürmer.',
      },
      wallPlay: {
        name: 'An der Wand spielen, dann raus',
        hint: 'Die Arbeit an der Wand zwischen Außenstürmer und Pivot, dann die Befreiung zum anderen Flügel.',
        note1:
          'Der rechte Pivot kämpft an seiner Wand; der rechte Stürmer, ihm zugewandt, wechselt Sandwiches und Wenden ab. Der Mittelstürmer, etwas zurück, räumt ab und schirmt ab; der Verteidiger unterstützt. Der linke Stürmer bleibt draußen.',
        note2:
          'Blockiert, löst der Pivot ab: Er flickt den Puck zum Verteidiger, der mit der Befreiung von der Wand losschwimmt. Der Pivot ordnet sich sofort wieder ein.',
        note3:
          'Der Verteidiger passt zum Mittelstürmer, der auf der Lauer liegt.',
        note4:
          'Der spielt weiter zum linken Stürmer, der außerhalb der Wand blieb: Er ist es, der den Konter fährt.',
      },
      slide: {
        name: 'Verschiebende Abwehr',
        hint: 'Die Höhe jedes Spielers je nach Tiefe des Pucks, Aktion links.',
        note1:
          'Puck auf Höhe unserer Stürmer, links: Der linke Stürmer presst, der Mittelstürmer unterstützt. Die Pivots stehen hoch, bereit, sehr schnell zurückzuweichen; der Außenstürmer der anderen Seite etwas vor dem Mittelstürmer, gegen den Querpass.',
        note2:
          'Puck auf Höhe des Pivots: Der linke Pivot greift an; der Pivot der anderen Seite stellt sich auf Höhe des Verteidigers, bereit abzusichern oder zu unterstützen. Der Außenstürmer der anderen Seite auf Höhe des Mittelstürmers.',
        note3:
          'Puck auf Höhe des Verteidigers: Der Pivot der anderen Seite sichert das Tor, die Stürmer kommen sehr schnell zurück, der Außenstürmer der anderen Seite tiefer als der Mittelstürmer.',
      },
      wingSwitch: {
        name: 'Flügelwechsel',
        hint: 'Der Puck geht zurück und kommt auf dem freien Flügel wieder heraus.',
        note1:
          'Der rechte Stürmer, an der Wand blockiert, zieht die Schwarzen auf seine Seite.',
        note2: 'Er dreht sich um und passt zurück zum rechten Pivot.',
        note3:
          'Der rechte Pivot passt zum Verteidiger, der die Seite wechselt.',
        note4:
          'Der Verteidiger passt zum linken Pivot, etwas zurück: Der Puck kommt immer vor dem Empfänger an.',
        note5:
          'Der linke Pivot spielt weiter zum linken Stürmer, allein auf seinem Flügel. Einen Versuch wert, wenn die Abwehr an der Wand klebt.',
      },
      penalty: {
        name: 'Penalty zwei gegen eins',
        hint: 'Eine Finte zur einen Seite, der Puck hinter den Abwehrspieler gehoben, der zweite Angreifer schließt ab.',
        note1:
          'Penalty: Die beiden Angreifer an der Oberfläche, hintereinander, auf Höhe des Pucks; der Abwehrspieler berührt die Wand über dem Tor. Fünf Sekunden, um den Puck zu nehmen.',
        note2:
          'Der erste Angreifer nimmt den Puck und zieht zu einer Seite; der Abwehrspieler folgt ihm.',
        note3:
          'Er hebt den Puck hinter den Abwehrspieler; der zweite Angreifer, zur anderen Seite gestartet, ist schon da.',
        note4: 'Er schiebt ihn in die Torrinne: Tor.',
      },
      freePuckPivots: {
        name: 'Freistoß durch die Pivots',
        hint: 'Nach „Tactique de base du hockey subaquatique“: Nur die Pivots führen ihn aus, mit einer Finte, und nur in ihrer Hälfte.',
        note1:
          'Freistoß in ihrer Hälfte: Die beiden Pivots über dem Puck, nur sie führen ihn aus. Die Schwarzen weichen 3 m zurück; die Stürmer warten auf den Pass, der Verteidiger sichert ab.',
        note2:
          'Auf das Signal taucht ein Pivot zuerst ab und schwimmt zur Wand, als würde er den Puck mitnehmen; ein Schwarzer fällt auf die Finte herein.',
        note3:
          'Der andere Pivot, direkt dahinter gestartet, nimmt den Puck und passt zum Mittelstürmer. In unserer Hälfte keine Finte: einfach spielen.',
      },
      freePuckBack: {
        name: 'Freistoß durch den Verteidiger',
        hint: 'Nach dem Blatt „Le coup franc“ der CIBPL-FFESSM: Der Verteidiger nimmt den Puck, rückt vor und schießt dann zu seinen Stürmern.',
        note1:
          'Freistoß für Weiß: Die Stürmer ihren Gegenspielern gegenüber, auf der 3-m-Linie, die die Schiedsrichter markieren; der Verteidiger über dem Puck, ein Pivot neben ihm, der andere weiter hinten zur Absicherung.',
        note2:
          'Auf das Signal taucht der Verteidiger ab, nimmt den Puck und rückt bis zum ersten Gegner vor; der Pivot neben ihm folgt. Die Stürmer bremsen die Schwarzen, indem sie sich zwischen sie und den Puck stellen, ohne sie festzuhalten oder zu schieben.',
        note3:
          'Er schießt zu seinen Stürmern, die frei stehen, und folgt seinem Puck: Wird er geblockt, kann er ihn zurückholen. Der andere Pivot bleibt zur Absicherung: Geht der Puck verloren, ist er die letzte Bastion.',
      },
      twoOnOne: {
        name: 'Zwei gegen eins',
        hint: 'Zwei Angreifer überwinden einen Abwehrspieler: Der Puckführer bindet ihn, der Pass kommt im richtigen Moment.',
        note1:
          'Zwei gegen eins: Der Puckführer und sein Partner starten zusammen, in Passdistanz zueinander; der Abwehrspieler erwartet sie in der Beckenmitte.',
        note2:
          'Der Puckführer schwimmt direkt auf den Abwehrspieler zu, um ihn zum Angreifen zu zwingen; der Partner bleibt seitlich versetzt, bereit zum Annehmen.',
        note3:
          'Sobald der Abwehrspieler angreift, geht der Pass vor ihm vorbei: zu früh, und er muss nur einem Spieler folgen; zu spät, und der Puckführer ist gestellt.',
        note4:
          'Der Empfänger beschleunigt sofort, auch wenn der Puck schlecht kontrolliert ist. Ist der Abwehrspieler überwunden, startet das nächste Paar; danach den Pass hinter ihm, Finten, Wenden probieren.',
      },
      passThree: {
        name: 'Passen zu dritt in Apnoe',
        hint: 'Drei Spieler bringen den Puck Pass für Pass nach vorn und lösen sich am Boden ab.',
        note1:
          'Zu dritt, nummeriert: Der Puck wandert geradeaus, Pass für Pass, jeweils um eine Bahnbreite. Immer ist ein Spieler mit ihm am Boden.',
        note2:
          '2 taucht vor 1 ab, der ihm den Puck passt und dann zum Atmen auftaucht, das Spiel im Blick; 3 schwimmt an der Oberfläche mit nach vorn.',
        note3:
          '3 taucht seinerseits vor dem Empfänger ab; 2 passt und taucht auf. Den Puck so wenig wie möglich führen: Jede Apnoe bleibt kurz.',
        note4:
          '1, wieder an der Oberfläche, taucht vor 3 ab, und so weiter. Kein Pass, wenn niemand vorn am Boden ist: warten. Varianten: Pässe zur Seite oder nach hinten, Richtungswechsel.',
      },
      wallRelay: {
        name: 'Ablösung an der Wand',
        hint: 'Zwei Spieler lösen sich an der Wand am Boden ab, um den Puck zu halten und den Abwehrspieler zu zermürben.',
        note1:
          'An der Wand wird der Puckführer von einem Abwehrspieler gestoppt; sein Mitspieler folgt ihm an der Oberfläche, direkt hinter ihm.',
        note2:
          'Blockiert, gibt er den Puck nach hinten zu seinem Mitspieler, der hinter ihm abgetaucht ist, und taucht zum Atmen auf.',
        note3:
          'Er stellt sich sofort wieder hinter seinen Mitspieler, bereit, für die nächste Ablösung abzutauchen: Alles hängt vom Tempo dieses Einordnens ab.',
        note4:
          'Ablösung um Ablösung geht dem Abwehrspieler die Luft aus, und er taucht auf: Das Paar gewinnt an der Wand Raum, Richtung gegnerisches Tor.',
      },
      piggyInMiddle: {
        name: 'Schweinchen in der Mitte',
        hint: 'Zwei Paare passen sich den Puck über einen Streifen zu, den ein drittes bewacht.',
        note1:
          'Drei Streifen, markiert durch die Linien am Boden: ein weißes Paar auf jeder Seite, zwei Schwarze in der Mitte. Jeder bleibt in seinem Streifen und ragt höchstens eine Unterarmlänge hinaus.',
        note2:
          'Die äußeren Paare passen sich den Puck über den mittleren Streifen zu. Nur ein Pass zwischen Partnern, und den Puck nicht halten, bis der Gegner auftaucht.',
        note3: 'Das mittlere Paar lauert auf den Pass und fängt ihn ab.',
        note4:
          'Mit dem Puck versucht es, ihn über ein äußeres Paar hinweg zu flicken, über dessen Streifen hinaus.',
      },
    },
    replaced: 'Der Entwurf auf der Tafel wurde ersetzt.',
    count: {
      one: '{count} Spielzug',
      other: '{count} Spielzüge',
    },
    current: 'Auf der Tafel geöffnet',
    exportAll: 'Bibliothek exportieren',
    importedMany: {
      one: '{count} Spielzug importiert.',
      other: '{count} Spielzüge importiert.',
    },
    importSkipped: {
      one: '{count} unlesbarer Spielzug übersprungen.',
      other: '{count} unlesbare Spielzüge übersprungen.',
    },
    search: 'Spielzug suchen',
    sort: 'Sortieren',
    sortRecent: 'Neueste zuerst',
    sortName: 'Nach Name',
    sortSteps: 'Nach Anzahl der Schritte',
    countFiltered: '{shown} von {total}',
    noMatch: 'Kein Spielzug passt zu „{query}“.',
    duplicate: '„{name}“ duplizieren',
    copySuffix: '(Kopie)',
    copySuffixN: '(Kopie {n})',
    moreActions: 'Weitere Aktionen',
    cardActions: 'Aktionen für „{name}“',
    menuShare: 'Link teilen',
    menuExport: 'Datei exportieren',
    menuDuplicate: 'Duplizieren',
    menuRemove: 'Löschen',
    duplicated: '„{name}“ zur Bibliothek hinzugefügt.',
    title: 'Spielzüge',
    loading: 'Spielzüge werden geladen',
    empty: 'Noch kein Spielzug gespeichert.',
    emptyAccount: 'Noch kein Spielzug in deinem Konto.',
    emptyAccountHint:
      'Die von diesem Gerät stehen weiter unten: Füge sie deinem Konto hinzu oder beginne einen auf der Tafel.',
    outsideTitle: 'Auf diesem Gerät, außerhalb deines Kontos',
    outsideHint:
      'Vor deiner Anmeldung gespeichert oder von jemand anderem auf diesem Gerät. Sie folgen deinem Konto nicht und gehen nirgendwohin ohne dich.',
    adopt: 'Zu meinem Konto hinzufügen',
    adoptAll: {
      one: 'Diesen Spielzug zu meinem Konto hinzufügen',
      other: 'Alle {count} zu meinem Konto hinzufügen',
    },
    adopted: {
      one: '{count} Spielzug zu deinem Konto hinzugefügt.',
      other: '{count} Spielzüge zu deinem Konto hinzugefügt.',
    },
    emptyHint:
      'Ein Spielzug ist eine Spielphase in Schritten. Beginne einen auf der Tafel oder öffne ein Beispiel, um zu sehen, was er zeigen kann.',
    open: 'Öffnen',
    share: 'Teilen',
    shareText: 'Ein Unterwasserhockey-Spielzug, zu öffnen in Mister UWH Tactic',
    copied: 'Link kopiert',
    export: 'Exportieren',
    import: 'Spielzug importieren',
    imported: '„{name}“ importiert.',
    importFailed: 'Datei abgelehnt: {error}',
    remove: '„{name}“ löschen',
    removed: '„{name}“ gelöscht',
    undo: 'Rückgängig',
  },
  notes: {
    title: 'Trainernotizen',
    loading: 'Notizen werden geladen',
    empty: 'Noch keine Notizen.',
    emptyHint:
      'Eine Anweisung, eine Nachbesprechung, was du beim nächsten Training sagen willst.',
    add: 'Hinzufügen',
    field: 'Neue Notiz',
    placeholder: 'Anweisung, Nachbesprechung…',
    remove: 'Löschen',
    removed: 'Notiz gelöscht',
    undo: 'Rückgängig',
    count: {
      one: '{count} Notiz',
      other: '{count} Notizen',
    },
    sync: {
      refused: {
        one: '{count} Schreibvorgang von der Datenbank abgelehnt: {error}',
        other: '{count} Schreibvorgänge von der Datenbank abgelehnt: {error}',
      },
      retry: 'Erneut versuchen',
    },
    stale:
      'Netzwerk nicht verfügbar: Das ist die Kopie, gespeichert {when}. Die Notizen können sich seitdem geändert haben.',
  },
  settings: {
    dataHint:
      'Deine Spielzüge und deine Notizen, jeweils in einer Datei zum Aufbewahren oder zum Mitnehmen auf ein anderes Gerät. Einen einzelnen Spielzug exportierst du im Bildschirm Spielzüge.',
    sync: 'Synchronisierung',
    syncLocal: 'Alles bleibt auf diesem Gerät: Nichts geht an einen Server.',
    syncRemote:
      'Notizen und Spielzüge werden mit {kind} synchronisiert, sobald du angemeldet bist.',
    developers: 'Für Entwickler',
    developersHint:
      'Die beim Build gelesenen Variablen, und was sie ersetzt, wenn sie fehlen.',
    title: 'Einstellungen',
    appearance: 'Darstellung',
    language: 'Sprache',
    theme: 'Design',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System',
    exportSchemas: 'Meine Spielzüge exportieren',
    data: 'Deine Daten',
    export: 'Meine Notizen exportieren',
    import: 'Meine Notizen importieren',
    importConfirm: 'Die aktuellen Notizen ersetzen?',
    importBody:
      'Die Datei ersetzt alles, was auf diesem Gerät ist. Exportiere zuerst, wenn du den aktuellen Stand behalten willst.',
    imported: {
      one: '{count} Notiz importiert.',
      other: '{count} Notizen importiert.',
    },
    importFailed: 'Datei abgelehnt: {error}',
    reset: 'Meine Notizen löschen',
    resetConfirm: 'Alle Notizen löschen?',
    resetBody: 'Das lässt sich nicht rückgängig machen.',
    backend: 'Datenquelle',
    backendLocal: 'Nur dieses Gerät',
    accountOpen: 'Konto öffnen',
  },
  account: {
    title: 'Konto',
    localMode: 'Lokaler Modus',
    localModeBody:
      'Konten sind in dieser Installation nicht aktiviert: Deine Spielzüge und Notizen bleiben auf diesem Gerät. Um sie zu behalten, exportiere sie in den Einstellungen.',
    signOut: 'Abmelden',
    admin: 'Verwaltung',
    linkIntro:
      'Ein Einmal-Link landet in deinem Postfach: kein Passwort, das du dir merken musst oder das gestohlen werden kann.',
    linkSentTitle: 'Link gesendet',
    linkSentBody:
      'Soeben wurde ein Link an {email} gesendet. Öffne ihn auf diesem Gerät: Er bringt dich angemeldet hierher zurück. Er funktioniert nur einmal.',
    linkAgain: 'Neuen Link anfordern',
    usePassword: 'Mit Passwort anmelden',
    useLink: 'Lieber einen Link erhalten',
    danger: {
      title: 'Gefahrenbereich',
      body: 'Wenn du dein Konto löschst, werden deine Notizen, deine gespeicherten Spielzüge, dein Profil und das Konto selbst gelöscht. Nichts wird aufbewahrt, und das lässt sich nicht rückgängig machen.',
      action: 'Mein Konto löschen',
      confirmLabel: 'Gib deine Adresse zur Bestätigung erneut ein',
      confirmHint: 'Die Adresse des Kontos ist {email}.',
      confirm: 'Endgültig löschen',
      cancel: 'Abbrechen',
      mismatch:
        'Die eingegebene Adresse stimmt nicht überein: Es wurde nichts gelöscht.',
      failed: 'Löschen fehlgeschlagen: {error}',
    },
  },

  about: {
    title: 'Über die App',
    what: 'Eine Taktiktafel, um eine Spielphase am Beckenrand zu erklären: das Spielfeld nach den internationalen Regeln gezeichnet, sechs Spieler pro Mannschaft zum Benennen, Ausrichten, an die Oberfläche oder auf den Boden Schicken, und vier Wechselspieler in ihrer Zone; die üblichen Aufstellungen (3-2-1, 2-2-2, 1-2-1-2…); drei Schiedsrichter im Wasser mit ihrem Sichtfeld, und der Hauptschiedsrichter. Eine Phase wird in Schritten beschrieben, als Animation abgespielt und auch in 3D betrachtet, in der echten Tiefe des Beckens. Alles bleibt auf dem Gerät; ein Spielzug wird mit einem einfachen Link geteilt.',
  },
};
