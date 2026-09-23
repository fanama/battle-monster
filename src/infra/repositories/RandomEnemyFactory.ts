import type { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import type { EnemyFactory, MoveProvider } from '../../core/services/ports';
import { MoveRepository } from './MoveRepositories';
import { createMonsterFromDefinition, type MonsterDefinition } from './monsterFactory';

const ALL_TYPES: MonsterType[] = ['fire', 'water', 'grass', 'normal', 'electric', 'rock'];

// Type-specific name pools
const NAME_POOLS: Record<MonsterType, { prefixes: string[]; suffixes: string[] }> = {
  fire: {
    prefixes: ['Pyre', 'Ember', 'Blaze', 'Solar', 'Magma'],
    suffixes: ['mander', 'core', 'fury', 'wing', 'flame']
  },
  water: {
    prefixes: ['Aqua', 'Hydro', 'Tidal', 'Mist', 'River'],
    suffixes: ['fin', 'scale', 'bubble', 'wave', 'soul']
  },
  grass: {
    prefixes: ['Terra', 'Leaf', 'Flora', 'Root', 'Bloom'],
    suffixes: ['thorn', 'vine', 'sprout', 'wood', 'pion']
  },
  normal: {
    prefixes: ['Swift', 'Bold', 'Iron', 'Zen', 'Chrono'],
    suffixes: ['beast', 'tail', 'fang', 'claw', 'ling']
  },
  electric: {
    prefixes: ['Volt', 'Spark', 'Shock', 'Zap', 'Static'],
    suffixes: ['volt', 'bolt', 'charge', 'surge', 'watt']
  },
  rock: {
    prefixes: ['Gran', 'Crag', 'Boulder', 'Stone', 'Titan'],
    suffixes: ['shard', 'rock', 'peak', 'crust', 'maw']
  }
};

/**
 * Fabrique d'ennemis **procéduraux** (combats sauvages et bosses de région) :
 * nom, type, stats et niveau générés. N'a rien à voir avec les starters fixes
 * (StarterCatalog). Dépendances injectées : `MoveProvider` et `random`.
 */
export class RandomEnemyFactory implements EnemyFactory {
  private readonly moveProvider: MoveProvider;
  private readonly random: () => number;

  constructor(moveProvider?: MoveProvider, random: () => number = Math.random) {
    this.moveProvider = moveProvider ?? new MoveRepository();
    this.random = random;
  }

  createRandomEnemy(
    targetLevel: number,
    opts: { type?: MonsterType; name?: string } = {}
  ): Monster {
    const randomType = opts.type ?? ALL_TYPES[Math.floor(this.random() * ALL_TYPES.length)];

    const pool = NAME_POOLS[randomType];
    const randomName =
      opts.name ??
      (pool.prefixes[Math.floor(this.random() * pool.prefixes.length)] +
        pool.suffixes[Math.floor(this.random() * pool.suffixes.length)]);

    const newDef: MonsterDefinition = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: randomName,
      type: randomType,
      level: targetLevel,
      stats: {
        strength: Math.floor(8 + this.random() * 7),
        speed: Math.floor(8 + this.random() * 7),
        constitution: Math.floor(8 + this.random() * 7),
        charisma: Math.floor(8 + this.random() * 7),
        wisdom: Math.floor(8 + this.random() * 7),
        instinct: Math.floor(8 + this.random() * 7)
      }
    };

    // Apply level scaling (each level above 1 adds 15% to total stats)
    const statMultiplier = 1 + ((targetLevel - 1) * 0.15);
    (Object.keys(newDef.stats) as Array<keyof typeof newDef.stats>).forEach(stat => {
      newDef.stats[stat] = Math.floor(newDef.stats[stat] * statMultiplier);
    });

    return createMonsterFromDefinition(newDef, this.moveProvider, this.random);
  }

  /** Boss de région : monstre du type demandé, plus gros pool de PV, rang boss (XP accrue). */
  createBoss(level: number, type: MonsterType, name: string): Monster {
    const boss = this.createRandomEnemy(level, { type, name });
    boss.maxHp = Math.floor(boss.maxHp * 1.4);
    boss.currentHp = boss.maxHp;
    boss.rank = 'boss';
    return boss;
  }
}
