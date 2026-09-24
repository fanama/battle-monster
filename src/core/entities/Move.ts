export type MonsterType = 'fire' | 'water' | 'grass' | 'normal' | 'electric' | 'rock';

export const TYPE_LABELS: Record<MonsterType, string> = {
  fire: 'Feu',
  water: 'Eau',
  grass: 'Plante',
  normal: 'Normal',
  electric: 'Électricité',
  rock: 'Roche',
};

export type MonsterStat =
  | 'strength'
  | 'speed'
  | 'constitution'
  | 'charisma'
  | 'wisdom'
  | 'instinct';

/** Libellés FR des stats (mécanique + affichage). */
export const STAT_LABELS: Record<MonsterStat, string> = {
  strength: 'Force',
  speed: 'Vitesse',
  constitution: 'Constitution',
  charisma: 'Charisme',
  wisdom: 'Savoir',
  instinct: 'Instinct',
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
  // Les capacités de soin suivent la règle D&D : (niveau + 1)d4 + mod(Constitution) + mod(Savoir)
  isHeal?: boolean;
  statBoosts?: StatBoost;
}

/**
 * Précision d'un move : bonus de toucher ajouté au jet `1d20` (inversé à la
 * puissance). Les attaques faibles sont **fiables**, les puissantes sont
 * **hasardeuses** (ratio précision/puissance classique RPG) — il ne s'agit pas
 * du bonus de dégâts (celui-ci reste tiré de `power` dans le moteur).
 *
 * `max(0, floor((120 - power) / 15))` → touché +6 (p. 30) … +0 (p. ≥ 120).
 */
export function moveAccuracyBonus(move: Move): number {
  if (move.power <= 0) return 0;
  return Math.max(0, Math.floor((120 - move.power) / 15));
}