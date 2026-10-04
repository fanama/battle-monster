// Moteur WebGL 3D natif zéro-dépendance pour le rendu procédural de créatures en 3D Toon-Shading

export interface Monster3DOptions {
  type: "fire" | "water" | "grass" | "electric" | "rock" | "normal";
  isPlayer: boolean;
  isBoss: boolean;
  isLowHp: boolean;
  isStrong: boolean;
  hasWisdom: boolean;
}

// Couleurs élémentaires pour le shader 3D
const ELEMENT_COLORS: Record<
  string,
  {
    body: [number, number, number];
    belly: [number, number, number];
    accent: [number, number, number];
    glow: [number, number, number];
    eye: [number, number, number];
  }
> = {
  fire: {
    body: [0.98, 0.38, 0.18], // Orange feu
    belly: [1.0, 0.85, 0.45], // Jaune crème
    accent: [0.92, 0.15, 0.15], // Rouge écarlate
    glow: [1.0, 0.4, 0.0],
    eye: [0.0, 0.75, 1.0], // Iris cyan
  },
  water: {
    body: [0.12, 0.62, 0.95], // Bleu lagon
    belly: [0.88, 0.96, 1.0], // Blanc bleuté
    accent: [0.0, 0.85, 0.9], // Cyan vif
    glow: [0.0, 0.8, 1.0],
    eye: [0.15, 0.75, 0.35], // Iris émeraude
  },
  grass: {
    body: [0.35, 0.75, 0.32], // Vert feuille
    belly: [0.9, 0.98, 0.88], // Crème menthe
    accent: [1.0, 0.3, 0.55], // Rose bourgeon
    glow: [0.45, 0.95, 0.25],
    eye: [0.75, 0.1, 0.4], // Iris rubis
  },
  electric: {
    body: [0.98, 0.78, 0.12], // Jaune éclair
    belly: [1.0, 0.98, 0.88], // Blanc cassé
    accent: [0.95, 0.15, 0.2], // Rouge joues
    glow: [1.0, 0.9, 0.2],
    eye: [0.38, 0.25, 0.2], // Iris chocolat
  },
  rock: {
    body: [0.55, 0.62, 0.66], // Gris basalte
    belly: [0.88, 0.92, 0.94], // Granit clair
    accent: [0.0, 0.78, 0.68], // Cristaux turquoise
    glow: [0.2, 0.85, 0.75],
    eye: [0.95, 0.35, 0.15], // Iris ambre
  },
  normal: {
    body: [0.68, 0.55, 0.46], // Fauve chaud
    belly: [0.98, 0.92, 0.85], // Crème duvet
    accent: [0.95, 0.65, 0.25], // Ambre doré
    glow: [0.85, 0.75, 0.65],
    eye: [0.25, 0.55, 0.95], // Iris saphir
  },
};

// Shaders GLSL 3D avec Cel-Shading, Rim Lighting et perspective réelle
const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;

  uniform mat4 uProjection;
  uniform mat4 uModelView;
  uniform mat3 uNormalMatrix;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vColor;

  void main() {
    vNormal = normalize(uNormalMatrix * aNormal);
    vec4 viewPos = uModelView * vec4(aPosition, 1.0);
    vViewPosition = -viewPos.xyz;
    vColor = aColor;
    gl_Position = uProjection * viewPos;
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vColor;

  uniform vec3 uLightDir;
  uniform vec3 uAuraColor;
  uniform float uIsBoss;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(vViewPosition);

    // Éclairage toon en 3 paliers nets (Cel-Shading)
    float NdotL = dot(N, L);
    float lightStep = 0.35;
    if (NdotL > 0.45) {
      lightStep = 1.0;
    } else if (NdotL > -0.05) {
      lightStep = 0.7;
    }

    // Reflet de bordure 3D (Rim Light / Fresnel)
    float rim = 1.0 - max(dot(N, V), 0.0);
    rim = smoothstep(0.55, 0.85, rim);
    vec3 rimColor = vec3(0.9, 0.95, 1.0) * rim * 0.45;

    // Éclat d'aura pour les Boss
    if (uIsBoss > 0.5) {
      rimColor += uAuraColor * rim * 0.6;
    }

    vec3 finalColor = (vColor * lightStep) + rimColor;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Mathématiques matricielles 4x4
function mat4Perspective(
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): Float32Array {
  const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRad);
  const rangeInv = 1.0 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (near + far) * rangeInv,
    -1,
    0,
    0,
    near * far * rangeInv * 2,
    0,
  ]);
}

