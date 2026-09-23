import type { Move, MonsterType } from "../../core/entities/Move";
import type { Monster } from "../../core/entities/Monster";

/**
 * Repository for managing and retrieving all available combat moves.
 * This acts as a centralized database for move definitions.
 */
export class MoveRepository {
  // A private map to store all moves, keyed by their unique ID for fast lookup.
  private static moves: Record<string, Move> = {
    // --- NORMAL Moves ---
    'normal-scratch': { id: 'normal-scratch', name: 'Griffure', power: 40, type: 'normal', isPhysical: true, level: 1 },
    'normal-tackle': { id: 'normal-tackle', name: 'Charge', power: 30, type: 'normal', isPhysical: true, level: 1 },
    // Giga Impact has a 3-turn cooldown (maxCoolDown: 3)
    'normal-slam': { id: 'normal-slam', name: 'Giga Impact', power: 150, type: 'normal', isPhysical: true, maxCoolDown: 3, level: 10 },
    'normal-heal': {
      id: 'normal-heal',
      name: 'Soin',
      power: 0,
      type: 'normal',
      isPhysical: false,
      level: 5,
      isHeal: true,
      maxCoolDown: 3
    },
    // --- FIRE Moves ---
    'fire-ball': { id: 'fire-ball', name: 'Boule de feu', power: 60, type: 'fire', isPhysical: false, level: 1 },
    'fire-blaze': { id: 'fire-blaze', name: 'Flammèche', power: 80, type: 'fire', isPhysical: false, level: 5 },
    // Déflagration has a 2-turn cooldown (maxCoolDown: 2)
    'fire-blast': { id: 'fire-blast', name: 'Déflagration', power: 120, type: 'fire', isPhysical: false, maxCoolDown: 2, level: 10 },
    'fire-rage': {
      id: 'fire-rage',
      name: 'Colère Ardente',
      power: 0,
      type: 'fire',
      isPhysical: false,
      level: 8,
      statBoosts: { stat: 'strength', value: 2 }, // +2 Force permanent (D&D buff rule)
      maxCoolDown: 4
    },
    // --- WATER Moves ---
    'water-jet': { id: 'water-jet', name: 'Jet d\'eau', power: 50, type: 'water', isPhysical: false, level: 1 },
    'water-wave': { id: 'water-wave', name: 'Aqua-vague', power: 75, type: 'water', isPhysical: false, level: 5 },
    // Hydrocanon has a 2-turn cooldown (maxCoolDown: 2)
    'water-hydro': { id: 'water-hydro', name: 'Hydrocanon', power: 110, type: 'water', isPhysical: false, maxCoolDown: 2, level: 10 },

    // --- GRASS Moves ---
    'grass-leaf': { id: 'grass-leaf', name: 'Fouet Liane', power: 45, type: 'grass', isPhysical: true, level: 1 },
    'grass-drain': { id: 'grass-drain', name: 'Giga-sangsue', power: 75, type: 'grass', isPhysical: false, level: 5 },
    // Rayon Solaire has a 3-turn cooldown (maxCoolDown: 3)
    'grass-solar': { id: 'grass-solar', name: 'Rayon Solaire', power: 120, type: 'grass', isPhysical: false, maxCoolDown: 3, level: 10 },

    // --- ELECTRIC Moves ---
    'elec-shock': { id: 'elec-shock', name: 'Éclair', power: 60, type: 'electric', isPhysical: false, level: 1 },
    'elec-bolt': { id: 'elec-bolt', name: 'Tonnerre', power: 80, type: 'electric', isPhysical: false, level: 5 },
    // Orage has a 2-turn cooldown (maxCoolDown: 2)
    'elec-storm': { id: 'elec-storm', name: 'Orage', power: 120, type: 'electric', isPhysical: false, maxCoolDown: 2, level: 10 },

    // --- ROCK Moves ---
    'rock-crush': { id: 'rock-crush', name: 'Écrasement', power: 45, type: 'rock', isPhysical: true, level: 1 },
    'rock-boulder': { id: 'rock-boulder', name: 'Bloc Roc', power: 75, type: 'rock', isPhysical: true, level: 5 },
    // Tremblement has a 2-turn cooldown (maxCoolDown: 2)
    'rock-quake': { id: 'rock-quake', name: 'Tremblement', power: 120, type: 'rock', isPhysical: true, maxCoolDown: 2, level: 10 },
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
   * @param type The type to filter by ('fire', 'water', 'grass', 'normal', 'electric', 'rock').
   * @returns An array of Move objects matching the type.
   */
  public getMovesByType(type: MonsterType): Move[] {
    // Use static moves directly, as 'this' isn't required for getAllMoves()
    return Object.values(MoveRepository.moves).filter(move => move.type === type);
  }

  /**
   * Retrieves all moves for a specific monster, based on its type and level.
   * @param monster The monster for which to retrieve moves.
   * @returns An array of Move objects the monster can use.
   */
  public getMovesForMonster(monster: Pick<Monster, 'type' | 'level'>): Move[] {
    return Object.values(MoveRepository.moves)
      .filter(
        move => (move.type === monster.type || move.type === 'normal') && move.level <= monster.level
      )
      .map(move => ({ ...move, coolDown: 0 }));
  }
}
