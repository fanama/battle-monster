/**
 * Calque 3D des effets élémentaires — un canvas WebGL posé sur **toute**
 * l'arène, indépendant des canvases des combattants.
 *
 * Pourquoi une couche à part : chaque combattant possède son propre contexte
 * WebGL et son canvas est rogné à sa boîte. Un projectile qui doit **relier**
 * les deux camps ne peut donc pas vivre dans le canvas du lanceur. Cette couche
 * couvre l'arène entière et travaille dans son repère (origine bas-gauche, en
 * pixels CSS) : le sort part de la main du lanceur, décrit un arc, passe devant
 * la scène et explose sur le buste de la cible.
 *
 * Répartition des responsabilités, identique au couple bestiaire/rig :
 *  - `spellVfx.ts` (pur, testé sous Bun) : palette, cadencement, trajectoire,
 *    maillages, projection ;
 *  - ce module : compilation des shaders, tampons GPU, boucle de rendu.
 *
 * Rendu : **additif** (`blendFunc(SRC_ALPHA, ONE)`), sans test de profondeur —
 * un sort est une source de lumière, il n'occulte rien. La boucle s'arrête
 * dès qu'aucun effet n'est actif (aucun rAF permanent).
 */

import {
  mat3NormalFromMat4,
  mat4Identity,
  mat4RotateZ,
  mat4Scale,
  mat4Translate,
  type MonsterType,
} from './monsterRig';
import {
  CAST_LEAD_MS,
  CHANNEL_MS,
  COLUMN_BASE_PX,
  COLUMN_HEIGHT_PX,
  ELEMENT_VFX,
  FLIGHT_MS,
  IMPACT_BASE_PX,
  IMPACT_MS,
  ORB_BASE_PX,
  buildGlowMesh,
  buildOrbMesh,
  buildRingMesh,
  buildShardMesh,
  sampleChannel,
  sampleFlight,
  sampleImpact,
  vfxAnchor,
  vfxProjection,
  type Vec2,
  type VfxQuality,
} from './spellVfx';

/** Un sort à distance : d'où il part, où il frappe, et son issue. */
export interface SpellCast {
  type: MonsterType;
  from: Vec2;
  to: Vec2;
  /** Coup manqué : le sort se dissipe avant la cible (pas de gerbe). */
  dissipate: boolean;
  /** Critique : la gerbe d'impact est plus large. */
  crit: boolean;
}

/** Canalisation (soin / amplification) : un cordon élémentaire sur le lanceur. */
export interface SpellChannel {
  type: MonsterType;
  /** Centre du corps du lanceur (repère arène, px). */
  at: Vec2;
}

/** Cap du devicePixelRatio, comme le renderer du bestiaire (perf mobile). */
const DPR_CAP = 1.5;
/** Sous ce seuil (px CSS de hauteur), maillage allégé. */
const LOW_QUALITY_HEIGHT = 360;
/** Une gerbe d'impact se joue pendant `IMPACT_MS`, la suivante remplace l'autre. */
const COLUMN_SEGMENTS = 5;

