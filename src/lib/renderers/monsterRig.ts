/**
 * Rig procédural des monstres — module **pur** (aucune dépendance WebGL,
 * exécutable tel quel sous Bun pour les tests).
 *
 * Architecture : le maillage est découpé en **segments articulés**
 * (torse → tête, torse → bras → avant-bras, bassin → cuisse → tibia). Chaque
 * segment est construit **une seule fois** dans l'espace local de son pivot ;
 * la pose ne s'exprime qu'en rotations d'articulation par rapport à la garde.
 * La garde (toutes les rotations nulles) reproduit exactement la silhouette
 * du moteur fusionné d'origine — continuité visuelle garantie.
 */

// ---------------------------------------------------------------------------
// Math 4x4 (exportées : le renderer et les tests les consomment)
// ---------------------------------------------------------------------------

export function mat4Identity(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function mat4Multiply(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
): Float32Array {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

export function mat4Translate(
  out: Float32Array,
  a: Float32Array,
  x: number,
  y: number,
  z: number,
): Float32Array {
  out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
  out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
  out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
  out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  if (a !== out) {
    for (let i = 0; i < 12; i++) out[i] = a[i];
  }
  return out;
}

export function mat4Perspective(
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): Float32Array {
  const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRad);
  const rangeInv = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

export function mat4RotateY(
  out: Float32Array,
  a: Float32Array,
  rad: number,
): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;

  if (a !== out) {
    out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
  }
  return out;
}

export function mat4RotateX(
  out: Float32Array,
  a: Float32Array,
  rad: number,
): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;

  if (a !== out) {
    out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
  }
  return out;
}

export function mat4RotateZ(
  out: Float32Array,
  a: Float32Array,
  rad: number,
): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];

  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;

  if (a !== out) {
    out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
  }
  return out;
}

export function mat4Scale(
  out: Float32Array,
  a: Float32Array,
  sx: number,
  sy: number,
  sz: number,
): Float32Array {
  out[0] = a[0] * sx; out[1] = a[1] * sx; out[2] = a[2] * sx; out[3] = a[3] * sx;
  out[4] = a[4] * sy; out[5] = a[5] * sy; out[6] = a[6] * sy; out[7] = a[7] * sy;
  out[8] = a[8] * sz; out[9] = a[9] * sz; out[10] = a[10] * sz; out[11] = a[11] * sz;
  out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
  return out;
}

export function mat3NormalFromMat4(out: Float32Array, a: Float32Array): Float32Array {
  const a00 = a[0], a01 = a[1], a02 = a[2];
  const a10 = a[4], a11 = a[5], a12 = a[6];
  const a20 = a[8], a21 = a[9], a22 = a[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  const det0 = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det0) return out;
  const det = 1.0 / det0;

  out[0] = b01 * det;
  out[1] = b11 * det;
  out[2] = b21 * det;
  out[3] = (-a22 * a01 + a02 * a21) * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a21 * a00 + a01 * a20) * det;
  out[6] = (a12 * a01 - a02 * a11) * det;
  out[7] = (-a12 * a00 + a02 * a10) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}

// ---------------------------------------------------------------------------
// Volumes paramétriques (cylindres, sphères, cônes — déplacés du renderer)
// ---------------------------------------------------------------------------

export interface BodyPartMesh {
  positions: number[];
  normals: number[];
  colors: number[];
}

/**
 * Ajoute une sphère (lat/long) à un maillage.
 *
 * Exportée : la couche d'effets de sort (`spellVfx.ts`) la réutilise plutôt que
 * de redupliquer une génération de sphère — l'enroulement des faces (CCW vu de
 * l'extérieur) et l'orientation des normales sont déjà verrouillés ici.
 */
export function addSphere(
  mesh: BodyPartMesh,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  color: [number, number, number],
  latBands = 14,
  longBands = 14,
) {
  for (let lat = 0; lat < latBands; lat++) {
    const theta1 = (lat * Math.PI) / latBands;
    const theta2 = ((lat + 1) * Math.PI) / latBands;

    for (let lon = 0; lon < longBands; lon++) {
      const phi1 = (lon * 2 * Math.PI) / longBands;
      const phi2 = ((lon + 1) * 2 * Math.PI) / longBands;

      const p1 = [
        Math.sin(theta1) * Math.cos(phi1),
        Math.cos(theta1),
        Math.sin(theta1) * Math.sin(phi1),
      ];
      const p2 = [
        Math.sin(theta2) * Math.cos(phi1),
        Math.cos(theta2),
        Math.sin(theta2) * Math.sin(phi1),
      ];
      const p3 = [
        Math.sin(theta2) * Math.cos(phi2),
        Math.cos(theta2),
        Math.sin(theta2) * Math.sin(phi2),
      ];
      const p4 = [
        Math.sin(theta1) * Math.cos(phi2),
        Math.cos(theta1),
        Math.sin(theta1) * Math.sin(phi2),
      ];

      // Triangle 1 : p1 → p3 → p2 (CCW vu de l'extérieur)
      mesh.positions.push(
        cx + p1[0] * rx, cy + p1[1] * ry, cz + p1[2] * rz,
        cx + p3[0] * rx, cy + p3[1] * ry, cz + p3[2] * rz,
        cx + p2[0] * rx, cy + p2[1] * ry, cz + p2[2] * rz,
      );
      mesh.normals.push(p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], p2[0], p2[1], p2[2]);
      mesh.colors.push(...color, ...color, ...color);

      // Triangle 2 : p1 → p4 → p3
      mesh.positions.push(
        cx + p1[0] * rx, cy + p1[1] * ry, cz + p1[2] * rz,
        cx + p4[0] * rx, cy + p4[1] * ry, cz + p4[2] * rz,
        cx + p3[0] * rx, cy + p3[1] * ry, cz + p3[2] * rz,
      );
      mesh.normals.push(p1[0], p1[1], p1[2], p4[0], p4[1], p4[2], p3[0], p3[1], p3[2]);
      mesh.colors.push(...color, ...color, ...color);
    }
  }
}

function addCone(
  mesh: BodyPartMesh,
  baseX: number,
  baseY: number,
  baseZ: number,
  tipX: number,
  tipY: number,
  tipZ: number,
  radius: number,
  color: [number, number, number],
  segments = 12,
) {
  for (let i = 0; i < segments; i++) {
    const angle1 = (i * 2 * Math.PI) / segments;
    const angle2 = ((i + 1) * 2 * Math.PI) / segments;

    const x1 = baseX + Math.cos(angle1) * radius;
    const z1 = baseZ + Math.sin(angle1) * radius;
    const x2 = baseX + Math.cos(angle2) * radius;
    const z2 = baseZ + Math.sin(angle2) * radius;

    mesh.positions.push(x1, baseY, z1, tipX, tipY, tipZ, x2, baseY, z2);
    const nx = Math.cos((angle1 + angle2) * 0.5);
    const nz = Math.sin((angle1 + angle2) * 0.5);
    mesh.normals.push(nx, 0.4, nz, nx, 0.8, nz, nx, 0.4, nz);
    mesh.colors.push(...color, ...color, ...color);
  }
}

function addCylinder(
  mesh: BodyPartMesh,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  radius: number,
  color: [number, number, number],
  segments = 10,
) {
  for (let i = 0; i < segments; i++) {
    const a1 = (i * 2 * Math.PI) / segments;
    const a2 = ((i + 1) * 2 * Math.PI) / segments;

    const cos1 = Math.cos(a1) * radius;
    const sin1 = Math.sin(a1) * radius;
    const cos2 = Math.cos(a2) * radius;
    const sin2 = Math.sin(a2) * radius;

    mesh.positions.push(
      x1 + cos1, y1, z1 + sin1,
      x2 + cos1, y2, z2 + sin1,
      x2 + cos2, y2, z2 + sin2,
    );
    mesh.normals.push(cos1, 0, sin1, cos1, 0, sin1, cos2, 0, sin2);
    mesh.colors.push(...color, ...color, ...color);

    mesh.positions.push(
      x1 + cos1, y1, z1 + sin1,
      x2 + cos2, y2, z2 + sin2,
      x1 + cos2, y1, z1 + sin2,
    );
    mesh.normals.push(cos1, 0, sin1, cos2, 0, sin2, cos2, 0, sin2);
    mesh.colors.push(...color, ...color, ...color);
  }
}

