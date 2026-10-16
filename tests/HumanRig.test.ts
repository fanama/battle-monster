import { describe, expect, test } from 'bun:test';
import {
  buildHumanRig,
  buildRig,
  ELEMENT_COLORS,
  GUARD_POSE,
  HUMAN_COLORS,
  JOINT_IDS,
  RIG_ACTIONS,
  rigPartMatrices,
  rigWorldBounds,
  sampleRigPose,
  scaleRigPose,
  type GearSlot,
  type MonsterType,
} from '../src/lib/renderers/monsterRig';

/**
 * Champion **humain** : corps humain + pièces d'équipement **visibles**.
 *
 * Le rig humain partage le squelette du monstre (10 articulations, mêmes
 * pivots) : les poses d'action et le renderer s'appliquent tels quels. On
 * vérifie que l'humain tient dans le cadre caméra, qu'il diffère réellement
 * d'un monstre (peau vs palette élémentaire) et que l'équipement porté ajoute
 * bien de la géométrie, emplacement par emplacement.
 */

const TYPES: MonsterType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'normal'];
const ALL_GEAR: GearSlot[] = ['weapon', 'armor', 'helm', 'shield', 'accessory'];

// Champ vertical visible : FOV 42°, caméra à z = -2.70 (cf. arène).
const HALF_H = 2.7 * Math.tan(((42 * Math.PI) / 180) / 2);
const TOP = HALF_H;
const BOTTOM = -HALF_H;
const BREATHE = 1.025;
const BOUNCE = 0.04;