function mat4Identity(): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Multiply(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
): Float32Array {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

function mat4Translate(
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

function mat4RotateY(
  out: Float32Array,
  a: Float32Array,
  rad: number,
): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];

  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;

  if (a !== out) {
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  return out;
}

function mat4RotateX(
  out: Float32Array,
  a: Float32Array,
  rad: number,
): Float32Array {
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];

  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;

  if (a !== out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  return out;
}

function mat4Scale(
  out: Float32Array,
  a: Float32Array,
  sx: number,
  sy: number,
  sz: number,
): Float32Array {
  out[0] = a[0] * sx;
  out[1] = a[1] * sx;
  out[2] = a[2] * sx;
  out[3] = a[3] * sx;
  out[4] = a[4] * sy;
  out[5] = a[5] * sy;
  out[6] = a[6] * sy;
  out[7] = a[7] * sy;
  out[8] = a[8] * sz;
  out[9] = a[9] * sz;
  out[10] = a[10] * sz;
  out[11] = a[11] * sz;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}

function mat3NormalFromMat4(out: Float32Array, a: Float32Array): Float32Array {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;

  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) return out;
  det = 1.0 / det;

  // Matrice normale = transposée de l'inverse de la sous-matrice 3x3
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

// Constructeur de maillages 3D paramétriques (Sphères, Cônes, Cylindres, Cubes)
interface MeshBuilder {
  positions: number[];
  normals: number[];
  colors: number[];
}

function addSphere(
  mesh: MeshBuilder,
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

      // 4 coins du quad
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

      // Triangle 1: p1 -> p3 -> p2 (ordre CCW vu de l'extérieur)
      mesh.positions.push(
        cx + p1[0] * rx,
        cy + p1[1] * ry,
        cz + p1[2] * rz,
        cx + p3[0] * rx,
        cy + p3[1] * ry,
        cz + p3[2] * rz,
        cx + p2[0] * rx,
        cy + p2[1] * ry,
        cz + p2[2] * rz,
      );
      mesh.normals.push(
        p1[0],
        p1[1],
        p1[2],
        p3[0],
        p3[1],
        p3[2],
        p2[0],
        p2[1],
        p2[2],
      );
      mesh.colors.push(...color, ...color, ...color);

      // Triangle 2: p1 -> p4 -> p3 (ordre CCW vu de l'extérieur)
      mesh.positions.push(
        cx + p1[0] * rx,
        cy + p1[1] * ry,
        cz + p1[2] * rz,
        cx + p4[0] * rx,
        cy + p4[1] * ry,
        cz + p4[2] * rz,
        cx + p3[0] * rx,
        cy + p3[1] * ry,
        cz + p3[2] * rz,
      );
      mesh.normals.push(
        p1[0],
        p1[1],
        p1[2],
        p4[0],
        p4[1],
        p4[2],
        p3[0],
        p3[1],
        p3[2],
      );
      mesh.colors.push(...color, ...color, ...color);
    }
  }
}

function addCone(
  mesh: MeshBuilder,
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

    // Face latérale
    mesh.positions.push(x1, baseY, z1, tipX, tipY, tipZ, x2, baseY, z2);
    // Normale approximative
    const nx = Math.cos((angle1 + angle2) * 0.5);
    const nz = Math.sin((angle1 + angle2) * 0.5);
    mesh.normals.push(nx, 0.4, nz, nx, 0.8, nz, nx, 0.4, nz);
    mesh.colors.push(...color, ...color, ...color);
  }
}