// ---------------------------------------------------------------------------
// Couleurs élémentaires (déplacées du renderer)
// ---------------------------------------------------------------------------

export type MonsterType = 'fire' | 'water' | 'grass' | 'electric' | 'rock' | 'normal';

export const ELEMENT_COLORS: Record<
  MonsterType,
  {
    body: [number, number, number];
    belly: [number, number, number];
    accent: [number, number, number];
    glow: [number, number, number];
    eye: [number, number, number];
  }
> = {
  fire: {
    body: [0.98, 0.38, 0.18],
    belly: [1.0, 0.85, 0.45],
    accent: [0.92, 0.15, 0.15],
    glow: [1.0, 0.4, 0.0],
    eye: [0.0, 0.75, 1.0],
  },
  water: {
    body: [0.12, 0.62, 0.95],
    belly: [0.88, 0.96, 1.0],
    accent: [0.0, 0.85, 0.9],
    glow: [0.0, 0.8, 1.0],
    eye: [0.15, 0.75, 0.35],
  },
  grass: {
    body: [0.35, 0.75, 0.32],
    belly: [0.9, 0.98, 0.88],
    accent: [1.0, 0.3, 0.55],
    glow: [0.45, 0.95, 0.25],
    eye: [0.75, 0.1, 0.4],
  },
  electric: {
    body: [0.98, 0.78, 0.12],
    belly: [1.0, 0.98, 0.88],
    accent: [0.95, 0.15, 0.2],
    glow: [1.0, 0.9, 0.2],
    eye: [0.38, 0.25, 0.2],
  },
  rock: {
    body: [0.55, 0.62, 0.66],
    belly: [0.88, 0.92, 0.94],
    accent: [0.0, 0.78, 0.68],
    glow: [0.2, 0.85, 0.75],
    eye: [0.95, 0.35, 0.15],
  },
  normal: {
    body: [0.68, 0.55, 0.46],
    belly: [0.98, 0.92, 0.85],
    accent: [0.95, 0.65, 0.25],
    glow: [0.85, 0.75, 0.65],
    eye: [0.25, 0.55, 0.95],
  },
};

// ---------------------------------------------------------------------------
// Squelette : articulations et segments
// ---------------------------------------------------------------------------

/** Articulations animables. La géométrie de chaque part est autorée en garde. */
export type JointId =
  | 'torso'
  | 'head'
  | 'armU.L'
  | 'armU.R'
  | 'fore.L'
  | 'fore.R'
  | 'legU.L'
  | 'legU.R'
  | 'shin.L'
  | 'shin.R';

export const JOINT_IDS: JointId[] = [
  'torso', 'head',
  'armU.L', 'armU.R', 'fore.L', 'fore.R',
  'legU.L', 'legU.R', 'shin.L', 'shin.R',
];

/** Rotation [rx, ry, rz] en radians autour du pivot (0 = garde). */
export type JointPose = [number, number, number];

/** Pose complète : rotations par articulation + passage vertical du bassin. */
export interface RigPose {
  joints: Partial<Record<JointId, JointPose>>;
  dy: number;
}

export const GUARD_POSE: RigPose = { joints: {}, dy: 0 };

export interface RigPart {
  id: JointId;
  /** 'root' ou l'id d'un part parent. */
  parent: JointId | 'root';
  /** Pivot exprimé dans l'espace local du parent. */
  pivot: [number, number, number];
  mesh: BodyPartMesh;
}

/**
 * Espèce d'un rig : les **monstres** gardent le maillage d'origine ; le
 * **champion (humain)** utilise un corps humain revêtu de son équipement.
 * Les deux partagent strictement les mêmes articulations (`JOINT_IDS`) et les
 * mêmes pivots : les poses d'action, le lissage et la composition parent →
 * enfant du renderer fonctionnent à l'identique des deux côtés.
 */
export type RigSpecies = 'monster' | 'human';

/** Emplacements d'équipement visibles sur le rig humain. */
export type GearSlot = 'weapon' | 'armor' | 'helm' | 'shield' | 'accessory';

export interface Rig {
  type: MonsterType;
  species: RigSpecies;
  isBoss: boolean;
  quality: RigQuality;
  parts: RigPart[];
  vertexCount: number;
}

/** Densité de maillage : réduite sur mobile (perf first). */
export type RigQuality = 'high' | 'low';

interface BuildCtx {
  bands: number;
  cyl: number;
  cone: number;
}

function ctxFor(quality: RigQuality): BuildCtx {
  return quality === 'low'
    ? { bands: 9, cyl: 7, cone: 8 }
    : { bands: 14, cyl: 10, cone: 12 };
}

const S = (side: 'L' | 'R') => (side === 'L' ? 1 : -1);

/**
 * Assombrit une couleur de la palette. Sert aux **détails du visage**
 * (sourcils, bouche, truffe) : on garde la teinte du corps pour que
 * l'expression reste dans la palette élémentaire du personnage.
 */
function shade(
  color: [number, number, number],
  factor: number,
): [number, number, number] {
  return [color[0] * factor, color[1] * factor, color[2] * factor];
}

/**
 * **Œil d'anime** — la fabrique partagée par le monstre et le champion, pour
 * que les deux rigs lisent le même langage de visage (gros yeux, double
 * reflet, sourcil). Coordonnées locales du segment `head` ; `side` (±1)
 * miroite l'œil gauche / droit, `brow` à `null` supprime le sourcil.
 */
function addAnimeEye(
  mesh: BodyPartMesh,
  B: number,
  side: number,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  iris: [number, number, number],
  brow: [number, number, number] | null,
) {
  const cx = side * x;
  // Sclère blanche
  addSphere(mesh, cx, y, z, rx, ry, rz, [1, 1, 1], B, B);
  // Iris (couleur du type) : disque bombé posé SUR la sclère, qui remplit
  // presque toute la hauteur de l'œil (œil d'anime). Il doit franchement
  // dépasser (centre avancé, faible profondeur), sinon ses bords s'enfoncent
  // dans la sclère et l'œil reste blanc avec un minuscule point de couleur.
  addSphere(mesh, cx, y - ry * 0.04, z + rz * 0.75, rx * 0.62, ry * 0.8, rz * 0.4, iris, B, B);
  // Pupille (même logique, au-dessus de l'iris)
  addSphere(mesh, cx, y - ry * 0.04, z + rz * 0.92, rx * 0.38, ry * 0.48, rz * 0.34, [0.06, 0.06, 0.08], B, B);
  // Reflet unique (lecture simple du regard)
  addSphere(mesh, cx * 0.84, y + ry * 0.3, z + rz * 1.08, rx * 0.3, ry * 0.32, rz * 0.24, [1, 1, 1], B, B);
  // Paupière supérieure marquée (trait d'encre, signature manga) : fin, contenu
  // dans la largeur de l'œil (un trait plus large formait un bandeau), calé sur
  // le BORD HAUT de l'œil (sinon la sclère dépassait au-dessus du trait) et
  // posé DEVANT le haut de l'iris (sinon l'iris le masque).
  addSphere(mesh, cx, y + ry * 0.86, z + rz * 0.55, rx * 0.98, ry * 0.15, rz * 0.5, [0.06, 0.06, 0.08], B, B);
  if (brow) {
    // Sourcil posé sur le front, franchement devant le crâne (sinon enterré),
    // nettement au-dessus de la paupière (sinon les deux traits se confondent).
    addSphere(mesh, cx, y + ry * 1.18, z + rz * 0.05, rx * 1.05, ry * 0.17, rz * 0.3, brow, B, B);
  }
}

