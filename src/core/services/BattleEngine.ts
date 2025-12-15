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
  calculateDamage(attacker: Monster, defender: Monster, move: Move) {
    let typeMultiplier = 1;

    // 1. Type Effectiveness
    if (move.type === 'fire' && defender.type === 'grass') typeMultiplier = 2;
    if (move.type === 'water' && defender.type === 'fire') typeMultiplier = 2;
    if (move.type === 'grass' && defender.type === 'water') typeMultiplier = 2;

    // 2. Determine Critical Hit
    // Example Logic: Base 5% chance + (Attacker Speed / 2)%
    // If Speed is 10, chance is 10%. If Speed is 50, chance is 30%.
    const critChance = 0.05 + (attacker.speed / 200);
    const isCritical = Math.random() < critChance;
    const critMultiplier = isCritical ? 2 : 1;

    // 3. Determine Stats
    let attackStat: number;
    let defenseStat: number = defender.constitution;

    if ((move as any).isPhysical) { // Assuming 'isPhysical' exists on Move
      attackStat = attacker.strength;
    } else {
      attackStat = attacker.intelligence;
    }

    // 4. Calculate Damage
    // Formula: (Power * (Atk/Def) * Crit) / 2 * TypeMultiplier
    const baseDamage = move.power * (attackStat / defenseStat);

    // Apply multipliers
    let finalDamage = Math.floor((baseDamage * 0.5) * critMultiplier * typeMultiplier);

    // Ensure at least 1 damage if the move has power
    if (finalDamage < 1 && move.power > 0) {
      finalDamage = 1;
    }

    return finalDamage
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
    const actualMoveInstance = attacker.moves.find(m => m.id === chosenMove.id);

    if (!actualMoveInstance) {
      logs.push({ message: `Erreur : Le monstre ne connaît pas ce mouvement.` });
      return logs;
    }

    if (actualMoveInstance.coolDown && actualMoveInstance.coolDown > 0) {
      logs.push({
        message: `${attacker.name} échoue ! ${actualMoveInstance.name} est en recharge (${actualMoveInstance.coolDown} tours).`
      });
      return logs;
    }

    logs.push({ message: `${attacker.name} utilise ${actualMoveInstance.name}!` });

    const damage = this.calculateDamage(attacker, defender, actualMoveInstance);
    defender.takeDamage(damage);

    logs.push({ message: `Cela inflige ${damage} dégâts !` });

    attacker.moves.forEach((move) => {
      if (move.id === actualMoveInstance.id && move.maxCoolDown) {
        if (move.maxCoolDown > 0) {
          move.coolDown = move.maxCoolDown;
        }
      } else {
        if (move.coolDown && move.coolDown > 0) {
          move.coolDown -= 1;
        }
      }
    });

    if (defender.isFainted()) {
      logs.push({ message: `${defender.name} est K.O. !` });

      const expGained = this.calculateExperienceGained(attacker, defender);
      const { leveledUp, logs: expLogs } = attacker.gainExperience(expGained);

      expLogs.forEach(logMessage => logs.push({ message: logMessage }));

      if (leveledUp) {
        logs.push({
          message: `(System) ${attacker.name} has leveled up!`,
          payload: { leveledUp: true }
        });
      }
    }

    return logs;
  }
}
