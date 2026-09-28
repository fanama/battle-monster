import { describe, expect, test } from 'bun:test';
import {
  Monster,
  effectiveArmorBonus,
  charismaMagicPercent,
  charismaHealBonus,
  AC_BASE,
  AC_SPEED_MOD_CAP,
  AC_ARMOR_SOFT_CAP,
  AC_HARD_CAP,
  CHARISMA_BASE,
} from '../src/core/entities/Monster';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import type { Move } from '../src/core/entities/Move';

describe('Plafonnement de la Classe d\'Armure (CA)', () => {
  test('effectiveArmorBonus applique le plein effet jusqu\'au soft cap (+6), puis 1 point sur 2', () => {
    expect(effectiveArmorBonus(0)).toBe(0);
    expect(effectiveArmorBonus(3)).toBe(3);
    expect(effectiveArmorBonus(6)).toBe(6);
    expect(effectiveArmorBonus(7)).toBe(6); // 6 + floor(1/2) = 6
    expect(effectiveArmorBonus(8)).toBe(7); // 6 + floor(2/2) = 7
    expect(effectiveArmorBonus(10)).toBe(8); // 6 + floor(4/2) = 8
    expect(effectiveArmorBonus(12)).toBe(9); // 6 + floor(6/2) = 9
    expect(effectiveArmorBonus(-2)).toBe(-2);
  });

  test('Monster.getAC prend en compte le modificateur de vitesse plafonné à +5', () => {
    // Vitesse 10 => mod 0 => CA 10
    const m1 = new Monster('1', 'Test', 'normal', 1, 10, 10, 10, 10, 10, 10, []);
    expect(m1.getAC()).toBe(10);

    // Vitesse 18 => mod +4 => CA 14
    const m2 = new Monster('2', 'Test', 'normal', 1, 10, 18, 10, 10, 10, 10, []);
    expect(m2.getAC()).toBe(14);

    // Vitesse 20 => mod +5 => CA 15
    const m3 = new Monster('3', 'Test', 'normal', 1, 10, 20, 10, 10, 10, 10, []);
    expect(m3.getAC()).toBe(15);

    // Vitesse 30 => mod +10, mais plafonné à +5 => CA 15
    const m4 = new Monster('4', 'Test', 'normal', 1, 10, 30, 10, 10, 10, 10, []);
    expect(m4.getAC()).toBe(15);
  });

  test('Monster.getAC respecte le plafond absolu (AC_HARD_CAP = 24)', () => {
    // Vitesse 20 (mod +5) + armure bonus 30
    const m = new Monster('1', 'Tank', 'rock', 10, 20, 20, 20, 10, 10, 10, []);
    m.armorBonus = 30; // raw armor gives soft cap 6 + 12 = 18 => raw total 10 + 5 + 18 = 33

    expect(m.getAC()).toBe(AC_HARD_CAP);
    expect(m.getAC()).toBe(24);
    expect(m.getRawAC()).toBe(10 + 5 + 30); // 45
    expect(m.getACCappedPoints()).toBe(45 - 24); // 21 points plafonnés
  });
});

describe('Rôle du Charisme', () => {
  test('charismaMagicPercent et charismaHealBonus calculent les bonus à partir du Charisme', () => {
    expect(charismaMagicPercent(CHARISMA_BASE)).toBe(0);
    expect(charismaMagicPercent(15)).toBe(10); // (15 - 10) / 50 * 100 = 10%
    expect(charismaMagicPercent(20)).toBe(20); // (20 - 10) / 50 * 100 = 20%
    expect(charismaMagicPercent(8)).toBe(0);

    expect(charismaHealBonus(10)).toBe(0);
    expect(charismaHealBonus(12)).toBe(1); // mod(12) = +1
    expect(charismaHealBonus(16)).toBe(3); // mod(16) = +3
    expect(charismaHealBonus(8)).toBe(0);
  });

  test('Le Charisme amplifie les dégâts magiques dans BattleEngine', () => {
    const fixedDice: Dice = { roll: () => 10 };
    const engine = new BattleEngine({ dice: fixedDice });

    const magicMove: Move = {
      id: 'spark',
      name: 'Étincelle',
      type: 'electric',
      power: 60,
      level: 1,
      isPhysical: false,
    };

    // Attaquant sans bonus de Charisme (10)
    const attackerNeutral = new Monster('1', 'Mage', 'electric', 5, 10, 10, 10, 10, 20, 10, [magicMove]);
    const rollNeutral = engine.rollDamage(attackerNeutral, magicMove, false);

    // Attaquant avec 20 en Charisme (+20% dégâts magiques)
    const attackerCharismatic = new Monster('2', 'Charmeur', 'electric', 5, 10, 10, 10, 20, 20, 10, [magicMove]);
    const rollCharismatic = engine.rollDamage(attackerCharismatic, magicMove, false);

    expect(attackerNeutral.charismaMagicFactor()).toBe(1);
    expect(attackerCharismatic.charismaMagicFactor()).toBe(1.2);
    expect(rollCharismatic.total).toBeGreaterThan(rollNeutral.total);
    expect(rollCharismatic.total).toBe(Math.floor(rollNeutral.total * 1.2));
  });

  test('Le Charisme augmente les soins appliqués dans BattleEngine', () => {
    const fixedDice: Dice = { roll: () => 4 }; // toujours 4 sur le dé de soin
    const engine = new BattleEngine({ dice: fixedDice });

    const healMove: Move = {
      id: 'heal',
      name: 'Soin',
      type: 'grass',
      power: 0,
      level: 1,
      isPhysical: false,
      isHeal: true,
    };

    const monsterNeutral = new Monster('1', 'Soigneur', 'grass', 1, 10, 10, 10, 10, 10, 10, [healMove]);
    monsterNeutral.currentHp = 1;
    const healNeutral = engine.applyHeal(monsterNeutral, healMove);

    const monsterCharisma = new Monster('2', 'Soigneur Charismatique', 'grass', 1, 10, 10, 10, 16, 10, 10, [healMove]);
    monsterCharisma.currentHp = 1;
    const healCharisma = engine.applyHeal(monsterCharisma, healMove);

    // Charisme 16 apporte +3 de modificateur
    expect(healCharisma - healNeutral).toBe(3);
  });
});
