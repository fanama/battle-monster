
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
    const tempMonster = new Monster(
      def.id,
      def.name,
      def.type,
      def.level,
      def.maxHp,
      def.maxHp,
      def.stats.strength,
      def.stats.speed,
      def.stats.constitution,
      def.stats.intelligence,
      def.stats.charisma,
      def.stats.wisdom,
      [],
      def.image
    );

    const moves = moveRepo.getMovesForMonster(tempMonster);

    return new Monster(
      def.id,
      def.name,
      def.type,
      def.level,
      def.maxHp,
      def.maxHp,
      def.stats.strength,
      def.stats.speed,
      def.stats.constitution,
      def.stats.intelligence,
      def.stats.charisma,
      def.stats.wisdom,
      moves,
      def.image
    );
  }

  getAllMonsters(): Monster[] {
    return this.definitions.map(def => this.createInstance(def));
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
    const randomIndex = Math.floor(Math.random() * this.definitions.length);
    const baseDef = this.definitions[randomIndex];

    const newDef: MonsterDefinition = JSON.parse(JSON.stringify(baseDef));

    const levelDifference = targetLevel - newDef.level;
    const statMultiplier = 1 + (levelDifference * 0.15);

    newDef.level = targetLevel;
    newDef.maxHp = Math.floor(newDef.maxHp * statMultiplier);
    
    (Object.keys(newDef.stats) as Array<keyof typeof newDef.stats>).forEach(stat => {
        newDef.stats[stat] = Math.floor(newDef.stats[stat] * statMultiplier);
    });

    return this.createInstance(newDef);
  }
}