const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;

  uniform mat4 uProjection;
  uniform mat4 uModelView;
  uniform mat3 uNormalMatrix;

  varying vec3 vNormal;

  void main() {
    vNormal = normalize(uNormalMatrix * aNormal);
    gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  varying vec3 vNormal;

  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uAlpha;
  // 1 : cœur ou éclat (opaque, saturé) — 0 : halo (lueur diffuse).
  uniform float uEmissive;

  void main() {
    vec3 N = normalize(vNormal);
    // Éclairage toon du sort : deux tons, comme le bestiaire — le volume se lit
    // sur les facettes sans jamais assombrir la source.
    float lambert = N.z * 0.55 + N.y * 0.45;
    float shade = 0.62 + 0.38 * smoothstep(-0.15, 0.35, lambert);
    vec3 color = mix(uColor, uGlowColor, uEmissive * 0.5) * shade;
    gl_FragColor = vec4(color, uAlpha);
  }
`;

interface GpuMesh {
  pos: WebGLBuffer;
  norm: WebGLBuffer;
  count: number;
}

interface ActiveFlight {
  spec: SpellCast;
  startedAt: number;
}

interface ActiveImpact {
  spec: SpellCast;
  startedAt: number;
}

interface ActiveChannel {
  spec: SpellChannel;
  startedAt: number;
}

export class SpellVfxLayer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;

  private uProjLoc: WebGLUniformLocation | null = null;
  private uMvLoc: WebGLUniformLocation | null = null;
  private uNormLoc: WebGLUniformLocation | null = null;
  private uColorLoc: WebGLUniformLocation | null = null;
  private uGlowLoc: WebGLUniformLocation | null = null;
  private uAlphaLoc: WebGLUniformLocation | null = null;
  private uEmissiveLoc: WebGLUniformLocation | null = null;

  private aPosLoc = -1;
  private aNormLoc = -1;

  /** Tampons par qualité : construits à la demande, libérés au destroy. */
  private meshes = new Map<string, GpuMesh>();
  private builtQuality: VfxQuality | null = null;

  private flight: ActiveFlight | null = null;
  private impact: ActiveImpact | null = null;
  private channels: ActiveChannel[] = [];

  private rafId: number | null = null;
  private destroyed = false;

  private readonly normMat = new Float32Array(9);
  /** Réutilisé entre les frames ; retypé large pour accueillir un `Float32Array`
   *  produit par `vfxProjection` (le littéral, lui, serait `Float32Array<ArrayBuffer>`). */
  private projMat: Float32Array = new Float32Array(16);
  private projKey = -1;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.initGL();
  }

  /** Vrai si le contexte WebGL et le programme sont prêts. */
  public get supported(): boolean {
    return this.gl !== null && this.program !== null;
  }

  /**
   * Lance un sort à distance. Un seul vol à la fois : les tours alternent
   * (le second frappeur part après `ENEMY_TURN_DELAY` > durée d'un sort).
   */
  public cast(spec: SpellCast): void {
    if (!this.supported || this.destroyed) return;
    this.flight = { spec, startedAt: performance.now() };
    this.ensureLoop();
  }

  /** Joue une canalisation (soin / amplification) autour du lanceur. */
  public channel(spec: SpellChannel): void {
    if (!this.supported || this.destroyed) return;
    this.channels.push({ spec, startedAt: performance.now() });
    this.ensureLoop();
  }

  // =====================================================================
  // WebGL
  // =====================================================================

  private initGL(): void {
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!this.gl) return;

    const gl = this.gl;
    // Effets additifs : pas de profondeur (un sort n'occulte rien), pas de
    // culling (les éclats sont vus des deux faces).
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

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
    this.uProjLoc = gl.getUniformLocation(this.program, 'uProjection');
    this.uMvLoc = gl.getUniformLocation(this.program, 'uModelView');
    this.uNormLoc = gl.getUniformLocation(this.program, 'uNormalMatrix');
    this.uColorLoc = gl.getUniformLocation(this.program, 'uColor');
    this.uGlowLoc = gl.getUniformLocation(this.program, 'uGlowColor');
    this.uAlphaLoc = gl.getUniformLocation(this.program, 'uAlpha');
    this.uEmissiveLoc = gl.getUniformLocation(this.program, 'uEmissive');
  }

  private currentQuality(): VfxQuality {
    return this.canvas.clientHeight > 0 &&
      this.canvas.clientHeight < LOW_QUALITY_HEIGHT
      ? 'low'
      : 'high';
  }

  /** Construit (ou retrouve) les tampons GPU de la qualité courante. */
  private ensureMeshes(): void {
    const quality = this.currentQuality();
    if (this.builtQuality === quality) return;
    this.releaseMeshes();

    const orb = quality === 'low' ? buildOrbMesh('low') : buildOrbMesh('high');
    const glow = quality === 'low' ? buildGlowMesh('low') : buildGlowMesh('high');
    this.meshes.set('orb', this.upload(orb));
    this.meshes.set('glow', this.upload(glow));
    this.meshes.set('shard', this.upload(buildShardMesh()));
    this.meshes.set('ring', this.upload(buildRingMesh()));
    this.builtQuality = quality;
  }

  private upload(mesh: {
    positions: number[];
    normals: number[];
  }): GpuMesh {
    const gl = this.gl!;
    const pos = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.positions),
      gl.STATIC_DRAW,
    );

    const norm = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, norm);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

    return { pos, norm, count: mesh.positions.length / 3 };
  }

  private releaseMeshes(): void {
    if (!this.gl) return;
    for (const mesh of this.meshes.values()) {
      this.gl.deleteBuffer(mesh.pos);
      this.gl.deleteBuffer(mesh.norm);
    }
    this.meshes.clear();
    this.builtQuality = null;
  }

  // =====================================================================
  // Boucle de rendu (uniquement quand un effet est actif)
  // =====================================================================

  private ensureLoop(): void {
    if (this.rafId !== null || this.destroyed) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const stillActive = this.draw();
      if (stillActive) this.ensureLoop();
    });
  }

  private syncViewport(): void {
    const gl = this.gl!;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, DPR_CAP)
        : 1;
    const cssW = Math.max(1, this.canvas.clientWidth);
    const cssH = Math.max(1, this.canvas.clientHeight);
    const targetW = Math.max(1, Math.round(cssW * dpr));
    const targetH = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    gl.viewport(0, 0, targetW, targetH);
    this.cssWidth = cssW;
    this.cssHeight = cssH;
  }

  private projection(): Float32Array {
    const key = this.cssWidth * 100000 + this.cssHeight;
    if (key !== this.projKey) {
      this.projKey = key;
      this.projMat = vfxProjection(this.cssWidth, this.cssHeight);
    }
    return this.projMat;
  }

  /** Matrice modèle d'un élément : placement arène → scène, rotation, échelle. */
  private model(
    x: number,
    y: number,
    z: number,
    spin: number,
    sx: number,
    sy: number,
    sz: number,
  ): Float32Array {
    const anchor = vfxAnchor(x, y, z, this.cssWidth, this.cssHeight);
    const m = mat4Identity();
    mat4Translate(m, m, anchor.x, anchor.y, anchor.z);
    if (spin !== 0) mat4RotateZ(m, m, spin);
    mat4Scale(m, m, sx, sy, sz);
    return m;
  }

  private drawPart(
    name: string,
    model: Float32Array,
    color: [number, number, number],
    glow: [number, number, number],
    alpha: number,
    emissive: number,
  ): void {
    if (alpha <= 0.004) return;
    const gl = this.gl!;
    const mesh = this.meshes.get(name);
    if (!mesh) return;

    mat3NormalFromMat4(this.normMat, model);
    gl.uniformMatrix4fv(this.uMvLoc, false, model);
    gl.uniformMatrix3fv(this.uNormLoc, false, this.normMat);
    gl.uniform3f(this.uColorLoc, color[0], color[1], color[2]);
    gl.uniform3f(this.uGlowLoc, glow[0], glow[1], glow[2]);
    gl.uniform1f(this.uAlphaLoc, alpha);
    gl.uniform1f(this.uEmissiveLoc, emissive);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
    gl.vertexAttribPointer(this.aPosLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
    gl.vertexAttribPointer(this.aNormLoc, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  /** Dessine une frame ; renvoie `true` tant qu'un effet est en vie. */
  private draw(): boolean {
    if (!this.gl || !this.program || this.destroyed) return false;
    const gl = this.gl;

    this.syncViewport();
    this.ensureMeshes();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uProjLoc, false, this.projection());
    gl.enableVertexAttribArray(this.aPosLoc);
    gl.enableVertexAttribArray(this.aNormLoc);

    const now = performance.now();
    let alive = false;

    // --- Vol en cours -----------------------------------------------------
    const flight = this.flight;
    if (flight) {
      const elapsed = now - flight.startedAt;
      // Pendant l'armement (`CAST_LEAD_MS`) le bras se tend : rien n'est
      // encore sorti du corps.
      const t = (elapsed - CAST_LEAD_MS) / FLIGHT_MS;
      if (t >= 1) {
        this.flight = null;
        if (!flight.spec.dissipate) {
          this.impact = { spec: flight.spec, startedAt: now };
          alive = true;
        }
      } else {
        if (t >= 0) this.drawFlight(flight.spec, t);
        alive = true;
      }
    }

    // --- Gerbe d'impact ---------------------------------------------------
    const impact = this.impact;
    if (impact) {
      const ti = (now - impact.startedAt) / IMPACT_MS;
      if (ti >= 1) {
        this.impact = null;
      } else {
        this.drawImpact(impact.spec, ti);
        alive = true;
      }
    }

    // --- Canalisations ----------------------------------------------------
    if (this.channels.length > 0) {
      this.channels = this.channels.filter(
        (channel) => now - channel.startedAt < CHANNEL_MS,
      );
      for (const channel of this.channels) {
        this.drawChannel(
          channel.spec,
          (now - channel.startedAt) / CHANNEL_MS,
        );
      }
      if (this.channels.length > 0) alive = true;
    }

    return alive;
  }

  // =====================================================================
  // Effets
  // =====================================================================

  /** Vol : traînée d'éclats, cœur lumineux et halo. */
  private drawFlight(spec: SpellCast, t: number): void {
    const vfx = ELEMENT_VFX[spec.type];
    const sample = sampleFlight(spec.from, spec.to, t, vfx, spec.dissipate);
    const orbScale = ORB_BASE_PX * sample.scale;

    // Traînée : éclats décroissants échelonnés en arrière du projectile.
    for (let k = 1; k <= vfx.trail; k++) {
      const tk = t - k * 0.055;
      if (tk <= 0) break;
      const tail = sampleFlight(spec.from, spec.to, tk, vfx, spec.dissipate);
      const ratio = k / (vfx.trail + 1);
      const alpha = tail.alpha * (1 - ratio) * 0.75;
      const scale = orbScale * 0.5 * (1 - ratio);
      if (alpha <= 0.01 || scale <= 0.2) continue;
      this.drawPart(
        'shard',
        this.model(
          tail.x,
          tail.y,
          tail.z,
          tail.spin * 1.7,
          scale,
          scale,
          scale,
        ),
        vfx.spark,
        vfx.glow,
        alpha,
        1,
      );
    }

    // Halo additif : large, peu saturé — c'est lui qui « éclaire » l'arène.
    const halo = orbScale * 2.3;
    this.drawPart(
      'glow',
      this.model(sample.x, sample.y, sample.z, 0, halo, halo, halo),
      vfx.glow,
      vfx.core,
      sample.alpha * 0.3,
      0,
    );

    // Cœur du projectile.
    this.drawPart(
      'orb',
      this.model(
        sample.x,
        sample.y,
        sample.z,
        sample.spin,
        orbScale,
        orbScale,
        orbScale,
      ),
      vfx.core,
      vfx.glow,
      sample.alpha,
      1,
    );
  }

  /** Gerbe d'impact : anneau de choc, éclair central et éclats projetés. */
  private drawImpact(spec: SpellCast, t: number): void {
    const vfx = ELEMENT_VFX[spec.type];
    const sample = sampleImpact(t, spec.crit ? 1.5 : 1);
    const { x, y } = spec.to;
    const z = 12;

    // Anneau de choc (face caméra : la projection est presque orthographique).
    const ringRadius = sample.ringRadius * IMPACT_BASE_PX * vfx.size;
    this.drawPart(
      'ring',
      this.model(x, y, z, 0, ringRadius, ringRadius, ringRadius),
      vfx.glow,
      vfx.core,
      sample.ringAlpha * 0.85,
      1,
    );

    // Éclair central + son halo.
    const flashScale = ORB_BASE_PX * vfx.size * (0.9 + sample.flash * 2.8);
    const halo = flashScale * 2.2;
    this.drawPart(
      'glow',
      this.model(x, y, z, 0, halo, halo, halo),
      vfx.glow,
      vfx.core,
      sample.flash * 0.4,
      0,
    );
    this.drawPart(
      'orb',
      this.model(x, y, z + 6, 0, flashScale, flashScale, flashScale),
      vfx.core,
      vfx.glow,
      sample.flash,
      1,
    );

    // Éclats : gerbe elliptique (plus large que haute), déterministe.
    const spread = sample.sparkSpread * IMPACT_BASE_PX;
    for (let i = 0; i < sample.sparkCount; i++) {
      const angle = (i / sample.sparkCount) * Math.PI * 2 + 0.4;
      const px = x + Math.cos(angle) * spread;
      const py = y + Math.sin(angle) * spread * 0.72;
      const scale = ORB_BASE_PX * 0.5 * vfx.size * (1 - t);
      if (scale <= 0.2) continue;
      this.drawPart(
        'shard',
        this.model(px, py, z, angle * 3, scale, scale * 1.6, scale),
        vfx.spark,
        vfx.glow,
        sample.sparkAlpha * 0.9,
        1,
      );
    }
  }

  /** Canalisation : cordon élémentaire qui monte le long du lanceur. */
  private drawChannel(spec: SpellChannel, t: number): void {
    const vfx = ELEMENT_VFX[spec.type];
    const sample = sampleChannel(t);
    const { x, y } = spec.at;
    const baseY = y - COLUMN_HEIGHT_PX * 0.35;
    const radius = sample.radius * COLUMN_BASE_PX;
    const head = baseY + sample.rise * COLUMN_HEIGHT_PX;

    // Halo diffus autour du corps.
    const halo = radius * 1.5;
    this.drawPart(
      'glow',
      this.model(x, baseY + sample.rise * COLUMN_HEIGHT_PX * 0.55, 0, 0, halo, halo, halo),
      vfx.glow,
      vfx.core,
      sample.alpha * 0.24,
      0,
    );

    // Cordon : colonnes d'éclats qui montent en tournant.
    for (let i = 0; i < COLUMN_SEGMENTS; i++) {
      const angle = (i / COLUMN_SEGMENTS) * Math.PI * 2 + sample.spin;
      const px = x + Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      const scale = ORB_BASE_PX * 0.6 * (1 - sample.rise * 0.5);
      this.drawPart(
        'shard',
        this.model(px, head, pz, angle + sample.spin, scale, scale * 1.5, scale),
        vfx.spark,
        vfx.glow,
        sample.alpha * 0.9,
        1,
      );
      // Comète : petit cœur lumineux sous l'éclat, qui marque la montée.
      const tailScale = scale * 0.7;
      this.drawPart(
        'orb',
        this.model(px, head - 10, pz, 0, tailScale, tailScale, tailScale),
        vfx.glow,
        vfx.core,
        sample.alpha * 0.4,
        0,
      );
    }

    // Anneau au sol : écrasé (ellipse) pour lire comme posé sur le sol.
    const ringRadius = radius * 1.7;
    this.drawPart(
      'ring',
      this.model(x, baseY, 0, 0, ringRadius, ringRadius * 0.5, ringRadius),
      vfx.glow,
      vfx.core,
      sample.alpha * 0.5,
      1,
    );
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.flight = null;
    this.impact = null;
    this.channels = [];
    if (this.gl) {
      this.releaseMeshes();
      if (this.program) this.gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}
