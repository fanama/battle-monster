export type MonsterType = 'fire' | 'water' | 'grass' | 'normal';

export const TYPE_LABELS: Record<MonsterType, string> = {
  fire: 'Feu',
  water: 'Eau',
  grass: 'Plante',
  normal: 'Normal',
};

export type MonsterStat =
  | 'strength'
  | 'speed'
  | 'constitution'
  | 'intelligence'
  | 'charisma'
  | 'wisdom';

/** Libellés FR des stats (mécanique + affichage). */
export const STAT_LABELS: Record<MonsterStat, string> = {
  strength: 'Force',
  speed: 'Vitesse',
  constitution: 'Constitution',
  intelligence: 'Savoir',
  charisma: 'Charisme',
  wisdom: 'Instinct',
};

/**
 * Additive stat buff, mirroring the D&D `buff` rule (`{ stat, valeur }`).
 * Bonus is applied permanently to the target's base stat.
 */
export interface StatBoost {
  stat: MonsterStat;
  value: number;
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
  // Healing moves follow the D&D potion rule: 2d4 + mod(Constitution)
  isHeal?: boolean;
  statBoosts?: StatBoost;
}