/**
 * Construit le rig complet d'un type. Les coordonnées des volumes sont les
 * coordonnées du mesh fusionné d'origine, **translatées dans l'espace local
 * de chaque pivot** — pose zéro = garde d'origine.
 */
export function buildRig(
  type: MonsterType,
  isBoss: boolean,
  quality: RigQuality = 'high',
): Rig {
  const c = ctxFor(quality);
  const p = ELEMENT_COLORS[type] ?? ELEMENT_COLORS.normal;
  const parts: RigPart[] = [];
  const B = c.bands;

  const newMesh = (): BodyPartMesh => ({ positions: [], normals: [], colors: [] });

  // ============================ TORSO ============================
  // Pivot : le centre du buste, soit (0, 0, 0). Proportions **chibi** : le
  // buste est court et rond (peluche) et les épaules resserrées, pour que la
  // grosse tête domine la silhouette.
  {
    const m = newMesh();
    // Bassin rebondi (sous le buste)
    addSphere(m, 0, -0.22, 0, 0.25, 0.16, 0.19, p.body, B, B);
    // Buste rond (au pivot) : plus large que haut
    addSphere(m, 0, 0.03, 0, 0.30, 0.26, 0.23, p.body, B, B);
    // Ventre clair en saillie avant
    addSphere(m, 0, -0.02, 0.14, 0.21, 0.22, 0.13, p.belly, B, B);
    // Cou court (montant, la tête s'articule à son sommet)
    addCylinder(m, 0, 0.23, 0, 0, 0.33, 0, 0.10, p.body, c.cyl);
    // Épaules (marques visuelles des pivots de bras) — resserrées : la tête
    // chibi reste la partie la plus large de la silhouette.
    addSphere(m, -0.26, 0.12, 0, 0.10, 0.10, 0.095, p.body, B, B);
    addSphere(m, 0.26, 0.12, 0, 0.10, 0.10, 0.095, p.body, B, B);
    // Hanches (marques visuelles des pivots de jambes)
    addSphere(m, -0.13, -0.27, 0, 0.10, 0.10, 0.095, p.body, B, B);
    addSphere(m, 0.13, -0.27, 0, 0.10, 0.10, 0.095, p.body, B, B);

    // Appendices dorsaux / caudaux, fixés au tronc (pas d'articulation dédiée).
    // Tous **rabattus vers l'arrière** (−z) et raccourcis : la tête chibi reste
    // dégagée et la silhouette ronde.
    if (type === 'fire') {
      addCone(m, -0.20, 0.10, -0.18, -0.54, 0.42, -0.38, 0.11, [0.0, 0.75, 0.65], c.cone);
      addCone(m, 0.20, 0.10, -0.18, 0.54, 0.42, -0.38, 0.11, [0.0, 0.75, 0.65], c.cone);
      addCylinder(m, 0, -0.22, -0.18, 0, -0.10, -0.50, 0.075, p.body, c.cyl);
      addSphere(m, 0, -0.05, -0.55, 0.13, 0.16, 0.13, p.accent, B, B);
      addSphere(m, 0, -0.03, -0.55, 0.08, 0.10, 0.08, [1.0, 0.95, 0.5], B, B);
    } else if (type === 'water') {
      addCylinder(m, 0, -0.22, -0.18, 0, -0.10, -0.50, 0.065, p.body, c.cyl);
      addCone(m, 0, -0.10, -0.50, -0.21, -0.02, -0.66, 0.085, p.accent, c.cone);
      addCone(m, 0, -0.10, -0.50, 0.21, -0.02, -0.66, 0.085, p.accent, c.cone);
    } else if (type === 'grass') {
      addSphere(m, 0, 0.10, -0.22, 0.20, 0.22, 0.19, p.accent, B, B);
      addSphere(m, 0, 0.19, -0.24, 0.10, 0.10, 0.10, [1.0, 0.9, 0.95], B, B);
    } else if (type === 'electric') {
      addCylinder(m, 0, -0.24, -0.18, 0.16, -0.08, -0.44, 0.065, p.body, c.cyl);
      addCone(m, 0.16, -0.08, -0.44, 0.27, 0.24, -0.56, 0.10, p.body, c.cone);
    } else if (type === 'rock') {
      addCone(m, 0, 0.10, -0.20, 0, 0.34, -0.36, 0.13, p.accent, c.cone);
    } else {
      // normal : collerette duveteuse + queue touffue
      addSphere(m, 0, 0.22, 0.08, 0.25, 0.12, 0.17, p.belly, B, B);
      addSphere(m, 0, -0.24, -0.40, 0.20, 0.24, 0.20, p.body, B, B);
      addSphere(m, 0, -0.12, -0.52, 0.11, 0.13, 0.11, p.belly, B, B);
    }

    parts.push({ id: 'torso', parent: 'root', pivot: [0, 0, 0], mesh: m });
  }

  // ============================ HEAD ============================
  // Pivot : le sommet du cou dans le torse local, soit (0, 0.32, 0).
  // **Grosse tête chibi** (≈ 45 % de la figure) avec un vrai visage : museau,
  // truffe, bouche souriante, joues et grands yeux d'anime sourcillés.
  {
    const m = newMesh();
    const brow = shade(p.body, 0.40);
    const mouth = shade(p.body, 0.28);
    // Crâne surdimensionné
    addSphere(m, 0, 0.22, 0, 0.40, 0.36, 0.34, p.body, B, B);
    // Museau court et arrondi
    addSphere(m, 0, 0.12, 0.27, 0.105, 0.09, 0.08, p.belly, B, B);
    // Truffe
    addSphere(m, 0, 0.145, 0.335, 0.05, 0.04, 0.04, mouth, B, B);
    // Bouche en « 3 » : lèvre supérieure plus grande que l'inférieure
    addSphere(m, 0, 0.062, 0.30, 0.075, 0.024, 0.032, mouth, B, B);
    addSphere(m, 0, 0.038, 0.30, 0.055, 0.02, 0.026, mouth, B, B);
    // Grands yeux d'anime expressifs (sclère, iris, pupille, double reflet, sourcil)
    for (const s of [-1, 1] as const) {
      addAnimeEye(m, B, s, 0.15, 0.25, 0.29, 0.135, 0.155, 0.10, p.eye, brow);
    }
    // Joues
    if (type === 'electric') {
      addSphere(m, -0.245, 0.11, 0.20, 0.075, 0.075, 0.06, [0.95, 0.15, 0.2], B, B);
      addSphere(m, 0.245, 0.11, 0.20, 0.075, 0.075, 0.06, [0.95, 0.15, 0.2], B, B);
    } else {
      addSphere(m, -0.245, 0.10, 0.20, 0.085, 0.065, 0.05, [1.0, 0.45, 0.55], B, B);
      addSphere(m, 0.245, 0.10, 0.20, 0.085, 0.065, 0.05, [1.0, 0.45, 0.55], B, B);
    }

    // Cornes / oreilles / ouïes / feuille selon le type : **petites et
    // rabattues vers l'arrière**, pour que le crâne reste rond (lecture chibi)
    // et que rien ne sorte du cadre caméra.
    if (type === 'fire') {
      addCone(m, -0.18, 0.36, -0.04, -0.27, 0.52, -0.20, 0.075, p.accent, c.cone);
      addCone(m, 0.18, 0.36, -0.04, 0.27, 0.52, -0.20, 0.075, p.accent, c.cone);
    } else if (type === 'water') {
      addCone(m, -0.24, 0.12, -0.02, -0.42, 0.19, -0.10, 0.085, p.accent, c.cone);
      addCone(m, 0.24, 0.12, -0.02, 0.42, 0.19, -0.10, 0.085, p.accent, c.cone);
    } else if (type === 'grass') {
      addCone(m, 0, 0.42, 0, 0, 0.58, -0.12, 0.10, p.accent, c.cone);
    } else if (type === 'electric') {
      addCone(m, -0.17, 0.36, 0, -0.28, 0.54, -0.08, 0.085, p.body, c.cone);
      addCone(m, -0.235, 0.47, -0.04, -0.28, 0.54, -0.08, 0.065, [0.12, 0.12, 0.12], c.cone);
      addCone(m, 0.17, 0.36, 0, 0.28, 0.54, -0.08, 0.085, p.body, c.cone);
      addCone(m, 0.235, 0.47, -0.04, 0.28, 0.54, -0.08, 0.065, [0.12, 0.12, 0.12], c.cone);
    } else if (type === 'rock') {
      addCone(m, -0.17, 0.36, 0, -0.25, 0.52, -0.08, 0.10, p.accent, c.cone);
      addCone(m, 0.17, 0.36, 0, 0.25, 0.52, -0.08, 0.10, p.accent, c.cone);
    } else {
      addCone(m, -0.17, 0.36, 0, -0.28, 0.58, -0.05, 0.095, p.body, c.cone);
      addCone(m, 0.17, 0.36, 0, 0.28, 0.58, -0.05, 0.095, p.body, c.cone);
    }

    // Couronne du boss : **bandeau large** posé sur le crâne + trois pointes
    // basses (l'ancienne couronne haute dépassait du cadre chibi).
    if (isBoss) {
      addCylinder(m, 0, 0.40, 0.02, 0, 0.45, 0.02, 0.38, [1.0, 0.85, 0.0], c.cyl);
      addCone(m, -0.17, 0.45, 0.02, -0.19, 0.56, 0.02, 0.06, [1.0, 0.85, 0.0], c.cone);
      addCone(m, 0, 0.45, 0.10, 0, 0.58, 0.10, 0.07, [1.0, 0.85, 0.0], c.cone);
      addCone(m, 0.17, 0.45, 0.02, 0.19, 0.56, 0.02, 0.06, [1.0, 0.85, 0.0], c.cone);
    }

    parts.push({ id: 'head', parent: 'torso', pivot: [0, 0.32, 0], mesh: m });
  }

  // ============================ BRAS ============================
  // Pivot au socket d'épaule, dans le torse local (±0.26, 0.12, 0).
  // Membres **courts et trapus**, poings ronds : proportions chibi.
  for (const side of ['L', 'R'] as const) {
    const s = S(side);
    const upper: BodyPartMesh = { positions: [], normals: [], colors: [] };
    // Bras (épaule → coude, descend en s'écartant à peine)
    addCylinder(
      upper,
      0, -0.02, 0,
      s * 0.09, -0.15, 0.03,
      0.072, p.body, c.cyl,
    );
    parts.push({
      id: `armU.${side}`,
      parent: 'torso',
      pivot: [s * 0.26, 0.12, 0],
      mesh: upper,
    });

    // Avant-bras + coude + poing : pivot au coude, dans l'espace du bras.
    const fore: BodyPartMesh = { positions: [], normals: [], colors: [] };
    addSphere(fore, 0, 0, 0, 0.078, 0.078, 0.075, p.body, B, B); // coude
    // Avant-bras remontant en garde vers l'intérieur
    addCylinder(
      fore,
      s * 0.01, 0.02, 0,
      s * 0.09, 0.16, 0.05,
      0.062, p.body, c.cyl,
    );
    // Poing (garde haute : à hauteur du menton, devant la face)
    addSphere(fore, s * 0.10, 0.20, 0.06, 0.085, 0.085, 0.08, p.body, B, B);
    parts.push({
      id: `fore.${side}`,
      parent: `armU.${side}`,
      pivot: [s * 0.09, -0.15, 0.03],
      mesh: fore,
    });
  }

  // ============================ JAMBES ============================
  // Pivot à la hanche, dans l'espace racine (±0.13, -0.27, 0).
  // Jambes **courtes** et pieds **ronds et larges** : un appui de peluche.
  for (const side of ['L', 'R'] as const) {
    const s = S(side);
    const legU: BodyPartMesh = { positions: [], normals: [], colors: [] };
    // Cuisse (hanche → genou, assise large)
    addCylinder(
      legU,
      0, -0.01, 0,
      s * 0.09, -0.13, 0.02,
      0.092, p.body, c.cyl,
    );
    parts.push({
      id: `legU.${side}`,
      parent: 'root',
      pivot: [s * 0.13, -0.27, 0],
      mesh: legU,
    });

    // Tibia + genou + pied : pivot au genou.
    const shin: BodyPartMesh = { positions: [], normals: [], colors: [] };
    addSphere(shin, 0, -0.005, 0, 0.088, 0.086, 0.086, p.body, B, B); // genou
    addCylinder(
      shin,
      0, -0.01, 0,
      s * 0.02, -0.12, -0.01,
      0.08, p.body, c.cyl,
    );
    addSphere(shin, s * 0.02, -0.20, 0.05, 0.115, 0.078, 0.155, p.body, B, B); // pied
    parts.push({
      id: `shin.${side}`,
      parent: `legU.${side}`,
      pivot: [s * 0.09, -0.13, 0.02],
      mesh: shin,
    });
  }

  return {
    type,
    species: 'monster',
    isBoss,
    quality,
    parts,
    vertexCount: parts.reduce((n, part) => n + part.mesh.positions.length / 3, 0),
  };
}