describe('Champion humain — structure du rig', () => {
  test('le rig humain couvre les 10 articulations et reste fini', () => {
    const rig = buildHumanRig({ type: 'fire' });
    expect(rig.species).toBe('human');
    expect(rig.isBoss).toBe(false);
    const ids = rig.parts.map((p) => p.id);
    for (const id of JOINT_IDS) {
      expect(ids, `${id} manquant`).toContain(id);
    }
    expect(rig.parts).toHaveLength(10);
    for (const part of rig.parts) {
      expect(part.mesh.positions.length % 3).toBe(0);
      expect(part.mesh.positions.length).toBe(part.mesh.normals.length);
      for (const v of part.mesh.positions) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  test('le monstre reste un monstre (aucune régression du rig ennemi)', () => {
    const rig = buildRig('normal', false);
    expect(rig.species).toBe('monster');
    expect(rig.parts).toHaveLength(10);
  });

  test('la qualité mobile allège le rig humain sans changer la garde', () => {
    const high = buildHumanRig({ type: 'water', quality: 'high' });
    const low = buildHumanRig({ type: 'water', quality: 'low' });
    expect(low.vertexCount).toBeLessThan(high.vertexCount * 0.55);
    const bh = rigWorldBounds(high, GUARD_POSE);
    const bl = rigWorldBounds(low, GUARD_POSE);
    for (const key of ['minY', 'maxY', 'minX', 'maxX'] as const) {
      expect(Math.abs(bh[key] - bl[key])).toBeLessThan(0.02);
    }
  });
});

describe('Champion humain — couleur et silhouette', () => {
  test('la peau (et non une palette élémentaire) porte le corps nu', () => {
    const rig = buildHumanRig({ type: 'rock' });
    const head = rig.parts.find((p) => p.id === 'head')!;
    const colors = new Set<string>();
    for (let i = 0; i < head.mesh.colors.length; i += 3) {
      colors.add(`${head.mesh.colors[i]},${head.mesh.colors[i + 1]},${head.mesh.colors[i + 2]}`);
    }
    expect(colors.has(HUMAN_COLORS.skin.join(','))).toBe(true);
    // La teinte rocheuse du monstre ne colore PAS la peau de l'humain.
    expect(colors.has(ELEMENT_COLORS.rock.body.join(','))).toBe(false);
  });

  test('la garde humaine tient dans le cadre caméra (pieds et crâne compris)', () => {
    for (const type of TYPES) {
      const rig = buildHumanRig({ type });
      const b = rigWorldBounds(rig, GUARD_POSE);
      expect(b.maxX - b.minX, `${type} trop large`).toBeLessThan(1.8);
      expect(b.maxY - b.minY, `${type} : silhouette trop plate`).toBeGreaterThan(1.5);
      expect(b.minY, `${type} : pieds remontés`).toBeLessThan(-0.6);
      expect(b.minY * BREATHE - BOUNCE, `${type} : pieds hors cadre`).toBeGreaterThan(BOTTOM);
      expect(b.maxY * BREATHE + BOUNCE, `${type} : crâne hors cadre`).toBeLessThan(TOP);
    }
  });
});

/** Bornes monde d'un **seul** segment (le rig humain n'expose que celles du tout). */
function partWorldBounds(
  rig: ReturnType<typeof buildHumanRig>,
  id: string,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const mats = rigPartMatrices(rig, GUARD_POSE);
  const part = rig.parts.find((p) => p.id === id)!;
  const m = mats[id]!;
  const pos = part.mesh.positions;
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i]!, y = pos[i + 1]!, z = pos[i + 2]!;
    const wx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    const wy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    if (wx < b.minX) b.minX = wx;
    if (wx > b.maxX) b.maxX = wx;
    if (wy < b.minY) b.minY = wy;
    if (wy > b.maxY) b.maxY = wy;
  }
  return b;
}

/** Couleurs distinctes d'un segment (clés `r,g,b`). */
function partColors(rig: ReturnType<typeof buildHumanRig>, id: string): Set<string> {
  const part = rig.parts.find((p) => p.id === id)!;
  const out = new Set<string>();
  for (let i = 0; i < part.mesh.colors.length; i += 3) {
    out.add(`${part.mesh.colors[i]},${part.mesh.colors[i + 1]},${part.mesh.colors[i + 2]}`);
  }
  return out;
}

describe('Chibi anime — proportions, coiffure et grands yeux', () => {
  test('la tête occupe près de la moitié de la figure (chibi marqué)', () => {
    const rig = buildHumanRig({ type: 'fire' });
    const total = rigWorldBounds(rig, GUARD_POSE);
    const head = partWorldBounds(rig, 'head');
    const ratio = (head.maxY - head.minY) / (total.maxY - total.minY);
    expect(ratio, `ratio tête = ${ratio.toFixed(2)}`).toBeGreaterThan(0.4);
  });

  test('la tête est plus large que le torse (grosse tête chibi)', () => {
    const rig = buildHumanRig({ type: 'normal' });
    const head = partWorldBounds(rig, 'head');
    const torso = partWorldBounds(rig, 'torso');
    expect(head.maxX - head.minX).toBeGreaterThan(torso.maxX - torso.minX);
  });

  test('le sommet de la tête est une pointe de cheveux (silhouette hérissée)', () => {
    const rig = buildHumanRig({ type: 'fire' });
    const head = rig.parts.find((p) => p.id === 'head')!;
    let topIdx = 0;
    let topY = -Infinity;
    for (let i = 0; i < head.mesh.positions.length; i += 3) {
      const y = head.mesh.positions[i + 1]!;
      if (y > topY) {
        topY = y;
        topIdx = i;
      }
    }
    const topColor = `${head.mesh.colors[topIdx]},${head.mesh.colors[topIdx + 1]},${head.mesh.colors[topIdx + 2]}`;
    expect(topColor).toBe(HUMAN_COLORS.hair.join(','));
  });

  test('de nombreux vertices de cheveux (calotte + pointes)', () => {
    const rig = buildHumanRig({ type: 'grass' });
    const head = rig.parts.find((p) => p.id === 'head')!;
    const hair = HUMAN_COLORS.hair.join(',');
    let hairVerts = 0;
    for (let i = 0; i < head.mesh.colors.length; i += 3) {
      if (`${head.mesh.colors[i]},${head.mesh.colors[i + 1]},${head.mesh.colors[i + 2]}` === hair) {
        hairVerts++;
      }
    }
    expect(hairVerts).toBeGreaterThan(500);
  });

  test('de grands yeux d’anime : sclère blanche + iris élémentaire', () => {
    const rig = buildHumanRig({ type: 'water' });
    const colors = partColors(rig, 'head');
    expect(colors.has('1,1,1')).toBe(true);
    expect(colors.has(ELEMENT_COLORS.water.eye.join(','))).toBe(true);
  });

  test('le casque cohabite avec les pointes (cheveux ET métal visibles)', () => {
    const rig = buildHumanRig({ type: 'electric', gear: ['helm'] });
    const colors = partColors(rig, 'head');
    expect(colors.has(HUMAN_COLORS.hair.join(','))).toBe(true);
    expect(colors.has(HUMAN_COLORS.metal.join(','))).toBe(true);
  });
});

describe('Équipement visible — chaque pièce portée ajoute de la géométrie', () => {
  test('chaque emplacement occupé densifie le maillage', () => {
    const bare = buildHumanRig({ type: 'normal' });
    for (const slot of ALL_GEAR) {
      const withGear = buildHumanRig({ type: 'normal', gear: [slot] });
      expect(withGear.vertexCount, `${slot} invisible`).toBeGreaterThan(bare.vertexCount);
    }
  });

  test('tout l’équipement porté masque plus de vertices qu’une seule pièce', () => {
    const bare = buildHumanRig({ type: 'normal' });
    const one = buildHumanRig({ type: 'normal', gear: ['armor'] });
    const full = buildHumanRig({ type: 'normal', gear: ALL_GEAR });
    expect(full.vertexCount).toBeGreaterThan(one.vertexCount);
    expect(full.vertexCount).toBeGreaterThan(bare.vertexCount);
  });

  test('l’arme ne va qu’en main droite, le bouclier qu’au bras gauche', () => {
    const weapon = buildHumanRig({ type: 'normal', gear: ['weapon'] });
    const shield = buildHumanRig({ type: 'normal', gear: ['shield'] });
    const bare = buildHumanRig({ type: 'normal' });
    const foreR = (rig: typeof bare) => rig.parts.find((p) => p.id === 'fore.R')!;
    const foreL = (rig: typeof bare) => rig.parts.find((p) => p.id === 'fore.L')!;

    expect(foreR(weapon).mesh.positions.length).toBeGreaterThan(
      foreR(bare).mesh.positions.length,
    );
    expect(foreL(weapon).mesh.positions.length).toBe(foreL(bare).mesh.positions.length);

    expect(foreL(shield).mesh.positions.length).toBeGreaterThan(foreL(bare).mesh.positions.length);
    expect(foreR(shield).mesh.positions.length).toBe(foreR(bare).mesh.positions.length);
  });

  test('un humain équipé tient toujours dans le cadre (aucun membre volant)', () => {
    for (const type of TYPES) {
      const rig = buildHumanRig({ type, gear: ALL_GEAR });
      for (const [kind, mid] of [
        ['melee', 0.4],
        ['ranged', 0.5],
        ['victory', 0.6],
      ] as Array<[keyof typeof RIG_ACTIONS, number]>) {
        for (const t of [0, mid, 1]) {
          const pose = scaleRigPose(sampleRigPose(kind, t), 1.3);
          const b = rigWorldBounds(rig, pose);
          expect(Math.abs(b.minX), `${type}/${kind}@${t}`).toBeLessThan(1.9);
          expect(Math.abs(b.maxX), `${type}/${kind}@${t}`).toBeLessThan(1.9);
          expect(b.minY, `${type}/${kind}@${t}`).toBeGreaterThan(-2.2);
          expect(b.maxY, `${type}/${kind}@${t}`).toBeLessThan(2.2);
        }
      }
    }
  });
});
