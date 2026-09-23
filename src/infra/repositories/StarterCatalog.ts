import type { Monster } from '../../core/entities/Monster';
import type { MoveProvider } from '../../core/services/ports';
import { MoveRepository } from './MoveRepositories';
import { createMonsterFromDefinition, type MonsterDefinition } from './monsterFactory';

import FireImage from '../../assets/monster_1.png';
import WaterImage from '../../assets/monster_2.png';

/** Les 5 starters définis (sélection roguelike) — fixes, pas de hasard. */
const STARTER_DEFINITIONS: MonsterDefinition[] = [
  {
    id: '1',
    name: 'Pyromancer',
    type: 'fire',
    level: 5,
    image: FireImage,
    stats: { strength: 15, speed: 12, constitution: 10, charisma: 8, wisdom: 11, instinct: 0 }
  },
  {
    id: '2',
    name: 'HydroSlime',
    type: 'water',
    level: 5,
    image: WaterImage,
    stats: { strength: 10, speed: 9, constitution: 15, charisma: 13, wisdom: 14, instinct: 0 }
  },
  {
    id: '3',
    name: 'LeafGuardian',
    type: 'grass',
    level: 5,
    image: WaterImage, // Placeholder
    stats: { strength: 12, speed: 8, constitution: 14, charisma: 12, wisdom: 16, instinct: 0 }
  },
  {
    id: '4',
    name: 'Voltis',
    type: 'electric',
    level: 5,
    image: FireImage, // Placeholder
    stats: { strength: 10, speed: 16, constitution: 8, charisma: 10, wisdom: 9, instinct: 0 }
  },
  {
    id: '5',
    name: 'Cairnox',
    type: 'rock',
    level: 5,
    image: WaterImage, // Placeholder
    stats: { strength: 16, speed: 7, constitution: 15, charisma: 10, wisdom: 9, instinct: 0 }
  }
];

/**
 * Catalogue des monstres de départ (choix du run). Ne génère rien au hasard :
 * retourne toujours le quintet de starters défini. Dépendances injectées :
 * `MoveProvider` (moves éligibles) et `random` (tirage des moves).
 */
export class StarterCatalog {
  private readonly moveProvider: MoveProvider;
  private readonly random: () => number;

  constructor(moveProvider?: MoveProvider, random: () => number = Math.random) {
    this.moveProvider = moveProvider ?? new MoveRepository();
    this.random = random;
  }

  /** Les 5 starters, chacun avec 4 moves tirés parmi ses moves éligibles. */
  getAll(): Monster[] {
    return STARTER_DEFINITIONS.map(def => createMonsterFromDefinition(def, this.moveProvider, this.random));
  }
}