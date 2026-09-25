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
    'normal-feint': { id: 'normal-feint', name: 'Feinte Virole', power: 50, type: 'normal', isPhysical: true, level: 3 },
    'normal-heal': {
      id: 'normal-heal',
      name: 'Méditation',
      power: 0,
      type: 'normal',
      isPhysical: false,
      level: 4,
      isHeal: true,
      maxCoolDown: 3
    },
    'normal-fury': { id: 'normal-fury', name: 'Combo Furie', power: 75, type: 'normal', isPhysical: true, level: 6 },
    'normal-rally': {
      id: 'normal-rally',
      name: 'Cri de Guerre',
      power: 0,
      type: 'normal',
      isPhysical: false,
      level: 7,
      statBoosts: { stat: 'strength', value: 2 },
      maxCoolDown: 4
    },
    'normal-hyper-beam': { id: 'normal-hyper-beam', name: 'Rayon Énergétique', power: 105, type: 'normal', isPhysical: false, maxCoolDown: 2, level: 9 },
    'normal-slam': { id: 'normal-slam', name: 'Giga Impact', power: 140, type: 'normal', isPhysical: true, maxCoolDown: 3, level: 10 },

    // --- FIRE Moves ---
    'fire-ember': { id: 'fire-ember', name: 'Tison', power: 35, type: 'fire', isPhysical: true, level: 1, statusEffect: { type: 'burn', chance: 35, duration: 3, dc: 12 } },
    'fire-ball': { id: 'fire-ball', name: 'Boule de Feu', power: 55, type: 'fire', isPhysical: false, level: 1 },
    'fire-fang': { id: 'fire-fang', name: 'Crocs de Flammes', power: 65, type: 'fire', isPhysical: true, level: 3 },
    'fire-blaze': { id: 'fire-blaze', name: 'Flammèche Majeure', power: 80, type: 'fire', isPhysical: false, level: 5, statusEffect: { type: 'burn', chance: 50, duration: 3, dc: 13 } },
    'fire-rage': {
      id: 'fire-rage',
      name: 'Colère Ardente',
      power: 0,
      type: 'fire',
      isPhysical: false,
      level: 7,
      statBoosts: { stat: 'strength', value: 2 },
      maxCoolDown: 4
    },
    'fire-flare': { id: 'fire-flare', name: 'Éruption de Braises', power: 95, type: 'fire', isPhysical: true, maxCoolDown: 1, level: 9 },
    'fire-blast': { id: 'fire-blast', name: 'Déflagration', power: 125, type: 'fire', isPhysical: false, maxCoolDown: 2, level: 11, statusEffect: { type: 'burn', chance: 75, duration: 3, dc: 14 } },

    // --- WATER Moves ---
    'water-splash': { id: 'water-splash', name: 'Coup de Nageoire', power: 35, type: 'water', isPhysical: true, level: 1 },
    'water-jet': { id: 'water-jet', name: 'Jet d\'Eau', power: 50, type: 'water', isPhysical: false, level: 1, statusEffect: { type: 'freeze', chance: 30, duration: 2, dc: 12 } },
    'water-bubble': {
      id: 'water-bubble',
      name: 'Bulle Protectrice',
      power: 0,
      type: 'water',
      isPhysical: false,
      level: 3,
      statBoosts: { stat: 'constitution', value: 2 },
      maxCoolDown: 4
    },
    'water-wave': { id: 'water-wave', name: 'Aqua-Vague', power: 75, type: 'water', isPhysical: false, level: 5, statusEffect: { type: 'freeze', chance: 45, duration: 2, dc: 13 } },
    'water-cascade': {
      id: 'water-cascade',
      name: 'Cascade Curative',
      power: 0,
      type: 'water',
      isPhysical: false,
      level: 6,
      isHeal: true,
      maxCoolDown: 3
    },
    'water-dive': { id: 'water-dive', name: 'Plongeon Torrentiel', power: 90, type: 'water', isPhysical: true, maxCoolDown: 1, level: 8 },
    'water-hydro': { id: 'water-hydro', name: 'Hydrocanon', power: 120, type: 'water', isPhysical: false, maxCoolDown: 2, level: 10, statusEffect: { type: 'freeze', chance: 65, duration: 3, dc: 14 } },

    // --- GRASS Moves ---
    'grass-tackle': { id: 'grass-tackle', name: 'Épine Percée', power: 35, type: 'grass', isPhysical: true, level: 1 },
    'grass-spores': { id: 'grass-spores', name: 'Poudre Sylvestre', power: 50, type: 'grass', isPhysical: false, level: 1, statusEffect: { type: 'poison', chance: 85, duration: 4, dc: 13 } },
    'grass-leaf': { id: 'grass-leaf', name: 'Fouet Liane', power: 65, type: 'grass', isPhysical: true, level: 3 },
    'grass-drain': { id: 'grass-drain', name: 'Giga-Sangsue', power: 75, type: 'grass', isPhysical: false, level: 5, statusEffect: { type: 'poison', chance: 45, duration: 3, dc: 12 } },
    'grass-synthesis': {
      id: 'grass-synthesis',
      name: 'Photosynthèse',
      power: 0,
      type: 'grass',
      isPhysical: false,
      level: 7,
      isHeal: true,
      maxCoolDown: 3
    },
    'grass-wood-hammer': { id: 'grass-wood-hammer', name: 'Marteau de Bois', power: 95, type: 'grass', isPhysical: true, maxCoolDown: 1, level: 9 },
    'grass-solar': { id: 'grass-solar', name: 'Rayon Solaire', power: 125, type: 'grass', isPhysical: false, maxCoolDown: 3, level: 11, statusEffect: { type: 'poison', chance: 65, duration: 3, dc: 14 } },

    // --- ELECTRIC Moves ---
    'elec-spark': { id: 'elec-spark', name: 'Étincelle', power: 35, type: 'electric', isPhysical: true, level: 1, statusEffect: { type: 'paralysis', chance: 35, duration: 3, dc: 12 } },
    'elec-shock': { id: 'elec-shock', name: 'Éclair', power: 55, type: 'electric', isPhysical: false, level: 1, statusEffect: { type: 'paralysis', chance: 50, duration: 3, dc: 13 } },
    'elec-charge': {
      id: 'elec-charge',
      name: 'Surcharge Nerveuse',
      power: 0,
      type: 'electric',
      isPhysical: false,
      level: 3,
      statBoosts: { stat: 'speed', value: 2 },
      maxCoolDown: 4
    },
    'elec-punch': { id: 'elec-punch', name: 'Poing Éclair', power: 70, type: 'electric', isPhysical: true, level: 5 },
    'elec-bolt': { id: 'elec-bolt', name: 'Tonnerre', power: 85, type: 'electric', isPhysical: false, level: 7, statusEffect: { type: 'paralysis', chance: 65, duration: 3, dc: 14 } },
    'elec-volt-tackle': { id: 'elec-volt-tackle', name: 'Charge Voltage', power: 100, type: 'electric', isPhysical: true, maxCoolDown: 1, level: 9 },
    'elec-storm': { id: 'elec-storm', name: 'Orage Apocalyptique', power: 125, type: 'electric', isPhysical: false, maxCoolDown: 2, level: 11, statusEffect: { type: 'paralysis', chance: 85, duration: 4, dc: 15 } },

    // --- ROCK Moves ---
    'rock-pebble': { id: 'rock-pebble', name: 'Jet de Pierre', power: 35, type: 'rock', isPhysical: false, level: 1 },
    'rock-crush': { id: 'rock-crush', name: 'Écrasement', power: 50, type: 'rock', isPhysical: true, level: 1 },
    'rock-armor': {
      id: 'rock-armor',
      name: 'Armure de Granit',
      power: 0,
      type: 'rock',
      isPhysical: false,
      level: 3,
      statBoosts: { stat: 'constitution', value: 2 },
      maxCoolDown: 4
    },
    'rock-boulder': { id: 'rock-boulder', name: 'Bloc Roc', power: 75, type: 'rock', isPhysical: true, level: 5 },
    'rock-geyser': { id: 'rock-geyser', name: 'Piliers de Cristal', power: 80, type: 'rock', isPhysical: false, level: 7 },
    'rock-earthquake': { id: 'rock-earthquake', name: 'Tremblement', power: 100, type: 'rock', isPhysical: true, maxCoolDown: 1, level: 9 },
    'rock-meteor': { id: 'rock-meteor', name: 'Chute de Météore', power: 130, type: 'rock', isPhysical: true, maxCoolDown: 3, level: 11 },
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
