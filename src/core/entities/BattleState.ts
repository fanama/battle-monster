import type { CombatFeedback } from '../services/BattleEngine';
import type { Monster } from './Monster';
import type { Move } from './Move';
import type { Relic } from './Relic';

/** Phase de la run roguelike (machine à états du run). */
export type RunPhase = 'starter' | 'encounter' | 'relic' | 'regionClear' | 'victory' | 'runover';

export interface RunState {
  phase: RunPhase;
  /** Index de la région courante (REGIONS). */
  regionIndex: number;
  /** Combats sauvages remportés dans la région courante. */
  encounterIndex: number;
  relics: Relic[];
  score: number;
  relicOffers: Relic[] | null;
}

/** État complet du combat + run — interface unique partagée par le store et le contrôleur. */
export interface BattleState {
  playerMonster: Monster | null;
  enemyMonster: Monster | null;
  logs: string[];
  isPlayerTurn: boolean;
  winner: 'player' | 'enemy' | null;
  isAttacking: boolean;
  isEnemyAttacking: boolean;
  playerLastMove: Move | null;
  enemyLastMove: Move | null;
  playerFeedback: CombatFeedback | null;
  enemyFeedback: CombatFeedback | null;
  isBossFight: boolean;
  run: RunState;
}