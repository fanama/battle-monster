/**
 * Renderer WebGL « toon » des monstres — couche fine au-dessus du **rig**
 * (`monsterRig.ts`). Les données du personnage (segments, poses, actions)
 * sont calculées côté rig pur ; ce module :
 *  1. compile les shaders (aplat **2 tons** + **contour encré**, façon chibi
 *     fantasy / Dragon Quest),
 *  2. téléverse chaque segment du rig dans ses buffers,
 *  3. à chaque frame : échantillonne la pose (action en cours ou garde),
 *     compose la hiérarchie parent → enfant, puis dessine **deux passes** :
 *     d'abord la coque du contour (faces arrière gonflées le long des
 *     normales, aplat d'encre), ensuite le corps toon par-dessus,
 *  4. lisse les poses (aucun saut entre deux actions),
 *  5. plafonne le devicePixelRatio et abaisse la densité de maillage sur
 *     mobile (perf first).
 */

import {
  ELEMENT_COLORS,
  GUARD_POSE,
  JOINT_IDS,
  RIG_ACTIONS,
  buildHumanRig,
  buildRig,
  mat3NormalFromMat4,
  mat4Identity,
  mat4Multiply,
  mat4Perspective,
  mat4RotateX,
  mat4RotateY,
  mat4Scale,
  mat4Translate,
  rigPartMatrices,
  sampleRigPose,
  scaleRigPose,
  type GearSlot,
  type JointId,
  type JointPose,
  type RigActionKind,
  type RigQuality,
} from './monsterRig';

export interface Monster3DOptions {
  type: 'fire' | 'water' | 'grass' | 'electric' | 'rock' | 'normal';
  isPlayer: boolean;
  isBoss: boolean;
  isLowHp: boolean;
  isStrong: boolean;
  hasWisdom: boolean;
  /**
   * Espèce rendue : `human` pour le **champion** (corps humain, équipement
   * visible), `monster` pour les créatures ennemies. L'espèce pilote aussi
   * *quel* rig est construit ; un changement d'espèce ou d'équipement
   * reconstruit la géométrie.
   */
  species?: 'monster' | 'human';
  /** Emplacements d'équipement portés (rig humain uniquement). */
  gear?: readonly GearSlot[];
  /**
   * Source **vivante** de l'équipement porté. Le `Monster` est muté sur place
   * à l'équipement (la fiche n'est pas un état réactif Svelte) : le renderer
   * relit cet accesseur à chaque frame, si bien qu'enfiler une pièce met à
   * jour le maillage humanoïde immédiatement, sans remontage du composant.
   */
  gearProvider?: () => readonly GearSlot[];
}

/** Signature stable d'un jeu d'équipements (triée) pour la clé de cache. */
function gearKey(gear: readonly GearSlot[] | undefined): string {
  return [...(gear ?? [])].sort().join('+');
}

/** Emplacements d'équipement effectifs d'un jeu d'options (rig humain seul). */
function resolveGear(options: Monster3DOptions): GearSlot[] {
  if ((options.species ?? 'monster') !== 'human') return [];
  const gear = options.gearProvider?.() ?? options.gear ?? [];
  return [...gear].sort();
}

/** Action demandée par la couche UI (SpriteDisplayer ⇒ renderer). */
export interface StageAction {
  kind: RigActionKind;
  /** Amplitude relative (1 = normal, >1 critique / réaction fort). */
  intensity?: number;
}

