import type { MoveStatusEffect } from './StatusEffect';
export type { MoveStatusEffect };

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
  /**
   * Capacité de soin (sur soi-même). Le jet suit la règle D&D :
   * `(niveau + 1)d4 + mod(CON) + max(0, mod(SAV)) + max(0, mod(CHA))`, **plus**
   * `healPower`. Jamais soumis au jet d'attaque : un move de soin garde
   * `power: 0` pour ne pas déclencher la branche de dégâts de `executeTurn`.
   */
  isHeal?: boolean;
  /**
   * Gradation des soins, en PV (`BattleEngine.applyHeal`). C'est ce champ —
   * et non `power` — qui distingue les sorts de soin entre eux : `power`
   * reste 0 pour qu'un soin ne soit jamais résolu comme une attaque.
   */
  healPower?: number;
  statBoosts?: StatBoost;
  statusEffect?: MoveStatusEffect;
  /**
   * **Coup mortel** façon Dragon Quest (会心の一撃) : la capacité ne passe par
   * **aucun jet contre la CA** (elle touche toujours) et **ignore la défense**
   * de la victime (sa réduction de Constitution).
   *
   * Elle ne double **pas** les dés de dégâts : sa valeur vient de la fiabilité
   * (jamais de fumble, jamais de raté, armure traversée), pas du plafond de
   * dégâts — c'est ce qui lui permet d'occuper un palier de puissance médian
   * sans devenir une exécution.
   */
  guaranteedCrit?: boolean;
  /**
   * **Charge** façon « ちからため » : sacrifie l'offensive du tour pour armer la
   * **prochaine attaque** d'un multiplicateur de dégâts
   * (`CHARGE_DAMAGE_MULTIPLIER`), consommé par le premier coup qui **touche**
   * (une attaque ratée laisse la charge en place).
   */
  charge?: boolean;
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