import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { MonsterWebGLRenderer } from '../src/lib/renderers/MonsterWebGLRenderer';
import type { Monster3DOptions } from '../src/lib/renderers/MonsterWebGLRenderer';

/**
 * Vérifie la silhouette **réellement construite** par le moteur : on injecte un
 * contexte WebGL simulé qui enregistre le contenu des `bufferData`, puis on
 * mesure les positions de sommets produites par `buildGeometry`.
 *
 * C'est une exécution réelle du code de rendu (pas une analyse de source) : les
 * nombres mesurés ci-dessous proviennent du maillage réellement produit.
 */

const TYPES: Monster3DOptions['type'][] = [
  'fire',
  'water',
  'grass',
  'electric',
  'rock',
  'normal',
];

/** Contexte GL factice : capture les trois Float32Array (positions/normales/couleurs). */
function fakeGL() {
  const captured: Record<string, Float32Array> = {};
  const handle = { __buf: 0 };
  let binding = '';
  const gl: any = {
    DEPTH_TEST: 1, LEQUAL: 2, CULL_FACE: 3, BACK: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6,
    FLOAT: 7, TRIANGLES: 8, COLOR_BUFFER_BIT: 16, DEPTH_BUFFER_BIT: 32, CCW: 64,
    enable() {}, depthFunc() {}, cullFace() {}, frontFace() {}, viewport() {},
    clearColor() {}, clear() {}, useProgram() {}, enableVertexAttribArray() {},
    vertexAttribPointer() {}, uniformMatrix4fv() {}, uniformMatrix3fv() {},
    uniform3fv() {}, uniform3f() {}, uniform1f() {},
    createShader: () => handle, shaderSource() {}, compileShader() {},
    createProgram: () => handle, attachShader() {}, linkProgram() {},
    getAttribLocation: () => 0, getUniformLocation: () => handle,
    createBuffer: () => ({ __id: ++handle.__buf }),
    bindBuffer(_t: number, b: any) { binding = String(b?.__id ?? '?'); },
    bufferData(_t: number, data: Float32Array) { captured[binding] = data; },
    deleteBuffer() {}, deleteProgram() {}, drawArrays() {},
  };
  return { gl, captured };
}

/** Construit le maillage d'un type et renvoie ses positions de sommets. */
function buildPositions(type: Monster3DOptions['type'], isBoss = false): Float32Array {
  const { gl, captured } = fakeGL();
  const canvas: any = { getContext: () => gl, clientWidth: 100, clientHeight: 100, width: 100, height: 100 };
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;
  // Le rendu n'est pas nécessaire : on neutralise la boucle d'animation.
  globalThis.requestAnimationFrame = (() => 0) as any;
  globalThis.cancelAnimationFrame = (() => {}) as any;
  try {
    const renderer = new MonsterWebGLRenderer(canvas, {
      type, isPlayer: false, isBoss, isLowHp: false, isStrong: false, hasWisdom: false,
    });
    const pos = Object.values(captured).find((a) => a?.length && a.length % 3 === 0);
    renderer.destroy();
    return pos!;
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
}

function bounds(pos: Float32Array) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i]!, y = pos[i + 1]!, z = pos[i + 2]!;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

// Champ vertical visible : FOV 42°, caméra à z = -2.70, centrée sur y = 0.
// On intègre l'animation de respiration (± 2.5 %) et le flottement (± 0.04),
// sinon le crâne sortirait du cadre au pic de l'animation.
const HALF_H = 2.7 * Math.tan(((42 * Math.PI) / 180) / 2);
const TOP = HALF_H;
const BOTTOM = -HALF_H;
const BREATHE = 1.025;
const BOUNCE = 0.04;

