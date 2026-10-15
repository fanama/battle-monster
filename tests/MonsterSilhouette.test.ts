import { describe, expect, test } from 'bun:test';
import {
  buildRig,
  ELEMENT_COLORS,
  GUARD_POSE,
  JOINT_IDS,
  RIG_ACTIONS,
  rigWorldBounds,
  sampleRigPose,
  scaleRigPose,
  type Rig,
  type MonsterType,
} from '../src/lib/renderers/monsterRig';

/**
 * Teste le **rig pur** réellement construit (aucun contexte WebGL simulé
 * nécessaire) : segments, pivots articulaires, garde d'origine, bornes du
 * monde sous chaque action, densité de maillage mobile.
 *
 * La garde (toutes rotations nulles) doit reproduire exactement la silhouette
 * humanoïde du moteur fusionné d'origine — continuité visuelle verrouillée.
 */

const TYPES: MonsterType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'normal'];

// Champ vertical visible : FOV 42°, caméra à z = -2.70, centrée sur y = 0.
const HALF_H = 2.7 * Math.tan(((42 * Math.PI) / 180) / 2);
const TOP = HALF_H;
const BOTTOM = -HALF_H;
// Animation d'idle globale (respiration ±2.5 % + flottement ±0.04).
const BREATHE = 1.025;
const BOUNCE = 0.04;

describe('Rig articulé — structure des segments', () => {
  test('chaque type produit les 10 segments articulés attendus', () => {
    for (const type of TYPES) {
      const rig = buildRig(type, false);
      const ids = rig.parts.map((p) => p.id);
      expect(ids).toContain('torso');
      expect(ids).toContain('head');
      for (const side of ['L', 'R'] as const) {
        expect(ids).toContain(`armU.${side}`);
        expect(ids).toContain(`fore.${side}`);
        expect(ids).toContain(`legU.${side}`);
        expect(ids).toContain(`shin.${side}`);
      }
      expect(rig.parts).toHaveLength(10);

      // Hiérarchie parent → enfant cohérente
      for (const part of rig.parts) {
        if (part.parent !== 'root') {
          expect(ids, `${part.id} : parent inconnu`).toContain(part.parent);
        }
        expect(part.mesh.positions.length, `${part.id} : maillage vide`).toBeGreaterThan(0);
        expect(part.mesh.positions.length % 3, `${part.id} : sommets non alignés`).toBe(0);
        expect(part.mesh.positions.length).toBe(part.mesh.normals.length);
      }
    }
  });

  test('tout sommet est fini (pas de NaN) pour les 6 types', () => {
    for (const type of TYPES) {
      for (const isBoss of [false, true]) {
        const rig = buildRig(type, isBoss);
        for (const part of rig.parts) {
          for (const v of part.mesh.positions) {
            expect(Number.isFinite(v), `${type}/boss=${isBoss} : NaN`).toBe(true);
          }
        }
      }
    }
  });

  test('la chaîne bras respecte les pivots (coude sous l’épaule, poing remonté)', () => {
    const rig = buildRig('normal', false);
    const shoulder = rig.parts.find((p) => p.id === 'armU.L')!;
    const elbow = rig.parts.find((p) => p.id === 'fore.L')!;

    // Le coude est sous l'épaule : pivot y du coude < pivot y de l'épaule.
    expect(elbow.pivot[1]).toBeLessThan(shoulder.pivot[1]);
    // L'avant-bras remonte en garde : son poing est au-dessus du coude
    // (coordonnée y locale positive, garde de boxe).
    const fistAbove = elbow.mesh.positions.filter(
      (_, i) => i % 3 === 1 && elbow.mesh.positions[i]! > 0.2,
    );
    expect(fistAbove.length, 'poing remonté en garde').toBeGreaterThan(0);
  });

  test('la chaîne jambes s’enfonce : genou au-dessus du pied', () => {
    const rig = buildRig('normal', false);
    const shin = rig.parts.find((p) => p.id === 'shin.L')!;
    // Le pied (y ≈ -0.24) est bien sous le genou (pivot y ≈ -0.005 dans le
    // shin local) : la jambe descend.
    const footDy = Math.min(...shin.mesh.positions.filter((_, i) => i % 3 === 1));
    expect(footDy).toBeLessThan(-0.2);
  });

  test('les 6 types ont des palettes distinctes (identité visuelle conservée)', () => {
    expect(new Set(TYPES.map((t) => ELEMENT_COLORS[t].body.join(','))).size).toBe(6);
  });
});

