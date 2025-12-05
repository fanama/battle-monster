import type { Monster } from "./Monster";

export interface BattleState {
  playerMonster: Monster;
  enemyMonster: Monster;
  logs: string[];
  isPlayerTurn: boolean;
  winner: 'player' | 'enemy' | null;
}
