import type { BattleState } from '../entities/BattleState';
import type { Monster } from '../entities/Monster';
import type { Move } from '../entities/Move';

export interface BattleLog {
  message: string;
}


export class BattleEngine {
  calculateDamage(attacker: Monster, defender: Monster, move: Move): number {
    let multiplier = 1;

    // 1. Logique des types (Super Efficace)
    // Logique simplifiée des types
    if (move.type === 'fire' && defender.type === 'grass') multiplier = 2;
    if (move.type === 'water' && defender.type === 'fire') multiplier = 2;
    if (move.type === 'grass' && defender.type === 'water') multiplier = 2;
    // Si vous voulez ajouter une résistance :
    // if (move.type === 'fire' && defender.type === 'fire') multiplier = 0.5;

    // 2. Calcul des statistiques (Attaque vs. Défense)
    let attackStat: number;
    let defenseStat: number = defender.constitution; // La Constitution sert de défense physique/magique de base

    if ((move as any).isPhysical) {
      attackStat = attacker.strength;
      // Pour une logique plus fine, on pourrait faire: defenseStat = defender.constitution;
    } else {
      attackStat = attacker.intelligence;
      // Pour une logique plus fine, on pourrait faire: defenseStat = defender.sagesse;
    }

    // Formule de dégâts standard (simplifiée, inspirée de Pokémon) :
    // Dégâts = ( (2 * Niveau / 5 + 2) * Puissance * (Attaque / Défense) / 50 + 2 ) * Multiplicateur
    // Puisque nous n'avons pas de niveau, nous utilisons une version plus simple:

    const baseDamage = move.power * (attackStat / defenseStat);

    let finalDamage = Math.floor((baseDamage * 0.5) * multiplier);

    // S'assurer que les dégâts sont au moins de 1 si l'attaque a eu lieu.
    if (finalDamage < 1 && move.power > 0) {
      finalDamage = 1;
    }

    return finalDamage;
  }


  executeTurn(attacker: Monster, defender: Monster, chosenMove: Move): BattleLog[] {
    const logs: BattleLog[] = [];

    // --- 1. Find the REAL move instance in the attacker's state ---
    // We match by ID to be safe, in case 'chosenMove' is a copy from the UI
    const actualMoveInstance = attacker.moves.find(m => m.id === chosenMove.id);

    if (!actualMoveInstance) {
      logs.push({ message: `Erreur : Le monstre ne connaît pas ce mouvement.` });
      return logs;
    }

    // --- 2. Validation: Cooldown ---
    if (actualMoveInstance.coolDown && actualMoveInstance.coolDown > 0) {
      logs.push({
        message: `${attacker.name} échoue ! ${actualMoveInstance.name} est en recharge (${actualMoveInstance.coolDown} tours).`
      });
      return logs;
    }

    // --- 3. Execution ---
    logs.push({ message: `${attacker.name} utilise ${actualMoveInstance.name}!` });

    const damage = this.calculateDamage(attacker, defender, actualMoveInstance);
    defender.takeDamage(damage); // Direct mutation of defender state

    logs.push({ message: `Cela inflige ${damage} dégâts !` });

    // --- 4. Cooldown Mutation ---
    // We iterate over the ATTACKER'S moves to update their state
    attacker.moves.forEach((move) => {

      // CASE A: The move we just used
      if (move.id === actualMoveInstance.id && move.maxCoolDown) {
        if (move.maxCoolDown > 0) {
          move.coolDown = move.maxCoolDown;
          logs.push({ message: `(System) ${move.name} doit recharger.` });
        }
      }
      // CASE B: Other moves (recover logic)
      else {
        if (move.coolDown && move.coolDown > 0) {
          move.coolDown -= 1;
        }
      }
    });

    // --- 5. Faint Check ---
    if (defender.isFainted()) {
      logs.push({ message: `${defender.name} est K.O. !` });
    }

    return logs;
  }
}
