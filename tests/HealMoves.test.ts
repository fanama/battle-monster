import { describe, expect, test } from 'bun:test';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';

/** Un soin de base : même règle D&D que les sorts du dépôt, `power` à 0. */
function healMove(overrides: Partial<Move> = {}): Move {
  return {
    id: 'heal',
    name: 'Soin',
    type: 'grass',
    power: 0,
    level: 1,
    isPhysical: false,
    isHeal: true,
    ...overrides,
  };
}

describe('Graduation des sorts de soin (healPower)', () => {
  test('applyHeal ajoute healPower au jet de base', () => {
    // Le stub renvoie 4 en ignorant le nombre de dés : le jet de base vaut 4.
    const dice: Dice = { roll: () => 4 };
    const engine = new BattleEngine({ dice });

    // Niveau 1 → 2d4 ; stats à 10 → tous les modificateurs à 0.
    const base = new Monster('1', 'Base', 'grass', 1, 10, 10, 10, 10, 10, 10, []);
    base.currentHp = 1;
    const withBonus = new Monster('2', 'Bonus', 'grass', 1, 10, 10, 10, 10, 10, 10, []);
    withBonus.currentHp = 1;

    const healBase = engine.applyHeal(base, healMove());
    const healBonus = engine.applyHeal(withBonus, healMove({ healPower: 12 }));

    expect(healBase).toBe(4); // jet de base + modificateurs nuls
    expect(healBonus).toBe(16); // 4 + 12
  });

  test('Les trois soins du dépôt sont désormais distincts et croissants', () => {
    const repo = new MoveRepository();
    const meditation = repo.getMovesForMonster({ type: 'normal', level: 10 })
      .find((m) => m.id === 'normal-heal');
    const cascade = repo.getMovesForMonster({ type: 'water', level: 10 })
      .find((m) => m.id === 'water-cascade');
    const synthese = repo.getMovesForMonster({ type: 'grass', level: 10 })
      .find((m) => m.id === 'grass-synthesis');

    expect(meditation?.healPower).toBe(0);
    expect(cascade?.healPower).toBe(10);
    expect(synthese?.healPower).toBe(15);
  });

  test('Tous les soins du dépôt gardent power: 0 (jamais résolus comme une attaque)', () => {
    const repo = new MoveRepository();
    const heals = repo
      .getMovesForMonster({ type: 'grass', level: 20 })
      .filter((m) => m.isHeal)
      .concat(repo.getMovesForMonster({ type: 'water', level: 20 }).filter((m) => m.isHeal))
      .concat(repo.getMovesForMonster({ type: 'normal', level: 20 }).filter((m) => m.isHeal));

    expect(heals.length).toBeGreaterThan(0);
    for (const heal of heals) {
      expect(heal.power).toBe(0);
    }
  });

  test('executeTurn : un soin n\'inflige AUCUN dégât à l\'adversaire', () => {
    // Dé figé à 20 : sans cette garantie, un `power > 0` déclencherait un
    // jet d'attaque et le soin frapperait aussi la cible.
    const dice: Dice = { roll: () => 20 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Soigneur', 'grass', 1, 10, 10, 10, 10, 10, 10, []);
    const defender = new Monster('d', 'Cible', 'normal', 1, 10, 10, 10, 10, 10, 10, []);
    attacker.currentHp = 1;

    const heal = healMove({ healPower: 20 });
    attacker.learnMove(heal);

    const defenderHpBefore = defender.currentHp;
    engine.executeTurn(attacker, defender, heal);

    expect(defender.currentHp).toBe(defenderHpBefore);
    expect(attacker.currentHp).toBeGreaterThan(1);
  });

  test('executeTurn : un soin ne peut pas être bloqué par un fumble (dé = 1)', () => {
    const dice: Dice = { roll: () => 1 };
    const engine = new BattleEngine({ dice });

    const attacker = new Monster('a', 'Soigneur', 'grass', 1, 10, 10, 10, 10, 10, 10, []);
    const defender = new Monster('d', 'Cible', 'normal', 1, 10, 10, 10, 10, 10, 10, []);
    attacker.currentHp = 1;

    const heal = healMove({ healPower: 5 });
    attacker.learnMove(heal);
    engine.executeTurn(attacker, defender, heal);

    expect(attacker.currentHp).toBeGreaterThan(1);
  });
});