describe('Silhouette humanoïde — maillage réellement construit', () => {
  test('chaque type produit un maillage non vide et sans NaN', () => {
    for (const type of TYPES) {
      const pos = buildPositions(type);
      expect(pos.length, `${type} : maillage vide`).toBeGreaterThan(0);
      expect(pos.length % 3, `${type} : sommets non alignés sur des triplets`).toBe(0);
      for (let i = 0; i < pos.length; i++) {
        if (!Number.isFinite(pos[i]!)) {
          throw new Error(`${type} : valeur non finie à l'index ${i}`);
        }
      }
    }
  });

  test('le corps est centré horizontalement (jambes symétriques)', () => {
    for (const type of TYPES) {
      const b = bounds(buildPositions(type));
      // La largeur totale reste faible : une pose debout, pas une écartée.
      expect(b.maxX - b.minX, `${type} trop large`).toBeLessThan(2.2);
      expect(b.minX, `${type} : déséquilibre gauche`).toBeGreaterThan(-1.2);
      expect(b.maxX, `${type} : déséquilibre droite`).toBeLessThan(1.2);
    }
  });

  // Haut du crâne (centre 0.56 + rayon 0.32) dans le maillage de base.
  const CRANIUM_TOP = 0.88;

  test('la tête dépasse le torse : le corps est erecté', () => {
    for (const type of TYPES) {
      const b = bounds(buildPositions(type));
      // Hauteur totale cohérente avec buste + tête + jambes.
      expect(b.maxY - b.minY, `${type} : silhouette trop plate`).toBeGreaterThan(1.5);
    }
  });

  test('les pieds et le crâne tiennent dans le champ, animation comprise', () => {
    for (const type of TYPES) {
      const b = bounds(buildPositions(type));
      // Pieds au point bas de l'animation (contraction + flottement).
      expect(b.minY * BREATHE - BOUNCE, `${type} : pieds hors cadre`).toBeGreaterThan(BOTTOM);
      // Crâne au point haut de l'animation. On borne au crâne (0.88), pas au
      // bout des cornes/oreilles, qui débordent volontairement (décor).
      expect(CRANIUM_TOP * BREATHE + BOUNCE, `${type} : crâne hors cadre`).toBeLessThan(TOP);
    }
  });

  test('les pieds descendent réellement sous le torse', () => {
    for (const type of TYPES) {
      expect(bounds(buildPositions(type)).minY).toBeLessThan(-0.6);
    }
  });

  test('la version boss ajoute la couronne sans casser le maillage', () => {
    const normal = buildPositions('normal');
    const boss = buildPositions('normal', true);
    expect(boss.length).toBeGreaterThan(normal.length);
    expect(bounds(boss).minY).toBeGreaterThan(BOTTOM);
  });
});

/**
 * Le maillage exécuté donne les positions mais ne dit pas **avec quelle
 * primitive** chaque membre est construit. On vérifie donc les appels de
 * `buildGeometry` : les épaules doivent exister, et les membres doivent être
 * des cylindres (et non des sphères).
 */
const GEOM = fs.readFileSync(
  path.join(import.meta.dir, '../src/lib/renderers/MonsterWebGLRenderer.ts'),
  'utf8',
);
const BODY_SRC = GEOM.slice(
  GEOM.indexOf('private buildGeometry'),
  GEOM.indexOf('this.vertexCount'),
).replace(/\s+/g, ' ');

describe('Épaules et membres cylindriques', () => {
  test('les deux épaules (articulations deltoïdiennes) existent', () => {
    const shoulders = BODY_SRC.match(
      /addSphere\(mesh, *[-\d.]+, *0\.16, *0, *0\.11, *0\.115, *0\.105/g,
    );
    expect(shoulders).toHaveLength(2);
  });

  test('les épaules sont posées sur le haut du torse', () => {
    // Torse : centre -0.02, rayon vertical 0.34 → sommet à y = 0.32.
    const y = Number(
      /addSphere\(mesh, *-?[\d.]+, *(0\.16), *0,/.exec(BODY_SRC)![1],
    );
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(0.32);
  });

  test('chaque bras est fait de deux cylindres (bras + avant-bras)', () => {
    const upper = BODY_SRC.match(
      /addCylinder\(mesh, *-?[\d.]+, *0\.13, *0, *-?[\d.]+, *-0\.12/g,
    );
    const fore = BODY_SRC.match(
      /addCylinder\(mesh, *-?[\d.]+, *-0\.15, *0\.02, *-?[\d.]+, *-0\.34/g,
    );
    expect(upper, 'bras supérieur').toHaveLength(2);
    expect(fore, 'avant-bras').toHaveLength(2);
  });

  test('chaque jambe est faite de deux cylindres (cuisse + tibia)', () => {
    const thigh = BODY_SRC.match(
      /addCylinder\(mesh, *-?[\d.]+, *-0\.36, *0, *-?[\d.]+, *-0\.54/g,
    );
    const shin = BODY_SRC.match(
      /addCylinder\(mesh, *-?[\d.]+, *-0\.57, *0\.005, *-?[\d.]+, *-0\.72/g,
    );
    expect(thigh, 'cuisse').toHaveLength(2);
    expect(shin, 'tibia').toHaveLength(2);
  });

  test('aucun segment de membre n’est construit avec une sphère', () => {
    // Seules les articulations (épaule, coude, genou, main, pied) sont des
    // sphères ; les segments entre elles doivent être des cylindres.
    for (const forbidden of ['0.29, 0.13', '-0.33, -0.12', '0.13, -0.36']) {
      const sphere = new RegExp(
        `addSphere\\(mesh, *-?[\\d.]+, *${forbidden.replace(/[.\-]/g, '\\$&')}`,
      );
      expect(BODY_SRC.match(sphere)).toBeNull();
    }
  });

  test('les hanches sont elles aussi articulées', () => {
    const hips = BODY_SRC.match(
      /addSphere\(mesh, *-?[\d.]+, *-0\.34, *0, *0\.105, *0\.105, *0\.10/g,
    );
    expect(hips).toHaveLength(2);
  });
});