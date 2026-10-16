/**
 * Renderer WebGL de l'environnement 3D de l'arène.
 *
 * La scène est **statique** : le décor est téléversé une fois, puis dessiné à
 * chaque redimensionnement du canvas (`render()`). Aucune boucle
 * `requestAnimationFrame` : pas de coût permanent sur la batterie ni sur le GPU.
 *
 * La géométrie et les matrices viennent de `arenaEnvironment.ts` (pur, testé).
 */

import {
  ARENA_FOG_COLOR,
  ARENA_FOG_FAR,
  ARENA_FOG_NEAR,
  ARENA_LIGHT_DIR,
  arenaViewMatrix,
  arenaViewProjection,
  buildArenaEnvironment,
} from './arenaEnvironment';

/** Cap du devicePixelRatio, comme les autres renderers (perf mobile). */
const DPR_CAP = 1.5;

const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec4 aColor;
  attribute float aEmissive;

  uniform mat4 uViewProj;
  uniform mat4 uView;

  varying vec3 vNormal;
  varying vec4 vColor;
  varying float vEmissive;
  varying float vDepth;

  void main() {
    vec4 viewPos = uView * vec4(aPosition, 1.0);
    vDepth = -viewPos.z;
    vNormal = aNormal;
    vColor = aColor;
    vEmissive = aEmissive;
    gl_Position = uViewProj * vec4(aPosition, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  varying vec3 vNormal;
  varying vec4 vColor;
  varying float vEmissive;
  varying float vDepth;

  uniform vec3 uLightDir;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  void main() {
    vec3 N = normalize(vNormal);
    float lambert = max(dot(N, normalize(uLightDir)), 0.0);
    // Les surfaces lumineuses (horizon) ne sont pas éclairées.
    float light = mix(0.55 + 0.45 * lambert, 1.0, vEmissive);
    vec3 color = vColor.rgb * light;

    // Brume : le décor lointain se fond dans le ciel CSS. Les surfaces
    // lumineuses ne s'éteignent pas dans la brume.
    float fog = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0)
      * (1.0 - vEmissive);
    color = mix(color, uFogColor, fog);
    float alpha = vColor.a * (1.0 - fog * 0.9);

    // Canvas en alpha prémultiplié.
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

type AttribName = 'aPosition' | 'aNormal' | 'aColor' | 'aEmissive';

export class ArenaEnvironmentLayer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffers = new Map<AttribName, WebGLBuffer>();
  private attribLocs = new Map<AttribName, number>();
  private uViewProjLoc: WebGLUniformLocation | null = null;
  private uViewLoc: WebGLUniformLocation | null = null;
  private uLightDirLoc: WebGLUniformLocation | null = null;
  private uFogColorLoc: WebGLUniformLocation | null = null;
  private uFogNearLoc: WebGLUniformLocation | null = null;
  private uFogFarLoc: WebGLUniformLocation | null = null;
  private vertexCount = 0;
  private readonly view = arenaViewMatrix();
  private destroyed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.initGL();
  }

  /** Vrai si le contexte WebGL et le programme sont prêts. */
  public get supported(): boolean {
    return this.gl !== null && this.program !== null;
  }

  /** Dessine le décor au format courant du canvas (appelé au redimensionnement). */
  public render(): void {
    if (!this.gl || !this.program || this.destroyed) return;
    const gl = this.gl;

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
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uViewProjLoc, false, arenaViewProjection(cssW, cssH));
    gl.uniformMatrix4fv(this.uViewLoc, false, this.view);
    gl.uniform3f(this.uLightDirLoc, ARENA_LIGHT_DIR[0], ARENA_LIGHT_DIR[1], ARENA_LIGHT_DIR[2]);
    gl.uniform3f(this.uFogColorLoc, ARENA_FOG_COLOR[0], ARENA_FOG_COLOR[1], ARENA_FOG_COLOR[2]);
    gl.uniform1f(this.uFogNearLoc, ARENA_FOG_NEAR);
    gl.uniform1f(this.uFogFarLoc, ARENA_FOG_FAR);

    const sizes: Record<AttribName, number> = {
      aPosition: 3,
      aNormal: 3,
      aColor: 4,
      aEmissive: 1,
    };
    for (const name of Object.keys(sizes) as AttribName[]) {
      const loc = this.attribLocs.get(name)!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.get(name)!);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, sizes[name], gl.FLOAT, false, 0, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }

  /** Libère le programme et les tampons GPU. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const gl = this.gl;
    if (gl) {
      for (const buffer of this.buffers.values()) gl.deleteBuffer(buffer);
      if (this.program) gl.deleteProgram(this.program);
    }
    this.buffers.clear();
    this.program = null;
  }

  private initGL(): void {
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!this.gl) return;
    const gl = this.gl;

    // Décor opaque avec profondeur (les pilliers masquent le sol), mélange
    // standard pour les lignes translucides et la brume.
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER_SRC);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAGMENT_SHADER_SRC);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      this.gl = null;
      return;
    }
    this.program = program;

    this.uViewProjLoc = gl.getUniformLocation(program, 'uViewProj');
    this.uViewLoc = gl.getUniformLocation(program, 'uView');
    this.uLightDirLoc = gl.getUniformLocation(program, 'uLightDir');
    this.uFogColorLoc = gl.getUniformLocation(program, 'uFogColor');
    this.uFogNearLoc = gl.getUniformLocation(program, 'uFogNear');
    this.uFogFarLoc = gl.getUniformLocation(program, 'uFogFar');

    const mesh = buildArenaEnvironment();
    this.vertexCount = mesh.positions.length / 3;
    const data: Record<AttribName, number[]> = {
      aPosition: mesh.positions,
      aNormal: mesh.normals,
      aColor: mesh.colors,
      aEmissive: mesh.emissive,
    };
    for (const name of Object.keys(data) as AttribName[]) {
      this.attribLocs.set(name, gl.getAttribLocation(program, name));
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data[name]), gl.STATIC_DRAW);
      this.buffers.set(name, buffer);
    }
  }
}
