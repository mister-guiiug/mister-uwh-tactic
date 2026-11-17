import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { drawPitchOnCanvas, GOAL_WIDTH } from './pitch.ts';
import {
  FIN,
  FIN_COLOR,
  finOutline,
  GLOVE,
  SKIN,
  STICK,
  stickOutline,
  TEAM_GEAR,
  type Outline,
} from './equipment.ts';
import type { Frame, FramePlayer, FrameReferee } from './frame.ts';
import {
  POOL_MARGIN,
  PUCK_ID,
  type Display,
  type Pitch,
  type Point,
} from './model.ts';

/**
 * LE BASSIN EN TROIS DIMENSIONS, en three.js nu.
 *
 * Ni React Three Fiber, ni drei : la scène est un objet impératif que le
 * composant `Pool3D` crée, nourrit d'images (`update`) et détruit. Deux
 * raisons. Le poids, d'abord : three.js seul est déjà le plus gros morceau de
 * l'application, et il n'est chargé qu'à l'ouverture de la vue 3D. Le modèle,
 * ensuite : la scène ne possède aucun état métier — elle dessine l'image que
 * lui donne `frameAt`, exactement comme le tableau 2D, et rend les gestes
 * (sélection, déplacement) au même magasin.
 *
 * Repère : le terrain est centré sur l'origine. `x` du terrain → `x` du
 * monde, `y` du terrain → `z` du monde, la hauteur est `y`, le fond du bassin
 * à 0 et la surface à `pitch.depth`. Un angle de terrain `a` (sens horaire vu
 * de dessus) devient une rotation de `−a` autour de `y`.
 */
export type CameraPreset = 'tribune' | 'dessus' | 'immersion' | 'suivi';

export interface SceneCallbacks {
  onSelect: (id: string | null) => void;
  onMove: (id: string, point: Point) => void;
}

export interface SceneInput {
  pitch: Pitch;
  frame: Frame;
  display: Display;
  selected: string | null;
  labelOf: (token: FramePlayer | FrameReferee) => string;
  distanceLabel: (metres: number) => string;
}

const DECK_HEIGHT = 0.35;
/** Hauteur d'un joueur sous l'eau, au ras du palet. */
const UNDERWATER_Y = 0.32;
const FOV_TILT = (40 * Math.PI) / 180;
const FOV_HALF_ANGLE = (32 * Math.PI) / 180;
const FOV_LENGTH = 6.5;

const COLORS = {
  water: '#9fdcec',
  line: '#123e6b',
  goalBlanc: '#f8fafc',
  goalNoir: '#111827',
  referee: 0xd92d20,
  trousers: 0x1f2937,
  snorkel: 0xfacc15,
  mask: 0x38bdf8,
  accent: 0xf59e0b,
  puck: 0x111111,
  puckHalo: 0xf472b6,
  tile: 0xd9f1f7,
  deck: 0xc9d3dc,
  above: 0x1d2a36,
  below: 0x0b5570,
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Une étiquette toujours face caméra : un sprite et son canevas. */
class Label {
  readonly sprite: THREE.Sprite;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private text = '';

  constructor(private readonly color = '#0b2545') {
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // TAILLE CONSTANTE À L'ÉCRAN : vu de la tribune, une étiquette à
    // l'échelle du bassin ne fait que quelques pixels.
    const material = new THREE.SpriteMaterial({
      map: this.texture,
      depthTest: false,
      transparent: true,
      sizeAttenuation: false,
    });
    this.sprite = new THREE.Sprite(material);
    this.sprite.scale.set(0.16, 0.04, 1);
    this.sprite.renderOrder = 10;
  }

  set(text: string) {
    if (text === this.text) return;
    this.text = text;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 64);
    if (!text) {
      this.texture.needsUpdate = true;
      return;
    }
    ctx.font = '600 34px system-ui, sans-serif';
    const width = Math.min(248, ctx.measureText(text).width + 28);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect((256 - width) / 2, 8, width, 48, 24);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 33, 236);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}

/**
 * UN NAGEUR, tête vers +x, dos vers +y, main droite vers +z.
 *
 * En slip de bain, comme on joue : la peau, le slip et le bonnet de
 * water-polo à la couleur de l'équipe (blanc, ou bleu pour les Noirs), le
 * masque, le tuba, le gant sur la main de la crosse, la crosse à crochet et
 * les palmes longues — mesures dans `equipment.ts`, que le tableau 2D lit
 * aussi.
 *
 * Bras et jambes sont montés sur des pivots : la même figure passe de la
 * nage en surface (bras écartés) à la position de jeu sous l'eau (bras
 * tendus, crosse devant) selon `surfaceness`, et les palmes battent.
 */
