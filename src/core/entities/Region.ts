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
  bossName: string;
  bossType: MonsterType;
}

/** Progression roguelike : 4 régions, la 4ᵉ donne le titre de Champion. */
export const REGIONS: RegionDef[] = [
  {
    id: 'region-verdure',
    name: 'Plaines de Verdure',
    description: 'Collines douces où rôdent de jeunes créatures.',
    mapLayers: 4,
    minLevel: 2,
    maxLevel: 4,
    types: ['grass', 'normal', 'fire'],
    bossName: 'Gardien des Racines',
    bossType: 'grass',
  },
  {
    id: 'region-abysse',
    name: "Rivages d'Abysse",
    description: 'Brouillards salés et créatures aquatiques.',
    mapLayers: 5,
    minLevel: 4,
    maxLevel: 7,
    types: ['water', 'grass', 'normal', 'electric'],
    bossName: 'Reine des Flots',
    bossType: 'water',
  },
  {
    id: 'region-braise',
    name: 'Volcan de Braise',
    description: 'Un volcan grondant, gardé par les titans du feu.',
    mapLayers: 6,
    minLevel: 7,
    maxLevel: 10,
    types: ['fire', 'normal', 'water', 'rock'],
    bossName: 'Dragon de Magma',
    bossType: 'fire',
  },
  {
    id: 'region-celeste',
    name: 'Citadelle Céleste',
    description: 'Dernier rempart avant le titre de Champion.',
    mapLayers: 7,
    minLevel: 10,
    maxLevel: 13,
    types: ['fire', 'water', 'grass', 'normal', 'electric', 'rock'],
    bossName: 'Titan Élémentaire',
    bossType: 'normal',
  },
];