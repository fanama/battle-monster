import type { RunPhase } from '../core/entities/BattleState';

/** Onglets du run (mobile first : 5 à 6 onglets, largeurs égales, aucun débordement). */
export type RunTabId = 'arena' | 'map' | 'shop' | 'champion' | 'relics' | 'logs';

export interface RunTab {
  id: RunTabId;
  label: string;
  icon: string;
  /** Pastille animée : signale une action attendue du joueur sur cet onglet. */
  alert?: boolean;
  /** Compteur affiché en badge (ex. nombre de reliques obtenues). */
  badge?: number;
}

/**
 * Onglet à afficher automatiquement quand la phase de run change.
 * Les phases de résolution (`relic`, `regionClear`) restent sur l'arène.
 */
export function tabForPhase(phase: RunPhase): RunTabId {
  switch (phase) {
    case 'map':
      return 'map';
    case 'shop':
      return 'shop';
    default:
      return 'arena';
  }
}
