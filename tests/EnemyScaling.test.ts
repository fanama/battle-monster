import { describe, expect, test } from 'bun:test';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import { RandomEnemyFactory } from '../src/infra/repositories/RandomEnemyFactory';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { Monster } from '../src/core/entities/Monster';
import { REGIONS } from '../src/core/entities/Region';
import type { RunState } from '../src/core/entities/BattleState';

describe('Scaling des ennemis sur le joueur', () => {
  const moveProvider = new MoveRepository();
  const enemyFactory = new RandomEnemyFactory(moveProvider);
  const engine = new BattleEngine();

  test('Les ennemis sauvages adaptent leur niveau à celui du joueur, borné par la région', () => {
    // Région 0 : Forêt Émeraude (niveaux 1 à 4)
    const controller = new BattleController({
      engine,
      moveProvider,
      enemyFactory,
      random: () => 0.5, // Tire l'offset 0 dans [-1, 0, 1]
    });

    const runRegion0: RunState = {
      regionIndex: 0,
      map: { layers: [], totalLayers: 0, currentLayerIndex: 0 },
      currentLayer: 0,
      currentPosition: null,
      currentNode: null,
      inventory: [],
      score: 0,
      gold: 50,
      relics: [],
      relicOffers: null,
      phase: 'encounter',
      shopStock: null,
    };

    // Joueur niveau 2 dans Région 0 (1-4) => ennemi niveau 2
    const playerLv2 = new Monster('p1', 'Player', 'fire', 2, 10, 10, 10, 10, 10, 10, []);
    const combatLv2 = controller.enterWildCombat(playerLv2, runRegion0);
    expect(combatLv2.enemyMonster.level).toBe(2);

    // Joueur sous-niveau (ex: niveau 1 dans région 2 minLevel 6, maxLevel 9)
    const runRegion2: RunState = { ...runRegion0, regionIndex: 2 };
    const playerLowInRegion2 = new Monster('p2', 'Player', 'fire', 1, 10, 10, 10, 10, 10, 10, []);
    const combatLow = controller.enterWildCombat(playerLowInRegion2, runRegion2);
    // Borné au minLevel de la région (6)
    expect(combatLow.enemyMonster.level).toBe(REGIONS[2].minLevel);

    // Joueur sur-élevé (ex: niveau 10 dans région 0 minLevel 1, maxLevel 4)
    const playerHighInRegion0 = new Monster('p3', 'Player', 'fire', 10, 10, 10, 10, 10, 10, 10, []);
    const combatHigh = controller.enterWildCombat(playerHighInRegion0, runRegion0);
    // Borné au maxLevel de la région (4)
    expect(combatHigh.enemyMonster.level).toBe(REGIONS[0].maxLevel);
  });

  test('Le boss de région s\'adapte au niveau du joueur (niveau joueur + 1, borné par maxLevel + 1)', () => {
    const controller = new BattleController({
      engine,
      moveProvider,
      enemyFactory,
      random: () => 0.5,
    });

    const runRegion0: RunState = {
      regionIndex: 0,
      map: { layers: [], totalLayers: 0, currentLayerIndex: 0 },
      currentLayer: 0,
      currentPosition: null,
      currentNode: null,
      inventory: [],
      score: 0,
      gold: 50,
      relics: [],
      relicOffers: null,
      phase: 'encounter',
      shopStock: null,
    };

    // Joueur niveau 3 en région 0 (1-4, boss max 5) => boss niveau 4
    const playerLv3 = new Monster('p1', 'Player', 'fire', 3, 10, 10, 10, 10, 10, 10, []);
    const bossFight1 = controller.enterBossCombat(playerLv3, runRegion0);
    expect(bossFight1.enemyMonster.level).toBe(4);
    expect(bossFight1.enemyMonster.rank).toBe('boss');

    // Joueur niveau 8 en région 0 => boss borné à maxLevel + 1 (5)
    const playerLv8 = new Monster('p2', 'Player', 'fire', 8, 10, 10, 10, 10, 10, 10, []);
    const bossFight2 = controller.enterBossCombat(playerLv8, runRegion0);
    expect(bossFight2.enemyMonster.level).toBe(REGIONS[0].maxLevel + 1);
  });

  test('RandomEnemyFactory applique le multiplicateur de statistiques proportionnel au niveau', () => {
    const factory = new RandomEnemyFactory(moveProvider, () => 0.5); // stats de base fixes
    const enemyLv1 = factory.createRandomEnemy(1);
    const enemyLv5 = factory.createRandomEnemy(5);

    // Au niveau 5, statMultiplier = 1 + (5 - 1) * 0.15 = 1.6
    // Les stats de l'ennemi niveau 5 doivent être significativement supérieures
    expect(enemyLv5.strength).toBeGreaterThan(enemyLv1.strength);
    expect(enemyLv5.constitution).toBeGreaterThan(enemyLv1.constitution);
    expect(enemyLv5.maxHp).toBeGreaterThan(enemyLv1.maxHp);
  });
});
