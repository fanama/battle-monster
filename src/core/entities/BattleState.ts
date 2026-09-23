import type { CombatFeedback } from '../services/BattleEngine';
import type { Monster } from './Monster';
import type { Move } from './Move';
import type { Relic, ShopItem } from './Relic';
import type { RegionMap } from './RegionMap';

/** Phase de la run roguelike (machine à états du run). */
export type RunPhase =
  | 'starter'
  | 'map'
  | 'encounter'
  | 'shop'
  | 'relic'
  | 'regionClear'
  | 'victory'
  | 'runover';

export interface RunState {
  phase: RunPhase;
  /** Index de la région courante (REGIONS). */
  regionIndex: number;
  /** Carte de progression de la région courante (null hors run). */
  map: RegionMap | null;
  /** Couche de la carte sur laquelle se trouve le joueur. */
  mapLayer: number;
  /** Colonne choisie à chaque couche parcourue (chemin réellement pris). */
  path: number[];
  /** Or accumulé (boutiques et gains de combat). */
  gold: number;
  /** Stock de la boutique courante (null hors boutique). */
  shopStock: ShopItem[] | null;
  /** Combat en cours contre le boss de région (pour la sauvegarde). */
  bossBattle: boolean;
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