import type { MonsterType } from '../entities/Move';

/**
 * Efficacité des types (dégâts physiques) : multiplicateur plein ×2 / ×0.5.
 * Le cœur du jeu reste le triangle Feu > Plante > Eau > Feu ; les types ajoutés
 * s'y greffent : Électricité > Eau & Roche ; Roche > Feu ; Plante résiste à
 * l'Électricité (`normal` est neutre).
 */
export const TYPE_MULTIPLIER: Record<MonsterType, Partial<Record<MonsterType, number>>> = {
  fire: { grass: 2, water: 0.5, rock: 0.5 },
  water: { fire: 2, grass: 0.5, electric: 0.5 },
  grass: { water: 2, fire: 0.5 },
  electric: { water: 2, rock: 2, grass: 0.5 },
  rock: { fire: 2, water: 0.5, grass: 0.5 },
  normal: {},
};

/**
 * Efficacité des types (magie) : **dampée** (×1.5 / ×0.67) pour que les gros
 * bursts de Savoir ne one-shot plus les monstres (cf. rebalance §5).
 */
export const MAGIC_TYPE_MULTIPLIER: Record<MonsterType, Partial<Record<MonsterType, number>>> = {
  fire: { grass: 1.5, water: 0.67, rock: 0.67 },
  water: { fire: 1.5, grass: 0.67, electric: 0.67 },
  grass: { water: 1.5, fire: 0.67 },
  electric: { water: 1.5, rock: 1.5, grass: 0.67 },
  rock: { fire: 1.5, water: 0.67, grass: 0.67 },
  normal: {},
};

/**
 * Multiplicateur de type d'un move contre un type cible.
 * Fonction pure, partagée par le moteur (dégâts, IA) et l'UI (indicateur
 * « super efficace / peu efficace »).
 */
export function typeEffectiveness(
  moveType: MonsterType,
  defenderType: MonsterType,
  isPhysical = true
): number {
  const table = isPhysical ? TYPE_MULTIPLIER : MAGIC_TYPE_MULTIPLIER;
  return table[moveType]?.[defenderType] ?? 1;
}