// ---------------------------------------------------------------------------
// Champion humain : corps nu + pièces d'équipement visibles
// ---------------------------------------------------------------------------

/**
 * Palette du champion humain : peau, cheveux, tissu, cuir, acier et or.
 * Le **type élémentaire** du champion ne colore pas la peau (il reste humain)
 * mais la **bordure de tunique et la cape** (`ELEMENT_COLORS[type].accent`),
 * ce qui conserve l'identité visuelle des 6 types tout en lisant comme un
 * humain « teinté » par son élément.
 */
export const HUMAN_COLORS = {
  skin: [0.86, 0.68, 0.55] as [number, number, number],
  skinShade: [0.74, 0.55, 0.43] as [number, number, number],
  hair: [0.28, 0.20, 0.14] as [number, number, number],
  cloth: [0.14, 0.20, 0.40] as [number, number, number],
  leather: [0.26, 0.20, 0.22] as [number, number, number],
  boot: [0.12, 0.13, 0.22] as [number, number, number],
  metal: [0.72, 0.75, 0.80] as [number, number, number],
  metalDark: [0.47, 0.51, 0.57] as [number, number, number],
  gold: [0.90, 0.74, 0.28] as [number, number, number],
};

export interface HumanRigOptions {
  /** Type élémentaire du champion (teinte de tunique / cape / sceau). */
  type: MonsterType;
  quality?: RigQuality;
  /** Emplacements d'équipement **portés** (dessine la pièce correspondante). */
  gear?: readonly GearSlot[];
}

/**
 * Construit le rig du **champion humain**, en **chibi animé façon Dragon Ball** :
 * grosse tête (près de la moitié de la figure) coiffée de **cheveux en pointes**,
 * **grands yeux d'anime** (sclère, iris, pupille, reflet, sourcil), membres
 * courts et trapus. La tunique, la cape et les bottes existantes sont conservées
 * (teintées par le type élémentaire).
 *
 * Les pièces d'équipement réellement portées se greffent toujours au maillage :
 * arme en main droite, bouclier au bras gauche, plastron sur le torse, casque
 * sur la tête, amulette au cou.
 *
 * **Même squelette que le monstre** (les 10 articulations, mêmes identifiants ;
 * seuls les pivots et volumes sont reproportionnés) : aucune pièce n'est un
 * segment articulé de plus (l'équipement est soudé aux segments existants),
 * donc les actions et le lissage du renderer s'appliquent sans changement. Le
 * chibi tient dans le même budget caméra que l'ancien humain : la tête reste
 * sous le bord haut du cadre et les pieds au-dessus du sol.
 */
