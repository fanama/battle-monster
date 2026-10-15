import { describe, expect, test } from 'bun:test';
import {
  createMonsterFromDefinition,
  type EnemyArchetype,
  type MonsterDefinition,
} from '../src/infra/repositories/monsterFactory';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { RandomEnemyFactory } from '../src/infra/repositories/RandomEnemyFactory';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';

/**
 * Capacités signature (réglage Dragon Quest 2026-10) : les sauvages tirent un
 * **archétype** (brute / statuteur / tank) qui pondère leur panel de 4
 * capacités, et l'IA joue ensuite le gimmick correspondant. Les boss restent
 * en panel signature (top-4 par score) ; la déduction du panel par l'IA,
 * testable après restauration de sauvegarde.
 */

const moves = new MoveRepository();

// Dé fiable : le random des façons (panel + statuts) est injecté à 0.15 —
// les branches d'aléa de l'IA (< 0.6 / < 0.85) se déclenchent, le tie-break
// du panel est stable.
const RNG = () => 0.15;

const FIRE_L9: MonsterDefinition = {
  id: 'fire-def',
  name: 'Sim',
  type: 'fire',
  level: 9,
  stats: {
    strength: 16,
    speed: 12,
    constitution: 14,
    charisma: 10,
    wisdom: 12,
    instinct: 12,
  },
};

function panelOf(archetype: EnemyArchetype, def: MonsterDefinition = FIRE_L9): Move[] {
  return createMonsterFromDefinition(def, moves, RNG, { archetype }).moves;
}

describe('Panneaux d’archétypes — le panel porte l’identité', () => {
  test('brute : le panel a au moins 2 frappes physiques lourdes (≥65)', () => {
    const panel = panelOf('brute');
    const heavy = panel.filter(m => m.isPhysical && m.power >= 65);
    expect(heavy.length, `panel: ${panel.map(m => m.id).join(', ')}`).toBeGreaterThanOrEqual(2);
  });

  test('statuteur : le panel a au moins 3 capacités à statut', () => {
    const panel = panelOf('statuteur');
    const statuses = panel.filter(m => m.statusEffect);
    expect(statuses.length, `panel: ${panel.map(m => m.id).join(', ')}`).toBeGreaterThanOrEqual(3);
  });

  test('tank : le panel contient le soin — il est prioritaire devant une frappe lourde', () => {
    const panel = panelOf('tank');
    expect(panel.some(m => m.isHeal), `panel: ${panel.map(m => m.id).join(', ')}`).toBe(true);
    // Le soin acheté via poids figure dans le top-4, à la place d'une frappe
    // de palier intermédiaire : la réserve de soin est l'identité du tank.
    const healCount = panel.filter(m => m.isHeal).length;
    expect(healCount).toBe(1);
  });

  test('signature : panel top-4 par score (comportement historique conservé)', () => {
    const def: MonsterDefinition = { ...FIRE_L9, level: 9 };
    // Score brute = niveau×100 + puissance + healPower : à n9, les 77 fire
    // candidates : flare (800), fury (800), heal (615), hyper-beam (585)…
    const panel = panelOf('signature', def);
    expect(panel.map(m => m.id)).toContain('fire-flare');
    expect(panel.map(m => m.id)).toContain('normal-fury');
    expect(panel.length).toBe(4);
  });

  test('boss : la fabrique ne tir JAMAIS un gimmick aléatoire (panel signature)', () => {
    const factory = new RandomEnemyFactory(moves, RNG);
    for (let i = 0; i < 20; i++) {
      const boss = factory.createBoss(9, 'fire', 'Boss Sim', 1);
      const ids = boss.moves.map(m => m.id);
      // Signature top-4 stable quel que soit le nombre d'invocations.
      expect(ids).toContain('fire-flare');
      expect(ids).toContain('normal-fury');
    }
  });

  test('sauvages : le tirage donne toujours un panel de 4 (coïncide avec le réel)', () => {
    const factory = new RandomEnemyFactory(moves, RNG);
    for (const archetype of ['signature', 'brute', 'statuteur', 'tank'] as const) {
      const enemy = factory.createRandomEnemy(9, { type: 'fire', archetype });
      expect(enemy.moves).toHaveLength(4);
    }
  });
});

