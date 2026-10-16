import { describe, expect, test } from 'bun:test';
import { BattleStore } from '../src/lib/stores/battleStore';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { Monster } from '../src/core/entities/Monster';
import { EQUIPMENT_CATALOG } from '../src/core/entities/Equipment';
import { REGIONS } from '../src/core/entities/Region';
import {
  ALL_MONSTER_TYPES,
  DEFAULT_CHAMPION_TYPE,
  createDraft,
  isTypeUnlocked,
} from '../src/core/entities/MonsterCreation';
import { LocalStorageProgressionRepository } from '../src/infra/repositories/LocalStorageProgressionRepository';
import type { ProgressionRepository } from '../src/core/services/ports';
import type { BattleState, RunState } from '../src/core/entities/BattleState';
import type { MonsterType } from '../src/core/entities/Move';

/**
 * Déblocage des éléments : un nouveau champion naît **Normal** ; battre un boss
 * de région révèle son élément (persistant), et le champion en cours peut
 * l'adopter en fin de région.
 */

const strike: any = {
  id: 't',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

const dice: Dice = { roll: () => 10 };

function freshRun(over: Partial<RunState> = {}): RunState {
  return {
    phase: 'regionClear',
    regionIndex: 0,
    map: null,
    mapLayer: 0,
    path: [],
    gold: 0,
    shopStock: null,
    bossBattle: false,
    relics: [],
    score: 0,
    relicOffers: null,
    equipOffers: null,
    inventory: [],
    equipmentBag: [],
    unlockedThisRegion: [],
    ...over,
  } as unknown as RunState;
}

function makeController(): BattleController {
  return new BattleController({
    engine: new BattleEngine({ dice }),
    moveProvider: new MoveRepository(),
    enemyFactory: {} as never,
    dice,
    random: () => 0.3,
  });
}

// ---------------------------------------------------------------------------
// 1. Domaine : carte de déblocage + défaut Normal
// ---------------------------------------------------------------------------

describe('Déblocage des éléments — carte des régions', () => {
  test('chaque élément non-normal est révélé par exactement une région', () => {
    const revealed = REGIONS.flatMap((r) => r.unlocks);
    expect(new Set(revealed).size).toBe(revealed.length); // aucun doublon
    expect(revealed).not.toContain(DEFAULT_CHAMPION_TYPE); // Normal est le défaut
    const all = new Set([DEFAULT_CHAMPION_TYPE, ...revealed]);
    for (const type of ALL_MONSTER_TYPES) {
      expect(all.has(type), `${type} jamais débloqué`).toBe(true);
    }
  });

  test('la dernière région (boss neutre) révèle les deux derniers éléments', () => {
    const last = REGIONS[REGIONS.length - 1]!;
    expect(last.bossType).toBe('normal');
    expect([...last.unlocks].sort()).toEqual(['electric', 'rock']);
  });

  test('Normal est toujours disponible ; les autres exigent un déblocage', () => {
    expect(isTypeUnlocked('normal', [])).toBe(true);
    expect(isTypeUnlocked('fire', [])).toBe(false);
    expect(isTypeUnlocked('fire', ['fire'])).toBe(true);
  });

  test('un brouillon neuf part sur Normal', () => {
    expect(createDraft().type).toBe('normal');
  });
});

// ---------------------------------------------------------------------------
// 2. Persistance : LocalStorageProgressionRepository
// ---------------------------------------------------------------------------

describe('Progression persistante (localStorage)', () => {
  // Mock de localStorage (Bun n'en garantit pas dans le runner de tests).
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
    },
  });

  test('défaut : Normal seul ; les déblocages s\'accumulent sans doublon', () => {
    const repo = new LocalStorageProgressionRepository();
    repo.clear();
    expect(repo.getUnlockedTypes()).toEqual(['normal']);

    expect(repo.unlockTypes(['grass'])).toEqual(['grass']);
    // Re-battre le même boss ne ré-annonce rien.
    expect(repo.unlockTypes(['grass'])).toEqual([]);
    expect(repo.getUnlockedTypes()).toContain('grass');
    expect(repo.getUnlockedTypes()).toContain('normal');

    expect(repo.unlockTypes(['electric', 'rock'])).toEqual(['electric', 'rock']);
    expect(new Set(repo.getUnlockedTypes())).toEqual(
      new Set(['normal', 'grass', 'electric', 'rock']),
    );
  });

  test('les entrées inconnues / corrompues sont ignorées', () => {
    const repo = new LocalStorageProgressionRepository();
    repo.clear();
    localStorage.setItem('monster-battle-progression', JSON.stringify({ unlockedTypes: ['grass', 'nope', 42] }));
    expect(repo.getUnlockedTypes()).toEqual(['normal', 'grass']);
  });
});

// ---------------------------------------------------------------------------
// 3. Reforge du champion (adoption mi-run)
// ---------------------------------------------------------------------------