export function buildHumanRig(options: HumanRigOptions): Rig {
  const { type, quality = 'high' } = options;
  const gear = new Set<GearSlot>(options.gear ?? []);
  const c = ctxFor(quality);
  const element = ELEMENT_COLORS[type] ?? ELEMENT_COLORS.normal;
  const H = HUMAN_COLORS;
  const trim = element.accent;
  const B = c.bands;
  const parts: RigPart[] = [];

  const newMesh = (): BodyPartMesh => ({ positions: [], normals: [], colors: [] });

  // ============================ TORSE (chibi : trapu) ============================
  {
    const m = newMesh();
    // Bassin (haut-de-chausses de cuir)
    addSphere(m, 0, -0.30, 0, 0.22, 0.14, 0.17, H.leather, B, B);
    // Torse court et trapu vêtu d'une tunique (proportions du modèle chibi)
    addSphere(m, 0, 0, 0, 0.28, 0.25, 0.20, H.cloth, B, B);
    // Bande de tunique à la teinte élémentaire (identité du type conservée)
    addSphere(m, 0, 0, 0.16, 0.13, 0.23, 0.06, trim, B, B);
    // Cape dans le dos (teinte élémentaire)
    addSphere(m, 0, 0.06, -0.19, 0.23, 0.27, 0.08, trim, B, B);
    // Cou court
    addCylinder(m, 0, 0.22, 0, 0, 0.30, 0, 0.085, H.skin, c.cyl);
    // Épaules (marques visuelles des pivots de bras)
    addSphere(m, -0.25, 0.10, 0, 0.09, 0.09, 0.085, H.cloth, B, B);
    addSphere(m, 0.25, 0.10, 0, 0.09, 0.09, 0.085, H.cloth, B, B);
    // Hanches (marques visuelles des pivots de jambes)
    addSphere(m, -0.115, -0.34, 0, 0.09, 0.09, 0.085, H.leather, B, B);
    addSphere(m, 0.115, -0.34, 0, 0.09, 0.09, 0.085, H.leather, B, B);
    // Ceinture
    addSphere(m, 0, -0.20, 0, 0.25, 0.05, 0.19, H.leather, B, B);

    // --- Armure : pièces **rapportées** et lisibles (construction kit) ---
    if (gear.has('armor')) {
      // Plastron bombé
      addSphere(m, 0, 0.02, 0.04, 0.315, 0.30, 0.235, H.metal, B, B);
      // Gorgerin (col d'acier)
      addCylinder(m, 0, 0.20, 0.02, 0, 0.27, 0.02, 0.125, H.metalDark, c.cyl);
      // Épaulières : deux coques détachées du plastron
      addSphere(m, -0.30, 0.12, 0.03, 0.145, 0.14, 0.145, H.metal, B, B);
      addSphere(m, 0.30, 0.12, 0.03, 0.145, 0.14, 0.145, H.metal, B, B);
      // Tassettes (lames de jupe)
      addSphere(m, -0.16, -0.30, 0.05, 0.11, 0.09, 0.13, H.metalDark, B, B);
      addSphere(m, 0.16, -0.30, 0.05, 0.11, 0.09, 0.13, H.metalDark, B, B);
    }

    // --- Accessoire (amulette + chaîne) ---
    if (gear.has('accessory')) {
      addSphere(m, 0, -0.02, 0.19, 0.05, 0.05, 0.045, H.gold, B, B);
      addCylinder(m, -0.12, 0.20, 0.02, 0.12, 0.20, 0.02, 0.016, H.gold, c.cyl);
    }

    parts.push({ id: 'torso', parent: 'root', pivot: [0, 0, 0], mesh: m });
  }

  // ============================ TÊTE (chibi : grosse tête d'anime) ============================
  {
    const m = newMesh();
    // Crâne surdimensionné (près de la moitié de la figure, aussi large que le torse)
    addSphere(m, 0, 0.22, 0, 0.38, 0.35, 0.34, H.skin, B, B);
    // Oreilles (à fleur du crâne élargi, elles doivent dépasser)
    addSphere(m, -0.375, 0.20, 0.02, 0.05, 0.07, 0.04, H.skin, B, B);
    addSphere(m, 0.375, 0.20, 0.02, 0.05, 0.07, 0.04, H.skin, B, B);
    // Nez fin (pointe discrète, pas un museau)
    addSphere(m, 0, 0.155, 0.305, 0.034, 0.04, 0.042, H.skinShade, B, B);
    // Bouche en « 3 » : lèvre supérieure plus grande que l'inférieure
    addSphere(m, 0, 0.075, 0.30, 0.055, 0.018, 0.028, H.skinShade, B, B);
    addSphere(m, 0, 0.052, 0.30, 0.042, 0.015, 0.024, H.skinShade, B, B);
    // Joues (marque d'anime, fines et hautes, sous les yeux)
    for (const s of [-1, 1]) {
      addSphere(m, s * 0.225, 0.125, 0.225, 0.062, 0.046, 0.045, [1.0, 0.45, 0.55], B, B);
    }
    // Yeux d'anime : même fabrique que le monstre (sclère, iris élémentaire,
    // pupille, double reflet, sourcil), pour un langage de visage commun aux
    // deux espèces. Taille réduite et écart augmenté : le visage reste lisible
    // (le trait d'encre de la paupière ne forme plus un bandeau).
    for (const s of [-1, 1] as const) {
      addAnimeEye(m, B, s, 0.16, 0.235, 0.265, 0.095, 0.115, 0.075, element.eye, H.hair);
    }

    // --- Cheveux : grosse crinière de **mèches** façon Dragon Ball ---
    // La calotte coiffe le haut et l'arrière du crâne (z ≤ 0.20) : le visage
    // reste dégagé, les mèches percent au-dessus et autour d'elle.
    addSphere(m, 0, 0.40, -0.10, 0.40, 0.23, 0.30, H.hair, B, B);
    // Pointes (base, pointe, rayon) : crête centrale haute, mèches latérales
    // évasées, mèches arrière et deux pointes basses qui encadrent le visage.
    const SPIKES: Array<[number, number, number, number, number, number, number]> = [
      [0, 0.52, -0.06, 0, 0.665, -0.02, 0.115],
      [-0.12, 0.54, 0.08, -0.17, 0.655, 0.12, 0.10],
      [0.12, 0.54, 0.08, 0.17, 0.655, 0.12, 0.10],
      [-0.22, 0.52, 0.02, -0.38, 0.645, -0.04, 0.105],
      [0.22, 0.52, 0.02, 0.38, 0.645, -0.04, 0.105],
      [-0.33, 0.42, -0.08, -0.55, 0.53, -0.16, 0.10],
      [0.33, 0.42, -0.08, 0.55, 0.53, -0.16, 0.10],
      [-0.20, 0.50, -0.20, -0.34, 0.63, -0.34, 0.10],
      [0.20, 0.50, -0.20, 0.34, 0.63, -0.34, 0.10],
      [-0.08, 0.52, -0.26, -0.12, 0.65, -0.42, 0.10],
      [0.08, 0.52, -0.26, 0.12, 0.65, -0.42, 0.10],
      [-0.34, 0.34, 0.02, -0.58, 0.44, -0.08, 0.095],
      [0.34, 0.34, 0.02, 0.58, 0.44, -0.08, 0.095],
      [-0.28, 0.28, -0.14, -0.52, 0.34, -0.30, 0.09],
      [0.28, 0.28, -0.14, 0.52, 0.34, -0.30, 0.09],
    ];
    for (const [bx, by, bz, tx, ty, tz, r] of SPIKES) {
      addCone(m, bx, by, bz, tx, ty, tz, r, H.hair, c.cone);
    }
    // Mèches de frange : pendent sur le front (une centrale entre les sourcils,
    // deux par côté jusqu'aux tempes), en avant du crâne pour être visibles.
    const BANGS: Array<[number, number, number, number, number, number]> = [
      [0, 0.52, 0.12, 0, 0.36, 0.325],
      [-0.11, 0.51, 0.12, -0.15, 0.395, 0.295],
      [0.11, 0.51, 0.12, 0.15, 0.395, 0.295],
      [-0.21, 0.48, 0.10, -0.30, 0.43, 0.25],
      [0.21, 0.48, 0.10, 0.30, 0.43, 0.25],
    ];
    for (const [bx, by, bz, tx, ty, tz] of BANGS) {
      addCone(m, bx, by, bz, tx, ty, tz, 0.055, H.hair, c.cone);
    }

    // --- Casque : calotte coiffant la crinière + garde-joues + nasal + cimier ---
    if (gear.has('helm')) {
      // La calotte doit contenir les pointes (sinon elles la transpercent).
      addSphere(m, 0, 0.38, -0.02, 0.43, 0.28, 0.33, H.metal, B, B);
      // Garde-joues (pièces latérales, signent le casque)
      addSphere(m, -0.31, 0.22, 0.08, 0.075, 0.14, 0.16, H.metalDark, B, B);
      addSphere(m, 0.31, 0.22, 0.08, 0.075, 0.14, 0.16, H.metalDark, B, B);
      // Nasal
      addCylinder(m, 0, 0.34, 0.30, 0, 0.10, 0.30, 0.03, H.metalDark, c.cyl);
      // Cimier doré : petite crête dressée sur le haut du casque
      addCone(m, 0, 0.62, 0.10, 0, 0.665, 0.22, 0.05, H.gold, c.cone);
    }

    parts.push({ id: 'head', parent: 'torso', pivot: [0, 0.30, 0], mesh: m });
  }

  // ============================ BRAS (chibi : courts et trapus) ============================
  for (const side of ['L', 'R'] as const) {
    const s = S(side);

    // Manche courte (tunique) puis bras nu.
    const upper = newMesh();
    addCylinder(upper, 0, -0.02, 0, s * 0.07, -0.10, 0.01, 0.082, H.cloth, c.cyl);
    addCylinder(upper, s * 0.07, -0.10, 0.01, s * 0.08, -0.16, 0.02, 0.07, H.skin, c.cyl);
    parts.push({ id: `armU.${side}`, parent: 'torso', pivot: [s * 0.27, 0.06, 0], mesh: upper });

    // Avant-bras (bracelet de cuir) + poing remonté en garde.
    const fore = newMesh();
    addSphere(fore, 0, 0, 0, 0.075, 0.075, 0.072, H.skin, B, B);
    addCylinder(fore, s * 0.01, 0.01, 0, s * 0.05, 0.10, 0.05, 0.065, H.skin, c.cyl);
    addCylinder(fore, s * 0.01, 0.02, 0.01, s * 0.04, 0.07, 0.03, 0.075, H.leather, c.cyl);
    addSphere(fore, s * 0.06, 0.13, 0.06, 0.08, 0.08, 0.075, H.skin, B, B);

    // --- Arme (main droite) : garde, lame, pointe, pommeau ---
    if (side === 'R' && gear.has('weapon')) {
      addSphere(fore, s * 0.06, 0.15, 0.06, 0.09, 0.035, 0.08, H.metalDark, B, B);
      addCylinder(fore, s * 0.06, 0.19, 0.07, s * 0.10, 0.55, 0.10, 0.032, H.metal, c.cyl);
      addCone(fore, s * 0.10, 0.55, 0.10, s * 0.11, 0.64, 0.11, 0.032, H.metal, c.cone);
      addSphere(fore, s * 0.06, 0.11, 0.06, 0.045, 0.045, 0.045, H.gold, B, B);
    }

    // --- Bouclier (bras gauche) : écu + umbo ---
    if (side === 'L' && gear.has('shield')) {
      addSphere(fore, s * 0.05, 0.06, 0.14, 0.18, 0.22, 0.06, H.metal, B, B);
      addSphere(fore, s * 0.05, 0.06, 0.19, 0.05, 0.05, 0.03, H.gold, B, B);
    }

    parts.push({ id: `fore.${side}`, parent: `armU.${side}`, pivot: [s * 0.08, -0.16, 0.02], mesh: fore });
  }

  // ============================ JAMBES (chibi : courtes, gros pieds) ============================
  for (const side of ['L', 'R'] as const) {
    const s = S(side);

    const legU = newMesh();
    addCylinder(legU, 0, -0.01, 0, s * 0.07, -0.16, 0.02, 0.088, H.cloth, c.cyl);
    parts.push({ id: `legU.${side}`, parent: 'root', pivot: [s * 0.115, -0.34, 0], mesh: legU });

    const shin = newMesh();
    addSphere(shin, 0, -0.005, 0, 0.085, 0.082, 0.082, H.cloth, B, B);
    addCylinder(shin, 0, -0.01, 0, s * 0.02, -0.14, -0.01, 0.078, H.cloth, c.cyl);
    addSphere(shin, s * 0.02, -0.20, 0.05, 0.105, 0.075, 0.15, H.boot, B, B);
    parts.push({ id: `shin.${side}`, parent: `legU.${side}`, pivot: [s * 0.07, -0.16, 0.02], mesh: shin });
  }

  return {
    type,
    species: 'human',
    isBoss: false,
    quality,
    parts,
    vertexCount: parts.reduce((n, part) => n + part.mesh.positions.length / 3, 0),
  };
}

