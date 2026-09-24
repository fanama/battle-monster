import { Monster, MonsterIO, type MonsterSnapshot } from '../entities/Monster';
import type { MonsterType, Move } from '../entities/Move';
import type { SavedChampion } from './ports';

export const MONSTER_FILE_FORMAT = 'monster-battle-champion';
export const MONSTER_FILE_VERSION = 1;

export interface MonsterExportPayload {
  format: string;
  version: number;
  exportedAt: number;
  monster: MonsterSnapshot;
  defeatedRegionName?: string;
  defeatedRegionIndex?: number;
}

const VALID_TYPES: MonsterType[] = ['fire', 'water', 'grass', 'normal', 'electric', 'rock'];

/**
 * Télécharge un monstre sous forme de fichier .json.
 */
export function downloadMonsterFile(
  target: Monster | MonsterSnapshot | SavedChampion,
  regionInfo?: { index: number; name: string }
): void {
  let snapshot: MonsterSnapshot;
  let regionName = regionInfo?.name;
  let regionIndex = regionInfo?.index;

  if ('snapshot' in target) {
    snapshot = target.snapshot;
    regionName = regionName ?? target.defeatedRegionName;
    regionIndex = regionIndex ?? target.defeatedRegionIndex;
  } else if (target instanceof Monster) {
    snapshot = MonsterIO.toSnapshot(target);
  } else {
    snapshot = target;
  }

  // Assure des PV pleins et des cooldowns à zéro pour l'export
  const cleanSnapshot: MonsterSnapshot = {
    ...snapshot,
    currentHp: target instanceof Monster ? target.maxHp : (snapshot.currentHp || 20),
    armorBonus: 0,
    moves: snapshot.moves.map(m => ({ ...m, coolDown: 0 })),
  };

  const payload: MonsterExportPayload = {
    format: MONSTER_FILE_FORMAT,
    version: MONSTER_FILE_VERSION,
    exportedAt: Date.now(),
    monster: cleanSnapshot,
    defeatedRegionName: regionName,
    defeatedRegionIndex: regionIndex,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanName = cleanSnapshot.name.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_') || 'monstre';
  const fileName = `${cleanName}-niv${cleanSnapshot.level}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valide et convertit du texte JSON en une instance de Monster prête pour le jeu.
 */
export function importMonsterFromJson(jsonString: string): {
  success: boolean;
  monster?: Monster;
  snapshot?: MonsterSnapshot;
  regionName?: string;
  regionIndex?: number;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Format JSON invalide.' };
    }

    // Supporte le format d'export officiel ou un snapshot direct
    const rawMonster = data.monster ?? (data.snapshot ? data.snapshot : data);

    if (!rawMonster || typeof rawMonster !== 'object') {
      return { success: false, error: 'Données de monstre manquantes dans le fichier.' };
    }

    const name = typeof rawMonster.name === 'string' && rawMonster.name.trim().length > 0
      ? rawMonster.name.trim()
      : 'Créature Inconnue';

    const type: MonsterType = VALID_TYPES.includes(rawMonster.type)
      ? rawMonster.type
      : 'normal';

    const level = typeof rawMonster.level === 'number' && rawMonster.level > 0
      ? Math.floor(rawMonster.level)
      : 5;

    const strength = Number(rawMonster.strength) || 10;
    const speed = Number(rawMonster.speed) || 10;
    const constitution = Number(rawMonster.constitution) || 10;
    const charisma = Number(rawMonster.charisma) || 10;
    const wisdom = Number(rawMonster.wisdom) || 10;
    const instinct = Number(rawMonster.instinct) || 10;

    let moves: Move[] = Array.isArray(rawMonster.moves)
      ? rawMonster.moves.filter((m: unknown) => m && typeof m === 'object' && typeof (m as Move).name === 'string')
      : [];

    if (moves.length === 0) {
      moves = [
        { id: `move-basic-${type}`, name: 'Frappe', power: 40, type, isPhysical: true, level: 1 }
      ];
    }

    const id = typeof rawMonster.id === 'string' && rawMonster.id.length > 0
      ? rawMonster.id
      : `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const snapshot: MonsterSnapshot = {
      id,
      name,
      type,
      level,
      strength,
      speed,
      constitution,
      charisma,
      wisdom,
      instinct,
      moves: moves.map(m => ({ ...m, coolDown: 0 })),
      spriteUrl: typeof rawMonster.spriteUrl === 'string' ? rawMonster.spriteUrl : '',
      experience: Number(rawMonster.experience) || 0,
      currentHp: 0, // sera recalculé par Monster
      rank: rawMonster.rank === 'boss' ? 'boss' : 'normal',
      armorBonus: 0,
    };

    const monster = MonsterIO.fromSnapshot(snapshot);
    monster.currentHp = monster.maxHp;

    const regionName = typeof data.defeatedRegionName === 'string'
      ? data.defeatedRegionName
      : (typeof data.defeatedRegionIndex === 'number' ? `Région ${data.defeatedRegionIndex + 1}` : 'Importé');

    const regionIndex = typeof data.defeatedRegionIndex === 'number'
      ? data.defeatedRegionIndex
      : 0;

    return {
      success: true,
      monster,
      snapshot,
      regionName,
      regionIndex,
    };
  } catch (err) {
    return {
      success: false,
      error: `Erreur lors de la lecture du fichier : ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