describe('BattleController.retypeChampion — adoption d’un élément', () => {
  test('change le type et reconstruit le panel, sans rien perdre d’autre', () => {
    const ctrl = makeController();
    const player = new Monster('p', 'Héro', 'grass', 6, 16, 14, 15, 10, 12, 12, [strike]);
    player.equip(EQUIPMENT_CATALOG.find((p) => p.id === 'eq-plate-armor')!);
    player.experience = 42;
    player.takeDamage(5);

    const stats = {
      strength: player.strength,
      speed: player.speed,
      constitution: player.constitution,
      wisdom: player.wisdom,
      charisma: player.charisma,
      instinct: player.instinct,
    };
    const hp = player.currentHp;
    const armor = player.armorBonus;

    const retyped = ctrl.retypeChampion(player, 'fire');

    expect(retyped.type).toBe('fire');
    expect(retyped).not.toBe(player);
    // Statistiques, PV, armure, expérience et équipement conservés.
    expect(retyped.strength).toBe(stats.strength);
    expect(retyped.speed).toBe(stats.speed);
    expect(retyped.constitution).toBe(stats.constitution);
    expect(retyped.wisdom).toBe(stats.wisdom);
    expect(retyped.charisma).toBe(stats.charisma);
    expect(retyped.instinct).toBe(stats.instinct);
    expect(retyped.maxHp).toBe(player.maxHp);
    expect(retyped.currentHp).toBe(hp);
    expect(retyped.armorBonus).toBe(armor);
    expect(retyped.experience).toBe(42);
    expect(retyped.equipped.armor?.id).toBe('eq-plate-armor');
    // Panel reconstruit : capacités du nouveau type **et** socle `normal`
    // partagé par tous les types (`getMovesForMonster`), mais plus rien de
    // l'ancien type.
    expect(retyped.moves.length).toBeGreaterThan(0);
    expect(retyped.moves.length).toBeLessThanOrEqual(4);
    for (const move of retyped.moves) {
      expect(['fire', 'normal']).toContain(move.type);
    }
    expect(retyped.moves.some((m) => m.type === 'fire')).toBe(true);
    expect(retyped.moves.some((m) => m.type === 'grass')).toBe(false);
  });

  test('adopter son propre type renvoie le monstre inchangé', () => {
    const ctrl = makeController();
    const player = new Monster('p', 'Héro', 'grass', 6, 16, 14, 15, 10, 12, 12, [strike]);
    expect(ctrl.retypeChampion(player, 'grass')).toBe(player);
  });
});

// ---------------------------------------------------------------------------
// 4. Store : déblocage au boss + action d'adoption
// ---------------------------------------------------------------------------

function buildStore(progression: ProgressionRepository): {
  store: BattleStore;
  internals: {
    _onPlayerWin: (s: BattleState) => BattleState;
  };
  read: () => BattleState;
} {
  const controller = makeController();
  const store = new BattleStore(
    controller,
    { load: () => null, save: () => {}, clear: () => {} } as never,
    { list: () => [], saveChampion: () => {} } as never,
    progression,
  );
  let state!: BattleState;
  (store as unknown as { subscribe: (fn: (s: BattleState) => void) => void }).subscribe(
    (s) => (state = s),
  );
  return {
    store,
    internals: store as unknown as { _onPlayerWin: (s: BattleState) => BattleState },
    read: () => state,
  };
}

/** Progression en mémoire, déterministe. */
function memoryProgression(initial: MonsterType[] = ['normal']): ProgressionRepository {
  const set = new Set<MonsterType>(initial);
  return {
    getUnlockedTypes: () => [...set],
    unlockTypes: (types) => {
      const newly: MonsterType[] = [];
      for (const t of types) {
        if (!set.has(t)) {
          set.add(t);
          newly.push(t);
        }
      }
      return newly;
    },
  };
}

describe('Store — le boss révèle un élément, le champion peut l’adopter', () => {
  test('victoire de boss : élément persistant + fenêtre d’adoption ouverte', () => {
    const progression = memoryProgression();
    const { internals } = buildStore(progression);
    const boss = new Monster('b', 'Gardien', 'grass', 6, 14, 14, 14, 14, 14, 14, [strike]);
    boss.rank = 'boss';

    const state = {
      playerMonster: new Monster('p', 'Héro', 'normal', 6, 14, 14, 14, 10, 12, 12, [strike]),
      enemyMonster: boss,
      isBossFight: true,
      logs: [],
      run: freshRun({ phase: 'encounter', bossBattle: true, regionIndex: 0 }),
    } as unknown as BattleState;

    const next = internals._onPlayerWin(state);

    expect(progression.getUnlockedTypes()).toContain('grass');
    expect(next.run.unlockedThisRegion).toEqual(['grass']);
    expect(next.logs.join('\n')).toContain('Élément révélé');
  });

  test('adopter un élément révélé change le type du champion en cours', () => {
    const { store, read } = buildStore(memoryProgression());
    const player = new Monster('p', 'Héro', 'normal', 6, 16, 14, 15, 10, 12, 12, [strike]);
    (store as unknown as { store: { set: (s: BattleState) => void } }).store.set({
      playerMonster: player,
      enemyMonster: null,
      logs: [],
      run: freshRun({ phase: 'regionClear', unlockedThisRegion: ['grass'] }),
    } as unknown as BattleState);

    store.adoptUnlockedType('grass');

    const after = read();
    expect(after.playerMonster!.type).toBe('grass');
    expect(after.run.unlockedThisRegion).toEqual([]);
    expect(after.logs.join('\n')).toContain('adopte');
  });

  test('ignoré hors fenêtre d’adoption ou pour un élément non révélé', () => {
    const { store, read } = buildStore(memoryProgression());
    const player = new Monster('p', 'Héro', 'normal', 6, 16, 14, 15, 10, 12, 12, [strike]);
    (store as unknown as { store: { set: (s: BattleState) => void } }).store.set({
      playerMonster: player,
      enemyMonster: null,
      logs: [],
      run: freshRun({ phase: 'regionClear', unlockedThisRegion: ['grass'] }),
    } as unknown as BattleState);

    // Élément non révélé → refusé.
    store.adoptUnlockedType('fire');
    expect(read().playerMonster!.type).toBe('normal');

    // Mauvaise phase → refusé.
    (store as unknown as { store: { set: (s: BattleState) => void } }).store.set({
      ...read(),
      run: freshRun({ phase: 'map', unlockedThisRegion: ['grass'] }),
    } as unknown as BattleState);
    store.adoptUnlockedType('grass');
    expect(read().playerMonster!.type).toBe('normal');
  });
});
