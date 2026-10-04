import { describe, expect, test } from 'bun:test';
import { Monster } from '../src/core/entities/Monster';

/**
 * Rejeu d'un champion enregistré : le champion est gravé tel qu'il était en
 * fin de région, mais le run repart du niveau 1.
 */
const strike: any = {
  id: 'tackle',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

/** Monstre ayant monté jusqu’au niveau demandé, comme en fin de run. */
function leveledMonster(targetLevel: number): Monster {
  const m = new Monster('c1', 'Vétéran', 'fire', 1, 12, 12, 12, 12, 12, 12, [strike]);
  // On donne juste ce qu'il faut pour franchir chaque palier, afin de ne pas
  // déborder sur le niveau suivant.
  while (m.level < targetLevel) {
    m.gainExperience(m.experienceToNextLevel);
  }
  return m;
}

describe('Rejeu d’un champion : niveau remis à 1', () => {
  test('le niveau revient à 1 et l’XP repart de zéro', () => {
    const m = leveledMonster(10);
    expect(m.level).toBe(10);

    m.resetLevelTo(1);

    expect(m.level).toBe(1);
    expect(m.experience).toBe(0);
  });

  test('le seuil d’XP est recalculé sur le nouveau niveau', () => {
    const m = leveledMonster(10);
    m.resetLevelTo(1);
    // Formule du domaine : floor(80 × niveau − 40).
    expect(m.experienceToNextLevel).toBe(40);
  });

  test('les caractéristiques de fin de run sont conservées', () => {
    const m = leveledMonster(10);
    const stats = {
      strength: m.strength,
      speed: m.speed,
      constitution: m.constitution,
      wisdom: m.wisdom,
      charisma: m.charisma,
      instinct: m.instinct,
    };

    m.resetLevelTo(1);

    expect(m.strength).toBe(stats.strength);
    expect(m.speed).toBe(stats.speed);
    expect(m.constitution).toBe(stats.constitution);
    expect(m.wisdom).toBe(stats.wisdom);
    expect(m.charisma).toBe(stats.charisma);
    expect(m.instinct).toBe(stats.instinct);
  });

  test('les PV sont réétendus sur la base du niveau 1', () => {
    const m = leveledMonster(10);
    m.currentHp = 1;
    const maxHpAtTen = m.maxHp;

    m.resetLevelTo(1);

    // Le pool de PV dépend du niveau : il diminue, et le monstre est rétabli.
    expect(m.maxHp).toBeLessThan(maxHpAtTen);
    expect(m.currentHp).toBe(m.maxHp);
    expect(m.maxHp).toBeGreaterThan(0);
  });

  test('un niveau inférieur à 1 est ramené à 1 (plancher)', () => {
    const m = leveledMonster(8);
    m.resetLevelTo(0);
    expect(m.level).toBe(1);
    m.resetLevelTo(-5);
    expect(m.level).toBe(1);
  });

  test('le monstre peut de nouveau monter normalement après le reset', () => {
    const m = leveledMonster(10);
    m.resetLevelTo(1);
    m.gainExperience(50); // > 40 : déclenche une montée

    expect(m.level).toBeGreaterThan(1);
  });
});