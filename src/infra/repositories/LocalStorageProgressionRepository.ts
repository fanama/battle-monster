import { ALL_MONSTER_TYPES, DEFAULT_CHAMPION_TYPE } from '../../core/entities/MonsterCreation';
import type { MonsterType } from '../../core/entities/Move';
import type { ProgressionRepository } from '../../core/services/ports';

/** Clé de stockage : un objet `{ unlockedTypes: MonsterType[] }`. */
const PROGRESSION_STORAGE_KEY = 'monster-battle-progression';

/**
 * Progression persistante du joueur (localStorage) : les **éléments débloqués**
 * en battant les boss de région.
 *
 * Le type `normal` (défaut de tout nouveau champion) est toujours considéré
 * comme débloqué : il n'a pas besoin d'être stocké ni annoncé. Les entrées
 * inconnues ou corrompues sont ignorées silencieusement (mode privé, quota,
 * données d'une version antérieure) — le jeu retombe alors sur « Normal seul ».
 */
export class LocalStorageProgressionRepository implements ProgressionRepository {
  getUnlockedTypes(): MonsterType[] {
    const unlocked = new Set<MonsterType>([DEFAULT_CHAMPION_TYPE]);
    try {
      const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY);
      if (!raw) return [...unlocked];
      const parsed = JSON.parse(raw);
      const list = parsed?.unlockedTypes;
      if (Array.isArray(list)) {
        for (const type of list) {
          if (ALL_MONSTER_TYPES.includes(type)) unlocked.add(type);
        }
      }
    } catch {
      // Lecture impossible → on retombe sur le défaut (Normal seul).
    }
    return [...unlocked];
  }

  unlockTypes(types: readonly MonsterType[]): MonsterType[] {
    const current = new Set(this.getUnlockedTypes());
    const newlyUnlocked: MonsterType[] = [];
    for (const type of types) {
      if (ALL_MONSTER_TYPES.includes(type) && !current.has(type)) {
        current.add(type);
        newlyUnlocked.push(type);
      }
    }
    if (newlyUnlocked.length > 0) {
      try {
        localStorage.setItem(
          PROGRESSION_STORAGE_KEY,
          JSON.stringify({ unlockedTypes: [...current] }),
        );
      } catch {
        // Écriture impossible (quota / mode privé) : la progression ne survit
        // pas à la session, mais la partie en cours reste jouable.
      }
    }
    return newlyUnlocked;
  }

  /** Réinitialise la progression (menu / tests). */
  clear(): void {
    try {
      localStorage.removeItem(PROGRESSION_STORAGE_KEY);
    } catch {
      // Silencieux.
    }
  }
}
