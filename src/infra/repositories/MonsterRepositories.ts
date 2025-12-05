import { Monster } from '../../core/entities/Monster';
import type { MonsterType } from '../../core/entities/Move';
import { MoveRepository } from './MoveRepositories';

import FireImage from '../../assets/monster_1.png'
import WaterImage from '../../assets/monster_2.png'

// Initialize the MoveRepository once
const moveRepo = new MoveRepository();

export class MonsterRepository {

  /**
   * Retrieves a starter monster based on the chosen element.
   * Fetches moves from the MoveRepository using their unique IDs.
   * @param element 'fire' or 'water'.
   * @returns A new Monster instance.
   */
  getStarter(element: MonsterType): Monster {
    // Helper function to safely retrieve and filter moves from the repository

    if (element === 'fire') {
      const fireMoves = moveRepo.getMovesByType('fire'); // IDs: Griffure, Boule de feu

      return new Monster(
        '1',
        'Pyromancer',
        'fire',
        100, // maxHp
        100, // currentHp
        // --- Nouvelles statistiques ---
        15, // force
        12, // vitesse
        10, // constitution
        14, // intelligence
        8,  // charisme
        11, // sagesse
        // ------------------------------
        fireMoves,
        FireImage // Placeholder
      );
    } else {
      const waterMoves = moveRepo.getMovesByType('water')

      return new Monster(
        '2',
        'HydroSlime',
        'water',
        120, // maxHp
        120, // currentHp
        // --- Nouvelles statistiques ---
        10, // force
        9,  // vitesse
        15, // constitution
        11, // intelligence
        13, // charisme
        14, // sagesse
        // ------------------------------
        waterMoves,
        WaterImage
      );
    }
  }
}
