import type { Monster, MonsterRank } from '../entities/Monster';
import { abilityModifier } from '../entities/Monster';
import type { Move, MonsterStat, MonsterType } from '../entities/Move';
import { STAT_LABELS } from '../entities/Move';
import { typeEffectiveness } from './effectiveness';

export interface BattleLog {
  message: string;
  // Add a payload to signal a level up to the store
  payload?: {
    leveledUp?: boolean;
  };
}

/**
 * Structured visual feedback for the UI (floating numbers, flashes, shakes).
 */
export interface CombatFeedback {
  kind: 'damage' | 'heal' | 'buff' | 'fumble' | 'miss' | 'none';
  damage: number;
  isCrit: boolean;
}

export interface TurnResult {
  logs: BattleLog[];
  feedback: CombatFeedback;
}

/** Modificateurs de run (reliques) appliqués aux dégâts infligés. */
export interface BattleModifiers {
  /** Bonus de dégâts final en % (ex. 10 → ×1.10). */
  damagePercent?: number;
  /** Range de critiques élargi (2 → critiques sur 19-20). */
  critRange?: number;
  /** Bonus d'EXP gagnée en % (ex. 25 → ×1.25). */
  experiencePercent?: number;
}

/** Générateur de dés injectable — permet des tests déterministes. */
export interface Dice {
  roll(count: number, sides: number): number;
}

export const defaultDice: Dice = {
  roll(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  },
};

/**
 * Rang du monstre vaincu → multiplicateur d'XP (dnd : 10 PNJ / 20 minion /
 * 50 boss). Les boss rapportent nettement plus.
 */
export const RANK_XP_MULTIPLIER: Record<MonsterRank, number> = {
  normal: 1,
  boss: 1.5,
};

function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Maps a move's power to a weapon die face count (1d6…1d20).
 * Recalibré à la hausse (rebalance §5) : les mouvements physiques doivent
 * rester compétitifs face à la magie.
 */
function powerToDie(power: number): number {
  if (power < 40) return 6;
  if (power < 60) return 8;
  if (power < 80) return 10;
  if (power < 110) return 12;
  return 20;
}

/**
 * Bonus d'attaque d'un move, analogue au BonusDégâts d'une arme (ajouté au jet
 * ET aux dégâts) ou au BonusSort d'un sort.
 */
function moveHitBonus(move: Move): number {
  return Math.floor(move.power / 20);
}

/** Terme linéaire de la puissance d'un move physique (le move « pèse »). */
function movePowerFlat(move: Move): number {
  return Math.floor(move.power / 10);
}

export interface AttackOutcome {
  hit: boolean;
  crit: boolean;
  fumble: boolean;
  roll: number;
  total: number;
  ac: number;
  attackMod: number;
  bonus: number;
}

export interface DamageRoll {
  desc: string;
  total: number;
}

/**
 * Moteur de combat d20 (règles D&D).
 *
 * Sépare :
 *  1. la **résolution pure** (jets, dégâts, multiplicateurs — aucune mutation),
 *  2. l'**application des effets** (mutation des monstres : dégâts, soin, buff,
 *     cooldowns, exp/niveau),
 *  3. la **génération des logs + feedback**.
 *
 * Le générateur de dés (`Dice`) est injecté pour rendre les tours déterministes
 * dans les tests — principe d'injection de dépendance.
 */
export class BattleEngine {
  private readonly dice: Dice;

  constructor(deps: { dice?: Dice } = {}) {
    this.dice = deps.dice ?? defaultDice;
  }

  // --- 1. Résolution pure (aucune mutation) ---

  /**
   * D&D attack resolution:
   *  - arme physique : 1d20 + mod(Force) + Bonus
   *  - sort :          1d20 + mod(Savoir/i) + BonusSort
   *  - CA : 10 + mod(Vitesse)
   *  - 20 naturel → touche + critique ; 1 naturel → fumble (raté).
   *  - `critRange` élargit les jets de critique (ex. 2 → 19-20), reliques joueur.
   */
  resolveAttack(attacker: Monster, defender: Monster, move: Move, critRange = 1): AttackOutcome {
    const attackStat = move.isPhysical ? attacker.strength : attacker.intelligence;
    const attackMod = abilityModifier(attackStat);
    const bonus = moveHitBonus(move);
    const ac = defender.getAC();
    const roll = this.dice.roll(1, 20);
    const total = roll + attackMod + bonus;
    const fumble = roll === 1;
    const crit = !fumble && roll >= 21 - Math.max(1, critRange);
    const hit = !fumble && (roll === 20 || total >= ac);
    return { hit, crit, fumble, roll, total, ac, attackMod, bonus };
  }

