import { BattleController } from '../core/services/BattleController';
import { BattleEngine, defaultDice } from '../core/services/BattleEngine';
import { RandomEnemyFactory } from '../infra/repositories/RandomEnemyFactory';
import { MoveRepository } from '../infra/repositories/MoveRepositories';
import { MonsterForge } from '../infra/repositories/MonsterForge';
import { LocalStorageRunRepository } from '../infra/repositories/LocalStorageRunRepository';
import { LocalStorageChampionRepository } from '../infra/repositories/LocalStorageChampionRepository';
import { createBattleStore, type BattleStore } from './stores/battleStore';

/**
 * Composition root (injection de dépendance manuelle) : c'est le SEUL endroit
 * où les classes concrètes sont instanciées et câblées. Le domaine (core/) et
 * l'application ne dépendent que des abstractions injectées (Dice, ports).
 */
export interface Container {
  engine: BattleEngine;
  moves: MoveRepository;
  /** Forge du champion personnalisé (type + points de destin + nom). */
  forge: MonsterForge;
  enemies: RandomEnemyFactory;
  controller: BattleController;
  saveRepo: LocalStorageRunRepository;
  championRepo: LocalStorageChampionRepository;
  store: BattleStore;
}

export function createContainer(): Container {
  const moves = new MoveRepository();

  // Persistance / API (infra) implémentant les ports de core/.
  const forge = new MonsterForge(moves);
  const enemies = new RandomEnemyFactory(moves);
  const saveRepo = new LocalStorageRunRepository();
  const championRepo = new LocalStorageChampionRepository();

  // Domaine, câblé via injection de dépendance. Une SEULE instance de `Dice`
  // est partagée entre l'engine et le controller (initiative, jets, dégâts).
  const dice = defaultDice;
  const engine = new BattleEngine({ dice });
  const controller = new BattleController({ engine, moveProvider: moves, enemyFactory: enemies, dice });

  // Store Svelte — wrapper mince autour du controller (+ persistance).
  const store = createBattleStore(controller, saveRepo, championRepo);

  return { engine, moves, forge, enemies, controller, saveRepo, championRepo, store };
}

export const container = createContainer();