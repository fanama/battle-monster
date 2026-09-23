import type { Monster } from '../entities/Monster';
import type { MonsterType, Move } from '../entities/Move';
import type { MonsterSnapshot } from '../entities/Monster';
import type { RunState } from '../entities/BattleState';

/**
 * Contrats (ports) que l'application (= le domaine) consomme et que la couche
 * infrastructure implémente. Le contrôleur dépend de ces abstractions, pas des
 * classes concrètes : c'est une injection de dépendance orientée interface.
 */

/** Donne accès aux mouvements qu'un monstre peut apprendre. Impl. : MoveRepository. */
export interface MoveProvider {
  getMovesForMonster(monster: Pick<Monster, 'type' | 'level'>): Move[];
}

/** Crée les ennemis (sauvages et boss de région). Impl. : RandomEnemyFactory. */
export interface EnemyFactory {
  createRandomEnemy(level: number, opts?: { type?: MonsterType; name?: string }): Monster;
  createBoss(level: number, type: MonsterType, name: string): Monster;
}

/** Version du format de sauvegarde — un décalage = sauvegarde invalide. */
export const SAVE_VERSION = 3;

/** Sauvegarde JSON-safe d'une partie (menu titre → « Continuer »). */
export interface RunSave {
  version: number;
  savedAt: number;
  playerMonster: MonsterSnapshot;
  run: RunState;
}

/** Persistance de la progression. Impl. : LocalStorageRunRepository. */
export interface SaveRepository {
  save(save: RunSave): void;
  load(): RunSave | null;
  clear(): void;
}