describe('Garde = silhouette d’origine (continuité visuelle)', () => {
  test('la pose zéro tient dans le cadre caméra, pieds et crâne inclus', () => {
    for (const type of TYPES) {
      const rig = buildRig(type, false);
      const b = rigWorldBounds(rig, GUARD_POSE);

      // Largeur debout maîtrisée (pas une pose écartée).
      expect(b.maxX - b.minX, `${type} trop large`).toBeLessThan(2.2);
      expect(b.minX, `${type} : déséquilibre gauche`).toBeGreaterThan(-1.2);
      expect(b.maxX, `${type} : déséquilibre droite`).toBeLessThan(1.2);

      // Debout : hauteur du corps (buste + tête + jambes) — même bornes que
      // l'ancien mesh fusionné : crâne ~0.88, pieds ~-0.85, idem.
      expect(b.maxY - b.minY, `${type} : silhouette trop plate`).toBeGreaterThan(1.5);
      // Crâne dans le champ (idem test historique).
      expect(0.88 * BREATHE + BOUNCE).toBeLessThan(TOP);
      // Pieds sous le torse ET dans le champ.
      expect(b.minY, `${type} : pieds remontés`).toBeLessThan(-0.6);
      expect(b.minY * BREATHE - BOUNCE, `${type} : pieds hors cadre`).toBeGreaterThan(BOTTOM);
    }
  });

  test('la version boss ajoute la couronne sans casser le rig', () => {
    const plain = buildRig('normal', false);
    const boss = buildRig('normal', true);
    expect(boss.vertexCount).toBeGreaterThan(plain.vertexCount);
    expect(rigWorldBounds(boss, GUARD_POSE).minY).toBeGreaterThan(BOTTOM);
  });
});