describe('IA de gimmick — selectEnemyMove joue l’archétype déduit du panel', () => {
  const dice: Dice = { roll: () => 12 }; // neutre pour les jet d'ordre (non utilisés ici)
  const controller = new BattleController({
    engine: new BattleEngine({ dice }),
    moveProvider: moves,
    enemyFactory: { createRandomEnemy: () => new Monster('x', 'X', 'normal', 5, 10, 10, 10, 10, 10, 10, []) } as never,
    random: RNG,
  });

  function actorWith(panel: Move[]): Monster {
    const m = new Monster('a', 'Acteur', 'fire', 9, 12, 12, 14, 10, 12, 12, []);
    m.setMoves(panel.map(mv => ({ ...mv, coolDown: 0 })));
    return m;
  }

  function targetWithoutStatus(): Monster {
    return new Monster('t', 'Cible', 'normal', 9, 10, 10, 10, 10, 10, 10, []);
  }

  test('statuteur face à une cible saine : un cutter de statut est lancé', () => {
    const panel = panelOf('statuteur');
    const actor = actorWith(panel);
    const chosen = controller.selectEnemyMove(actor.moves, actor, targetWithoutStatus());
    // random fixé à 0.15 (< 0.6) : la branche gimmick statueur se déclenche.
    expect(chosen.statusEffect, `${chosen.name}`).toBeDefined();
  });

  test('statuteur face à une cible déjà contaminée : le gimmick ne rejoue pas un statut', () => {
    const panel = panelOf('statuteur');
    const actor = actorWith(panel);
    const target = targetWithoutStatus();
    target.addStatus('poison', 3, 1);
    const chosen = controller.selectEnemyMove(actor.moves, actor, target);
    // La branche gimmick exige une cible saine : ici le tri standard s'applique
    // (pool hors recharge → tapent le plus fort).
    expect(chosen.power, `${chosen.name}`).toBeGreaterThan(0);
  });

  test('tank à PV bas : le soin est le premier réflexe', () => {
    const panel = panelOf('tank');
    const actor = actorWith(panel);
    actor.currentHp = Math.floor(actor.maxHp * 0.3);
    const chosen = controller.selectEnemyMove(actor.moves, actor, targetWithoutStatus());
    expect(chosen.isHeal ?? false, `choisi : ${chosen.name}`).toBe(true);
  });

  test('tank à PV corrects : aucun soin de gaspillage', () => {
    const panel = panelOf('tank');
    const actor = actorWith(panel);
    actor.currentHp = actor.maxHp;
    const chosen = controller.selectEnemyMove(actor.moves, actor, targetWithoutStatus());
    expect(chosen.isHeal ?? false, `choisi : ${chosen.name}`).toBe(false);
  });

  test('brute : jamais de soin spontané, tapote les frappes lourdes', () => {
    const panel = panelOf('brute');
    const actor = actorWith(panel);
    actor.currentHp = Math.floor(actor.maxHp * 0.2);
    const chosen = controller.selectEnemyMove(actor.moves, actor, targetWithoutStatus());
    expect(chosen.isHeal ?? false, `choisi : ${chosen.name}`).toBe(false);
    expect(chosen.power, `choisi : ${chosen.name}`).toBeGreaterThan(0);
  });

  test('la déduction réussit après un remake du monstre (panel identique)', () => {
    // Le champ n'est pas sérialisé : il doit être déductible du panel seul, à
    // froid (restauration de sauvegarde). Un statuteur complète son panel
    // gated des cooldowns du tour.
    const panel = panelOf('statuteur').filter(m => m.statusEffect).slice(0, 3);
    const actor = actorWith(panel as Move[]);
    const chosen = controller.selectEnemyMove(actor.moves, actor, targetWithoutStatus());
    expect(chosen.statusEffect, `choisi : ${chosen.name}`).toBeDefined();
  });
});
