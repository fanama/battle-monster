import { describe, expect, test } from 'bun:test';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';

describe('BattleEngine (D&D 5e d20 Combat)', () => {
  const tackle: Move = {
    id: 'tackle',
    name: 'Charge',
    type: 'normal',
    power: 40,
    level: 1,
    isPhysical: true,
  };

  const ember: Move = {
    id: 'ember',
    name: 'Flammèche',
    type: 'fire',
    power: 40,
    level: 1,
    isPhysical: false,
  };

  test('Jet d\'attaque 20 naturel réussit toujours en coup critique', () => {
    const dice: Dice = { roll: () => 20 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Attacker', 'normal', 1, 10, 10, 10, 10, 10, 10, [tackle]);
    const defender = new Monster('d', 'Defender', 'normal', 1, 10, 10, 10, 10, 10, 10, []);
    defender.armorBonus = 20; // CA très haute

    const outcome = engine.resolveAttack(attacker, defender, tackle);
    expect(outcome.roll).toBe(20);
    expect(outcome.crit).toBe(true);
    expect(outcome.fumble).toBe(false);
    expect(outcome.hit).toBe(true);
  });

  test('Jet d\'attaque 1 naturel est un fumble (raté automatique)', () => {
    const dice: Dice = { roll: () => 1 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Attacker', 'normal', 10, 30, 10, 10, 10, 10, 10, [tackle]);
    const defender = new Monster('d', 'Defender', 'normal', 1, 10, 10, 10, 10, 10, 10, []);

    const outcome = engine.resolveAttack(attacker, defender, tackle);
    expect(outcome.roll).toBe(1);
    expect(outcome.fumble).toBe(true);
    expect(outcome.hit).toBe(false);
  });

  test('Attaque touche si jet total >= CA effective', () => {
    // Dice roll 10 + mod(Force 14 = +2) + precision bonus (+2 pour tackle) = 14 vs CA 12
    const dice: Dice = { roll: () => 10 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Attacker', 'normal', 1, 14, 10, 10, 10, 10, 10, [tackle]);
    const defender = new Monster('d', 'Defender', 'normal', 1, 10, 14, 10, 10, 10, 10, []); // CA 12

    const outcome = engine.resolveAttack(attacker, defender, tackle);
    expect(outcome.hit).toBe(true);
    expect(outcome.total).toBeGreaterThanOrEqual(outcome.ac);
  });

  test('Attaque rate si jet total < CA effective', () => {
    // Dice roll 5 + mod(Force 10 = +0) + precision (+2) = 7 vs CA 12
    const dice: Dice = { roll: () => 5 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Attacker', 'normal', 1, 10, 10, 10, 10, 10, 10, [tackle]);
    const defender = new Monster('d', 'Defender', 'normal', 1, 10, 14, 10, 10, 10, 10, []); // CA 12

    const outcome = engine.resolveAttack(attacker, defender, tackle);
    expect(outcome.hit).toBe(false);
    expect(outcome.total).toBeLessThan(outcome.ac);
  });
});
