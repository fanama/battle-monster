import type { Monster } from '../entities/Monster';
import type { Move } from '../entities/Move';

export interface BattleLog {
  message: string;
  // Add a payload to signal a level up to the store
  payload?: {
    leveledUp?: boolean;
  };
}

export class BattleEngine {
  calculateDamage(attacker: Monster, defender: Monster, move: Move): number {
    let typeMultiplier = 1;

    // 1. Type Effectiveness Logic
    // Fire > Grass > Water > Fire
    const table: Record<string, Record<string, number>> = {
      fire: { grass: 2, water: 0.5 },
      water: { fire: 2, grass: 0.5 },
      grass: { water: 2, fire: 0.5 },
      normal: {} // Normal is neutral against everything
    };

    if (table[move.type] && table[move.type][defender.type]) {
      typeMultiplier = table[move.type][defender.type];
    }

    // 2. Determine Critical Hit
    // We use the modified speed (speed * multiplier) to calculate crit chance
    const effectiveSpeed = attacker.speed * attacker.speedMultiplier;
    const critChance = 0.05 + (effectiveSpeed / 200);
    const isCritical = Math.random() < critChance;
    const critMultiplier = isCritical ? 2 : 1;

    // 3. Determine Stats with Multipliers
    let attackStat: number;

    // Use Physical (Strength) or Special (Intelligence)
    if (move.isPhysical) {
      attackStat = attacker.strength * attacker.attackMultiplier;
    } else {
      attackStat = attacker.intelligence * attacker.attackMultiplier;
    }

    // Defense uses Constitution modified by the multiplier
    const defenseStat = defender.constitution * defender.defenseMultiplier;

    // 4. Calculate Damage
    // Formula: (Power * (Modified Atk / Modified Def))
    // We use Math.max(1, ...) for defense to avoid division by zero
    const baseDamage = move.power * (attackStat / Math.max(1, defenseStat));

    // Apply multipliers: 0.5 is a balancing constant
    let finalDamage = Math.floor((baseDamage * 0.5) * critMultiplier * typeMultiplier);

    // 5. Final Guard
    // Ensure at least 1 damage if the move has power
    if (finalDamage < 1 && move.power > 0) {
      finalDamage = 1;
    }

    return finalDamage;
  }

  calculateExperienceGained(attacker: Monster, defender: Monster): number {
    const levelDifference = defender.level - attacker.level;
    const levelMultiplier = Math.pow(1.9, levelDifference);
    const baseExperience = 100; // Base exp for any defeat

    let experience = Math.floor(baseExperience * levelMultiplier);

    if (experience <= 0) {
      experience = 50;
    }

    return experience;
  }

  executeTurn(attacker: Monster, defender: Monster, chosenMove: Move): BattleLog[] {
    const logs: BattleLog[] = [];

    // 1. Validation: Does the monster know the move?
    const actualMoveInstance = attacker.moves.find(m => m.id === chosenMove.id);
    if (!actualMoveInstance) {
      logs.push({ message: `Erreur : Le monstre ne connaît pas ce mouvement.` });
      return logs;
    }

    // 2. Cooldown Check
    if (actualMoveInstance.coolDown && actualMoveInstance.coolDown > 0) {
      logs.push({
        message: `${attacker.name} échoue ! ${actualMoveInstance.name} est en recharge (${actualMoveInstance.coolDown} tours).`
      });
      return logs;
    }

    // 3. Execution Start
    logs.push({ message: `${attacker.name} utilise ${actualMoveInstance.name}!` });

    // --- NEW: Dodge Logic ---
    let isDodged = false;
    if (actualMoveInstance.power > 0) {
      // Calculate effective speeds including modifiers
      const attackerSpeed = attacker.speed * attacker.speedMultiplier;
      const defenderSpeed = defender.speed * defender.speedMultiplier;

      // Dodge Formula: Base 30% + a bonus based on the speed difference
      // If defender is twice as fast, chance is roughly 15-20%
      const dodgeChance = 0.3 + Math.max(0.1, (defenderSpeed - attackerSpeed) / 200);

      // Cap dodge at 40% so the game remains playable
      const finalDodgeChance = Math.min(0.40, dodgeChance);
      const chance = Math.random()

      console.log({ dodgeChance, chance, finalDodgeChance })

      if (chance < finalDodgeChance) {
        isDodged = true;
        logs.push({ message: `${defender.name} esquive l'attaque avec agilité !` });
      }
    }

    // --- Sub-Step A: Damage Dealing (Only if NOT dodged) ---
    if (actualMoveInstance.power > 0 && !isDodged) {
      const damage = this.calculateDamage(attacker, defender, actualMoveInstance);
      defender.takeDamage(damage);
      logs.push({ message: `Cela inflige ${damage} dégâts !` });
    }

    // --- Sub-Step B: Healing (Self-targeted, cannot be dodged) ---
    if (actualMoveInstance.healPercentage) {
      const healAmount = Math.floor(attacker.maxHp * actualMoveInstance.healPercentage);
      attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
      logs.push({ message: `${attacker.name} récupère ${healAmount} PV !` });
    }

    // --- Sub-Step C: Stat Boosting (Self-targeted, cannot be dodged) ---
    if (actualMoveInstance.statBoosts) {
      attacker.applyBoosts(actualMoveInstance.statBoosts);
      logs.push({ message: `Les statistiques de ${attacker.name} augmentent !` });
    }

    // 4. Cooldown Management (Always happens, even on dodge)
    attacker.moves.forEach((move) => {
      if (move.id === actualMoveInstance.id && move.maxCoolDown) {
        move.coolDown = move.maxCoolDown;
      } else if (move.coolDown && move.coolDown > 0) {
        move.coolDown -= 1;
      }
    });

    // 5. Post-Turn Check
    if (defender.isFainted()) {
      logs.push({ message: `${defender.name} est K.O. !` });
      const expGained = this.calculateExperienceGained(attacker, defender);
      const { leveledUp, logs: expLogs } = attacker.gainExperience(expGained);
      expLogs.forEach(logMessage => logs.push({ message: logMessage }));

      if (leveledUp) {
        logs.push({
          message: `(System) ${attacker.name} a gagné un niveau !`,
          payload: { leveledUp: true }
        });
      }
    }

    return logs;
  }
}
