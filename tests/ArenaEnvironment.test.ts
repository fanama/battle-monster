import { describe, expect, test } from 'bun:test';
import {
  ARENA_EYE,
  ARENA_HORIZON_FROM_TOP,
  arenaViewMatrix,
  arenaViewProjection,
  buildArenaEnvironment,
  mat4LookAt,
} from '../src/lib/renderers/arenaEnvironment';

/** Projette un point monde par une matrice colonne-majeure → coordonnées NDC. */
function project(m: Float32Array, x: number, y: number, z: number) {
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return { x: cx / cw, y: cy / cw, w: cw };
}

const W = 800;
const H = 600;

describe('Maillage du décor', () => {
  const mesh = buildArenaEnvironment();
  const vertices = mesh.positions.length / 3;

  test('les attributs sont parallèles (un sommet = une normale, une couleur, un flag)', () => {
    expect(mesh.positions.length % 9).toBe(0);
    expect(mesh.normals.length).toBe(vertices * 3);
    expect(mesh.colors.length).toBe(vertices * 4);
    expect(mesh.emissive.length).toBe(vertices);
  });

  test('toutes les valeurs sont finies', () => {
    const all = [...mesh.positions, ...mesh.normals, ...mesh.colors, ...mesh.emissive];
    expect(all.every((v) => Number.isFinite(v))).toBe(true);
  });

  test('les couleurs restent dans [0, 1]', () => {
    expect(mesh.colors.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  test('seul l’horizon est lumineux (émissif = 1)', () => {
    const lit = mesh.emissive.filter((v) => v === 1).length;
    expect(lit).toBe(6); // un quad = deux triangles
    expect(lit).toBeLessThan(vertices);
  });

  test('les piliers dépassent nettement la hauteur des yeux', () => {
    const maxY = Math.max(...mesh.positions.filter((_, i) => i % 3 === 1));
    expect(maxY).toBeGreaterThan(ARENA_EYE[1]);
  });
});

describe('Caméra', () => {
  test('l’œil du spectateur est au centre de la vue', () => {
    const v = arenaViewMatrix();
    const [ex, ey, ez] = ARENA_EYE;
    const p = project(v, ex, ey, ez);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
    expect(Math.abs(p.y)).toBeLessThan(1e-6);
  });

  /** Profondeur en repère de vue (négative = devant la caméra, OpenGL). */
  function viewDepth(m: Float32Array, x: number, y: number, z: number): number {
    return m[2] * x + m[6] * y + m[10] * z + m[14];
  }

  test('la caméra regarde vers -Z (le fond de l’arène est devant)', () => {
    const v = arenaViewMatrix();
    expect(viewDepth(v, 0, ARENA_EYE[1], 0)).toBeLessThan(0);
  });

  test('mat4LookAt place la cible sur l’axe -Z, à la bonne distance', () => {
    const m = mat4LookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    expect(viewDepth(m, 0, 0, 0)).toBeCloseTo(-5, 5);
  });
});

describe('Horizon', () => {
  const vp = arenaViewProjection(W, H);

  test('l’infini se projette à la ligne d’horizon CSS (38 % depuis le haut)', () => {
    // Un point très loin au ras du sol tend vers l'horizon.
    const far = project(vp, 0, 0, -1e6);
    const fromTop = (1 - far.y) / 2;
    expect(fromTop).toBeCloseTo(ARENA_HORIZON_FROM_TOP, 3);
  });

  test('le sol proche est sous l’horizon', () => {
    const near = project(vp, 0, 0, 8);
    const fromTop = (1 - near.y) / 2;
    expect(fromTop).toBeGreaterThan(ARENA_HORIZON_FROM_TOP);
  });

  test('la projection ne dépend que du ratio de l’arène, pas de sa taille absolue', () => {
    const a = arenaViewProjection(800, 600);
    const b = arenaViewProjection(1600, 1200);
    for (let i = 0; i < 16; i++) expect(a[i]).toBeCloseTo(b[i], 6);
  });
});
