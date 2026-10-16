import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARC_BASE_PX,
  CAST_LEAD_MS,
  CHANNEL_MS,
  ELEMENT_VFX,
  FLIGHT_MS,
  IMPACT_MS,
  SCREEN_DISTANCE_PX,
  attackFamily,
  buildGlowMesh,
  buildOrbMesh,
  buildRingMesh,
  buildShardMesh,
  casterMuzzle,
  sampleChannel,
  sampleFlight,
  sampleImpact,
  targetChest,
  toArenaRect,
  vfxAnchor,
  vfxProjection,
  type ElementVfx,
} from '../src/lib/renderers/spellVfx';
import type { BodyPartMesh, MonsterType } from '../src/lib/renderers/monsterRig';

/**
 * Attaques à distance 3D.
 *
 * Le rendu navigateur n'est pas exécutable ici : on verrouille donc tout ce qui
 * **décide** de l'effet (routage, cadencement, trajectoire, ancrages,
 * projection, maillages) sur le module pur `spellVfx.ts` — mêmes données que le
 * renderer — et l'architecture de la couche sur la source, comme
 * `AttackAnimations.test.ts` le fait pour le CSS.
 */

const TYPES: MonsterType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'normal'];
const ARENA = { width: 640, height: 400 };
const FROM = { x: 120, y: 150 };
const TO = { x: 520, y: 160 };

/** Applique une matrice colonne-majeur à un point, puis divise par w (NDC). */
function project(m: Float32Array, v: [number, number, number]) {
  const x = m[0]! * v[0] + m[4]! * v[1] + m[8]! * v[2] + m[12]!;
  const y = m[1]! * v[0] + m[5]! * v[1] + m[9]! * v[2] + m[13]!;
  const z = m[2]! * v[0] + m[6]! * v[1] + m[10]! * v[2] + m[14]!;
  const w = m[3]! * v[0] + m[7]! * v[1] + m[11]! * v[2] + m[15]!;
  return { x: x / w, y: y / w, z: z / w };
}

function meshNormalsAreUnit(mesh: BodyPartMesh, label: string): void {
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const n = Math.hypot(mesh.normals[i]!, mesh.normals[i + 1]!, mesh.normals[i + 2]!);
    expect(Math.abs(n - 1), `${label} : normale non unitaire (${n})`).toBeLessThan(1e-6);
  }
}

describe('Routage des attaques — règle partagée', () => {
  test('une capacité à `power: 0` est une canalisation (soin / buff)', () => {
    expect(attackFamily({ power: 0, isPhysical: false })).toBe('utility');
    expect(attackFamily({ power: 0, isPhysical: true })).toBe('utility');
  });

  test('une attaque physique part au corps à corps', () => {
    expect(attackFamily({ power: 40, isPhysical: true })).toBe('melee');
    expect(attackFamily({ power: 140, isPhysical: true })).toBe('melee');
  });

  test('une attaque magique part à distance (projectile 3D)', () => {
    expect(attackFamily({ power: 55, isPhysical: false })).toBe('ranged');
    expect(attackFamily({ power: 130, isPhysical: false })).toBe('ranged');
  });
});

