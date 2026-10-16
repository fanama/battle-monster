/**
 * Environnement 3D de l'arène — module **pur** (aucune dépendance WebGL ni DOM,
 * exécutable tel quel sous Bun pour les tests).
 *
 * Décor façon Dragon Quest : un sol bleu nuit strié de lignes qui fuient vers
 * un horizon lumineux, deux rangées de piliers de temple qui reculent dans la
 * brume. La scène est statique : le renderer ne la dessine qu'au redimensionnement.
 *
 * Caméra : position fixe, regard horizontal. L'horizon est décalé
 * optiquement (décalage de la matrice de projection, pas une rotation) pour
 * tomber exactement sur la ligne d'horizon CSS de l'arène (38 % depuis le
 * haut), donc sur la ligne de sol où se tiennent les combattants.
 *
 * Répartition, identique à `spellVfx.ts` / `monsterRig.ts` : la géométrie et les
 * matrices sont ici, le téléversement GPU est dans `ArenaEnvironmentLayer.ts`.
 */

import { mat4Multiply, mat4Perspective } from './monsterRig';

export type Vec3 = [number, number, number];
export type Rgba = [number, number, number, number];

/** Maillage sans index : trois sommets par triangle, attributs parallèles. */
export interface ArenaMesh {
  positions: number[];
  normals: number[];
  /** Couleur RGBA par sommet (4 valeurs). */
  colors: number[];
  /** 1 par sommet : 1 = surface lumineuse (non éclairée, exemptée de brume). */
  emissive: number[];
}

// ---------------------------------------------------------------------------
// Caméra
// ---------------------------------------------------------------------------

/** Œil du spectateur : légèrement au-dessus du sol, en avant du décor. */
export const ARENA_EYE: Vec3 = [0, 1.6, 9];
export const ARENA_FOV_RAD = (50 * Math.PI) / 180;
export const ARENA_NEAR = 0.1;
export const ARENA_FAR = 200;
/** Ligne d'horizon, en fraction de la hauteur depuis le haut (= CSS `bottom: 62%`). */
export const ARENA_HORIZON_FROM_TOP = 0.38;

// ---------------------------------------------------------------------------
// Ambiance
// ---------------------------------------------------------------------------

/** Brume : au-delà de `FOG_FAR`, le décor se fond dans le ciel CSS. */
export const ARENA_FOG_NEAR = 12;
export const ARENA_FOG_FAR = 60;
export const ARENA_FOG_COLOR: Vec3 = [0.04, 0.06, 0.16];
/** Direction de la lumière (depuis le haut-gauche, vers l'arrière). */
export const ARENA_LIGHT_DIR: Vec3 = [-0.35, 1, 0.45];

// ---------------------------------------------------------------------------
// Géométrie du décor
// ---------------------------------------------------------------------------

const FLOOR_HALF_X = 40;
const FLOOR_NEAR_Z = 8;
const FLOOR_FAR_Z = -60;
const FLOOR_COLOR: Rgba = [0.05, 0.08, 0.18, 0.95];

const GRID_HALF = 20;
const GRID_STEP_X = 2;
const GRID_STEP_Z = 1.5;
const GRID_LINE_HALF_WIDTH = 0.025;
const GRID_LINE_Y = 0.01;
const GRID_COLOR: Rgba = [0.58, 0.77, 0.99, 0.4];

const HORIZON_Z = -58;
const HORIZON_GLOW_HEIGHT = 2.5;
const HORIZON_COLOR: Rgba = [0.45, 0.7, 1, 0.85];

const PILLAR_XS = [-10, 10];
const PILLAR_ZS = [-8, -18, -30];
const PILLAR_BASE_COLOR: Rgba = [0.2, 0.26, 0.44, 1];
const PILLAR_SHAFT_COLOR: Rgba = [0.3, 0.38, 0.62, 1];
const PILLAR_CAPITAL_COLOR: Rgba = [0.5, 0.7, 1, 1];

// ---------------------------------------------------------------------------
// Matrices
// ---------------------------------------------------------------------------

/** Matrice de vue (colonne-majeure), cadre (0, 1.6, 9) regardant vers -Z. */
export function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;

  // x = up × z
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl;
  xy /= xl;
  xz /= xl;

  // y = z × x
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
    -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1,
  ]);
}

/** Vue de la caméra de l'arène (regard horizontal, à hauteur d'œil). */
export function arenaViewMatrix(): Float32Array {
  return mat4LookAt(ARENA_EYE, [0, ARENA_EYE[1], 0], [0, 1, 0]);
}

/**
 * Projection pour une arène de `width` × `height` pixels CSS, avec décalage
 * optique de l'horizon. En perspective, `NDC y = -P[9] + f·y/(-z)` : fixer
 * `P[9] = -(1 - 2h)` place l'horizon (point à l'infini) à la fraction `h`
 * depuis le haut, sans incliner la caméra.
 */
export function arenaProjectionMatrix(width: number, height: number): Float32Array {
  const aspect = Math.max(1, width) / Math.max(1, height);
  const proj = mat4Perspective(ARENA_FOV_RAD, aspect, ARENA_NEAR, ARENA_FAR);
  proj[9] = -(1 - 2 * ARENA_HORIZON_FROM_TOP);
  return proj;
}

