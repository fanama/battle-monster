import { Monster } from '../../core/entities/Monster';
import type { MoveProvider } from '../../core/services/ports';
import type { MonsterType } from '../../core/entities/Move';

export interface MonsterDefinition {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  image: string;
  stats: {
    strength: number;
    speed: number;
    constitution: number;
    intelligence: number;
    charisma: number;
    wisdom: number;
  };
}

/**
 * Instancie un Monster à partir d'une définition : récupère les moves éligibles
 * (porte `MoveProvider` injecté), en tire jusqu'à 4 au hasard (`random`
 * injectée pour la testabilité) et clone l'état de cooldown par instance.
 */
export function createMonsterFromDefinition(
  def: MonsterDefinition,
  moveProvider: MoveProvider,
  random: () => number
): Monster {
  const eligibleMoves = moveProvider.getMovesForMonster({ type: def.type, level: def.level });
  const selectedMoves = [...eligibleMoves]
    .sort(() => 0.5 - random())
    .slice(0, 4);

  return new Monster(
    def.id,
    def.name,
    def.type,
    def.level,
    def.stats.strength,
    def.stats.speed,
    def.stats.constitution,
    def.stats.intelligence,
    def.stats.charisma,
    def.stats.wisdom,
    selectedMoves,
    def.image
  );
}