  /**
   * D&D damage roll:
   *  - physique : 1dX + mod(Force) + Bonus (crit : 2dX)
   *  - magique :  Savoir(i) × 1.5 (crit : Savoir(i) × 3)
   */
  rollDamage(attacker: Monster, move: Move, crit: boolean): DamageRoll {
    if (move.isPhysical) {
      const sides = powerToDie(move.power);
      const count = crit ? 2 : 1;
      const total = this.dice.roll(count, sides)
        + movePowerFlat(move)
        + abilityModifier(attacker.strength)
        + moveHitBonus(move);
      return { desc: `${count}d${sides}+${movePowerFlat(move)}`, total: Math.max(1, total) };
    }
    const total = attacker.intelligence * 1.5 * (crit ? 2 : 1);
    return { desc: crit ? 'Savoir ×3' : 'Savoir ×1.5', total: Math.max(1, total) };
  }

  /**
   * Multiplicateur de type : ×2/×0.5 en physique, ×1.5/×0.67 en magie
   * (dampé pour éviter les one-shots, cf. rebalance §5).
   */
  typeMultiplier(moveType: MonsterType, defenderType: MonsterType, isPhysical = true): number {
    return typeEffectiveness(moveType, defenderType, isPhysical);
  }

  /** Dégâts finaux arrondis (multiplicateur de type × modificateurs de run). */
  computeFinalDamage(rawDamage: number, multiplier: number, modifiers?: BattleModifiers): number {
    const damageBonusFactor = modifiers?.damagePercent ? 1 + modifiers.damagePercent / 100 : 1;
    return Math.max(1, Math.floor(rawDamage * multiplier * damageBonusFactor));
  }

  calculateDamage(attacker: Monster, defender: Monster, move: Move): number {
    const outcome = this.resolveAttack(attacker, defender, move);
    if (!outcome.hit) return 0;
    const roll = this.rollDamage(attacker, move, outcome.crit);
    return this.computeFinalDamage(
      roll.total,
      this.typeMultiplier(move.type, defender.type, move.isPhysical)
    );
  }

  /**
   * XP gagnée : base 100 × évolution de niveau × rang du vaincu (boss ×1.5,
   * cf. dnd 10/20/50) × reliques d'EXP. Minimum 50.
   */
  calculateExperienceGained(attacker: Monster, defender: Monster, experiencePercent = 0): number {
    const levelDifference = defender.level - attacker.level;
    const levelMultiplier = Math.pow(1.9, levelDifference);
    const baseExperience = 100; // Base exp for any defeat
    const rankMultiplier = RANK_XP_MULTIPLIER[defender.rank] ?? 1;
    const relicMultiplier = 1 + experiencePercent / 100;

    let experience = Math.floor(baseExperience * levelMultiplier * rankMultiplier * relicMultiplier);

    if (experience <= 0) {
      experience = 50;
    }

    return experience;
  }

  // --- 2. Application des effets (mutation des monstres) ---

  /** Soin (règle potion D&D) : 2d4 + mod(Constitution), plafonné aux PV max. */
  applyHeal(attacker: Monster, move: Move): number {
    const healAmount = Math.max(1, this.dice.roll(2, 4) + abilityModifier(attacker.constitution));
    attacker.heal(healAmount);
    return healAmount;
  }

  /** Buff additif et permanent sur une stat (règle D&D). */
  applyBuff(attacker: Monster, move: Move): MonsterStat | null {
    const boost = move.statBoosts;
    if (!boost) return null;
    attacker.boostStat(boost.stat, boost.value);
    return boost.stat;
  }

  /** Cooldowns : la move utilisée entre en recharge, les autres décrémentent. */
  manageCooldowns(attacker: Monster, usedMove: Move): void {
    attacker.moves.forEach(move => {
      if (move.id === usedMove.id && move.maxCoolDown) {
        move.coolDown = move.maxCoolDown;
      } else if (move.coolDown && move.coolDown > 0) {
        move.coolDown -= 1;
      }
    });
  }

  /** Récompenses de défaite : exp + montée de niveau(s) de l'attaquant. */
  applyDefeatRewards(
    attacker: Monster,
    defender: Monster,
    experiencePercent?: number
  ): { leveledUp: boolean; logs: BattleLog[] } {
    const experience = this.calculateExperienceGained(attacker, defender, experiencePercent);
    const { leveledUp, logs: expMessages } = attacker.gainExperience(experience);
    return { leveledUp, logs: expMessages.map(message => ({ message })) };
  }

