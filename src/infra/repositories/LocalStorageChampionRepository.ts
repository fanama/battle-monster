import { MonsterIO, type Monster } from '../../core/entities/Monster';
import type { ChampionRepository, SavedChampion } from '../../core/services/ports';

const CHAMPIONS_STORAGE_KEY = 'monster-battle-champions';
const MAX_SAVED_CHAMPIONS = 20;

export class LocalStorageChampionRepository implements ChampionRepository {
  list(): SavedChampion[] {
    try {
      const raw = localStorage.getItem(CHAMPIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (c): c is SavedChampion =>
          typeof c?.id === 'string' &&
          typeof c?.name === 'string' &&
          typeof c?.level === 'number' &&
          typeof c?.type === 'string' &&
          typeof c?.defeatedRegionIndex === 'number' &&
          c?.snapshot &&
          typeof c.snapshot.id === 'string' &&
          Array.isArray(c.snapshot.moves)
      );
    } catch {
      return [];
    }
  }

  saveChampion(monster: Monster, defeatedRegionIndex: number, defeatedRegionName: string): void {
    try {
      const champions = this.list();
      const snapshot = MonsterIO.toSnapshot(monster);

      // Le champion sauvegardé est prêt pour une nouvelle partie : PV pleins, armure de base
      snapshot.currentHp = monster.maxHp;
      snapshot.armorBonus = 0;
      snapshot.moves.forEach(m => (m.coolDown = 0));

      const entry: SavedChampion = {
        id: monster.id,
        name: monster.name,
        type: monster.type,
        level: monster.level,
        savedAt: Date.now(),
        defeatedRegionIndex,
        defeatedRegionName,
        snapshot,
      };

      const existingIndex = champions.findIndex(c => c.id === monster.id || c.name.toLowerCase() === monster.name.toLowerCase());
      if (existingIndex >= 0) {
        // Met à jour le champion existant
        champions[existingIndex] = entry;
      } else {
        champions.unshift(entry);
      }

      const trimmed = champions.slice(0, MAX_SAVED_CHAMPIONS);
      localStorage.setItem(CHAMPIONS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Quota / mode privé / indisponibilité de localStorage ignorés
    }
  }

  remove(id: string): void {
    try {
      const champions = this.list().filter(c => c.id !== id);
      localStorage.setItem(CHAMPIONS_STORAGE_KEY, JSON.stringify(champions));
    } catch {
      // Erreurs silencieuses
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(CHAMPIONS_STORAGE_KEY);
    } catch {
      // Erreurs silencieuses
    }
  }
}
