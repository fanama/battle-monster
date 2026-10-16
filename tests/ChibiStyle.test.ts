import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  ELEMENT_COLORS,
  GUARD_POSE,
  buildHumanRig,
  buildRig,
  rigPartMatrices,
  rigWorldBounds,
  type MonsterType,
  type Rig,
} from '../src/lib/renderers/monsterRig';

/**
 * Style « chibi fantasy » : le bestiaire ET le champion lisent comme des
 * figurines à grosse tête, et le renderer les encadre d'un **trait encré** sur
 * un **aplat toon 2 tons** (inspirations : kits chibi low-poly et Dragon Quest).
 *
 * Le rendu navigateur n'est pas exécutable ici : les invariants de forme sont
 * vérifiés sur le rig pur (mêmes données que le renderer), et le style du
 * shader sur la source du renderer — comme `AttackAnimations.test.ts` le fait
 * pour le CSS. `bun run check` / `bun run build` couvrent la compilation.
 */

const TYPES: MonsterType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'normal'];

const RENDERER_SRC = fs.readFileSync(
  path.join(import.meta.dir, '../src/lib/renderers/MonsterWebGLRenderer.ts'),
  'utf8',
);

/** Bornes monde d'un **seul** segment, en garde (pose zéro). */
function partBounds(rig: Rig, id: string) {
  const mats = rigPartMatrices(rig, GUARD_POSE);
  const part = rig.parts.find((p) => p.id === id)!;
  const m = mats[id]!;
  const pos = part.mesh.positions;
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i]!;
    const y = pos[i + 1]!;
    const z = pos[i + 2]!;
    const wx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    const wy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    if (wx < b.minX) b.minX = wx;
    if (wx > b.maxX) b.maxX = wx;
    if (wy < b.minY) b.minY = wy;
    if (wy > b.maxY) b.maxY = wy;
  }
  return b;
}

/** Couleurs distinctes d'un segment, en clés `r,g,b`. */
function partColors(rig: Rig, id: string): Set<string> {
  const part = rig.parts.find((p) => p.id === id)!;
  const out = new Set<string>();
  for (let i = 0; i < part.mesh.colors.length; i += 3) {
    out.add(`${part.mesh.colors[i]},${part.mesh.colors[i + 1]},${part.mesh.colors[i + 2]}`);
  }
  return out;
}

describe('Chibi fantasy — proportions des monstres', () => {
  test('la tête occupe près de la moitié de la figure, pour les 6 types', () => {
    for (const type of TYPES) {
      const rig = buildRig(type, false);
      const total = rigWorldBounds(rig, GUARD_POSE);
      const head = partBounds(rig, 'head');
      const ratio = (head.maxY - head.minY) / (total.maxY - total.minY);
      expect(ratio, `${type} : ratio tête = ${ratio.toFixed(2)}`).toBeGreaterThan(0.4);
    }
  });

  test('la tête est plus large que le torse (grosse tête chibi)', () => {
    for (const type of ['normal', 'water', 'grass', 'electric', 'rock'] as MonsterType[]) {
      const rig = buildRig(type, false);
      const head = partBounds(rig, 'head');
      const torso = partBounds(rig, 'torso');
      expect(
        head.maxX - head.minX,
        `${type} : tête ${(head.maxX - head.minX).toFixed(2)} vs torse ${(torso.maxX - torso.minX).toFixed(2)}`,
      ).toBeGreaterThan(torso.maxX - torso.minX);
    }
  });

  test('les jambes sont courtes (moins d’un tiers de la hauteur totale)', () => {
    for (const type of TYPES) {
      const rig = buildRig(type, false);
      const total = rigWorldBounds(rig, GUARD_POSE);
      const hip = rig.parts.find((p) => p.id === 'legU.L')!;
      const legSpan = hip.pivot[1] - total.minY;
      expect(legSpan / (total.maxY - total.minY), `${type} : jambes longues`).toBeLessThan(0.35);
    }
  });

  test('le crâne du boss tient dans le cadre (couronne abaissée)', () => {
    for (const type of TYPES) {
      const boss = buildRig(type, true);
      const plain = buildRig(type, false);
      expect(boss.vertexCount).toBeGreaterThan(plain.vertexCount);
      expect(rigWorldBounds(boss, GUARD_POSE).maxY).toBeLessThan(0.95);
    }
  });
});

