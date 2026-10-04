import type { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import { statGrowthForType } from '../../core/entities/Monster';
import { CREATION_CHARISMA, CREATION_LEVEL, STAT_FLOOR } from '../../core/entities/MonsterCreation';
import type { EnemyFactory, MoveProvider } from '../../core/services/ports';
import { MoveRepository } from './MoveRepositories';
import { createMonsterFromDefinition, type MonsterDefinition } from './monsterFactory';

const ALL_TYPES: MonsterType[] = ['fire', 'water', 'grass', 'normal', 'electric', 'rock'];

/**
 * Modèle de caractéristiques d'un ennemi (cf. `statGrowthForType`).
 *
 * Avant, l'ennemi partait d'un tirage `8..14` multiplié par `1 + 0.15 × (niveau − 1)` :
 * une croissance **multiplicative** ancrée sur le niveau 1, et surtout **plate
 * sur les six caractéristiques**. Le champion, lui, est forgé au niveau
 * `CREATION_LEVEL` avec des caractéristiques plates et ne croît ensuite que de
 * `statGrowthForType` par niveau — laquelle laisse le **Charisme à zéro** et
 * l'Instinct à +1. Les deux courbes divergeaient donc à tous les niveaux, et
 * l'ennemi emportait deux avantages que le joueur ne peut jamais obtenir :
 *
 * - du **Charisme**, qui amplifie la magie (`charismaMagicFactor`) ;
 * - de l'**Instinct**, qui élargit la plage de critique (dégâts doublés).
 *
 * Au niveau 13, l'ennemi gagnait +34 % de dégâts magiques et deux points de
 * critique de plus que le joueur : les derniers paliers étaient injouables.
 * Mesuré : 3-35 % de victoire en miroir avant correction.
 *
 * L'ennemi suit donc **exactement** la croissance du champion du même type :
 * `tirage(8..14) + croissance_du_type × (niveau − niveau de création)`, pondérée
 * par la menace de la région (`statScale`) et bornée à `STAT_FLOOR`. Le
 * Charisme reste à sa valeur de création : c'est une stat de relique, pas une
 * stat de niveau.
 */

/** Multiplicateur de menace régionale : < 1 = ennemis plus faibles (cf. `RegionDef.threat`). */
export const DEFAULT_STAT_SCALE = 1;

/**
 * Réserve de PV supplémentaire d'un boss, **après** l'échelle de niveau.
 *
 * Réduit de 1.4 à 1.2 : les dégâts suivent maintenant la même courbe de
 * progression que les PV (`levelPaceFactor`), donc le saut de niveau du boss est
 * presque neutre en temps-au-KO. Le facteur 1.4 ne pesait plus que sur les PV
 * et transformait un duel à 85 % de victoire en duel à 5 % : mesuré, les boss
 * des régions 2 et 3 étaient à 0-10 %. Un palier de difficulté doit venir d'une
 * décision lisible (« il encaisse plus »), pas d'un multiplicateur opaque.
 */
export const BOSS_HP_MULTIPLIER = 1.2;

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
    opts: { type?: MonsterType; name?: string; statScale?: number } = {}
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
        strength: this.rollStat(),
        speed: this.rollStat(),
        constitution: this.rollStat(),
        charisma: this.rollStat(),
        wisdom: this.rollStat(),
        instinct: this.rollStat()
      }
    };

    // Croissance linéaire depuis le niveau de création, pondérée par la menace
    // Croissance alignée sur celle du champion du même type, pondérée par la
    // menace de la région (les premières régions génèrent des ennemis plus
    // faibles). Le Charisme est fixé : il ne vient que des reliques.
    const statScale = opts.statScale ?? DEFAULT_STAT_SCALE;
    const growth = statGrowthForType(randomType);
    const gainedLevels = targetLevel - CREATION_LEVEL;
    (Object.keys(newDef.stats) as Array<keyof typeof newDef.stats>).forEach(stat => {
      if (stat === 'charisma') {
        newDef.stats[stat] = CREATION_CHARISMA;
        return;
      }
      const grown = newDef.stats[stat] + growth[stat] * gainedLevels;
      newDef.stats[stat] = Math.max(STAT_FLOOR, Math.floor(grown * statScale));
    });

    return createMonsterFromDefinition(newDef, this.moveProvider, this.random);
  }

  /** Tirage de base d'une caractéristique : même bande que la création d'un champion (8..14). */
  private rollStat(): number {
    return Math.floor(8 + this.random() * 7);
  }

  /** Boss de région : monstre du type demandé, plus gros pool de PV, rang boss (XP accrue). */
  createBoss(
    level: number,
    type: MonsterType,
    name: string,
    statScale?: number
  ): Monster {
    const boss = this.createRandomEnemy(level, { type, name, statScale });
    boss.maxHp = Math.floor(boss.maxHp * BOSS_HP_MULTIPLIER);
    boss.currentHp = boss.maxHp;
    boss.rank = 'boss';
    return boss;
  }
}
