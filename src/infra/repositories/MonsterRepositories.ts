import { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import { MoveRepository } from './MoveRepositories';

// Images
import FireImage from '../../assets/monster_1.png';
import WaterImage from '../../assets/monster_2.png';
// You can add more images here, or reuse existing ones for now
// import PlantImage from '../../assets/monster_3.png'; 
// import ElectricImage from '../../assets/monster_4.png';

const moveRepo = new MoveRepository();

// Interface to define the "Blueprints" of our monsters
interface MonsterDefinition {
  id: string;
  name: string;
  type: MonsterType;
  image: string;
  maxHp: number;
  stats: {
    strength: number; // Renamed from 'force' to match your Class
    speed: number;
    constitution: number;
    intelligence: number;
    charisma: number;
    wisdom: number;
  };
}

export class MonsterRepository {

  // 1. Define the raw data for all available monsters
  private definitions: MonsterDefinition[] = [
    {
      id: '1',
      name: 'Pyromancer',
      type: 'fire',
      image: FireImage,
      maxHp: 100,
      stats: { strength: 15, speed: 12, constitution: 10, intelligence: 14, charisma: 8, wisdom: 11 }
    },
    {
      id: '2',
      name: 'HydroSlime',
      type: 'water',
      image: WaterImage,
      maxHp: 120,
      stats: { strength: 10, speed: 9, constitution: 15, intelligence: 11, charisma: 13, wisdom: 14 }
    },
    {
      id: '3',
      name: 'LeafGuardian',
      type: 'grass',
      image: WaterImage, // Placeholder
      maxHp: 110,
      stats: { strength: 12, speed: 8, constitution: 14, intelligence: 10, charisma: 12, wisdom: 16 }
    }

  ];

  /**
   * Helper to instantiate a fresh Monster object from a definition.
   * This ensures that every battle starts with full HP and fresh stats.
   */
  private createInstance(def: MonsterDefinition): Monster {
    // Fetch moves dynamically based on the monster's type
    const moves = moveRepo.getMovesByType(def.type);

    return new Monster(
      def.id,
      def.name,
      def.type,
      def.maxHp,
      def.maxHp, // currentHp (starts full)
      // Stats must match Constructor Order:
      def.stats.strength,
      def.stats.speed,
      def.stats.constitution,
      def.stats.intelligence,
      def.stats.charisma,
      def.stats.wisdom,
      moves,      // initialMoves
      def.image   // spriteUrl
    );
  }

  /**
   * Returns a list of ALL available monsters.
   * Useful for the Character Selection Screen.
   */
  getAllMonsters(): Monster[] {
    return this.definitions.map(def => this.createInstance(def));
  }

  /**
   * Retrieves a specific monster by its ID.
   */
  getMonsterById(id: string): Monster | undefined {
    const def = this.definitions.find(d => d.id === id);
    if (!def) return undefined;
    return this.createInstance(def);
  }

  /**
   * Legacy support (optional): returns a starter based on type
   */
  getStarter(element: MonsterType): Monster {
    const def = this.definitions.find(d => d.type === element);
    if (def) return this.createInstance(def);

    // Fallback if not found
    return this.createInstance(this.definitions[0]);
  }
}
