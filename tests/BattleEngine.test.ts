import { describe, expect, test } from 'bun:test';
import { BattleEngine, constitutionDamageReduction, type Dice } from '../src/core/services/BattleEngine';
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

describe('Absorption des dégâts par la Constitution de la victime', () => {
  const tackle: Move = {
    id: 'tackle',
    name: 'Charge',
    type: 'normal',
    power: 40,
    level: 1,
    isPhysical: true,
  };

  /** Jet d'attaque 12 (touche, pas de critique) puis dé de dégâts 8. */
  const attackDice = (): Dice => {
    const rolls = [12, 8];
    let i = 0;
    return { roll: () => rolls[i++] ?? 1 };
  };

  const attacker = () =>
    new Monster('a', 'Attacker', 'normal', 1, 14, 10, 10, 10, 10, 10, [tackle]);

  test('constitutionDamageReduction ne renvoie que les modificateurs positifs', () => {
    const con18 = new Monster('x', 'X', 'normal', 1, 10, 10, 18, 10, 10, 10, []);
    const con10 = new Monster('y', 'Y', 'normal', 1, 10, 10, 10, 10, 10, 10, []);
    const con8 = new Monster('z', 'Z', 'normal', 1, 10, 10, 8, 10, 10, 10, []);

    expect(constitutionDamageReduction(con18)).toBe(4);
    expect(constitutionDamageReduction(con10)).toBe(0);
    expect(constitutionDamageReduction(con8)).toBe(0); // mod négatif → jamais de vulnérabilité
  });

  test('Le mod(CON) positif de la victime est retiré des dégâts infligés', () => {
    // Dégâts bruts : 1d8(8) + 4 (puissance) + 2 (mod FOR 14) + 2 (bonus) = 16.
    const engineNoCon = new BattleEngine({ dice: attackDice() });
    const soft = new Monster('d', 'Souple', 'normal', 1, 10, 14, 10, 10, 10, 10, []); // CON 10 → +0
    const turnSoft = engineNoCon.executeTurn(attacker(), soft, tackle);

    const engineHighCon = new BattleEngine({ dice: attackDice() });
    const tough = new Monster('d', 'Coriace', 'normal', 1, 10, 14, 18, 10, 10, 10, []); // CON 18 → +4
    const turnTough = engineHighCon.executeTurn(attacker(), tough, tackle);

    expect(turnSoft.feedback.kind).toBe('damage');
    expect(turnTough.feedback.kind).toBe('damage');
    expect(turnSoft.feedback.damage).toBe(16);
    expect(turnTough.feedback.damage).toBe(12); // 16 − 4 (mod CON)
    expect(tough.currentHp).toBe(tough.maxHp - 12);
    // La réduction apparaît bien dans les données affichées (journal).
    expect(turnTough.logs.some(l => l.message.includes('mod CON +4'))).toBe(true);
    expect(turnSoft.logs.some(l => l.message.includes('mod CON'))).toBe(false);
  });

  test('Les dégâts restent minimum 1 malgré une CON très élevée', () => {
    const engine = new BattleEngine({ dice: attackDice() });
    const wall = new Monster('d', 'Mur', 'normal', 1, 10, 14, 46, 10, 10, 10, []); // mod CON +17
    const turn = engine.executeTurn(attacker(), wall, tackle);

    expect(turn.feedback.damage).toBe(1);
    expect(wall.currentHp).toBe(wall.maxHp - 1);
  });
});
