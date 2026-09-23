import { SAVE_VERSION, type RunSave, type SaveRepository } from '../../core/services/ports';

const STORAGE_KEY = 'monster-battle-save';

/**
 * Implémentation `localStorage` du port SaveRepository (persistance de la run).
 * Tolérante aux erreurs (mode privé, quota, absence de localStorage en SSR) :
 * tous les appels sont isolés dans des try/catch.
 */
export class LocalStorageRunRepository implements SaveRepository {
  save(save: RunSave): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // Quota / mode privé / environnement sans DOM : on ignore silencieusement.
    }
  }

  load(): RunSave | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RunSave;
      if (
        parsed?.version === SAVE_VERSION
        && parsed?.playerMonster
        && parsed?.run
      ) {
        return parsed;
      }
      // Sauvegarde d'un ancien format : incompatible, on la purge.
      this.clear();
      return null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Même philosophie : aucune erreur ne doit remonter à l'UI.
    }
  }
}

export function createLocalStorageRunRepository(): LocalStorageRunRepository {
  return new LocalStorageRunRepository();
}