/** Projection × vue, prête pour le shader. */
export function arenaViewProjection(width: number, height: number): Float32Array {
  return mat4Multiply(
    new Float32Array(16),
    arenaProjectionMatrix(width, height),
    arenaViewMatrix(),
  );
}

// ---------------------------------------------------------------------------
// Maillages
// ---------------------------------------------------------------------------

function emptyMesh(): ArenaMesh {
  return { positions: [], normals: [], colors: [], emissive: [] };
}

function pushVertex(
  mesh: ArenaMesh,
  p: Vec3,
  n: Vec3,
  color: Rgba,
  emissive: number,
): void {
  mesh.positions.push(p[0], p[1], p[2]);
  mesh.normals.push(n[0], n[1], n[2]);
  mesh.colors.push(color[0], color[1], color[2], color[3]);
  mesh.emissive.push(emissive);
}

/** Quad `a b c d` (deux triangles `a b c` et `a c d`), normale plate. */
function pushQuad(
  mesh: ArenaMesh,
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  normal: Vec3,
  color: Rgba,
  emissive = 0,
): void {
  for (const p of [a, b, c, a, c, d]) {
    pushVertex(mesh, p, normal, color, emissive);
  }
}

/** Pavé aligné sur les axes (six faces, normales plates). */
export function addBox(
  mesh: ArenaMesh,
  center: Vec3,
  half: Vec3,
  color: Rgba,
): void {
  const [cx, cy, cz] = center;
  const [hx, hy, hz] = half;
  const x0 = cx - hx, x1 = cx + hx;
  const y0 = cy - hy, y1 = cy + hy;
  const z0 = cz - hz, z1 = cz + hz;

  pushQuad(mesh, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], color);
  pushQuad(mesh, [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0], color);
  pushQuad(mesh, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], color);
  pushQuad(mesh, [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0], color);
  pushQuad(mesh, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], color);
  pushQuad(mesh, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], color);
}

function addPillar(mesh: ArenaMesh, x: number, z: number): void {
  // Socle, fût, chapiteau : une colonne de temple lisible à distance.
  addBox(mesh, [x, 0.3, z], [0.75, 0.3, 0.75], PILLAR_BASE_COLOR);
  addBox(mesh, [x, 3.3, z], [0.45, 2.7, 0.45], PILLAR_SHAFT_COLOR);
  addBox(mesh, [x, 6.3, z], [0.75, 0.3, 0.75], PILLAR_CAPITAL_COLOR);
}

/**
 * Construit le décor complet. Ordre des primitives : sol, grille, horizon,
 * piliers — l'horizon (translucide) est dessiné avant les piliers (opaques),
 * le test de profondeur tranche le reste.
 */
export function buildArenaEnvironment(): ArenaMesh {
  const mesh = emptyMesh();
  const up: Vec3 = [0, 1, 0];

  // Sol : un plan qui s'étend du bord de la caméra jusqu'à l'horizon.
  pushQuad(
    mesh,
    [-FLOOR_HALF_X, 0, FLOOR_NEAR_Z],
    [FLOOR_HALF_X, 0, FLOOR_NEAR_Z],
    [FLOOR_HALF_X, 0, FLOOR_FAR_Z],
    [-FLOOR_HALF_X, 0, FLOOR_FAR_Z],
    up,
    FLOOR_COLOR,
  );

  // Grille : lignes parallèles à Z (fuyantes) et à X (transversales). Leur
  // espacement en monde est constant, la perspective les resserre seule.
  const hw = GRID_LINE_HALF_WIDTH;
  const y = GRID_LINE_Y;
  for (let x = -GRID_HALF; x <= GRID_HALF; x += GRID_STEP_X) {
    pushQuad(
      mesh,
      [x - hw, y, FLOOR_NEAR_Z],
      [x + hw, y, FLOOR_NEAR_Z],
      [x + hw, y, FLOOR_FAR_Z],
      [x - hw, y, FLOOR_FAR_Z],
      up,
      GRID_COLOR,
    );
  }
  for (let z = FLOOR_NEAR_Z - 2; z >= FLOOR_FAR_Z; z -= GRID_STEP_Z) {
    pushQuad(
      mesh,
      [-GRID_HALF, y, z - hw],
      [GRID_HALF, y, z - hw],
      [GRID_HALF, y, z + hw],
      [-GRID_HALF, y, z + hw],
      up,
      GRID_COLOR,
    );
  }

  // Horizon : bande lumineuse verticale au fond du sol, face caméra.
  pushQuad(
    mesh,
    [-FLOOR_HALF_X, 0, HORIZON_Z],
    [FLOOR_HALF_X, 0, HORIZON_Z],
    [FLOOR_HALF_X, HORIZON_GLOW_HEIGHT, HORIZON_Z],
    [-FLOOR_HALF_X, HORIZON_GLOW_HEIGHT, HORIZON_Z],
    [0, 0, 1],
    HORIZON_COLOR,
    1,
  );

  for (const x of PILLAR_XS) {
    for (const z of PILLAR_ZS) addPillar(mesh, x, z);
  }

  return mesh;
}