// ---------------------------------------------------------------------------
// Actions : keyframes articulaires (attaque, défense, canalisation, fin de
// combat). Toutes les keyframes d'une action listent le **même ensemble** de
// joints, absent = garde (0).
// ---------------------------------------------------------------------------

export type RigActionKind = 'melee' | 'ranged' | 'channel' | 'block' | 'victory' | 'defeat';

export interface ActionKeyframe {
  /** Normalisé [0..1] sur la durée de l'action. */
  t: number;
  joints: Partial<Record<JointId, JointPose>>;
  dy: number;
}

export interface RigActionSpec {
  /** Durée totale en ms (le beat du renderer étire les protections). */
  duration: number;
  /** Vrai : la dernière keyframe est maintenue (défaite) au lieu de relâcher. */
  holdAfter?: boolean;
  keyframes: ActionKeyframe[];
}

/** Conventions : le monstre est face à +Z (caméra). Le bras (−y) part en
 * avant avec rx **négatif** ; l'avant-bras (+y) se tend avec rx **positif**
 * ~2.9 (extension le long du bras) ; crouch = legU− / shin+ / dy−. */
export const RIG_ACTIONS: Record<RigActionKind, RigActionSpec> = {
  // Coup physique : VRAI mouvement de combat — enroulement du buste,
  // poing droit chambré, grande enjambée avant, frappe tendue à bout de bras
  // (synchrone avec le sommet de la ruée CSS à 46 %), puis récupération.
  // Les jambes font le travail : appui arrière qui pousse, genou avant plié.
  melee: {
    duration: 620,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      // Armement : buste enroulé loin du coup, poing chambré près du menton,
      // jambes chargées (genou avant levé, poids sur la jambe arrière).
      {
        t: 0.16,
        joints: {
          torso: [0, -0.5, 0], head: [-0.05, 0.2, 0],
          'armU.R': [-0.7, 0, -0.3], 'fore.R': [1.7, 0, 0],
          'armU.L': [-0.95, 0, 0.25], 'fore.L': [2.1, 0, 0],
          'legU.L': [-0.35, 0, 0], 'legU.R': [0.22, 0, 0],
          'shin.L': [0.55, 0, 0], 'shin.R': [0.4, 0, 0],
        },
        dy: -0.09,
      },
      // Foulée : grande enjambée avant, jambe arrière tendue qui pousse,
      // le buste entame sa rotation vers la cible.
      {
        t: 0.34,
        joints: {
          torso: [0.08, 0.45, 0], head: [-0.1, -0.15, 0],
          'armU.R': [-1.35, 0, -0.15], 'fore.R': [2.5, 0, 0],
          'armU.L': [-0.55, 0, 0.4], 'fore.L': [1.5, 0, 0],
          'legU.L': [-0.7, 0, 0], 'legU.R': [0.38, 0, 0],
          'shin.L': [0.9, 0, 0], 'shin.R': [0.28, 0, 0],
        },
        dy: -0.05,
      },
      // Impact (sommet de la ruée CSS) : bras tendu au maximum, buste lancé,
      // les deux appuis ancrés au sol en fente.
      {
        t: 0.46,
        joints: {
          torso: [0.12, 0.55, 0], head: [-0.08, -0.18, 0],
          'armU.R': [-1.7, 0, -0.1], 'fore.R': [3.05, 0, 0],
          'armU.L': [-0.35, 0, 0.5], 'fore.L': [1.15, 0, 0],
          'legU.L': [-0.8, 0, 0], 'legU.R': [0.42, 0, 0],
          'shin.L': [1.0, 0, 0], 'shin.R': [0.2, 0, 0],
        },
        dy: -0.04,
      },
      // Poursuite : le bras continue sa course, le buste se replie, la fente
      // se resserre.
      {
        t: 0.62,
        joints: {
          torso: [0.16, 0.35, 0], head: [-0.04, -0.08, 0],
          'armU.R': [-1.35, 0, -0.05], 'fore.R': [2.55, 0, 0],
          'armU.L': [-0.5, 0, 0.35], 'fore.L': [1.35, 0, 0],
          'legU.L': [-0.6, 0, 0], 'legU.R': [0.32, 0, 0],
          'shin.L': [0.85, 0, 0], 'shin.R': [0.3, 0, 0],
        },
        dy: -0.05,
      },
      // Récupération : les appuis se resserrent, la garde remonte.
      {
        t: 0.82,
        joints: {
          torso: [0.05, -0.1, 0], head: [0, 0, 0],
          'armU.R': [-0.55, 0, -0.12], 'fore.R': [1.55, 0, 0],
          'armU.L': [-0.5, 0, 0.18], 'fore.L': [1.45, 0, 0],
          'legU.L': [-0.22, 0, 0], 'legU.R': [0.12, 0, 0],
          'shin.L': [0.38, 0, 0], 'shin.R': [0.22, 0, 0],
        },
        dy: -0.02,
      },
      { t: 1, joints: {}, dy: 0 },
    ],
  },

  // Sort à distance : recul de préparation, paumes projetées en avant.
  ranged: {
    duration: 720,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      {
        t: 0.26,
        joints: {
          torso: [-0.12, 0, 0], head: [-0.07, 0, 0],
          'armU.L': [-0.35, 0, 0.08], 'armU.R': [-0.35, 0, -0.08],
          'fore.L': [1.25, 0, 0], 'fore.R': [1.25, 0, 0],
          'legU.L': [-0.18, 0, 0], 'legU.R': [0.12, 0, 0],
          'shin.L': [0.3, 0, 0], 'shin.R': [0.25, 0, 0],
        },
        dy: -0.045,
      },
      {
        t: 0.48,
        joints: {
          torso: [0.1, 0, 0], head: [-0.02, 0, 0],
          'armU.L': [-0.95, 0, 0.12], 'armU.R': [-0.95, 0, -0.12],
          'fore.L': [2.5, 0, 0], 'fore.R': [2.5, 0, 0],
          'legU.L': [-0.32, 0, 0], 'legU.R': [0.22, 0, 0],
          'shin.L': [0.5, 0, 0], 'shin.R': [0.32, 0, 0],
        },
        dy: -0.03,
      },
      {
        t: 0.68,
        joints: {
          torso: [0.06, 0, 0], head: [-0.02, 0, 0],
          'armU.L': [-0.8, 0, 0.1], 'armU.R': [-0.8, 0, -0.1],
          'fore.L': [2.2, 0, 0], 'fore.R': [2.2, 0, 0],
          'legU.L': [-0.25, 0, 0], 'legU.R': [0.18, 0, 0],
          'shin.L': [0.42, 0, 0], 'shin.R': [0.28, 0, 0],
        },
        dy: -0.02,
      },
      {
        t: 0.86,
        joints: {
          torso: [0, 0, 0], head: [0, 0, 0],
          'armU.L': [-0.35, 0, 0.05], 'armU.R': [-0.35, 0, -0.05],
          'fore.L': [1.2, 0, 0], 'fore.R': [1.2, 0, 0],
          'legU.L': [-0.1, 0, 0], 'legU.R': [0.06, 0, 0],
          'shin.L': [0.16, 0, 0], 'shin.R': [0.1, 0, 0],
        },
        dy: -0.01,
      },
      { t: 1, joints: {}, dy: 0 },
    ],
  },

  // Soin / buff : les bras s'élèvent, canalisation sur place (sans
  // translation horizontale — l'arène reste ancrée au sol).
  channel: {
    duration: 900,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      {
        t: 0.3,
        joints: {
          torso: [-0.05, 0, 0], head: [-0.12, 0, 0],
          'armU.L': [-2.3, 0, 0.15], 'armU.R': [-2.3, 0, -0.15],
          'fore.L': [1.0, 0, 0], 'fore.R': [1.0, 0, 0],
        },
        dy: 0.03,
      },
      {
        t: 0.55,
        joints: {
          torso: [-0.06, 0, 0], head: [-0.15, 0, 0],
          'armU.L': [-2.5, 0, 0.2], 'armU.R': [-2.5, 0, -0.2],
          'fore.L': [1.15, 0, 0], 'fore.R': [1.15, 0, 0],
        },
        dy: 0.04,
      },
      {
        t: 0.78,
        joints: {
          torso: [-0.04, 0, 0], head: [-0.1, 0, 0],
          'armU.L': [-2.2, 0, 0.15], 'armU.R': [-2.2, 0, -0.15],
          'fore.L': [0.9, 0, 0], 'fore.R': [0.9, 0, 0],
        },
        dy: 0.02,
      },
      { t: 1, joints: {}, dy: 0 },
    ],
  },

  // Défense réactive : bras croisés devant la face, buste recroquevillé,
  // jambes pliées. Le renderer ajoute un tremblement d'impact décroissant.
  block: {
    duration: 700,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      {
        t: 0.16,
        joints: {
          torso: [0.16, 0, 0], head: [-0.07, 0, 0],
          'armU.L': [-0.55, 0, 0.22], 'armU.R': [-0.55, 0, -0.22],
          'fore.L': [1.6, 0, 0.4], 'fore.R': [1.6, 0, -0.4],
          'legU.L': [-0.2, 0, 0], 'legU.R': [-0.2, 0, 0],
          'shin.L': [0.4, 0, 0], 'shin.R': [0.4, 0, 0],
        },
        dy: -0.05,
      },
      {
        t: 0.45,
        joints: {
          torso: [0.15, 0, 0], head: [-0.07, 0, 0],
          'armU.L': [-0.6, 0, 0.25], 'armU.R': [-0.6, 0, -0.25],
          'fore.L': [1.65, 0, 0.45], 'fore.R': [1.65, 0, -0.45],
          'legU.L': [-0.22, 0, 0], 'legU.R': [-0.22, 0, 0],
          'shin.L': [0.42, 0, 0], 'shin.R': [0.42, 0, 0],
        },
        dy: -0.06,
      },
      {
        t: 0.8,
        joints: {
          torso: [0.05, 0, 0], head: [0, 0, 0],
          'armU.L': [-0.2, 0, 0.1], 'armU.R': [-0.2, 0, -0.1],
          'fore.L': [0.6, 0, 0.1], 'fore.R': [0.6, 0, -0.1],
          'legU.L': [-0.08, 0, 0], 'legU.R': [-0.08, 0, 0],
          'shin.L': [0.15, 0, 0], 'shin.R': [0.15, 0, 0],
        },
        dy: -0.02,
      },
      { t: 1, joints: {}, dy: 0 },
    ],
  },

  // Victoire : les bras montent vers le ciel (la célébration CSS prolonge).
  victory: {
    duration: 1100,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      {
        t: 0.35,
        joints: {
          head: [-0.12, 0, 0],
          'armU.L': [-2.4, 0, 0.2], 'armU.R': [-2.4, 0, -0.2],
          'fore.L': [1.3, 0, 0], 'fore.R': [1.3, 0, 0],
        },
        dy: 0.05,
      },
      {
        t: 0.6,
        joints: {
          head: [-0.08, 0, 0],
          'armU.L': [-2.05, 0, 0.15], 'armU.R': [-2.05, 0, -0.15],
          'fore.L': [1.0, 0, 0], 'fore.R': [1.0, 0, 0],
        },
        dy: -0.01,
      },
      {
        t: 0.85,
        joints: {
          head: [-0.12, 0, 0],
          'armU.L': [-2.45, 0, 0.2], 'armU.R': [-2.45, 0, -0.2],
          'fore.L': [1.35, 0, 0], 'fore.R': [1.35, 0, 0],
        },
        dy: 0.06,
      },
      { t: 1, joints: {}, dy: 0 },
    ],
  },

  // Défaite : effondrement du buste, bras inertes, tassement du bassin.
  // `holdAfter` : la pose reste (le CSS désature et fait disparaître ensuite).
  defeat: {
    duration: 1400,
    holdAfter: true,
    keyframes: [
      { t: 0, joints: {}, dy: 0 },
      {
        t: 0.3,
        joints: {
          torso: [0.3, 0, 0], head: [0.35, 0, 0],
          'armU.L': [0.2, 0, 0.08], 'armU.R': [0.2, 0, -0.08],
          'fore.L': [2.0, 0, 0], 'fore.R': [2.0, 0, 0],
          'legU.L': [-0.1, 0, 0], 'legU.R': [-0.1, 0, 0],
          'shin.L': [0.2, 0, 0], 'shin.R': [0.2, 0, 0],
        },
        dy: -0.12,
      },
      {
        t: 0.75,
        joints: {
          torso: [0.42, 0, 0], head: [0.45, 0, 0],
          'armU.L': [0.3, 0, 0.12], 'armU.R': [0.3, 0, -0.12],
          'fore.L': [2.2, 0, 0], 'fore.R': [2.2, 0, 0],
          'legU.L': [-0.14, 0, 0], 'legU.R': [-0.14, 0, 0],
          'shin.L': [0.26, 0, 0], 'shin.R': [0.26, 0, 0],
        },
        dy: -0.16,
      },
      {
        t: 1,
        joints: {
          torso: [0.42, 0, 0], head: [0.45, 0, 0],
          'armU.L': [0.3, 0, 0.12], 'armU.R': [0.3, 0, -0.12],
          'fore.L': [2.2, 0, 0], 'fore.R': [2.2, 0, 0],
          'legU.L': [-0.14, 0, 0], 'legU.R': [-0.14, 0, 0],
          'shin.L': [0.26, 0, 0], 'shin.R': [0.26, 0, 0],
        },
        dy: -0.16,
      },
    ],
  },
};