  // --- 3. Orchestration du tour ---

  executeTurn(attacker: Monster, defender: Monster, chosenMove: Move, modifiers?: BattleModifiers): TurnResult {
    const logs: BattleLog[] = [];
    let feedback: CombatFeedback = { kind: 'none', damage: 0, isCrit: false };

    // 1. Validation: Does the monster know the move?
    const actualMoveInstance = attacker.moves.find(m => m.id === chosenMove.id);
    if (!actualMoveInstance) {
      logs.push({ message: `Erreur : Le monstre ne connaît pas ce mouvement.` });
      return { logs, feedback };
    }

    // 2. Cooldown Check
    if (actualMoveInstance.coolDown && actualMoveInstance.coolDown > 0) {
      logs.push({
        message: `${attacker.name} échoue ! ${actualMoveInstance.name} est en recharge (${actualMoveInstance.coolDown} tours).`,
      });
      return { logs, feedback };
    }

    // 3. Execution Start
    logs.push({ message: `${attacker.name} utilise ${actualMoveInstance.name}!` });

    // 4. Damaging move: D&D d20 attack resolution
    let isFumble = false;
    if (actualMoveInstance.power > 0) {
      const outcome = this.resolveAttack(attacker, defender, actualMoveInstance, modifiers?.critRange ?? 1);

      if (outcome.fumble) {
        isFumble = true;
        feedback = { kind: 'fumble', damage: 0, isCrit: false };
        logs.push({
          message: `❌ ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! [1d20 = 1] ❌ Raté (fumble) !`,
        });
      } else if (outcome.hit) {
        const roll = this.rollDamage(attacker, actualMoveInstance, outcome.crit);
        const multiplier = this.typeMultiplier(actualMoveInstance.type, defender.type, actualMoveInstance.isPhysical);
        const final = this.computeFinalDamage(roll.total, multiplier, modifiers);
        defender.takeDamage(final);
        feedback = { kind: 'damage', damage: final, isCrit: outcome.crit };

        const critMark = outcome.crit ? ' 💥 CRITIQUE !' : '';
        const signature = `[1d20${sign(outcome.attackMod)}${sign(outcome.bonus)} = ${outcome.total}]`;
        const effective = multiplier !== 1 ? ` (×${multiplier})` : '';

        logs.push({
          message: `🎯${critMark} ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! ` +
            `Jet ${signature} vs CA ${outcome.ac} → Touché ! Dégâts : ${roll.total}${effective} = ${final}.`,
        });
      } else {
        feedback = { kind: 'miss', damage: 0, isCrit: false };
        logs.push({
          message: `❌ ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! ` +
            `Jet [1d20${sign(outcome.attackMod)}${sign(outcome.bonus)} = ${outcome.total}] < CA ${outcome.ac} → Raté !`,
        });
      }
    }

    // 5. Healing (self, D&D potion rule): 2d4 + mod(Constitution)
    if (actualMoveInstance.isHeal && !isFumble) {
      const healAmount = this.applyHeal(attacker, actualMoveInstance);
      feedback = { kind: 'heal', damage: healAmount, isCrit: false };
      logs.push({ message: `🧪 ${attacker.name} récupère ${healAmount} PV !` });
    }

    // 6. Stat Buffing (self, permanent additive boost — D&D buff rule)
    if (actualMoveInstance.statBoosts && !isFumble) {
      const stat = this.applyBuff(attacker, actualMoveInstance);
      if (stat) {
        feedback = { kind: 'buff', damage: actualMoveInstance.statBoosts.value, isCrit: false };
        logs.push({
          message: `✨ Les statistiques de ${attacker.name} augmentent : +${actualMoveInstance.statBoosts.value} ${STAT_LABELS[stat]} (permanent).`,
        });
      }
    }

    // 7. Cooldown Management (always, even on fumble)
    this.manageCooldowns(attacker, actualMoveInstance);

    // 8. Post-Turn Check
    if (defender.isFainted()) {
      logs.push({ message: `☠️ ${defender.name} est K.O. !` });
      const { leveledUp, logs: expLogs } = this.applyDefeatRewards(attacker, defender, modifiers?.experiencePercent);
      expLogs.forEach(log => logs.push(log));

      if (leveledUp) {
        logs.push({
          message: `(System) ${attacker.name} a gagné un niveau !`,
          payload: { leveledUp: true },
        });
      }
    }

    return { logs, feedback };
  }
}