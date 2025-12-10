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
    let multiplier = 1;

    if (move.type === 'fire' && defender.type === 'grass') multiplier = 2;
    if (move.type === 'water' && defender.type === 'fire') multiplier = 2;
    if (move.type === 'grass' && defender.type === 'water') multiplier = 2;

    let attackStat: number;
    let defenseStat: number = defender.constitution;

    if ((move as any).isPhysical) {
      attackStat = attacker.strength;
    } else {
      attackStat = attacker.intelligence;
    }

    const baseDamage = move.power * (attackStat / defenseStat);
    let finalDamage = Math.floor((baseDamage * 0.5) * multiplier);

    if (finalDamage < 1 && move.power > 0) {
      finalDamage = 1;
    }

    return finalDamage;
  }

  calculateExperienceGained(attacker: Monster, defender: Monster): number {
    const levelDifference = defender.level - attacker.level;
    const levelMultiplier = Math.pow(1.1, levelDifference);
    const baseExperience = 50; // Base exp for any defeat

    let experience = Math.floor(baseExperience * levelMultiplier);

    if (experience <= 0) {
        experience = 10;
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