class Swimmer {
  readonly root = new THREE.Group();
  readonly label: Label;
  private readonly stickArm = new THREE.Group();
  private readonly freeArm = new THREE.Group();
  private readonly legs: THREE.Group[] = [];
  private readonly phase = Math.random() * Math.PI * 2;
  private stick: THREE.Mesh | null = null;
  private side = 1;
  fov: THREE.Mesh | null = null;

  constructor(
    readonly id: string,
    kind: RigKind,
    materials: Materials
  ) {
    this.root.userData.id = id;
    this.label = new Label(
      kind === 'arbitre' || kind === 'bord' ? '#9b1c1c' : '#0b2545'
    );
    this.root.add(this.label.sprite);
    if (kind === 'bord') {
      this.buildStanding(materials);
      return;
    }
    this.label.sprite.position.y = 0.75;
    const team = kind === 'arbitre' ? null : kind;
    const add = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D = this.root
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Le corps : la peau, et un maillot rouge pour l'arbitre aquatique.
    const torso = add(
      materials.geo.torso,
      team ? materials.skin : materials.referee
    );
    torso.rotation.z = Math.PI / 2;
    torso.position.x = 0.05;
    const briefs = add(
      materials.geo.briefs,
      team === 'blanc'
        ? materials.briefsBlanc
        : team === 'noir'
          ? materials.briefsNoir
          : materials.referee
    );
    briefs.rotation.z = Math.PI / 2;
    briefs.position.x = -0.27;

    const head = add(materials.geo.head, materials.skin);
    head.position.x = 0.55;
    // Le bonnet couvre l'arrière et le dessus de la tête ; le visage, masqué,
    // regarde le fond.
    const cap =
      team === 'blanc'
        ? materials.capBlanc
        : team === 'noir'
          ? materials.capNoir
          : materials.referee;
    const capShell = add(materials.geo.cap, cap);
    capShell.position.x = 0.55;
    capShell.rotation.z = 0.7;
    for (const z of [-0.118, 0.118]) {
      const guard = add(materials.geo.earGuard, cap);
      guard.position.set(0.53, 0, z);
      guard.scale.set(1, 1, 0.45);
    }
    const mask = add(materials.geo.mask, materials.mask);
    mask.position.set(0.64, -0.03, 0);
    const snorkel = add(materials.geo.snorkel, materials.snorkel);
    snorkel.position.set(0.5, 0.12, -0.13);
    snorkel.rotation.z = 0.45;

    // Les jambes, jusqu'aux palmes de 50 cm.
    for (const z of [-0.09, 0.09]) {
      const pivot = new THREE.Group();
      pivot.position.set(-0.32, 0, z);
      const leg = add(materials.geo.leg, materials.skin, pivot);
      leg.rotation.z = Math.PI / 2;
      leg.position.x = -0.41;
      const fin = new THREE.Group();
      fin.position.x = -0.8;
      const pocket = add(materials.geo.pocket, materials.fin, fin);
      pocket.position.x = -0.08;
      const blade = add(materials.geo.fin, materials.fin, fin);
      blade.rotation.x = Math.PI / 2;
      pivot.add(fin);
      this.root.add(pivot);
      this.legs.push(pivot);
    }

    for (const arm of [this.stickArm, this.freeArm]) {
      const limb = add(materials.geo.limb, materials.skin, arm);
      limb.rotation.z = Math.PI / 2;
      limb.position.x = 0.25;
      this.root.add(arm);
    }
    if (team) {
      // Le gant de laine enduite de silicone, et son poignet.
      const glove = add(materials.geo.glove, materials.glove, this.stickArm);
      glove.position.set(0.56, 0, 0);
      glove.scale.set(1.5, 0.75, 1);
      const cuff = add(materials.geo.cuff, materials.cuff, this.stickArm);
      cuff.position.set(0.47, 0, 0);
      cuff.rotation.y = Math.PI / 2;
      // La crosse, talon dans le gant, crochet vers l'intérieur.
      const stick = add(
        materials.geo.stick,
        team === 'blanc' ? materials.stickBlanc : materials.stickNoir,
        this.stickArm
      );
      stick.position.set(0.5, 0, 0);
      stick.rotation.x = Math.PI / 2;
      this.stick = stick;
    } else {
      const cone = new THREE.Mesh(materials.geo.fov, materials.fov);
      cone.position.x = 0.62;
      cone.rotation.z = Math.PI / 2 - FOV_TILT;
      cone.renderOrder = 2;
      this.root.add(cone);
      this.fov = cone;
    }
  }

