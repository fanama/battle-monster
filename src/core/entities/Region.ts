import type { MonsterType } from './Move';

export interface RegionDef {
  id: string;
  name: string;
  description: string;
  /** Nombre de couches de nœuds de la carte de la région (plus la région est avancée, plus la carte est longue). */
  mapLayers: number;
  /** Niveaux des ennemis sauvages de la région. */
  minLevel: number;
  maxLevel: number;
  /** Types d'ennemis rencontrés dans la région. */
  types: MonsterType[];
  /**
   * Menace de la région : multiplicateur appliqué au budget de
   * caractéristiques des ennemis avant leur bornage (`STAT_FLOOR`).
   *
   * C'est le levier principal de la difficulté : le niveau seul ne permet pas
   * de descendre le palier — un ennemi d'un niveau de moins ne perd qu'~1.5
   * point de caractéristique. La **montée en puissance est progressive** : les
   * deux premières régions sont des lieux d'apprentissage, les derniers
   * paliers offrent nettement plus de résistance.
   */
  threat: number;
  /**
   * Écarts de niveau tirés pour un sauvage, autour du niveau du joueur
   * (avant bornage par `minLevel` / `maxLevel`). Les premières régions tirent
   * majoritairement *en dessous* du joueur, les dernières au-dessus.
   */
  wildLevelOffsets: readonly number[];
  bossName: string;
  bossType: MonsterType;
  /**
   * Éléments **débloqués** pour les prochains champions en battant le boss de
   * la région (« le type s'obtient en battant un boss »). Chaque région ouvre
   * l'élément de son propre boss ; la dernière, dont le boss est neutre
   * (`normal`, déjà le défaut), révèle les deux derniers éléments restants.
   */
  unlocks: readonly MonsterType[];
}

/** Progression roguelike : 4 régions, la 4ᵉ donne le titre de Champion. */
export const REGIONS: RegionDef[] = [
  {
    id: 'region-verdure',
    name: 'Plaines de Verdure',
    description: 'Collines douces où rôdent de jeunes créatures.',
    mapLayers: 8,
    minLevel: 2,
    maxLevel: 4,
    types: ['grass', 'normal', 'fire'],
    // Menaces rétarées (réglage Dragon Quest 2026-10) : après le rebasing du
    // champion (Instinct 12) et du tirage d'ennemi (8..12), le joueur est
    // structurellement en avant — la difficulté vient désormais des menaces.
    threat: 0.82,
    wildLevelOffsets: [-2, -1, 0],
    bossName: 'Gardien des Racines',
    bossType: 'grass',
    unlocks: ['grass'],
  },
  {
    id: 'region-abysse',
    name: "Rivages d'Abysse",
    description: 'Brouillards salés et créatures aquatiques.',
    mapLayers: 9,
    minLevel: 4,
    maxLevel: 7,
    types: ['water', 'grass', 'normal', 'electric'],
    threat: 0.84,
    wildLevelOffsets: [-1, -1, 0],
    bossName: 'Reine des Flots',
    bossType: 'water',
    unlocks: ['water'],
  },
  {
    id: 'region-braise',
    name: 'Volcan de Braise',
    description: 'Un volcan grondant, gardé par les titans du feu.',
    mapLayers: 10,
    minLevel: 7,
    maxLevel: 10,
    types: ['fire', 'normal', 'water', 'rock'],
    threat: 0.86,
    wildLevelOffsets: [-1, 0, 0],
    bossName: 'Dragon de Magma',
    bossType: 'fire',
    unlocks: ['fire'],
  },
  {
    id: 'region-celeste',
    name: 'Citadelle Céleste',
    description: 'Dernier rempart avant le titre de Champion.',
    mapLayers: 11,
    minLevel: 10,
    maxLevel: 13,
    types: ['fire', 'water', 'grass', 'normal', 'electric', 'rock'],
    threat: 0.92,
    wildLevelOffsets: [0, 0, 1],
    bossName: 'Titan Élémentaire',
    bossType: 'normal',
    unlocks: ['electric', 'rock'],
  },
];