function addCylinder(
  mesh: MeshBuilder,
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
      x1 + cos1,
      y1,
      z1 + sin1,
      x2 + cos1,
      y2,
      z2 + sin1,
      x2 + cos2,
      y2,
      z2 + sin2,
    );
    mesh.normals.push(cos1, 0, sin1, cos1, 0, sin1, cos2, 0, sin2);
    mesh.colors.push(...color, ...color, ...color);

    mesh.positions.push(
      x1 + cos1,
      y1,
      z1 + sin1,
      x2 + cos2,
      y2,
      z2 + sin2,
      x1 + cos2,
      y1,
      z1 + sin2,
    );
    mesh.normals.push(cos1, 0, sin1, cos2, 0, sin2, cos2, 0, sin2);
    mesh.colors.push(...color, ...color, ...color);
  }
}

// Classe de rendu WebGL 3D complète
export class MonsterWebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private posBuffer: WebGLBuffer | null = null;
  private normBuffer: WebGLBuffer | null = null;
  private colBuffer: WebGLBuffer | null = null;
  private vertexCount = 0;

  private uProjLoc: WebGLUniformLocation | null = null;
  private uMvLoc: WebGLUniformLocation | null = null;
  private uNormLoc: WebGLUniformLocation | null = null;
  private uLightLoc: WebGLUniformLocation | null = null;
  private uAuraLoc: WebGLUniformLocation | null = null;
  private uBossLoc: WebGLUniformLocation | null = null;

  private aPosLoc = -1;
  private aNormLoc = -1;
  private aColLoc = -1;

  private animFrameId: number | null = null;
  private startTime = performance.now();
  private options: Monster3DOptions;

  constructor(
    private canvas: HTMLCanvasElement,
    options: Monster3DOptions,
  ) {
    this.options = options;
    this.initGL();
    this.buildGeometry();
    this.startLoop();
  }

  public updateOptions(options: Monster3DOptions) {
    const typeChanged =
      this.options.type !== options.type ||
      this.options.isBoss !== options.isBoss;
    this.options = options;
    if (typeChanged) {
      this.buildGeometry();
    }
  }

  private initGL() {
    this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!this.gl) return;

    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER_SRC);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAGMENT_SHADER_SRC);
    gl.compileShader(fs);

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    this.aPosLoc = gl.getAttribLocation(this.program, "aPosition");
    this.aNormLoc = gl.getAttribLocation(this.program, "aNormal");
    this.aColLoc = gl.getAttribLocation(this.program, "aColor");

    this.uProjLoc = gl.getUniformLocation(this.program, "uProjection");
    this.uMvLoc = gl.getUniformLocation(this.program, "uModelView");
    this.uNormLoc = gl.getUniformLocation(this.program, "uNormalMatrix");
    this.uLightLoc = gl.getUniformLocation(this.program, "uLightDir");
    this.uAuraLoc = gl.getUniformLocation(this.program, "uAuraColor");
    this.uBossLoc = gl.getUniformLocation(this.program, "uIsBoss");

    this.posBuffer = gl.createBuffer();
    this.normBuffer = gl.createBuffer();
    this.colBuffer = gl.createBuffer();
  }

  private buildGeometry() {
    if (!this.gl) return;
    const mesh: MeshBuilder = { positions: [], normals: [], colors: [] };
    const p = ELEMENT_COLORS[this.options.type] || ELEMENT_COLORS.normal;

    // Silhouette humanoïde debout : cou marqué, torse plus large que profond,
    // hanches, jambes et bras distincts. Le volume total reste dans
    // y ∈ [-0.90 ; +0.90] pour tenir dans le champ de la caméra (FOV 42°,
    // distance 2.55) sans que les pieds ou la tête soient coupés.
    // 1. Bassin / Hanches (base de la silhouette debout)
    addSphere(mesh, 0, -0.30, 0, 0.26, 0.18, 0.19, p.body);

    // 2. Torse (plus large que profond, comme un buste humain)
    addSphere(mesh, 0, -0.02, 0, 0.32, 0.34, 0.21, p.body);

    // 3. Ventre clair (Belly Patch en 3D en saillie avant)
    addSphere(mesh, 0, -0.06, 0.14, 0.22, 0.24, 0.13, p.belly);

    // 4. Cou (distingue la tête du torse : c'est ce volume qui donne la pose debout)
    addCylinder(mesh, 0, 0.26, 0, 0, 0.36, 0, 0.10, p.body);

    // 5. Tête (réduite par rapport au corps : rapport tête/corps plus humain)
    addSphere(mesh, 0, 0.56, 0.0, 0.30, 0.32, 0.28, p.body);

    // 6. Nez (bouton central, sur le bas de la face)
    addSphere(mesh, 0, 0.50, 0.26, 0.045, 0.038, 0.04, [0.25, 0.15, 0.18]);

    // 7. Yeux Anime 3D (réaccusés sur la tête réduite)
    // --- ŒIL GAUCHE ---
    // Sclérotique (Blanc de l'œil)
    addSphere(mesh, -0.11, 0.60, 0.24, 0.105, 0.125, 0.09, [1.0, 1.0, 1.0]);
    // Iris coloré
    addSphere(mesh, -0.11, 0.60, 0.28, 0.075, 0.105, 0.06, p.eye);
    // Pupille sombre profonde
    addSphere(mesh, -0.11, 0.60, 0.30, 0.045, 0.065, 0.045, [0.06, 0.06, 0.08]);
    // Reflet spéculaire principal éclatant
    addSphere(mesh, -0.09, 0.645, 0.325, 0.035, 0.045, 0.03, [1.0, 1.0, 1.0]);
    // Reflet secondaire
    addSphere(mesh, -0.125, 0.565, 0.315, 0.02, 0.028, 0.022, [1.0, 1.0, 1.0]);

    // --- ŒIL DROIT ---
    // Sclérotique (Blanc de l'œil)
    addSphere(mesh, 0.11, 0.60, 0.24, 0.105, 0.125, 0.09, [1.0, 1.0, 1.0]);
    // Iris coloré
    addSphere(mesh, 0.11, 0.60, 0.28, 0.075, 0.105, 0.06, p.eye);
    // Pupille sombre profonde
    addSphere(mesh, 0.11, 0.60, 0.30, 0.045, 0.065, 0.045, [0.06, 0.06, 0.08]);
    // Reflet spéculaire principal éclatant
    addSphere(mesh, 0.09, 0.645, 0.325, 0.035, 0.045, 0.03, [1.0, 1.0, 1.0]);
    // Reflet secondaire
    addSphere(mesh, 0.125, 0.565, 0.315, 0.02, 0.028, 0.022, [1.0, 1.0, 1.0]);

    // 8. Joues mignonnes (Cheek Pouches)
    if (this.options.type === "electric") {
      addSphere(mesh, -0.22, 0.50, 0.21, 0.075, 0.075, 0.06, [0.95, 0.15, 0.2]);
      addSphere(mesh, 0.22, 0.50, 0.21, 0.075, 0.075, 0.06, [0.95, 0.15, 0.2]);
    } else {
      addSphere(mesh, -0.21, 0.50, 0.21, 0.06, 0.05, 0.045, [1.0, 0.45, 0.55]);
      addSphere(mesh, 0.21, 0.50, 0.21, 0.06, 0.05, 0.045, [1.0, 0.45, 0.55]);
    }

    // 9. Épaules (articulations deltoïdiennes) — marque la ligne d'épaule,
    // qui manquait : le bras semblait sortir du flanc du torse.
    addSphere(mesh, -0.28, 0.16, 0, 0.11, 0.115, 0.105, p.body);
    addSphere(mesh, 0.28, 0.16, 0, 0.11, 0.115, 0.105, p.body);

    // 10. Bras : deux cylindres par membre (bras puis avant-bras), main au bout.
    // POSITION DE COMBAT : le bras descend en s'écartant du corps, puis
    // l'avant-bras remonte vers l'intérieur — poings remontés à hauteur du
    // menton (garde de boxeur), coudes pliés et écartés du torse.
    // Bras (épaule → coude, vers le bas et l'extérieur)
    addCylinder(mesh, -0.29, 0.12, 0.02, -0.42, -0.06, 0.06, 0.078, p.body);
    addCylinder(mesh, 0.29, 0.12, 0.02, 0.42, -0.06, 0.06, 0.078, p.body);
    // Coude (pli de l'avant-bras)
    addSphere(mesh, -0.42, -0.06, 0.06, 0.078, 0.078, 0.075, p.body);
    addSphere(mesh, 0.42, -0.06, 0.06, 0.078, 0.078, 0.075, p.body);
    // Avant-bras (coude → poignet : remonte vers l'avant et l'intérieur)
    addCylinder(mesh, -0.41, -0.03, 0.06, -0.28, 0.16, 0.12, 0.066, p.body);
    addCylinder(mesh, 0.41, -0.03, 0.06, 0.28, 0.16, 0.12, 0.066, p.body);
    // Poings relevés devant la face
    addSphere(mesh, -0.26, 0.20, 0.13, 0.085, 0.085, 0.08, p.body);
    addSphere(mesh, 0.26, 0.20, 0.13, 0.085, 0.085, 0.08, p.body);

    // 11. Hanches (articulations) puis jambes en deux cylindres (cuisse,
    // tibia) : les membres restent entièrement cylindriques, seul le pied
    // est un volume aplati pour porter le poids sur le sol.
    addSphere(mesh, -0.13, -0.34, 0, 0.105, 0.105, 0.10, p.body);
    addSphere(mesh, 0.13, -0.34, 0, 0.105, 0.105, 0.10, p.body);
    // Cuisse (hanche → genou : s'écarte pour élargir l'assise)
    addCylinder(mesh, -0.13, -0.36, 0, -0.25, -0.53, 0.02, 0.098, p.body);
    addCylinder(mesh, 0.13, -0.36, 0, 0.25, -0.53, 0.02, 0.098, p.body);
    // Genou (garde fléchie)
    addSphere(mesh, -0.25, -0.54, 0.02, 0.09, 0.085, 0.085, p.body);
    addSphere(mesh, 0.25, -0.54, 0.02, 0.09, 0.085, 0.085, p.body);
    // Tibia (genou → cheville)
    addCylinder(mesh, -0.25, -0.56, 0.02, -0.28, -0.72, 0.01, 0.082, p.body);
    addCylinder(mesh, 0.25, -0.56, 0.02, 0.28, -0.72, 0.01, 0.082, p.body);
    // Pieds (orientés vers l'avant)
    addSphere(mesh, -0.28, -0.78, 0.07, 0.115, 0.07, 0.16, p.body);
    addSphere(mesh, 0.28, -0.78, 0.07, 0.115, 0.07, 0.16, p.body);

    // 12. Appendices élémentaires 3D (Cornes, Oreilles, Ailes, Queue)
    // Réancrés sur la silhouette humanoïde : base des appendices de tête sur
    // le crâne (y ≈ 0.80), appendices dorsaux sur le dos du torse (z ≈ -0.20)
    // et queues sur l'arrière du bassin (z ≈ -0.18).
    if (this.options.type === "fire") {
      // Cornes de dragon
      addCone(mesh, -0.20, 0.80, -0.02, -0.34, 1.08, -0.18, 0.1, p.accent);
      addCone(mesh, 0.20, 0.80, -0.02, 0.34, 1.08, -0.18, 0.1, p.accent);
      // Ailes de dragon 3D (décollent du dos, sous les épaules)
      addCone(mesh, -0.22, 0.12, -0.18, -0.66, 0.54, -0.40, 0.12, [0.0, 0.75, 0.65]);
      addCone(mesh, 0.22, 0.12, -0.18, 0.66, 0.54, -0.40, 0.12, [0.0, 0.75, 0.65]);
      // Queue avec flamme
      addCylinder(mesh, 0, -0.30, -0.18, 0, -0.16, -0.58, 0.08, p.body);
      addSphere(mesh, 0, -0.10, -0.64, 0.14, 0.17, 0.14, p.accent);
      addSphere(mesh, 0, -0.08, -0.64, 0.085, 0.105, 0.085, [1.0, 0.95, 0.5]);
    } else if (this.options.type === "water") {
      // Nageoires / Ouïes latérales (de part et d'autre de la tête)
      addCone(mesh, -0.26, 0.54, -0.02, -0.52, 0.60, -0.08, 0.1, p.accent);
      addCone(mesh, 0.26, 0.54, -0.02, 0.52, 0.60, -0.08, 0.1, p.accent);
      // Nageoire caudale
      addCylinder(mesh, 0, -0.30, -0.18, 0, -0.16, -0.58, 0.07, p.body);
      addCone(mesh, 0, -0.16, -0.58, -0.23, -0.06, -0.76, 0.09, p.accent);
      addCone(mesh, 0, -0.16, -0.58, 0.23, -0.06, -0.76, 0.09, p.accent);
    } else if (this.options.type === "grass") {
      // Bulbe / Fleur dans le dos
      addSphere(mesh, 0, 0.10, -0.22, 0.21, 0.23, 0.20, p.accent);
      addSphere(mesh, 0, 0.20, -0.24, 0.11, 0.11, 0.11, [1.0, 0.9, 0.95]);
      // Feuille sur la tête
      addCone(mesh, 0, 0.84, 0, 0, 1.12, -0.12, 0.12, p.accent);
    } else if (this.options.type === "electric") {
      // Grandes oreilles pointues
      addCone(mesh, -0.20, 0.80, 0, -0.36, 1.14, -0.06, 0.1, p.body);
      addCone(mesh, -0.30, 1.00, -0.05, -0.36, 1.14, -0.06, 0.08, [0.12, 0.12, 0.12]); // Bout noir
      addCone(mesh, 0.20, 0.80, 0, 0.36, 1.14, -0.06, 0.1, p.body);
      addCone(mesh, 0.30, 1.00, -0.05, 0.36, 1.14, -0.06, 0.08, [0.12, 0.12, 0.12]); // Bout noir
      // Queue en éclair
      addCylinder(mesh, 0, -0.34, -0.18, 0.18, -0.14, -0.50, 0.07, p.body);
      addCone(mesh, 0.18, -0.14, -0.50, 0.31, 0.26, -0.64, 0.11, p.body);
    } else if (this.options.type === "rock") {
      // Cornes de roc et cristaux
      addCone(mesh, -0.19, 0.80, 0, -0.31, 1.08, -0.08, 0.12, p.accent);
      addCone(mesh, 0.19, 0.80, 0, 0.31, 1.08, -0.08, 0.12, p.accent);
      // Plaques dorsales
      addCone(mesh, 0, 0.12, -0.20, 0, 0.40, -0.38, 0.14, p.accent);
    } else {
      // Normal : Grandes oreilles pointues
      addCone(mesh, -0.20, 0.80, 0, -0.38, 1.12, -0.04, 0.12, p.body);
      addCone(mesh, 0.20, 0.80, 0, 0.38, 1.12, -0.04, 0.12, p.body);
      // Collerette duveteuse (à la base du cou)
      addSphere(mesh, 0, 0.22, 0.10, 0.26, 0.13, 0.18, p.belly);
      // Queue touffue (arrivée à l'arrière du bassin)
      addSphere(mesh, 0, -0.30, -0.44, 0.21, 0.26, 0.21, p.body);
      addSphere(mesh, 0, -0.16, -0.56, 0.12, 0.14, 0.12, p.belly);
    }

    // Couronne dorée pour les Boss (posée sur le crâne, y ≈ 0.88)
    if (this.options.isBoss) {
      addCylinder(mesh, 0, 0.86, 0.04, 0, 0.92, 0.04, 0.22, [1.0, 0.85, 0.0]);
      addCone(mesh, -0.17, 0.92, 0.04, -0.19, 1.10, 0.04, 0.06, [1.0, 0.85, 0.0]);
      addCone(mesh, 0, 0.92, 0.13, 0, 1.16, 0.13, 0.07, [1.0, 0.85, 0.0]);
      addCone(mesh, 0.17, 0.92, 0.04, 0.19, 1.10, 0.04, 0.06, [1.0, 0.85, 0.0]);
    }

    const gl = this.gl;
    this.vertexCount = mesh.positions.length / 3;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.positions),
      gl.STATIC_DRAW,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.normals),
      gl.STATIC_DRAW,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.colors),
      gl.STATIC_DRAW,
    );
  }

  private startLoop() {
    const render = () => {
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private draw() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Redimensionnement automatique selon le container
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = Math.max(1, width);
      this.canvas.height = Math.max(1, height);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    // Calcul de l'animation d'inactivité (Idle 60 FPS)
    const time = (performance.now() - this.startTime) * 0.001;
    const bounce = Math.sin(time * 2.8) * 0.04;
    const breathe = 1.0 + Math.sin(time * 2.8) * 0.025;
    const breathY = 1.0 - Math.sin(time * 2.8) * 0.025;

    // Vue de 3/4 douce : le maillage est construit tourné vers +Z et la caméra regarde vers -Z.
    // Une rotation Y de ~25° suffit à révéler le volume du corps tout en gardant
    // le visage largement de face. Les deux créatures sont tournées en miroir,
    // de sorte qu'elles s'orientent chacune vers le centre de l'écran.
    const THREE_QUARTER_ANGLE = Math.PI * 0.14; // ≈ 25°
    const baseFacing = this.options.isPlayer
      ? THREE_QUARTER_ANGLE
      : -THREE_QUARTER_ANGLE;
    const idleSway = Math.sin(time * 1.8) * 0.04;
    const rotY = baseFacing + idleSway;
    const rotX = 0.06; // Légère plongée pour accentuer le relief de la vue 3/4

    const aspect = this.canvas.width / (this.canvas.height || 1);
    const projMat = mat4Perspective((42 * Math.PI) / 180, aspect, 0.1, 100);

    gl.frontFace(gl.CCW);

    let mvMat = mat4Identity();
    // Distance caméra et centrage.
    // La silhouette humanoïde est plus haute que l'ancien blob (pieds à
    // y = -0.85, crâne à y = 0.88) : la caméra est reculée à 2.70 et
    // recentrée sur y = 0 pour que le crâne ne soit pas rogné en haut,
    // y compris au pic de l'animation de respiration (± 2.5 % + flottement).
    mat4Translate(mvMat, mvMat, 0, bounce, -2.70);
    mat4RotateX(mvMat, mvMat, rotX);
    mat4RotateY(mvMat, mvMat, rotY);
    mat4Scale(mvMat, mvMat, breathe, breathY, breathe);

    const normMat = new Float32Array(9);
    mat3NormalFromMat4(normMat, mvMat);

    // Envoi des uniformes : lumière placée du côté éclairé par la vue 3/4
    gl.uniformMatrix4fv(this.uProjLoc, false, projMat);
    gl.uniformMatrix4fv(this.uMvLoc, false, mvMat);
    gl.uniformMatrix3fv(this.uNormLoc, false, normMat);
    gl.uniform3f(
      this.uLightLoc,
      this.options.isPlayer ? 0.38 : -0.38,
      0.8,
      0.85,
    );

    const p = ELEMENT_COLORS[this.options.type] || ELEMENT_COLORS.normal;
    gl.uniform3fv(this.uAuraLoc, p.glow);
    gl.uniform1f(this.uBossLoc, this.options.isBoss ? 1.0 : 0.0);

    // Liaison des attributs
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPosLoc);
    gl.vertexAttribPointer(this.aPosLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
    gl.enableVertexAttribArray(this.aNormLoc);
    gl.vertexAttribPointer(this.aNormLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuffer);
    gl.enableVertexAttribArray(this.aColLoc);
    gl.vertexAttribPointer(this.aColLoc, 3, gl.FLOAT, false, 0, 0);

    // Dessin du monstre 3D complet
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.gl) {
      if (this.posBuffer) this.gl.deleteBuffer(this.posBuffer);
      if (this.normBuffer) this.gl.deleteBuffer(this.normBuffer);
      if (this.colBuffer) this.gl.deleteBuffer(this.colBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}