  /**
   * L'ARBITRE DE BORD, debout sur la plage, origine aux pieds, face à +x :
   * jambes, maillot d'arbitre, tête, un bras tendu vers le jeu.
   */
  private buildStanding(materials: Materials) {
    for (const z of [-0.1, 0.1]) {
      const leg = new THREE.Mesh(materials.geo.leg, materials.trousers);
      leg.position.set(0, 0.45, z);
      leg.castShadow = true;
      this.root.add(leg);
    }
    const torso = new THREE.Mesh(materials.geo.torso, materials.referee);
    torso.position.y = 1.15;
    torso.scale.set(1, 0.75, 1);
    torso.castShadow = true;
    this.root.add(torso);
    const head = new THREE.Mesh(materials.geo.head, materials.skin);
    head.position.y = 1.62;
    head.castShadow = true;
    this.root.add(head);
    const arm = new THREE.Mesh(materials.geo.limb, materials.referee);
    arm.rotation.z = Math.PI / 2 - 0.35;
    arm.position.set(0.22, 1.32, 0.2);
    arm.castShadow = true;
    this.root.add(arm);
    this.label.sprite.position.y = 2.05;
  }

  setHanded(leftHanded: boolean) {
    this.side = leftHanded ? -1 : 1;
    // Un gaucher tient le miroir : le crochet tourne vers l'autre côté.
    if (this.stick) this.stick.scale.y = this.side;
  }

  /** `surfaceness` : 1 en surface, 0 sous l'eau. */
  pose(surfaceness: number, time: number) {
    if (this.legs.length === 0) return;
    const s = surfaceness;
    const side = this.side;
    this.stickArm.position.set(0.32, 0, 0.16 * side);
    this.freeArm.position.set(0.32, 0, -0.16 * side);
    // Rotation autour de y : un angle négatif écarte vers +z.
    this.stickArm.rotation.y = -side * lerp(0.06, 1.15, s);
    this.freeArm.rotation.y = side * lerp(0.3, 1.15, s);
    this.legs.forEach((leg, i) => {
      leg.rotation.z = Math.sin(time * 5 + this.phase + i * Math.PI) * 0.16;
    });
  }
}

/** Un contour plat (`equipment.ts`) en volume, épaisseur centrée. */
function extrudeOutline(outline: Outline, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(
    outline.map(([x, y]) => new THREE.Vector2(x, y))
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.25,
    bevelSize: 0.004,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

type RigKind = 'blanc' | 'noir' | 'arbitre' | 'bord';

interface Materials {
  skin: THREE.Material;
  briefsBlanc: THREE.Material;
  briefsNoir: THREE.Material;
  capBlanc: THREE.Material;
  capNoir: THREE.Material;
  referee: THREE.Material;
  trousers: THREE.Material;
  fin: THREE.Material;
  stickBlanc: THREE.Material;
  stickNoir: THREE.Material;
  glove: THREE.Material;
  cuff: THREE.Material;
  snorkel: THREE.Material;
  mask: THREE.Material;
  fov: THREE.Material;
  geo: {
    torso: THREE.BufferGeometry;
    briefs: THREE.BufferGeometry;
    head: THREE.BufferGeometry;
    cap: THREE.BufferGeometry;
    mask: THREE.BufferGeometry;
    limb: THREE.BufferGeometry;
    leg: THREE.BufferGeometry;
    fin: THREE.BufferGeometry;
    pocket: THREE.BufferGeometry;
    stick: THREE.BufferGeometry;
    glove: THREE.BufferGeometry;
    cuff: THREE.BufferGeometry;
    snorkel: THREE.BufferGeometry;
    earGuard: THREE.BufferGeometry;
    fov: THREE.BufferGeometry;
  };
}

const CAUSTICS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * DES CAUSTIQUES : le réseau de lignes claires que la houle dessine sur le
 * fond. Un bruit cellulaire (Worley) dont les germes dérivent lentement ; la
 * lumière se concentre le long des frontières entre cellules, là où la
 * distance au germe le plus proche égale presque celle au second. Deux
 * échelles superposées cassent la régularité. Rien de physique : de quoi lire
 * le fond comme un fond d'eau, et non comme un plancher.
 */
const CAUSTICS_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uSize;
  varying vec2 vUv;
  vec2 germ(vec2 cell) {
    vec2 h = vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)));
    return fract(sin(h) * 43758.5453);
  }
  float edge(vec2 p, float t) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = 0.5 + 0.42 * sin(t + 6.2831 * germ(ip + g));
        float d = length(g + o - fp);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
      }
    }
    return d2 - d1;
  }
  void main() {
    vec2 p = vUv * uSize * 0.75;
    float a = 1.0 - smoothstep(0.0, 0.13, edge(p, uTime * 0.6));
    float b = 1.0 - smoothstep(0.0, 0.09, edge(p * 1.7 + 7.3, uTime * 0.8));
    float intensity = (a * 0.65 + b * 0.35) * 0.3;
    gl_FragColor = vec4(vec3(0.88, 0.98, 1.0) * intensity, 1.0);
  }