/** Échantillonne la pose d'une action à un instant normalisé t ∈ [0..1]. */
export function sampleRigPose(kind: RigActionKind, t: number): RigPose {
  const spec = RIG_ACTIONS[kind];
  const kfs = spec.keyframes;
  const tc = Math.max(0, Math.min(1, t));

  let i = 0;
  while (i < kfs.length - 1 && kfs[i]!.t <= tc) i++;
  const a = kfs[Math.max(0, i - 1)]!;
  const b = kfs[Math.min(kfs.length - 1, i)]!;

  const span = b.t - a.t;
  const localT = span > 0 ? (tc - a.t) / span : 1;
  const ease = localT * localT * (3 - 2 * localT); // smoothstep

  const joints: Partial<Record<JointId, JointPose>> = {};
  for (const id of JOINT_IDS) {
    const ja = a.joints[id];
    const jb = b.joints[id];
    if (!ja && !jb) continue;
    const ra: JointPose = ja ?? [0, 0, 0];
    const rb: JointPose = jb ?? [0, 0, 0];
    joints[id] = [
      ra[0] + (rb[0] - ra[0]) * ease,
      ra[1] + (rb[1] - ra[1]) * ease,
      ra[2] + (rb[2] - ra[2]) * ease,
    ];
  }
  return { joints, dy: a.dy + (b.dy - a.dy) * ease };
}

