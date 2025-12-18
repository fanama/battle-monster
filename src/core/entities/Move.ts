export type MonsterType = 'fire' | 'water' | 'grass' | 'normal';

export interface StatBoosts {
  attack?: number;
  defense?: number;
  speed?: number;
}
export interface Move {
  id: string;
  name: string;
  power: number;
  type: MonsterType;
  isPhysical: boolean;
  level: number;
  coolDown?: number;
  maxCoolDown?: number;
  healPercentage?: number; // e.g., 0.5 for 50% HP recovery
  statBoosts?: StatBoosts;  // e.g., { attack: 1.2 } for a 20% boost
}