`;

export class PoolScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 250);
  private readonly controls: OrbitControls;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly materials: Materials;
  private readonly pool = new THREE.Group();
  private readonly tokens = new Map<string, Swimmer>();
  private readonly puck = new THREE.Group();
  private readonly selection: THREE.Mesh;
  private readonly refLine: THREE.Line;
  private readonly refLabel = new Label('#9b1c1c');
  private readonly floorClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly underwaterFog = new THREE.FogExp2(COLORS.below, 0.05);
  private readonly aboveColor = new THREE.Color(COLORS.above);
  private readonly belowColor = new THREE.Color(COLORS.below);
  private water: THREE.Mesh | null = null;
  private caustics: THREE.ShaderMaterial | null = null;
  private pitch: Pitch | null = null;
  private input: SceneInput | null = null;
  private preset: CameraPreset = 'tribune';
  private transition: {
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
  } | null = null;
  private drag: {
    id: string;
    plane: THREE.Plane;
    offset: THREE.Vector3;
  } | null = null;
  private down: { x: number; y: number } | null = null;
  private time = 0;
  private hasSelection = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: SceneCallbacks,
    private readonly options: { reducedMotion: boolean }
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;

    // NOTRE ÉCOUTEUR AVANT CELUI D'OrbitControls : saisir un jeton doit
    // couper l'orbite avant qu'elle ne démarre.
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = !options.reducedMotion;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 70;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    this.materials = this.createMaterials();

    const hemi = new THREE.HemisphereLight(0xe3f6ff, 0x0b3954, 1.25);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-6, 22, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;

    this.scene.add(this.pool);

    const puckBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24),
      new THREE.MeshStandardMaterial({
        color: COLORS.puck,
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    puckBody.position.y = 0.015;
    puckBody.castShadow = true;
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.22, 32),
      new THREE.MeshBasicMaterial({
        color: COLORS.puckHalo,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    this.puck.add(puckBody, halo);
    this.puck.userData.id = PUCK_ID;
    this.scene.add(this.puck);

    this.selection = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.035, 8, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.accent })
    );
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.visible = false;
    this.scene.add(this.selection);

    this.refLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineDashedMaterial({
        color: 0xd92d20,
        dashSize: 0.18,
        gapSize: 0.14,
      })
    );
    this.refLine.visible = false;
    this.scene.add(this.refLine);
    this.refLabel.sprite.visible = false;
    this.scene.add(this.refLabel.sprite);

    this.renderer.setAnimationLoop(this.loop);
  }

  private readonly sun: THREE.DirectionalLight;

  private createMaterials(): Materials {
    const standard = (color: number, roughness = 0.6) =>
      new THREE.MeshStandardMaterial({ color, roughness });
    const fovGeometry = new THREE.ConeGeometry(
      Math.tan(FOV_HALF_ANGLE) * FOV_LENGTH,
      FOV_LENGTH,
      32,
      1,
      true
    );
    // Sommet à l'origine, ouverture vers −y : la rotation du nageur l'oriente.
    fovGeometry.translate(0, -FOV_LENGTH / 2, 0);
    const hex = (color: string) => new THREE.Color(color).getHex();
    return {
      skin: standard(hex(SKIN), 0.7),
      briefsBlanc: standard(hex(TEAM_GEAR.blanc.briefs), 0.5),
      briefsNoir: standard(hex(TEAM_GEAR.noir.briefs), 0.5),
      capBlanc: standard(hex(TEAM_GEAR.blanc.cap), 0.45),
      capNoir: standard(hex(TEAM_GEAR.noir.cap), 0.45),
      referee: standard(COLORS.referee),
      trousers: standard(COLORS.trousers),
      fin: new THREE.MeshStandardMaterial({
        color: hex(FIN_COLOR),
        roughness: 0.35,
        metalness: 0.3,
      }),
      stickBlanc: standard(hex(TEAM_GEAR.blanc.stick), 0.45),
      stickNoir: standard(hex(TEAM_GEAR.noir.stick), 0.45),
      glove: standard(hex(GLOVE.silicone), 0.5),
      cuff: standard(hex(GLOVE.cuff), 0.9),
      snorkel: standard(COLORS.snorkel, 0.4),
      mask: new THREE.MeshStandardMaterial({
        color: COLORS.mask,
        roughness: 0.1,
        metalness: 0.4,
      }),
      fov: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
        clippingPlanes: [this.floorClip],
      }),
      geo: {
        torso: new THREE.CapsuleGeometry(0.17, 0.5, 6, 12),
        briefs: new THREE.CylinderGeometry(0.178, 0.172, 0.2, 16),
        head: new THREE.SphereGeometry(0.12, 20, 14),
        cap: new THREE.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, 1.75),
        mask: new THREE.BoxGeometry(0.06, 0.08, 0.17),
        limb: new THREE.CapsuleGeometry(0.055, 0.42, 4, 8),
        leg: new THREE.CapsuleGeometry(0.065, 0.68, 4, 8),
        fin: extrudeOutline(finOutline(FIN), 0.01),
        pocket: new THREE.BoxGeometry(0.2, 0.09, 0.11),
        stick: extrudeOutline(stickOutline(STICK), STICK.thickness),
        glove: new THREE.SphereGeometry(0.055, 12, 8),
        cuff: new THREE.TorusGeometry(0.05, 0.016, 6, 16),
        snorkel: new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8),
        earGuard: new THREE.SphereGeometry(0.05, 12, 8),
        fov: fovGeometry,
      },
    };
  }

  /** Le bassin dépend des dimensions : il est reconstruit quand elles changent. */
  private buildPool(pitch: Pitch) {
    this.disposeObject(this.pool);
    this.pool.clear();
    const L = pitch.length + 2 * POOL_MARGIN;
    const W = pitch.width + 2 * POOL_MARGIN;
    const D = pitch.depth;

    // Le fond, peint du même tracé que le tableau 2D.
    const scale = 48;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(L * scale);
    canvas.height = Math.round(W * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawPitchOnCanvas(ctx, pitch, scale, POOL_MARGIN, COLORS);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.pool.add(floor);

    this.caustics = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: new THREE.Vector2(L, W) },
      },
      vertexShader: CAUSTICS_VERTEX,
      fragmentShader: CAUSTICS_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const caustics = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W),
      this.caustics
    );
    caustics.rotation.x = -Math.PI / 2;
    caustics.position.y = 0.005;
    this.pool.add(caustics);

    // Les parois, un peu au-dessus de l'eau.
    const wallHeight = D + DECK_HEIGHT;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.tile,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    const walls: [number, number, number, number][] = [
      [L, 0, -W / 2, 0],
      [L, 0, W / 2, Math.PI],
      [W, -L / 2, 0, Math.PI / 2],
      [W, L / 2, 0, -Math.PI / 2],
    ];
    for (const [size, x, z, rotation] of walls) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(size, wallHeight),
        wallMaterial
      );
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = rotation;
      wall.receiveShadow = true;
      this.pool.add(wall);
    }

    // La plage autour du bassin.
    const outer = new THREE.Shape();
    outer.moveTo(-L / 2 - 12, -W / 2 - 10);
    outer.lineTo(L / 2 + 12, -W / 2 - 10);
    outer.lineTo(L / 2 + 12, W / 2 + 10);
    outer.lineTo(-L / 2 - 12, W / 2 + 10);
    outer.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-L / 2, -W / 2);
    hole.lineTo(-L / 2, W / 2);
    hole.lineTo(L / 2, W / 2);
    hole.lineTo(L / 2, -W / 2);
    hole.closePath();
    outer.holes.push(hole);
    const deck = new THREE.Mesh(
      new THREE.ShapeGeometry(outer),
      new THREE.MeshStandardMaterial({ color: COLORS.deck, roughness: 0.9 })
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = wallHeight;
    deck.receiveShadow = true;
    this.pool.add(deck);

    // Les buts : une gouttière de 3 m posée au fond, contre chaque mur.
    for (const [sign, color] of [
      [-1, 0xf8fafc],
      [1, 0x111827],
    ] as const) {
      const goal = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        metalness: 0.7,
        roughness: 0.35,
      });
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.04, GOAL_WIDTH),
        metal
      );
      base.position.y = 0.02;
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.24, GOAL_WIDTH),
        metal
      );
      back.position.set(sign * 0.15, 0.12, 0);
      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.12, GOAL_WIDTH),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      );
      lip.position.set(-sign * 0.15, 0.06, 0);
      for (const part of [base, back, lip]) {
        part.castShadow = true;
        part.receiveShadow = true;
        goal.add(part);
      }
      goal.position.set(sign * (pitch.length / 2 + 0.17), 0, 0);
      this.pool.add(goal);
    }

    // La surface de l'eau, que la houle déforme.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W, Math.round(L * 3), Math.round(W * 3)),
      new THREE.MeshStandardMaterial({
        color: 0x5cc4e0,
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        metalness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = D;
    water.renderOrder = 1;
    this.pool.add(water);
    this.water = water;

    const shadow = this.sun.shadow.camera;
    shadow.left = -L / 2 - 2;
    shadow.right = L / 2 + 2;
    shadow.top = W / 2 + 2;
    shadow.bottom = -W / 2 - 2;
    shadow.updateProjectionMatrix();

    this.pitch = pitch;
    this.setCamera(this.preset, false);
  }

  private presetView(preset: CameraPreset): {
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } {
    const p = this.pitch!;
    switch (preset) {
      case 'dessus':
        return {
          pos: new THREE.Vector3(
            0,
            Math.max(p.length, p.width * 1.6) * 1.05,
            0.01
          ),
          target: new THREE.Vector3(0, 0, 0),
        };
      case 'immersion':
        return {
          pos: new THREE.Vector3(-p.length / 2 + 0.8, p.depth * 0.45, 0),
          target: new THREE.Vector3(0, p.depth * 0.3, 0),
        };
      case 'tribune':
      case 'suivi':
      default:
        return {
          pos: new THREE.Vector3(0, p.depth + 7, p.width / 2 + 11),
          target: new THREE.Vector3(0, p.depth * 0.3, 0),
        };
    }
  }

  setCamera(preset: CameraPreset, animate = true) {
    this.preset = preset;
    this.controls.enabled = preset !== 'suivi';
    if (!this.pitch || preset === 'suivi') return;
    const view = this.presetView(preset);
    if (!animate || this.options.reducedMotion) {
      this.camera.position.copy(view.pos);
      this.controls.target.copy(view.target);
      this.transition = null;
      this.controls.update();
      return;
    }
    this.transition = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPos: view.pos,
      toTarget: view.target,
      t: 0,
    };
  }

  private world(point: Point, y: number): THREE.Vector3 {
    const p = this.pitch!;
    return new THREE.Vector3(point.x - p.length / 2, y, point.y - p.width / 2);
  }

  private tokenY(id: string): number {
    const p = this.pitch!;
    if (id === PUCK_ID) return 0.02;
    const player = this.input?.frame.players.find(pl => pl.id === id);
    if (player) return lerp(UNDERWATER_Y, p.depth - 0.12, player.surfaceness);
    const referee = this.input?.frame.referees.find(r => r.id === id);
    // L'arbitre de bord a les pieds sur la plage.
    if (referee?.deck) return p.depth + DECK_HEIGHT;
    return p.depth - 0.12;
  }

  update(input: SceneInput) {
    const previous = this.input;
    this.input = input;
    const p = input.pitch;
    if (
      !this.pitch ||
      this.pitch.length !== p.length ||
      this.pitch.width !== p.width ||
      this.pitch.depth !== p.depth
    ) {
      this.buildPool(p);
    }

    const seen = new Set<string>();
    for (const player of input.frame.players) {
      seen.add(player.id);
      const swimmer = this.swimmer(player.id, player.team);
      swimmer.setHanded(player.leftHanded);
      swimmer.root.position.copy(this.world(player, this.tokenY(player.id)));
      swimmer.root.rotation.y = -toRadians(player.angle);
      swimmer.pose(player.surfaceness, this.time);
      swimmer.label.sprite.visible = true;
      swimmer.label.set(input.labelOf(player));
    }
    for (const referee of input.frame.referees) {
      seen.add(referee.id);
      const swimmer = this.swimmer(
        referee.id,
        referee.deck ? 'bord' : 'arbitre'
      );
      swimmer.root.position.copy(this.world(referee, this.tokenY(referee.id)));
      swimmer.root.rotation.y = -toRadians(referee.angle);
      swimmer.pose(1, this.time);
      if (swimmer.fov) swimmer.fov.visible = input.display.fieldOfView;
      swimmer.label.set(input.labelOf(referee));
    }
    for (const [id, swimmer] of this.tokens) {
      if (!seen.has(id)) {
        this.scene.remove(swimmer.root);
        swimmer.label.dispose();
        this.tokens.delete(id);
      }
    }

    this.puck.position.copy(this.world(input.frame.puck, 0));

    const selected = input.selected;
    const target =
      selected === PUCK_ID
        ? this.puck
        : selected
          ? this.tokens.get(selected)?.root
          : undefined;
    this.hasSelection = Boolean(target);
    if (target) {
      this.selection.position.copy(target.position);
      const onDeck = this.input?.frame.referees.find(
        r => r.id === selected
      )?.deck;
      this.selection.position.y =
        selected === PUCK_ID
          ? 0.03
          : onDeck
            ? target.position.y + 0.02
            : target.position.y - 0.2;
      this.selection.scale.setScalar(selected === PUCK_ID ? 0.35 : 1);
    }

    const line = input.frame.refereeLine;
    this.refLine.visible = Boolean(line);
    this.refLabel.sprite.visible = Boolean(line);
    if (line) {
      const a = this.world(line[0], p.depth + 0.02);
      const b = this.world(line[1], p.depth + 0.02);
      this.refLine.geometry.setFromPoints([a, b]);
      this.refLine.computeLineDistances();
      this.refLabel.sprite.position.copy(a.clone().add(b).multiplyScalar(0.5));
      this.refLabel.sprite.position.y += 0.5;
      this.refLabel.set(
        input.distanceLabel(
          Math.hypot(line[0].x - line[1].x, line[0].y - line[1].y)
        )
      );
    }

    if (previous?.selected !== selected && this.preset === 'suivi') {
      this.transition = null;
    }
  }

  private swimmer(id: string, kind: RigKind): Swimmer {
    let swimmer = this.tokens.get(id);
    if (!swimmer) {
      swimmer = new Swimmer(id, kind, this.materials);
      this.tokens.set(id, swimmer);
      this.scene.add(swimmer.root);
    }
    return swimmer;
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private pointer(event: PointerEvent): THREE.Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private pick(event: PointerEvent): string | null {
    this.raycaster.setFromCamera(this.pointer(event), this.camera);
    const roots = [...[...this.tokens.values()].map(s => s.root), this.puck];
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      // Un cône de vision n'est pas une prise : on clique à travers.
      if (
        object instanceof THREE.Mesh &&
        object.material === this.materials.fov
      )
        continue;
      if (object instanceof THREE.Sprite) continue;
      while (object && object.userData.id === undefined) object = object.parent;
      if (object) return object.userData.id as string;
    }
    return null;
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.pitch) return;
    this.down = { x: event.clientX, y: event.clientY };
    const id = this.pick(event);
    if (!id) return;
    this.callbacks.onSelect(id);
    const y = this.tokenY(id);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const hit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, hit);
    const origin =
      id === PUCK_ID ? this.puck.position : this.tokens.get(id)!.root.position;
    this.drag = { id, plane, offset: origin.clone().sub(hit) };
    this.controls.enabled = false;
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.drag || !this.pitch) return;
    this.raycaster.setFromCamera(this.pointer(event), this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.drag.plane, hit)) return;
    hit.add(this.drag.offset);
    this.callbacks.onMove(this.drag.id, {
      x: hit.x + this.pitch.length / 2,
      y: hit.z + this.pitch.width / 2,
    });
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const wasDragging = Boolean(this.drag);
    this.drag = null;
    this.controls.enabled = this.preset !== 'suivi';
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    // Un clic sur l'eau, sans glisser, désélectionne.
    if (!wasDragging && this.down) {
      const moved = Math.hypot(
        event.clientX - this.down.x,
        event.clientY - this.down.y
      );
      if (moved < 4) this.callbacks.onSelect(null);
    }
    this.down = null;
  };

  /** La caméra subjective : depuis les yeux du jeton sélectionné. */
  private follow() {
    const selected = this.input?.selected;
    const swimmer = selected ? this.tokens.get(selected) : undefined;
    if (!swimmer) {
      const view = this.presetView('tribune');
      this.camera.position.lerp(view.pos, 0.08);
      this.controls.target.lerp(view.target, 0.08);
      this.camera.lookAt(this.controls.target);
      return;
    }
    const root = swimmer.root;
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion);
    const onDeck = this.input?.frame.referees.find(
      r => r.id === selected
    )?.deck;
    const eye = root.position
      .clone()
      .add(forward.clone().multiplyScalar(onDeck ? 0.15 : 0.7));
    eye.y += onDeck ? 1.62 : 0.12;
    const isReferee = selected!.startsWith('arbitre');
    // Debout sur la plage, l'arbitre de bord regarde le jeu d'en haut ; dans
    // l'eau, un arbitre regarde vers le fond, un joueur devant lui.
    const drop = onDeck ? -3.5 : isReferee ? -3.2 : -0.4;
    const look = eye
      .clone()
      .add(forward.multiplyScalar(onDeck ? 6 : 5))
      .add(new THREE.Vector3(0, drop, 0));
    const k = this.options.reducedMotion ? 1 : 0.15;
    this.camera.position.lerp(eye, k);
    this.controls.target.lerp(look, k);
    this.camera.lookAt(this.controls.target);
  }

  private readonly loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.options.reducedMotion) this.time += dt;
    const p = this.pitch;
    if (!p) return;

    if (this.caustics) this.caustics.uniforms.uTime!.value = this.time;
    if (this.water && !this.options.reducedMotion) {
      const position = this.water.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        position.setZ(
          i,
          Math.sin(x * 1.2 + this.time * 1.3) * 0.035 +
            Math.sin(y * 1.7 - this.time * 0.9) * 0.025
        );
      }
      position.needsUpdate = true;
      this.water.geometry.computeVertexNormals();
    }
    if (!this.options.reducedMotion && this.input) {
      for (const player of this.input.frame.players) {
        this.tokens.get(player.id)?.pose(player.surfaceness, this.time);
      }
    }

    // En vue subjective, l'anneau du jeton suivi entrerait dans le champ.
    this.selection.visible = this.hasSelection && this.preset !== 'suivi';

    if (this.preset === 'suivi') {
      this.follow();
    } else if (this.transition) {
      const tr = this.transition;
      tr.t = Math.min(1, tr.t + dt / 0.7);
      const e = tr.t < 0.5 ? 2 * tr.t * tr.t : 1 - (-2 * tr.t + 2) ** 2 / 2;
      this.camera.position.lerpVectors(tr.fromPos, tr.toPos, e);
      this.controls.target.lerpVectors(tr.fromTarget, tr.toTarget, e);
      if (tr.t >= 1) this.transition = null;
      this.controls.update();
    } else {
      this.controls.update();
    }

    // Sous la surface, l'eau se referme : brouillard bleu et fond sombre.
    const underwater = this.camera.position.y < p.depth;
    this.scene.fog = underwater ? this.underwaterFog : null;
    this.scene.background = underwater ? this.belowColor : this.aboveColor;

    this.renderer.render(this.scene, this.camera);
  };

  private disposeObject(root: THREE.Object3D) {
    root.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if ('map' in material && material.map instanceof THREE.Texture)
            material.map.dispose();
          material.dispose();
        }
      }
    });
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.controls.dispose();
    for (const swimmer of this.tokens.values()) swimmer.label.dispose();
    this.refLabel.dispose();
    this.disposeObject(this.scene);
    Object.values(this.materials.geo).forEach(g => g.dispose());
    this.renderer.dispose();
  }
}