describe('Palette élémentaire des effets', () => {
  test('les 6 types ont un jeu de réglages, tous distincts', () => {
    for (const type of TYPES) {
      expect(ELEMENT_VFX[type], `${type} sans effet`).toBeDefined();
    }
    const cores = TYPES.map((type) => ELEMENT_VFX[type].core.join(','));
    expect(new Set(cores).size).toBe(6);
  });

  test('chaque réglage reste dans les bornes de rendu', () => {
    for (const type of TYPES) {
      const vfx = ELEMENT_VFX[type];
      expect(vfx.trail, `${type} : traînée`).toBeGreaterThanOrEqual(5);
      expect(vfx.trail, `${type} : traînée`).toBeLessThanOrEqual(10);
      expect(vfx.size, `${type} : taille`).toBeGreaterThan(0);
      expect(vfx.arc, `${type} : bosse`).toBeGreaterThan(0);
      expect(vfx.spin, `${type} : rotation`).toBeGreaterThan(0);
      // Couleurs : composantes normalisées (la couche est additive).
      for (const channel of [...vfx.core, ...vfx.glow, ...vfx.spark]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('les identités élémentaires se lisent dans les réglages', () => {
    // Roche = le plus massif, électricité = le plus fin, et c'est l'éclair qui
    // serpente le plus (trajectoire la moins tendue).
    const sizes = TYPES.map((type) => ELEMENT_VFX[type].size);
    expect(ELEMENT_VFX.rock.size).toBe(Math.max(...sizes));
    expect(ELEMENT_VFX.electric.size).toBe(Math.min(...sizes));
    for (const type of TYPES) {
      expect(ELEMENT_VFX.electric.wobble).toBeGreaterThanOrEqual(
        ELEMENT_VFX[type].wobble,
      );
    }
  });
});

describe('Cadencement du sort', () => {
  test('armement + vol + impact tiennent dans la fenêtre d’animation (950 ms)', () => {
    // `ANIMATION_END_DELAY` du store : durée pendant laquelle `isAttacking`
    // reste vrai. Un sort qui déborderait jouerait par-dessus l'action suivante.
    const total = CAST_LEAD_MS + FLIGHT_MS + IMPACT_MS;
    expect(total).toBeLessThanOrEqual(950);
    expect(total).toBeGreaterThan(500);
  });

  test('la canalisation ne dépasse pas la fenêtre d’animation', () => {
    expect(CHANNEL_MS).toBeLessThanOrEqual(950);
    expect(CHANNEL_MS).toBeGreaterThan(FLIGHT_MS);
  });
});

describe('Ancrages écran', () => {
  test('un rectangle DOM est retourné dans le repère WebGL (origine bas-gauche)', () => {
    const rect = toArenaRect(
      { left: 10, top: 20, width: 100, height: 50 },
      ARENA,
    );
    expect(rect.left).toBe(10);
    // 400 - (20 + 50) : le bas du rectangle DOM devient son bas en y-vers-le-haut.
    expect(rect.top).toBe(330);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  test('le sort part de la main AVANT du lanceur, à hauteur de garde', () => {
    const player: Rect = { left: 40, top: 100, width: 160, height: 200 };
    const enemy: Rect = { left: 440, top: 100, width: 160, height: 200 };

    const fromPlayer = casterMuzzle(player, true);
    const fromEnemy = casterMuzzle(enemy, false);

    // Côté adverse : à droite pour le joueur (il regarde vers la droite),
    // à gauche pour l'ennemi.
    expect(fromPlayer.x).toBeGreaterThan(player.left + player.width / 2);
    expect(fromEnemy.x).toBeLessThan(enemy.left + enemy.width / 2);

    // Et toujours dans la boîte du combattant.
    for (const [rect, point] of [
      [player, fromPlayer],
      [enemy, fromEnemy],
    ] as Array<[Rect, { x: number; y: number }]>) {
      expect(point.x).toBeGreaterThan(rect.left);
      expect(point.x).toBeLessThan(rect.left + rect.width);
      expect(point.y).toBeGreaterThan(rect.top);
      expect(point.y).toBeLessThan(rect.top + rect.height);
    }
  });

  test('l’impact vise le buste, centré sur la cible', () => {
    const enemy: Rect = { left: 440, top: 100, width: 160, height: 200 };
    const chest = targetChest(enemy);
    expect(chest.x).toBe(enemy.left + enemy.width / 2);
    expect(chest.y).toBeGreaterThan(enemy.top + enemy.height * 0.4);
    expect(chest.y).toBeLessThan(enemy.top + enemy.height * 0.55);
  });

  test('le projectile va bien de la gauche vers la droite (joueur → ennemi)', () => {
    const player: Rect = { left: 40, top: 100, width: 160, height: 200 };
    const enemy: Rect = { left: 440, top: 100, width: 160, height: 200 };
    expect(casterMuzzle(player, true).x).toBeLessThan(targetChest(enemy).x);
    expect(casterMuzzle(enemy, false).x).toBeGreaterThan(targetChest(player).x);
  });
});

describe('Vol du projectile', () => {
  test('la trajectoire part de la main et arrive sur le buste', () => {
    for (const type of TYPES) {
      const start = sampleFlight(FROM, TO, 0, ELEMENT_VFX[type]);
      const end = sampleFlight(FROM, TO, 1, ELEMENT_VFX[type]);
      expect(start.x, `${type} : départ`).toBeCloseTo(FROM.x, 6);
      expect(start.y, `${type} : départ`).toBeCloseTo(FROM.y, 6);
      expect(end.x, `${type} : arrivée`).toBeCloseTo(TO.x, 6);
      expect(end.y, `${type} : arrivée`).toBeCloseTo(TO.y, 6);
    }
  });

  test('le sort décrit un arc au-dessus de la ligne droite', () => {
    for (const type of TYPES) {
      const vfx = ELEMENT_VFX[type];
      const mid = sampleFlight(FROM, TO, 0.5, vfx);
      const straight = (FROM.y + TO.y) / 2;
      expect(mid.y, `${type} : pas d'arc`).toBeGreaterThan(straight);
      expect(mid.y - straight).toBeCloseTo(vfx.arc * ARC_BASE_PX, 6);
    }
  });

  test('le sort avance vers la caméra au milieu du vol (relief)', () => {
    const vfx = ELEMENT_VFX.fire;
    expect(sampleFlight(FROM, TO, 0, vfx).z).toBeCloseTo(0, 6);
    expect(sampleFlight(FROM, TO, 1, vfx).z).toBeCloseTo(0, 6);
    expect(sampleFlight(FROM, TO, 0.5, vfx).z).toBeGreaterThan(0);
  });

  test('le projectile tourne et grossit en s’approchant', () => {
    const vfx = ELEMENT_VFX.grass;
    expect(sampleFlight(FROM, TO, 0, vfx).spin).toBeCloseTo(0, 6);
    expect(sampleFlight(FROM, TO, 0.5, vfx).spin).toBeGreaterThan(0);
    expect(sampleFlight(FROM, TO, 0.5, vfx).scale).toBeGreaterThan(
      sampleFlight(FROM, TO, 1, vfx).scale,
    );
  });

  test('le serpentement ne dépasse jamais l’amplitude annoncée', () => {
    const vfx: ElementVfx = ELEMENT_VFX.electric;
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const eased = t * t * (3 - 2 * t);
      const linearX = FROM.x + (TO.x - FROM.x) * eased;
      const sample = sampleFlight(FROM, TO, t, vfx);
      expect(Math.abs(sample.x - linearX)).toBeLessThanOrEqual(vfx.wobble * 60 + 1e-9);
    }
  });

  test('le projectile apparaît en fondu et reste visible jusqu’à l’impact', () => {
    const vfx = ELEMENT_VFX.water;
    expect(sampleFlight(FROM, TO, 0, vfx).alpha).toBeCloseTo(0, 6);
    expect(sampleFlight(FROM, TO, 0.1, vfx).alpha).toBeGreaterThan(0.5);
    expect(sampleFlight(FROM, TO, 0.5, vfx).alpha).toBeCloseTo(1, 6);
    expect(sampleFlight(FROM, TO, 1, vfx).alpha).toBeCloseTo(1, 6);
  });

  test('un coup manqué dissipe le sort avant la cible', () => {
    const vfx = ELEMENT_VFX.normal;
    const still = sampleFlight(FROM, TO, 0.5, vfx, true);
    expect(still.alpha).toBeCloseTo(1, 6);
    expect(sampleFlight(FROM, TO, 0.85, vfx, true).alpha).toBeLessThan(
      sampleFlight(FROM, TO, 0.7, vfx, true).alpha,
    );
    expect(sampleFlight(FROM, TO, 1, vfx, true).alpha).toBeCloseTo(0, 6);
    // Le sort se rétracte aussi : il ne frappe pas la cible de plein volume.
    expect(sampleFlight(FROM, TO, 1, vfx, true).scale).toBeLessThan(
      sampleFlight(FROM, TO, 0.7, vfx, true).scale,
    );
  });

  test('le temps est borné et toutes les valeurs restent finies', () => {
    for (const type of TYPES) {
      for (const t of [-1, 0, 0.5, 1, 2, Number.EPSILON]) {
        const sample = sampleFlight(FROM, TO, t, ELEMENT_VFX[type]);
        for (const value of [sample.x, sample.y, sample.z, sample.scale, sample.spin, sample.alpha]) {
          expect(Number.isFinite(value), `${type}@${t} : valeur non finie`).toBe(true);
        }
      }
      // Hors bornes : écrêtage (t < 0 vaut le départ, t > 1 vaut l'arrivée).
      expect(sampleFlight(FROM, TO, -1, ELEMENT_VFX[type]).x).toBeCloseTo(FROM.x, 6);
      expect(sampleFlight(FROM, TO, 2, ELEMENT_VFX[type]).x).toBeCloseTo(TO.x, 6);
    }
  });
});

describe('Gerbe d’impact', () => {
  test('l’anneau de choc s’ouvre et s’efface', () => {
    const early = sampleImpact(0.05);
    const late = sampleImpact(0.9);
    expect(late.ringRadius).toBeGreaterThan(early.ringRadius);
    expect(late.ringAlpha).toBeLessThan(early.ringAlpha);
    expect(sampleImpact(1).ringAlpha).toBeCloseTo(0, 6);
    expect(sampleImpact(1).sparkAlpha).toBeCloseTo(0, 6);
  });

  test('l’éclair central est bref', () => {
    expect(sampleImpact(0).flash).toBeGreaterThan(0.9);
    expect(sampleImpact(0.5).flash).toBeLessThan(0.1);
    expect(sampleImpact(1).flash).toBe(0);
  });

  test('un critique produit une gerbe plus large et plus fournie', () => {
    const normal = sampleImpact(0.5, 1);
    const crit = sampleImpact(0.5, 1.5);
    expect(crit.ringRadius).toBeGreaterThan(normal.ringRadius);
    expect(crit.sparkCount).toBeGreaterThan(normal.sparkCount);
    expect(crit.sparkSpread).toBeGreaterThan(normal.sparkSpread);
  });

  test('la force est écrêtée (aucune gerbe absurde) et tout reste fini', () => {
    for (const strength of [0, 1, 5, Number.NaN]) {
      const sample = sampleImpact(0.5, strength);
      for (const value of [
        sample.flash,
        sample.ringRadius,
        sample.ringAlpha,
        sample.sparkSpread,
        sample.sparkAlpha,
        sample.sparkCount,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(sample.sparkCount).toBeLessThanOrEqual(18);
    }
  });
});

describe('Canalisation (soin / buff)', () => {
  test('le cordon monte du sol vers le corps et s’efface aux deux bouts', () => {
    expect(sampleChannel(0).rise).toBe(0);
    expect(sampleChannel(1).rise).toBe(1);
    expect(sampleChannel(0).alpha).toBeCloseTo(0, 6);
    expect(sampleChannel(1).alpha).toBeCloseTo(0, 6);
    expect(sampleChannel(0.5).alpha).toBeGreaterThan(0.9);
  });

  test('le rayon reste borné et tourne', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const sample = sampleChannel(t);
      expect(sample.radius).toBeGreaterThan(0);
      expect(sample.radius).toBeLessThan(1.2);
      expect(sample.spin).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(sample.spin)).toBe(true);
    }
    expect(sampleChannel(1).spin).toBeGreaterThan(sampleChannel(0.5).spin);
  });
});

describe('Projection — le plan écran colle aux pixels de l’arène', () => {
  test('la caméra recule plus loin que la hauteur de l’arène (perspective douce)', () => {
    expect(SCREEN_DISTANCE_PX).toBeGreaterThan(ARENA.height);
  });

  test('à z = 0, les coins de l’arène tombent pile sur les bords du champ', () => {
    const proj = vfxProjection(ARENA.width, ARENA.height);
    const at = (x: number, y: number) => {
      const a = vfxAnchor(x, y, 0, ARENA.width, ARENA.height);
      return project(proj, [a.x, a.y, a.z]);
    };
    const bottomLeft = at(0, 0);
    const topRight = at(ARENA.width, ARENA.height);
    const center = at(ARENA.width / 2, ARENA.height / 2);
    expect(bottomLeft.x).toBeCloseTo(-1, 6);
    expect(bottomLeft.y).toBeCloseTo(-1, 6);
    expect(topRight.x).toBeCloseTo(1, 6);
    expect(topRight.y).toBeCloseTo(1, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(0, 6);
  });

  test('un sort qui avance (z > 0) grossit et s’écarte du centre', () => {
    const proj = vfxProjection(ARENA.width, ARENA.height);
    const edge = vfxAnchor(ARENA.width, ARENA.height / 2, 0, ARENA.width, ARENA.height);
    const closer = vfxAnchor(ARENA.width, ARENA.height / 2, 72, ARENA.width, ARENA.height);
    const flat = project(proj, [edge.x, edge.y, edge.z]);
    const pushed = project(proj, [closer.x, closer.y, closer.z]);
    expect(flat.x).toBeCloseTo(1, 6);
    // Le point conserve son bord en y, mais déborde en x : c'est la perspective.
    expect(pushed.x).toBeGreaterThan(flat.x);
    expect(pushed.y).toBeCloseTo(flat.y, 6);
  });

  test('la projection suit les dimensions de l’arène', () => {
    const wide = vfxProjection(900, 400);
    const narrow = vfxProjection(400, 400);
    expect(wide[0]).not.toBeCloseTo(narrow[0]!, 3);
  });
});

describe('Maillages des effets', () => {
  test('chaque maillage est fini, aligné et porte des normales unitaires', () => {
    const meshes: Array<[string, BodyPartMesh]> = [
      ['orb', buildOrbMesh('high')],
      ['glow', buildGlowMesh('high')],
      ['shard', buildShardMesh()],
      ['ring', buildRingMesh()],
    ];
    for (const [label, mesh] of meshes) {
      expect(mesh.positions.length, label).toBeGreaterThan(0);
      expect(mesh.positions.length % 3, label).toBe(0);
      expect(mesh.positions.length, label).toBe(mesh.normals.length);
      for (const value of mesh.positions) {
        expect(Number.isFinite(value), `${label} : sommet non fini`).toBe(true);
      }
      meshNormalsAreUnit(mesh, label);
    }
  });

  test('le mode mobile allège les sphères sans toucher aux éclats', () => {
    expect(buildOrbMesh('low').positions.length).toBeLessThan(
      buildOrbMesh('high').positions.length,
    );
    expect(buildGlowMesh('low').positions.length).toBeLessThan(
      buildGlowMesh('high').positions.length,
    );
    // L'octaèdre est déjà minimal : identique dans les deux modes.
    expect(buildShardMesh().positions.length).toBe(8 * 3 * 3);
  });

  test('l’anneau de choc est plat et face caméra', () => {
    const ring = buildRingMesh(24);
    expect(ring.positions.length).toBe(24 * 6 * 3);
    for (let i = 0; i < ring.positions.length; i += 3) {
      expect(ring.positions[i + 2]).toBe(0);
      expect(ring.normals[i + 2]).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Architecture de la couche (source, comme les tests de markup existants)
// ---------------------------------------------------------------------------

const ROOT = path.join(import.meta.dir, '../');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const LAYER = read('src/lib/renderers/SpellVfxLayer.ts');
const COMPONENT = read('src/lib/components/molecules/ArenaSpellLayer.svelte');
const APP = read('src/App.svelte');
const DISPLAYER = read('src/lib/components/molecules/MonsterDisplayer.svelte');
const SPRITE = read('src/lib/components/atoms/SpriteDisplayer.svelte');

describe('Calque 3D des sorts — architecture', () => {
  test('le rendu est additif et sans test de profondeur', () => {
    expect(LAYER).toContain('gl.enable(gl.BLEND)');
    expect(LAYER).toContain('gl.blendFunc(gl.SRC_ALPHA, gl.ONE)');
    expect(LAYER).toContain('gl.disable(gl.DEPTH_TEST)');
  });

  test('la boucle s’arrête dès qu’aucun effet n’est actif (aucun rAF permanent)', () => {
    expect((LAYER.match(/requestAnimationFrame/g) ?? []).length).toBe(1);
    expect(LAYER).toContain('const stillActive = this.draw();');
    expect(LAYER).toContain('if (stillActive) this.ensureLoop();');
  });

  test('la géométrie vient du module pur, pas du renderer', () => {
    for (const sampler of ['sampleFlight(', 'sampleImpact(', 'sampleChannel(']) {
      expect(LAYER).toContain(sampler);
    }
    expect(LAYER).toContain('vfxProjection(');
    expect(LAYER).toContain('vfxAnchor(');
  });

  test('la couche est montée dans l’arène, au-dessus des combattants', () => {
    expect(APP).toContain('<ArenaSpellLayer');
    expect(APP).toContain('isPlayerAttacking={$battleStore.isAttacking}');
    expect(APP).toContain('isEnemyAttacking={$battleStore.isEnemyAttacking}');
    expect(APP).toContain('playerLastMove={$battleStore.playerLastMove}');
    expect(APP).toContain('enemyLastMove={$battleStore.enemyLastMove}');
    expect(COMPONENT).toContain('pointer-events-none absolute inset-0 z-[25]');
  });

  test('les effets s’ancrent sur les deux silhouettes, repérées par leur face', () => {
    expect(COMPONENT).toContain('[data-fighter="${side}"]');
    expect(COMPONENT).toContain('casterMuzzle(own, isPlayer)');
    expect(COMPONENT).toContain('targetChest(other)');
    expect(SPRITE).toContain("data-fighter={isPlayer ? 'player' : 'enemy'}");
  });

  test('seuls les coups magiques partent en projectile 3D', () => {
    // Soin / buff → canalisation sur le lanceur ; corps à corps → rien (la
    // charge CSS reste seule).
    expect(COMPONENT).toContain("if (family === \"utility\")");
    expect(COMPONENT).toContain('if (self?.kind !== "heal" && self?.kind !== "buff") return;');
    expect(COMPONENT).toContain('layer.channel(channel)');
    expect(COMPONENT).toContain('if (family !== "ranged" || !own) return;');
    expect(COMPONENT).toContain('layer.cast(cast)');
  });

  test('un raté dissipe le sort, un critique élargit la gerbe', () => {
    expect(COMPONENT).toContain('foe?.kind === "miss" || foe?.kind === "fumble"');
    expect(COMPONENT).toContain('crit: Boolean(foe?.isCrit)');
  });

  test('l’orbe CSS devient le repli, piloté par le store', () => {
    expect(DISPLAYER).toContain('attackKind === \'ranged\' && isAttacking && !$spellVfxReady');
    expect(DISPLAYER).toContain('import { spellVfxReady } from "../../stores/vfxStore"');
    expect(COMPONENT).toContain('spellVfxReady.set(layer.supported)');
  });

  test('la pose et l’effet partagent le même routeur de familles', () => {
    expect(DISPLAYER).toContain(
      '$: attackKind = !isAttacking || !lastMove ? null : attackFamily(lastMove);',
    );
    expect(DISPLAYER).toContain('import { attackFamily } from "../../renderers/spellVfx"');
  });
});
