import type { Move } from "../../core/entities/Move";
import type { Monster } from "../../core/entities/Monster";

/**
 * Repository for managing and retrieving all available combat moves.
 * This acts as a centralized database for move definitions.
 *
 * ## Grille d'équilibrage du catalogue
 *
 * Chaque type propose **exactement 8 capacités** posées sur la **même échelle de
 * puissance**, ce qui rend les types réellement interchangeables :
 *
 * | créneau    | niveau | puissance | nature   | effet annexe          |
 * | ---------- | ------ | --------- | -------- | --------------------- |
 * | `a`        | 1      | 35        | physique | statut 35 %           |
 * | `b`        | 1      | 55        | magique  | statut 45 %           |
 * | `c`        | 3      | 65        | physique | —                     |
 * | amplification | 3   | 0         | —        | +2 stat, recharge 4  |
 * | `d`        | 5      | 80        | magique  | statut 55 %           |
 * | soin       | 6      | 0         | —        | `healPower` 10, cd 3  |
 * | `e`        | 9      | 95        | physique | recharge 1            |
 * | `f`        | 11     | 125       | signature | statut 75 %, cd 2     |
 *
 * Ce que cette grille corrige (mesuré avec `scripts/balanceSim.ts`) :
 *
 * - **Trois types sur six n'avaient aucun soin** (Feu, Électricité, Roche) et
 *   la Plante aucun buff : leur arsenal n'était pas comparable au reste du
 *   catalogue, alors qu'un combat mal engagé se décide à la régénération.
 * - **Les puissances divergeaient selon le type** (sommet à 120 chez l'Eau, 140
 *   chez le Normal) sans raison de jeu : le choix de type devenait un choix de
 *   palier de dégâts.
 * - **La Roche n'inflictait aucun statut**, là où les cinq autres types en
 *   plaçaient trois.
 * - Les chances de statut n'étaient pas gradées : « Poudre Sylvestre » (P. 50)
 *   touchait à 85 %, « Piliers de Cristal » (P. 80) à 0 %.
 *
 * L'identité d'un type vient donc de sa **nature** (physique ou magique, en
 * alternance), de son **statut** (brûlure, gel, paralysie, poison), de son
 * **buff** et de sa courbe de caractéristiques — plus jamais d'un multiplicateur
 * de dégâts caché dans le catalogue.
 *
 * Les moves `normal` sont de surcroît accessibles à **tous** les types
 * (`getMovesForMonster`) : le panel de choix fait donc 16 capacités, dont 8
 * communes.
 */