describe('Chibi fantasy — visage expressif des monstres', () => {
  test('chaque type a de grands yeux d’anime : sclère blanche + iris du type', () => {
    for (const type of TYPES) {
      const colors = partColors(buildRig(type, false), 'head');
      expect(colors.has('1,1,1'), `${type} : pas de sclère`).toBe(true);
      expect(
        colors.has(ELEMENT_COLORS[type].eye.join(',')),
        `${type} : pas d'iris élémentaire`,
      ).toBe(true);
    }
  });

  test('sourcils et bouche sont des nuances sombres de la palette du corps', () => {
    for (const type of TYPES) {
      const colors = partColors(buildRig(type, false), 'head');
      const [r, g, b] = ELEMENT_COLORS[type].body;
      // Mêmes facteurs que `shade()` dans le rig : sourcil 0.40, bouche 0.28.
      expect(colors.has(`${r * 0.4},${g * 0.4},${b * 0.4}`), `${type} : pas de sourcil`).toBe(true);
      expect(colors.has(`${r * 0.28},${g * 0.28},${b * 0.28}`), `${type} : pas de bouche`).toBe(true);
    }
  });

  test('le champion partage la même fabrique de visage (sclère + iris)', () => {
    for (const type of TYPES) {
      const rig = buildHumanRig({ type });
      const colors = partColors(rig, 'head');
      expect(colors.has('1,1,1'), `${type} : pas de sclère`).toBe(true);
      expect(colors.has(ELEMENT_COLORS[type].eye.join(','))).toBe(true);
    }
  });
});

describe('Renderer — contour encré + aplat toon 2 tons', () => {
  test('l’ombrage est passé à DEUX tons (plus de palier intermédiaire)', () => {
    expect(RENDERER_SRC).toContain('NdotL > 0.12 ? 1.0 : 0.62');
    // L'ancien cel-shading à trois paliers ne doit pas revenir.
    expect(RENDERER_SRC).not.toContain('lightStep = 0.35');
    expect(RENDERER_SRC).not.toContain('lightStep = 0.7');
  });

  test('une passe de contour gonfle la coque le long des normales', () => {
    expect(RENDERER_SRC).toContain('uniform float uInflate;');
    expect(RENDERER_SRC).toContain('aNormal + vec3(1e-5)) * uInflate');
    expect(RENDERER_SRC).toContain('const OUTLINE_WIDTH_HIGH');
  });

  test('le contour élimine les faces AVANT et pose un aplat d’encre', () => {
    expect(RENDERER_SRC).toContain('uniform float uOutline;');
    expect(RENDERER_SRC).toContain('if (uOutline > 0.5)');
    expect(RENDERER_SRC).toContain('gl.cullFace(gl.FRONT)');
  });

  test('le contour est dessiné AVANT le corps (sinon il masquerait le modèle)', () => {
    const outline = RENDERER_SRC.indexOf('gl.uniform1f(this.uOutlineLoc, 1.0)');
    const body = RENDERER_SRC.indexOf('gl.uniform1f(this.uOutlineLoc, 0.0)');
    expect(outline).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(outline);
    // Le corps reprend le culling normal après la passe de contour (le
    // `cullFace(BACK)` de l'initialisation WebGL, lui, est en amont).
    expect(RENDERER_SRC.lastIndexOf('gl.cullFace(gl.BACK)')).toBeGreaterThan(outline);
  });

  test('les deux passes réutilisent le même parcours de segments', () => {
    expect(RENDERER_SRC).toContain('private drawParts(');
    expect(RENDERER_SRC.match(/this\.drawParts\(/g) ?? []).toHaveLength(2);
  });
});
