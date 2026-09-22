import { BattleController } from '../core/services/BattleController';
import { BattleEngine, defaultDice } from '../core/services/BattleEngine';
import { RandomEnemyFactory } from '../infra/repositories/RandomEnemyFactory';
import { MoveRepository } from '../infra/repositories/MoveRepositories';
import { StarterCatalog } from '../infra/repositories/StarterCatalog';
import { createBattleStore, type BattleStore } from './stores/battleStore';

/**
 * Composition root (injection de dépendance manuelle) : c'est le SEUL endroit
 * où les classes concrètes sont instanciées et câblées. Le domaine (core/) et
 * l'application ne dépendent que des abstractions injectées (Dice, ports).
 */
export interface Container {
  engine: BattleEngine;
  moves: MoveRepository;
  starters: StarterCatalog;
  enemies: RandomEnemyFactory;
  controller: BattleController;
  store: BattleStore;
}

export function createContainer(): Container {
  const moves = new MoveRepository();

  // Persistance / API (infra) implémentant les ports de core/.
  const starters = new StarterCatalog(moves);
  const enemies = new RandomEnemyFactory(moves);

  // Domaine, câblé via injection de dépendance. Une SEULE instance de `Dice`
  // est partagée entre l'engine et le controller (initiative, jets, dégâts).
  const dice = defaultDice;
  const engine = new BattleEngine({ dice });
  const controller = new BattleController({ engine, moveProvider: moves, enemyFactory: enemies, dice });

  // Store Svelte — wrapper mince autour du controller.
  const store = createBattleStore(controller);

  return { engine, moves, starters, enemies, controller, store };
}

export const container = createContainer();