/** Applique une intensité (+crit) aux amplitudes d'une pose. */
export function scaleRigPose(pose: RigPose, factor: number): RigPose {
  if (Math.abs(factor - 1) < 1e-4) return pose;
  const joints: Partial<Record<JointId, JointPose>> = {};
  for (const [id, rot] of Object.entries(pose.joints) as [JointId, JointPose][]) {
    joints[id] = [
      Math.max(-3.1, Math.min(3.1, rot[0] * factor)),
      Math.max(-3.1, Math.min(3.1, rot[1] * factor)),
      Math.max(-3.1, Math.min(3.1, rot[2] * factor)),
    ] as JointPose;
  }
  return { joints, dy: pose.dy * factor };
}

// ---------------------------------------------------------------------------
// Composition hiérarchique : matrice monde de chaque part + bornes
// ---------------------------------------------------------------------------

/**
 * Calcule la matrice modèle (espace racine) de chaque part, en composant
 * parent → enfant avec les rotations de la pose. Espace racine = garde
 * d'origine du mesh fusionné.
 */
export function rigPartMatrices(
  rig: Rig,
  pose: RigPose,
): Record<string, Float32Array> {
  const out: Record<string, Float32Array> = {};
  const idents: Record<string, Float32Array> = { root: mat4Identity() };

  for (const part of rig.parts) {
    const parentMat = part.parent === 'root'
      ? idents['root']!
      : (out[part.parent] ?? idents[part.parent] ?? mat4Identity());

    const m = mat4Identity();
    mat4Translate(m, parentMat, part.pivot[0], part.pivot[1], part.pivot[2]);
    const rot = pose.joints[part.id];
    if (rot) {
      const [rx, ry, rz] = rot;
      if (rx) {
        const tmp = mat4Identity();
        mat4RotateX(tmp, tmp, rx);
        mat4Multiply(m, m, tmp);
      }
      if (ry) {
        const tmp = mat4Identity();
        mat4RotateY(tmp, tmp, ry);
        mat4Multiply(m, m, tmp);
      }
      if (rz) {
        const tmp = mat4Identity();
        mat4RotateZ(tmp, tmp, rz);
        mat4Multiply(m, m, tmp);
      }
    }
    out[part.id] = m;
  }
  return out;
}

export interface Vec3Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** Bornes du rig complet (espace racine) pour une pose donnée. */
export function rigWorldBounds(rig: Rig, pose: RigPose): Vec3Bounds {
  const matrices = rigPartMatrices(rig, pose);
  const bounds: Vec3Bounds = {
    minX: Infinity, maxX: -Infinity,
    minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity,
  };

  for (const part of rig.parts) {
    const m = matrices[part.id]!;
    const pos = part.mesh.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i]!, y = pos[i + 1]!, z = pos[i + 2]!;
      // Rotation PUIS translation de pivot (m[12..14]) : les sommets vivent
      // dans l'espace local du segment, le pivot les ramène au monde.
      const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
      if (wx < bounds.minX) bounds.minX = wx;
      if (wx > bounds.maxX) bounds.maxX = wx;
      if (wy < bounds.minY) bounds.minY = wy + pose.dy;
      if (wy > bounds.maxY) bounds.maxY = wy + pose.dy;
      if (wz < bounds.minZ) bounds.minZ = wz;
      if (wz > bounds.maxZ) bounds.maxZ = wz;
    }
  }
  return bounds;
}