export class MoveRepository {
  // A private map to store all moves, keyed by their unique ID for fast lookup.
  private static moves: Record<string, Move> = {
    // --- NORMAL Moves ---
    // Communs à tous les types : le socle neutre du jeu.
    "normal-scratch": {
      id: "normal-scratch",
      name: "Griffure",
      power: 35,
      type: "normal",
      isPhysical: true,
      level: 1,
      statusEffect: { type: "paralysis", chance: 35, duration: 2, dc: 12 },
    },
    "normal-souffle": {
      id: "normal-souffle",
      name: "Souffle Brut",
      power: 55,
      type: "normal",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "paralysis", chance: 45, duration: 2, dc: 13 },
    },
    "normal-feint": {
      id: "normal-feint",
      name: "Feinte Virole",
      power: 65,
      type: "normal",
      isPhysical: true,
      level: 3,
    },
    "normal-rally": {
      id: "normal-rally",
      name: "Cri de Guerre",
      power: 0,
      type: "normal",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "strength", value: 2 },
      maxCoolDown: 4,
    },
    "normal-hyper-beam": {
      id: "normal-hyper-beam",
      name: "Rayon Énergétique",
      power: 85,
      type: "normal",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "paralysis", chance: 55, duration: 2, dc: 13 },
    },
    "normal-heal": {
      id: "normal-heal",
      name: "Méditation",
      power: 0,
      type: "normal",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "normal-fury": {
      id: "normal-fury",
      name: "Combo Furie",
      power: 100,
      type: "normal",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "normal-slam": {
      id: "normal-slam",
      name: "Éclatement Total",
      power: 130,
      type: "normal",
      isPhysical: false,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "paralysis", chance: 65, duration: 3, dc: 14 },
    },

    // --- FIRE Moves --- (signature : Colère Ardente)
    "fire-ember": {
      id: "fire-ember",
      name: "Tison",
      power: 35,
      type: "fire",
      isPhysical: true,
      level: 1,
      statusEffect: { type: "burn", chance: 35, duration: 2, dc: 12 },
    },
    "fire-ball": {
      id: "fire-ball",
      name: "Boule de Feu",
      power: 55,
      type: "fire",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "burn", chance: 45, duration: 2, dc: 13 },
    },
    "fire-fang": {
      id: "fire-fang",
      name: "Crocs de Flammes",
      power: 65,
      type: "fire",
      isPhysical: true,
      level: 3,
    },
    "fire-rage": {
      id: "fire-rage",
      name: "Colère Ardente",
      power: 0,
      type: "fire",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "strength", value: 2 },
      maxCoolDown: 4,
    },
    "fire-blaze": {
      id: "fire-blaze",
      name: "Flammèche Majeure",
      power: 85,
      type: "fire",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "burn", chance: 55, duration: 2, dc: 13 },
    },
    "fire-bain": {
      id: "fire-bain",
      name: "Bain de Braise",
      power: 0,
      type: "fire",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "fire-flare": {
      id: "fire-flare",
      name: "Éruption de Braises",
      power: 100,
      type: "fire",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "fire-blast": {
      id: "fire-blast",
      name: "Déflagration",
      power: 130,
      type: "fire",
      isPhysical: false,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "burn", chance: 65, duration: 3, dc: 14 },
    },

    // --- WATER Moves --- (signature : Bulle Protectrice)
    "water-splash": {
      id: "water-splash",
      name: "Coup de Nageoire",
      power: 35,
      type: "water",
      isPhysical: true,
      level: 1,
      statusEffect: { type: "freeze", chance: 35, duration: 2, dc: 12 },
    },
    "water-jet": {
      id: "water-jet",
      name: "Jet d'Eau",
      power: 55,
      type: "water",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "freeze", chance: 45, duration: 2, dc: 13 },
    },
    "water-remous": {
      id: "water-remous",
      name: "Remous",
      power: 65,
      type: "water",
      isPhysical: true,
      level: 3,
    },
    "water-bubble": {
      id: "water-bubble",
      name: "Bulle Protectrice",
      power: 0,
      type: "water",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "constitution", value: 2 },
      maxCoolDown: 4,
    },
    "water-wave": {
      id: "water-wave",
      name: "Aqua-Vague",
      power: 85,
      type: "water",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "freeze", chance: 55, duration: 2, dc: 13 },
    },
    "water-cascade": {
      id: "water-cascade",
      name: "Cascade Curative",
      power: 0,
      type: "water",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "water-dive": {
      id: "water-dive",
      name: "Plongeon Torrentiel",
      power: 100,
      type: "water",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "water-hydro": {
      id: "water-hydro",
      name: "Hydrocanon",
      power: 130,
      type: "water",
      isPhysical: false,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "freeze", chance: 65, duration: 3, dc: 14 },
    },

    // --- GRASS Moves --- (signature : Écorce Protectrice)
    "grass-tackle": {
      id: "grass-tackle",
      name: "Épine Percée",
      power: 35,
      type: "grass",
      isPhysical: true,
      level: 1,
      statusEffect: { type: "poison", chance: 35, duration: 2, dc: 12 },
    },
    "grass-spores": {
      id: "grass-spores",
      name: "Poudre Sylvestre",
      power: 55,
      type: "grass",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "poison", chance: 45, duration: 2, dc: 13 },
    },
    "grass-leaf": {
      id: "grass-leaf",
      name: "Fouet Liane",
      power: 65,
      type: "grass",
      isPhysical: true,
      level: 3,
    },
    "grass-bark": {
      id: "grass-bark",
      name: "Écorce Protectrice",
      power: 0,
      type: "grass",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "constitution", value: 2 },
      maxCoolDown: 4,
    },
    "grass-drain": {
      id: "grass-drain",
      name: "Giga-Sangsue",
      power: 85,
      type: "grass",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "poison", chance: 55, duration: 2, dc: 13 },
    },
    "grass-synthesis": {
      id: "grass-synthesis",
      name: "Photosynthèse",
      power: 0,
      type: "grass",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "grass-wood-hammer": {
      id: "grass-wood-hammer",
      name: "Marteau de Bois",
      power: 100,
      type: "grass",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "grass-solar": {
      id: "grass-solar",
      name: "Rayon Solaire",
      power: 130,
      type: "grass",
      isPhysical: false,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "poison", chance: 65, duration: 3, dc: 14 },
    },

    // --- ELECTRIC Moves --- (signature : Surcharge Nerveuse)
    "elec-spark": {
      id: "elec-spark",
      name: "Étincelle",
      power: 35,
      type: "electric",
      isPhysical: true,
      level: 1,
      statusEffect: { type: "paralysis", chance: 35, duration: 2, dc: 12 },
    },
    "elec-shock": {
      id: "elec-shock",
      name: "Éclair",
      power: 55,
      type: "electric",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "paralysis", chance: 45, duration: 2, dc: 13 },
    },
    "elec-punch": {
      id: "elec-punch",
      name: "Poing Éclair",
      power: 65,
      type: "electric",
      isPhysical: true,
      level: 3,
    },
    "elec-charge": {
      id: "elec-charge",
      name: "Surcharge Nerveuse",
      power: 0,
      type: "electric",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "speed", value: 2 },
      maxCoolDown: 4,
    },
    "elec-bolt": {
      id: "elec-bolt",
      name: "Tonnerre",
      power: 85,
      type: "electric",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "paralysis", chance: 55, duration: 2, dc: 13 },
    },
    "elec-regen": {
      id: "elec-regen",
      name: "Onde Régénératrice",
      power: 0,
      type: "electric",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "elec-volt-tackle": {
      id: "elec-volt-tackle",
      name: "Charge Voltage",
      power: 100,
      type: "electric",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "elec-storm": {
      id: "elec-storm",
      name: "Orage Apocalyptique",
      power: 130,
      type: "electric",
      isPhysical: false,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "paralysis", chance: 65, duration: 3, dc: 14 },
    },

    // --- ROCK Moves --- (signature : Armure de Granit)
    // Seul type à attaquer majoritairement en physique : sa compensation est
    // la Constitution (affinité +3, croissance +3/niveau).
    "rock-pebble": {
      id: "rock-pebble",
      name: "Jet de Pierre",
      power: 35,
      type: "rock",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "paralysis", chance: 35, duration: 2, dc: 12 },
    },
    "rock-obsidian": {
      id: "rock-obsidian",
      name: "Éclat d'Obsidienne",
      power: 55,
      type: "rock",
      isPhysical: false,
      level: 1,
      statusEffect: { type: "paralysis", chance: 45, duration: 2, dc: 13 },
    },
    "rock-boulder": {
      id: "rock-boulder",
      name: "Bloc Roc",
      power: 65,
      type: "rock",
      isPhysical: true,
      level: 3,
    },
    "rock-armor": {
      id: "rock-armor",
      name: "Armure de Granit",
      power: 0,
      type: "rock",
      isPhysical: false,
      level: 3,
      statBoosts: { stat: "constitution", value: 2 },
      maxCoolDown: 4,
    },
    "rock-geyser": {
      id: "rock-geyser",
      name: "Piliers de Cristal",
      power: 85,
      type: "rock",
      isPhysical: false,
      level: 5,
      statusEffect: { type: "paralysis", chance: 55, duration: 2, dc: 13 },
    },
    "rock-breath": {
      id: "rock-breath",
      name: "Souffle de Roche",
      power: 0,
      type: "rock",
      isPhysical: false,
      level: 6,
      isHeal: true,
      healPower: 10,
      maxCoolDown: 3,
    },
    "rock-earthquake": {
      id: "rock-earthquake",
      name: "Tremblement",
      power: 100,
      type: "rock",
      isPhysical: true,
      level: 9,
      maxCoolDown: 1,
    },
    "rock-meteor": {
      id: "rock-meteor",
      name: "Chute de Météore",
      power: 130,
      type: "rock",
      isPhysical: true,
      level: 11,
      maxCoolDown: 2,
      statusEffect: { type: "paralysis", chance: 65, duration: 3, dc: 14 },
    },
  };

  /**
   * Retrieves all moves for a specific monster, based on its type and level.
   * @param monster The monster for which to retrieve moves.
   * @returns An array of Move objects the monster can use.
   */
  public getMovesForMonster(monster: Pick<Monster, "type" | "level">): Move[] {
    return Object.values(MoveRepository.moves)
      .filter(
        (move) =>
          (move.type === monster.type || move.type === "normal") &&
          move.level <= monster.level,
      )
      .map((move) => ({ ...move, coolDown: 0 }));
  }

  /**
   * Moves **propres** à un type (hors socle `normal`, commun à tous).
   * Utilisé par les tests d'équilibrage du catalogue.
   */
  public getMovesForType(type: Monster["type"]): Move[] {
    return Object.values(MoveRepository.moves).filter((move) => move.type === type);
  }
}