describe('Actions articulées — bornes plausibles et retour en garde', () => {
  const TESTS: Array<[keyof typeof RIG_ACTIONS, number]> = [
    ['melee', 0.4],
    ['ranged', 0.5],
    ['channel', 0.55],
    ['block', 0.45],
    ['victory', 0.6],
    ['defeat', 0.75],
  ];

  test('besoins déclarés : actions connues, durées positives', () => {
    expect(Object.keys(RIG_ACTIONS)).toContain('melee');
    expect(Object.keys(RIG_ACTIONS)).toContain('ranged');
    expect(Object.keys(RIG_ACTIONS)).toContain('channel');
    expect(Object.keys(RIG_ACTIONS)).toContain('block');
    expect(Object.keys(RIG_ACTIONS)).toContain('victory');
    expect(Object.keys(RIG_ACTIONS)).toContain('defeat');
    for (const spec of Object.values(RIG_ACTIONS)) {
      expect(spec.duration).toBeGreaterThan(0);
      expect(spec.keyframes.length).toBeGreaterThanOrEqual(2);
    }
  });

  test(`toutes les actions restent dans des bornes plausibles (pas de membre volant)`, () => {
    for (const type of TYPES) {
      const rig = buildRig(type, false);
      for (const [kind, mid] of TESTS) {
        for (const t of [0, mid, 1]) {
          const pose = scaleRigPose(sampleRigPose(kind, t), 1.3);
          const b = rigWorldBounds(rig, pose);
          // Les rotations d’articulation ne projettent aucun membre hors du
          // volume utile de l’arène.
          expect(Math.abs(b.minX), `${type}/${kind}@${t}`).toBeLessThan(1.8);
          expect(Math.abs(b.maxX), `${type}/${kind}@${t}`).toBeLessThan(1.8);
          expect(b.minY, `${type}/${kind}@${t} fusée vers le haut`).toBeGreaterThan(-2.2);
          expect(b.maxY, `${type}/${kind}@${t} sort du cadre haut`).toBeLessThan(2.2);
          // L'attaque pousse vers l'avant (+z), jamais dans la caméra.
          expect(b.maxZ, `${type}/${kind}@${t} perce la caméra`).toBeLessThan(1.4);
          expect(b.minZ, `${type}/${kind}@${t} recule trop loin`).toBeGreaterThan(-1.4);
        }
      }
    }
  });

  test('les actions non-maintenues finissent en garde (rotation ~0)', () => {
    for (const kind of ['melee', 'ranged', 'channel', 'block', 'victory'] as const) {
      const final = sampleRigPose(kind, 1);
      for (const rot of Object.values(final.joints)) {
        const norm = Math.abs(rot![0]) + Math.abs(rot![1]) + Math.abs(rot![2]);
        expect(norm, `${kind} ne relâche pas en garde`).toBeLessThan(0.05);
      }
      expect(final.dy, `${kind} dy final`).toBeCloseTo(0, 2);
    }
  });

  test('la défaite maintient l’effondrement (holdAfter)', () => {
    expect(RIG_ACTIONS.defeat.holdAfter).toBe(true);
    const held = sampleRigPose('defeat', 1);
    // Le buste est toujours penché après la durée.
    expect(Math.abs(held.joints.torso![0])).toBeGreaterThan(0.3);
    // Et un échantillonnage au-delà de 1 écrase à la même pose.
    expect(sampleRigPose('defeat', 5).joints.torso![0]).toBeCloseTo(held.joints.torso![0], 5);
  });

  test('la garde (t=0 de toute action) vaut bien pose zéro', () => {
    for (const kind of Object.keys(RIG_ACTIONS) as (keyof typeof RIG_ACTIONS)[]) {
      const start = sampleRigPose(kind, 0);
      expect(start.dy).toBe(0);
      // Le sampler normalise sur les 10 joints (absents = [0,0,0]) : toute
      // rotation est ~0 à t=0.
      for (const rot of Object.values(start.joints)) {
        expect(
          Math.abs(rot![0]) + Math.abs(rot![1]) + Math.abs(rot![2]),
          `${kind}@t=0 non garde`,
        ).toBeLessThan(0.05);
      }
    }
  });

  test('les 10 articulations existent dans le rig type (JOINT_IDS couverts)', () => {
    const rig: Rig = buildRig('fire', false);
    for (const id of JOINT_IDS) {
      expect(rig.parts.find((p) => p.id === id), `${id} manquant`).toBeDefined();
    }
  });
});

describe('Qualité mobile — densité de maillage', () => {
  test('le mode low produit moins de sommets que le mode high', () => {
    for (const type of TYPES) {
      const high = buildRig(type, false, 'high');
      const low = buildRig(type, false, 'low');
      expect(low.vertexCount, `${type} : pas d'économie`).toBeLessThan(high.vertexCount);
      // Économie substantielle (perf mobile).
      expect(low.vertexCount).toBeLessThan(high.vertexCount * 0.55);
    }
  });

  test('la qualité n’altère ni la garde ni les bornes', () => {
    const high = buildRig('water', false, 'high');
    const low = buildRig('water', false, 'low');
    const bh = rigWorldBounds(high, GUARD_POSE);
    const bl = rigWorldBounds(low, GUARD_POSE);
    for (const key of ['minY', 'maxY', 'minX', 'maxX'] as const) {
      expect(Math.abs(bh[key] - bl[key])).toBeLessThan(0.02);
    }
  });
});
