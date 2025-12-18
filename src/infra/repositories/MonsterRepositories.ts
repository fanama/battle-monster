
import { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import { MoveRepository } from './MoveRepositories';

// Images
import FireImage from '../../assets/monster_1.png';
import WaterImage from '../../assets/monster_2.png';

const moveRepo = new MoveRepository();

interface MonsterDefinition {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  image: string;
  maxHp: number;
  stats: {
    strength: number;
    speed: number;
    constitution: number;
    intelligence: number;
    charisma: number;
    wisdom: number;
  };
}

export class MonsterRepository {

  private definitions: MonsterDefinition[] = [
    {
      id: '1',
      name: 'Pyromancer',
      type: 'fire',
      level: 5,
      image: FireImage,
      maxHp: 100,
      stats: { strength: 15, speed: 12, constitution: 10, intelligence: 14, charisma: 8, wisdom: 11 }
    },
    {
      id: '2',
      name: 'HydroSlime',
      type: 'water',
      level: 5,
      image: WaterImage,
      maxHp: 120,
      stats: { strength: 10, speed: 9, constitution: 15, intelligence: 11, charisma: 13, wisdom: 14 }
    },
    {
      id: '3',
      name: 'LeafGuardian',
      type: 'grass',
      level: 5,
      image: WaterImage, // Placeholder
      maxHp: 110,
      stats: { strength: 12, speed: 8, constitution: 14, intelligence: 10, charisma: 12, wisdom: 16 }
    }

  ];

  private createInstance(def: MonsterDefinition): Monster {
    // 1. Get all potential moves the monster is eligible for
    // We pass a literal object that matches the Monster interface requirements
    const allEligibleMoves = moveRepo.getMovesForMonster({
      type: def.type,
      level: def.level
    } as any);

    // 2. Shuffle and pick a maximum of 4 moves
    const selectedMoves = allEligibleMoves
      .sort(() => 0.5 - Math.random()) // Randomize order
      .slice(0, 4);                    // Take only the first 4

    // 3. Create the final Monster instance
    return new Monster(
      def.id,
      def.name,
      def.type,
      def.level,
      def.maxHp,
      def.maxHp, // currentHp starts at maxHp
      def.stats.strength,
      def.stats.speed,
      def.stats.constitution,
      def.stats.intelligence,
      def.stats.charisma,
      def.stats.wisdom,
      selectedMoves,
      def.image
    );
  }

  getAllMonsters(): Monster[] {
    return this.definitions.map(def => this.getRandomMonster(def.level));
  }

  getMonsterById(id: string): Monster | undefined {
    const def = this.definitions.find(d => d.id === id);
    if (!def) return undefined;
    return this.createInstance(def);
  }

  getStarter(element: MonsterType): Monster {
    const def = this.definitions.find(d => d.type === element);
    if (def) return this.createInstance(def);
    return this.createInstance(this.definitions[0]);
  }

  getRandomMonster(targetLevel: number): Monster {
    const monsterTypes: MonsterType[] = ['fire', 'water', 'grass', 'normal'];
    const randomType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];

    // 1. Type-specific name pools
    const namePools: Record<MonsterType, { prefixes: string[], suffixes: string[] }> = {
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
      }
    };

    // 2. Select name and image based on type
    const pool = namePools[randomType];
    const randomName =
      pool.prefixes[Math.floor(Math.random() * pool.prefixes.length)] +
      pool.suffixes[Math.floor(Math.random() * pool.suffixes.length)];

    // Select sprite based on type (assuming you have imported these)
    const imageMap: Record<MonsterType, any> = {
      fire: FireImage,
      water: WaterImage,
      grass: FireImage,
      normal: FireImage
    };
    const randomImage = imageMap[randomType];

    // 3. Define Base Stats
    const newDef: MonsterDefinition = {
      id: crypto.randomUUID(), // Better than Math.random for IDs
      name: randomName,
      type: randomType,
      level: targetLevel,
      image: randomImage,
      maxHp: Math.floor(80 + Math.random() * 40),
      stats: {
        strength: Math.floor(8 + Math.random() * 7),
        speed: Math.floor(8 + Math.random() * 7),
        constitution: Math.floor(8 + Math.random() * 7),
        intelligence: Math.floor(8 + Math.random() * 7),
        charisma: Math.floor(8 + Math.random() * 7),
        wisdom: Math.floor(8 + Math.random() * 7)
      }
    };

    // 4. Apply Level Scaling
    // Every level above 1 adds 15% to total stats
    const levelDifference = targetLevel - 1;
    const statMultiplier = 1 + (levelDifference * 0.15);

    newDef.maxHp = Math.floor(newDef.maxHp * statMultiplier);

    (Object.keys(newDef.stats) as Array<keyof typeof newDef.stats>).forEach(stat => {
      newDef.stats[stat] = Math.floor(newDef.stats[stat] * statMultiplier);
    });

    return this.createInstance(newDef);
  }
}
