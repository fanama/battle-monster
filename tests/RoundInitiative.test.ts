import { describe, expect, test } from 'bun:test';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

describe("Ordre d'attaque du round (jets d'initiative)", () => {
  const tackle: Move = {
    id: 'tackle',
    name: 'Charge',
    type: 'normal',
    power: 40,
    level: 1,
    isPhysical: true,
  };

  /** Dés scriptés : chaque appel renvoie le tirage suivant. */
  const sequenceDice = (rolls: number[]): Dice => {
    let i = 0;
    return { roll: () => (i < rolls.length ? rolls[i++] : 1) };
  };

  const makeController = (dice: Dice): BattleController =>
    new BattleController({
      engine: new BattleEngine({ dice }),
      moveProvider: { getMovesForMonster: () => [] as Move[] } as MoveProvider,
      enemyFactory: {
        createRandomEnemy: () => {
          throw new Error('unused in this test');
        },
        createBoss: () => {
          throw new Error('unused in this test');
        },
      } as EnemyFactory,
      dice,
    });

  // Vitesse 14 → mod +2 pour le joueur, 10 → +0 pour l'ennemi.
  const player = () =>
    new Monster('p', 'Héro', 'normal', 1, 14, 14, 10, 10, 10, 10, [tackle]);
  const enemy = () =>
    new Monster('e', 'Sloub', 'normal', 1, 30, 10, 10, 10, 10, 10, [tackle]);

  test("Le plan de round suit l'ordre des jets d'initiative (joueur d'abord)", () => {
    const controller = makeController(sequenceDice([15, 8]));
    const plan = controller.beginRound({ player: player(), enemy: enemy() });

    expect(plan.playerInitiative).toBe(15 + 2); // 1d20 + mod(VIT 14)
    expect(plan.enemyInitiative).toBe(8 + 0);
    expect(plan.playerFirst).toBe(true);
    expect(plan.healFirst).toBe(false);
    // Le journal sépare le jet d'initiative de l'ordre effectif retenu.
    expect(plan.logs[0]).toContain('Héro en tête à l');
    expect(plan.logs[plan.logs.length - 1]).toContain('Héro agit en premier');
  });

  test("Le plan de round suit l'ordre des jets d'initiative (ennemi d'abord)", () => {
    const controller = makeController(sequenceDice([3, 18]));
    const plan = controller.beginRound({ player: player(), enemy: enemy() });

    expect(plan.playerInitiative).toBe(3 + 2);
    expect(plan.enemyInitiative).toBe(18 + 0);
    expect(plan.playerFirst).toBe(false);
    expect(plan.healFirst).toBe(false);
    expect(plan.logs[0]).toContain('Sloub en tête à l');
    expect(plan.logs[plan.logs.length - 1]).toContain('Sloub agit en premier');
  });

  test('La riposte est annulée : si le premier acteur met la cible K.O., le second tour ne se joue pas', () => {
    // Jets : initiative 3 vs 18 (ennemi d'abord), puis attaque 12 et dé 8.
    const controller = makeController(sequenceDice([3, 18, 12, 8]));
    const hero = player();
    const plan = controller.beginRound({ player: hero, enemy: enemy() });
    expect(plan.playerFirst).toBe(false);

    // Héros à bout de course : un seul coup suffit. La réserve est baissée
    // explicitement plutôt que d'être fixée par la réserve max — ce test porte
    // sur l'annulation de la riposte, pas sur l'échelle de PV.
    hero.currentHp = 10;

    // 1er tour : l'ennemi frappe (12 + 0 + 5 précision = 17 ≥ CA 12),
    // dégâts 8 + 4 + 10 (FOR 30) + 2 = 24 ≥ 10 PV restants.
    const enemyAction = controller.playTurn({
      attacker: enemy(),
      defender: hero,
      move: tackle,
      attackerSide: 'enemy',
    });

    expect(hero.isFainted()).toBe(true);
    expect(enemyAction.winner).toBe('enemy');
    // Un vainqueur désigné ⇒ le store n'exécute pas le tour suivant.
    expect(enemyAction.winner).not.toBeNull();
  });
});
