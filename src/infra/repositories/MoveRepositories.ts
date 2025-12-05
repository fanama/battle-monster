import type { Move, MonsterType } from "../../core/entities/Move.ts";

/**
 * Repository for managing and retrieving all available combat moves.
 * This acts as a centralized database for move definitions.
 */
export class MoveRepository {
  // A private map to store all moves, keyed by their unique ID for fast lookup.
  // NOTE: coolDown (current value) is NOT set here. It will be set to maxCoolDown
  // during battle logic, and initialized to 0 or undefined on the Monster's moveset.
  private static moves: Record<string, Move> = {
    // --- NORMAL Moves ---
    'normal-scratch': { id: 'normal-scratch', name: 'Griffure', power: 40, type: 'normal', isPhysical: true },
    'normal-tackle': { id: 'normal-tackle', name: 'Charge', power: 30, type: 'normal', isPhysical: true },
    // Giga Impact has a 3-turn cooldown (maxCoolDown: 3)
    'normal-slam': { id: 'normal-slam', name: 'Giga Impact', power: 150, type: 'normal', isPhysical: true, maxCoolDown: 3 },

    // --- FIRE Moves ---
    'fire-ball': { id: 'fire-ball', name: 'Boule de feu', power: 60, type: 'fire', isPhysical: false },
    'fire-blaze': { id: 'fire-blaze', name: 'Flammèche', power: 80, type: 'fire', isPhysical: false },
    // Déflagration has a 2-turn cooldown (maxCoolDown: 2)
    'fire-blast': { id: 'fire-blast', name: 'Déflagration', power: 120, type: 'fire', isPhysical: false, maxCoolDown: 2 },

    // --- WATER Moves ---
    'water-jet': { id: 'water-jet', name: 'Jet d\'eau', power: 50, type: 'water', isPhysical: false },
    'water-wave': { id: 'water-wave', name: 'Aqua-vague', power: 75, type: 'water', isPhysical: false },
    // Hydrocanon has a 2-turn cooldown (maxCoolDown: 2)
    'water-hydro': { id: 'water-hydro', name: 'Hydrocanon', power: 110, type: 'water', isPhysical: false, maxCoolDown: 2 },

    // --- GRASS Moves ---
    'grass-leaf': { id: 'grass-leaf', name: 'Fouet Liane', power: 45, type: 'grass', isPhysical: true },
    'grass-drain': { id: 'grass-drain', name: 'Giga-sangsue', power: 75, type: 'grass', isPhysical: false },
    // Rayon Solaire has a 3-turn cooldown (maxCoolDown: 3)
    'grass-solar': { id: 'grass-solar', name: 'Rayon Solaire', power: 120, type: 'grass', isPhysical: false, maxCoolDown: 3 },
  };

  /**
   * Retrieves a move by its unique ID.
   * @param id The unique identifier of the move.
   * @returns The Move object or undefined if not found.
   */
  public getMoveById(id: string): Move | undefined {
    return MoveRepository.moves[id];
  }

  /**
   * Retrieves a move by its display name (case-insensitive).
   * @param name The display name of the move (e.g., 'Boule de feu').
   * @returns The Move object or undefined if not found.
   */
  public getMoveByName(name: string): Move | undefined {
    const lowerCaseName = name.toLowerCase();
    return Object.values(MoveRepository.moves).find(
      move => move.name.toLowerCase() === lowerCaseName
    );
  }

  /**
   * Retrieves all moves currently defined in the repository.
   * @returns An array of all Move objects.
   */
  public getAllMoves(): Move[] {
    return Object.values(MoveRepository.moves);
  }

  /**
   * Retrieves all moves of a specific MonsterType.
   * @param type The type to filter by ('fire', 'water', 'grass', or 'normal').
   * @returns An array of Move objects matching the type.
   */
  public getMovesByType(type: MonsterType): Move[] {
    // Use static moves directly, as 'this' isn't required for getAllMoves()
    return Object.values(MoveRepository.moves).filter(move => move.type === type);
  }
}
