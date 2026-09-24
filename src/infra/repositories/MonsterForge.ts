import type { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import {
  CREATION_LEVEL,
  draftStats,
  sanitizeName,
  type MonsterDraft,
} from '../../core/entities/MonsterCreation';
import type { MoveProvider } from '../../core/services/ports';
import { MoveRepository } from './MoveRepositories';
import { createMonsterFromDefinition, type MonsterDefinition } from './monsterFactory';

/**
 * Forge le champion du joueur à partir de son brouillon de création
 * (type + points de destin + nom). Remplace l'ancien `StarterCatalog` : plus de
 * quintet figé, le monstre est entièrement défini par le joueur.
 *
 * Dépendances injectées : `MoveProvider` (moves éligibles) et `random`
 * (tirage des moves + identifiant), pour des tests déterministes.
 */
export class MonsterForge {
  private readonly moveProvider: MoveProvider;
  private readonly random: () => number;

  constructor(moveProvider?: MoveProvider, random: () => number = Math.random) {
    this.moveProvider = moveProvider ?? new MoveRepository();
    this.random = random;
  }

  /** Construit le `Monster` décrit par le brouillon (niveau de départ fixe). */
  create(draft: MonsterDraft): Monster {
    const stats = draftStats(draft);
    const definition: MonsterDefinition = {
      id: this.nextId(),
      name: sanitizeName(draft.name),
      type: draft.type,
      level: CREATION_LEVEL,
      stats,
    };
    return createMonsterFromDefinition(definition, this.moveProvider, this.random);
  }

  /**
   * Aperçu des moves que le champion connaîtra pour un type donné — sert à
   * l'écran de création (le tirage réel a lieu dans `create`).
   */
  previewMoves(type: MonsterType) {
    return this.moveProvider.getMovesForMonster({ type, level: CREATION_LEVEL });
  }

  private nextId(): string {
    return `champion-${Math.floor(this.random() * 1e9).toString(36)}`;
  }
}