const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;

  uniform mat4 uProjection;
  uniform mat4 uModelView;
  uniform mat3 uNormalMatrix;
  // Gonflement le long des normales, en unités du rig : 0 pour le corps,
  // > 0 pour la coque du contour encré.
  uniform float uInflate;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vColor;

  void main() {
    // Le garde-fou 1e-5 évite un normalize(0) sur les normales dégénérées.
    vec3 inflated = aPosition + normalize(aNormal + vec3(1e-5)) * uInflate;
    vNormal = normalize(uNormalMatrix * aNormal);
    vec4 viewPos = uModelView * vec4(inflated, 1.0);
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
  // 1.0 : passe « contour encré » — aplat d'encre pur, aucun éclairage.
  uniform float uOutline;

  void main() {
    // Contour : trait plein, la découpe du bord est adoucie par l'anticrénelage
    // du canvas (aucun lissage de fragment à coder ici).
    if (uOutline > 0.5) {
      gl_FragColor = vec4(0.07, 0.06, 0.10, 1.0);
      return;
    }

    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);

    // Ombrage PLAT en DEUX tons (toon Dragon Quest) : une ombre franche et une
    // lumière pleine, sans palier intermédiaire — le contour encré sépare
    // ensuite les volumes de l'équipement et des membres.
    float NdotL = dot(N, L);
    float lightStep = NdotL > 0.12 ? 1.0 : 0.62;
    vec3 finalColor = vColor * lightStep;

    // Aura des Boss : seul relief toléré sur l'aplat (liseré élémentaire).
    if (uIsBoss > 0.5) {
      vec3 V = normalize(vViewPosition);
      float rim = 1.0 - max(dot(N, V), 0.0);
      rim = smoothstep(0.55, 0.9, rim);
      finalColor += uAuraColor * rim * 0.55;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/** Cap du devicePixelRatio : au-delà, les vieux mobiles choppent (perf). */
const DPR_CAP = 1.5;
/** Sous ce seuil (CSS px de hauteur du canvas), maillage allégé. */
const LOW_QUALITY_HEIGHT = 340;
/**
 * Épaisseur du contour encré, en unités du rig (le maillage fait ~1,7 de haut).
 * Le maillage mobile étant plus grossier, la coque y est un peu plus épaisse
 * pour garder un trait continu.
 */
const OUTLINE_WIDTH_HIGH = 0.015;
const OUTLINE_WIDTH_LOW = 0.019;

interface PartBuffers {
  id: JointId;
  pos: WebGLBuffer;
  norm: WebGLBuffer;
  col: WebGLBuffer;
  vertexCount: number;
}

export class MonsterWebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;

  private uProjLoc: WebGLUniformLocation | null = null;
  private uMvLoc: WebGLUniformLocation | null = null;
  private uNormLoc: WebGLUniformLocation | null = null;
  private uLightLoc: WebGLUniformLocation | null = null;
  private uAuraLoc: WebGLUniformLocation | null = null;
  private uBossLoc: WebGLUniformLocation | null = null;
  private uOutlineLoc: WebGLUniformLocation | null = null;
  private uInflateLoc: WebGLUniformLocation | null = null;

  private aPosLoc = -1;
  private aNormLoc = -1;
  private aColLoc = -1;

  private animFrameId: number | null = null;
  private startTime = performance.now();
  private lastFrameTime = performance.now();
  private options: Monster3DOptions;

  // --- Rig + canvas des segments -----------------------------------------
  private rig = buildRig('normal', false, 'low'); // écrasé à la première frame
  private builtKey = '';
  private buffers: PartBuffers[] = [];

  // --- Pose courante (lissage + actions) ---------------------------------
  /** Pose lissée vers la cible (aucun saut d'animation). */
  private currentPose: Record<JointId, JointPose> & { dy: number };
  /** Action en cours + horodatage. */
  private action: (StageAction & { startedAt: number }) | null = null;
  private lastActionKind: RigActionKind | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    options: Monster3DOptions,
  ) {
    this.options = options;
    const zeroPose = {} as Record<JointId, JointPose> & { dy: number };
    for (const id of JOINT_IDS) {
      zeroPose[id] = [0, 0, 0];
    }
    zeroPose.dy = 0;
    this.currentPose = zeroPose;

    this.initGL();
    this.buildGeometry();
    this.startLoop();
  }

  public updateOptions(options: Monster3DOptions) {
    const rebuilt =
      this.options.type !== options.type ||
      this.options.isBoss !== options.isBoss ||
      (this.options.species ?? 'monster') !== (options.species ?? 'monster') ||
      gearKey(resolveGear(this.options)) !== gearKey(resolveGear(options));
    this.options = options;
    if (rebuilt) {
      this.buildGeometry();
    }
  }

  /**
   * Déclenche une action articulée (attaque, blocage…). Rejouer la même
   * action moins de 300 ms après redémarre le cadencement (évite de couper
   * une pose déjà lancée par un doublon de notification).
   */
  public setAction(next: StageAction | null) {
    if (!next) {
      this.action = null;
      return;
    }
    const now = performance.now();
    const age = this.action ? now - this.action.startedAt : Infinity;
    if (this.action && this.action.kind === next.kind && age < 300) return;
    if (this.lastActionKind === next.kind && age < 300) return;
    this.action = { ...next, startedAt: now };
    this.lastActionKind = next.kind;
  }

  // =====================================================================
  // WebGL init
  // =====================================================================

  private initGL() {
    this.gl = this.canvas.getContext('webgl', { alpha: true, antialias: true });
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

    this.aPosLoc = gl.getAttribLocation(this.program, 'aPosition');
    this.aNormLoc = gl.getAttribLocation(this.program, 'aNormal');
    this.aColLoc = gl.getAttribLocation(this.program, 'aColor');

    this.uProjLoc = gl.getUniformLocation(this.program, 'uProjection');
    this.uMvLoc = gl.getUniformLocation(this.program, 'uModelView');
    this.uNormLoc = gl.getUniformLocation(this.program, 'uNormalMatrix');
    this.uLightLoc = gl.getUniformLocation(this.program, 'uLightDir');
    this.uAuraLoc = gl.getUniformLocation(this.program, 'uAuraColor');
    this.uBossLoc = gl.getUniformLocation(this.program, 'uIsBoss');
    this.uOutlineLoc = gl.getUniformLocation(this.program, 'uOutline');
    this.uInflateLoc = gl.getUniformLocation(this.program, 'uInflate');
  }

  private currentQuality(): RigQuality {
    const cssH = this.canvas.clientHeight || 0;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    return cssH > 0 && cssH < LOW_QUALITY_HEIGHT && dpr >= 1
      ? 'low'
      : 'high';
  }

  private buildGeometry() {
    if (!this.gl) return;
    const quality = this.currentQuality();
    const species = this.options.species ?? 'monster';
    const gear = resolveGear(this.options);
    const key = `${species}|${this.options.type}|${this.options.isBoss}|${quality}|${gear.join('+')}`;
    if (this.builtKey === key && this.buffers.length > 0) return;

    // Remplace le cache de buffers précédent ; les anciens sont libérés en
    // fin de vie du renderer (destroy).
    this.rig = species === 'human'
      ? buildHumanRig({ type: this.options.type, quality, gear })
      : buildRig(this.options.type, this.options.isBoss, quality);
    this.builtKey = key;

    const gl = this.gl;
    this.buffers = this.rig.parts.map((part) => {
      const pos = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, pos);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.mesh.positions), gl.STATIC_DRAW);

      const norm = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, norm);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.mesh.normals), gl.STATIC_DRAW);

      const col = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, col);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.mesh.colors), gl.STATIC_DRAW);

      return {
        id: part.id,
        pos,
        norm,
        col,
        vertexCount: part.mesh.positions.length / 3,
      };
    });
  }

  private startLoop() {
    const render = () => {
      this.draw();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  // =====================================================================
  // Pose courante : cible échantillonnée + lissage (aucun saut)
  // =====================================================================

  private targetPose(now: number): RigTarget {
    let action = this.action;
    if (action) {
      const spec = RIG_ACTIONS[action.kind];
      const elapsed = now - action.startedAt;
      if (elapsed >= spec.duration) {
        if (spec.holdAfter) {
          action = { ...action, startedAt: now - spec.duration };
        } else {
          // Action finie dont le dernier keyframe est la garde\u00a0: relache.
          this.action = null;
          action = null;
        }
      }
    }

    if (!action) {
      return { pose: GUARD_POSE, tremor: 0 };
    }

    const spec = RIG_ACTIONS[action.kind];
    const t = Math.max(0, Math.min(1, (now - action.startedAt) / spec.duration));
    const raw = sampleRigPose(action.kind, t);

    // Intensité : critiques et blocages sous CA élevée amplituent plus.
    const intensity = Math.max(0.5, Math.min(1.4, action.intensity ?? 1));
    const pose = scaleRigPose(raw, intensity);

    // Tremblement d'impact pour le blocage (bras, décroissant).
    let tremor = 0;
    if (action.kind === 'block') {
      const decay = Math.max(0, 1 - t);
      tremor = Math.sin((now - action.startedAt) * 0.05) * 0.05 * intensity * decay;
    }
    return { pose, tremor };
  }

  private updatePose(now: number, dtMs: number): RigTarget {
    const target = this.targetPose(now);
    // Facteur de lissage indépendant du framerate\u00a0: le rig suit
    // énergiquement l'action, la garde s'installe en douceur.
    const k = 1 - Math.exp(-dtMs * 0.022);
    for (const id of JOINT_IDS) {
      const cur = this.currentPose[id]!;
      const tgt = (target.pose.joints[id] ?? [0, 0, 0]) as JointPose;
      cur[0] += (tgt[0] - cur[0]) * k;
      cur[1] += (tgt[1] - cur[1]) * k;
      cur[2] += (tgt[2] - cur[2]) * k;
    }
    this.currentPose.dy += (target.pose.dy - this.currentPose.dy) * k;

    // Tremblement d'impact ajouté APRÈS le lissage (sinon il serait filtré)
    // sur les bras uniquement — vibration lors d'un coup subi frappé.
    if (target.tremor !== 0) {
      for (const id of JOINT_IDS) {
        if (id === 'armU.L' || id === 'armU.R' || id === 'fore.L' || id === 'fore.R') {
          this.currentPose[id]![0] += target.tremor;
        }
      }
    }
    return target;
  }

  // =====================================================================
  // Rendu
  // =====================================================================

  private draw() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    this.buildGeometry(); // recadre la qualité si le CSS px du canvas migre

    const now = performance.now();
    const dtMs = Math.max(0, now - this.lastFrameTime);
    this.lastFrameTime = now;

    // Redimensionnement (cap DPR pour la perf mobile)
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, DPR_CAP)
        : 1;
    const targetW = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const targetH = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      gl.viewport(0, 0, targetW, targetH);
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    this.updatePose(now, dtMs);
    const time = (now - this.startTime) * 0.001;
    const bounce = Math.sin(time * 2.8) * 0.04;
    const breathe = 1.0 + Math.sin(time * 2.8) * 0.025;
    const breathY = 1.0 - Math.sin(time * 2.8) * 0.025;

    const THREE_QUARTER_ANGLE = Math.PI * 0.14; // ≈ 25°
    const baseFacing = this.options.isPlayer
      ? THREE_QUARTER_ANGLE
      : -THREE_QUARTER_ANGLE;
    const idleSway = Math.sin(time * 1.8) * 0.04;
    const rotY = baseFacing + idleSway;
    const rotX = 0.06;

    const aspect = targetW / (targetH || 1);
    const projMat = mat4Perspective((42 * Math.PI) / 180, aspect, 0.1, 100);
    gl.frontFace(gl.CCW);

    // Matrice globale (camp + idle) ; le dy d'action s'ajoute au bassin.
    const globalMV = mat4Identity();
    mat4Translate(globalMV, globalMV, 0, bounce + this.currentPose.dy, -2.7);
    mat4RotateX(globalMV, globalMV, rotX);
    mat4RotateY(globalMV, globalMV, rotY);
    mat4Scale(globalMV, globalMV, breathe, breathY, breathe);

    const partMats = rigPartMatrices(this.rig, { joints: this.currentPose, dy: 0 });
    const normMat = new Float32Array(9);
    const partMV = new Float32Array(16);

    const p = ELEMENT_COLORS[this.options.type] ?? ELEMENT_COLORS.normal;
    gl.uniformMatrix4fv(this.uProjLoc, false, projMat);
    gl.uniform3f(this.uLightLoc, this.options.isPlayer ? 0.38 : -0.38, 0.8, 0.85);
    gl.uniform3fv(this.uAuraLoc, p.glow);
    gl.uniform1f(this.uBossLoc, this.options.isBoss ? 1.0 : 0.0);

    gl.enableVertexAttribArray(this.aPosLoc);
    gl.enableVertexAttribArray(this.aNormLoc);
    gl.enableVertexAttribArray(this.aColLoc);

    // Passe 1 — **contour encré** : la coque du personnage est gonflée le long
    // de ses normales et ses faces avant sont éliminées. Seuls ses bords
    // débordent autour de la silhouette : un trait d'encre franc (Dragon Quest),
    // qui sépare aussi les pièces d'équipement entre elles (lecture
    // « construction kit »).
    gl.cullFace(gl.FRONT);
    gl.uniform1f(this.uOutlineLoc, 1.0);
    gl.uniform1f(
      this.uInflateLoc,
      this.currentQuality() === 'low' ? OUTLINE_WIDTH_LOW : OUTLINE_WIDTH_HIGH,
    );
    this.drawParts(globalMV, partMats, partMV, normMat);

    // Passe 2 — corps toon : aplat 2 tons par-dessus le trait.
    gl.cullFace(gl.BACK);
    gl.uniform1f(this.uOutlineLoc, 0.0);
    gl.uniform1f(this.uInflateLoc, 0.0);
    this.drawParts(globalMV, partMats, partMV, normMat);
  }

  /**
   * Dessine tous les segments du rig avec l'état de programme courant (le
   * même parcours sert aux deux passes : contour et corps).
   */
  private drawParts(
    globalMV: Float32Array,
    partMats: Record<string, Float32Array>,
    partMV: Float32Array,
    normMat: Float32Array,
  ) {
    const gl = this.gl!;
    for (const buf of this.buffers) {
      const partMat = partMats[buf.id];
      if (!partMat) continue;
      mat4Multiply(partMV, globalMV, partMat);
      mat3NormalFromMat4(normMat, partMV);

      gl.uniformMatrix4fv(this.uMvLoc, false, partMV);
      gl.uniformMatrix3fv(this.uNormLoc, false, normMat);

      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
      gl.vertexAttribPointer(this.aPosLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.norm);
      gl.vertexAttribPointer(this.aNormLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.col);
      gl.vertexAttribPointer(this.aColLoc, 3, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, buf.vertexCount);
    }
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.gl) {
      for (const buf of this.buffers) {
        this.gl.deleteBuffer(buf.pos);
        this.gl.deleteBuffer(buf.norm);
        this.gl.deleteBuffer(buf.col);
      }
      this.buffers = [];
      if (this.program) this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}

/** Cible d'animation d'une frame\u00a0: pose échantillonnée + tremblement. */
interface RigTarget {
  pose: { joints: Partial<Record<JointId, JointPose>>; dy: number };
  tremor: number;
}

