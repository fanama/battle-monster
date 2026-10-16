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
  /**
   * `statScale` module le budget de caractéristiques de l'ennemi (< 1 = plus
   * faible) : c'est le levier de difficulté d'une région (`RegionDef.threat`).
   */
  createRandomEnemy(
    level: number,
    opts?: { type?: MonsterType; name?: string; statScale?: number },
  ): Monster;
  createBoss(level: number, type: MonsterType, name: string, statScale?: number): Monster;
}

/**
 * Version du format de sauvegarde — un décalage = sauvegarde invalide.
 *
 * v4 (courbe d'EXP RPG Maker) : `Monster.experience` est désormais une EXP
 * **cumulée** (et non plus un reliquat de palier). Les sauvegardes v3 portent
 * un reliquat qui serait relu comme un total : on les invalide plutôt que de
 * reprendre avec une barre d'EXP fausse. La progression méta (types débloqués,
 * Panthéon) vit dans son propre stockage, elle n'est pas affectée.
 */
export const SAVE_VERSION = 4;

/** Sauvegarde JSON-safe d'une partie (menu titre → « Continuer »). */
export interface RunSave {
  version: number;
  savedAt: number;
  playerMonster: MonsterSnapshot;
  enemyMonster?: MonsterSnapshot;
  run: RunState;
}

/** Persistance de la progression. Impl. : LocalStorageRunRepository. */
export interface SaveRepository {
  save(save: RunSave): void;
  load(): RunSave | null;
  clear(): void;
}

/** Champion ayant vaincu au moins un boss de région, sauvegardé pour de nouvelles parties. */
export interface SavedChampion {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  savedAt: number;
  defeatedRegionIndex: number;
  defeatedRegionName: string;
  snapshot: MonsterSnapshot;
}

/** Persistance du Panthéon des champions. Impl. : LocalStorageChampionRepository. */
export interface ChampionRepository {
  list(): SavedChampion[];
  saveChampion(monster: Monster, defeatedRegionIndex: number, defeatedRegionName: string): void;
  remove(id: string): void;
  clear(): void;
}

/**
 * Progression **persistante du joueur**, au-delà de la run en cours.
 * Impl. : LocalStorageProgressionRepository.
 *
 * Aujourd'hui : les **éléments débloqués**. Un nouveau champion naît Normal ;
 * chaque boss de région battu révèle un élément (`RegionDef.unlocks`), défini-
 * tivement disponible à la création des champions suivants.
 */
export interface ProgressionRepository {
  /** Éléments jouables pour un nouveau champion (contient toujours `normal`). */
  getUnlockedTypes(): MonsterType[];
  /**
   * Débloque les éléments demandés. Retourne **ceux réellement nouveaux**
   * (un élément déjà débloqué n'est pas re-signalé — pas de double annonce).
   */
  unlockTypes(types: readonly MonsterType[]): MonsterType[];
}