import { MAX_MOVES, Monster } from '../../core/entities/Monster';
import type { MoveProvider } from '../../core/services/ports';
import type { MonsterType, Move } from '../../core/entities/Move';

export interface MonsterDefinition {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  image?: string;
  stats: {
    strength: number;
    speed: number;
    constitution: number;
    charisma: number;
    wisdom: number;
    instinct: number;
  };
}

/**
 * Score de valeur d'un move (miroir de `moveScore` dans `BattleController`) :
 * le niveau de déblocage pèse ×100, puis la puissance. Un sort de soin compte
 * via `healPower` (il a `power: 0`).
 */
function moveScore(move: Move): number {
  return move.level * 100 + move.power + (move.healPower ?? 0);
}

/**
 * Instancie un Monster à partir d'une définition : récupère les moves éligibles
 * (porte `MoveProvider` injecté), en garde les `MAX_MOVES` **plus forts**, et
 * clone l'état de cooldown par instance.
 *
 * **Pourquoi « les plus forts » et non « 4 tirés au hasard »** : le tirage
 * aléatoire rendait la force d'un ennemi entièrement dépendant de sa chance.
 * Un ennemi ayant tiré les quatre meilleures capacités gagnait son duel, un
 * autre ayant tiré deux soins perdait contre le même champion — mesuré, cela
 * faisait osciller le taux de victoire de 5 % à 95 % à niveau égal. La
 * difficulté devenait du RNG non advertised. Les égalités de score sont
 * départagées au hasard (`random` injecté), donc deux monstres de même profil
 * restent malgré tout légèrement différents.
 */
export function createMonsterFromDefinition(
  def: MonsterDefinition,
  moveProvider: MoveProvider,
  random: () => number
): Monster {
  const eligibleMoves = moveProvider.getMovesForMonster({ type: def.type, level: def.level });
  const ranked = eligibleMoves
    .map((move) => ({ move, score: moveScore(move), tie: random() }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie);
  const selectedMoves = ranked.slice(0, MAX_MOVES).map(entry => entry.move);

  return new Monster(
    def.id,
    def.name,
    def.type,
    def.level,
    def.stats.strength,
    def.stats.speed,
    def.stats.constitution,
    def.stats.charisma,
    def.stats.wisdom,
    def.stats.instinct,
    selectedMoves,
    def.image ?? ''
  );
}
