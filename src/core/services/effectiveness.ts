import type { MonsterType } from '../entities/Move';

/**
 * Efficacité des types (dégâts physiques) : multiplicateur plein ×2 / ×0.5.
 *
 * **Table de tournoi régulière** : chacun des cinq types élémentaires dame
 * exactement deux autres types et en perd deux. Aucune relation n'est
 * « morte » (si A est faible devant B, B est forcément fort devant A) et
 * aucun type n'est avantagé. Le triangle historique du jeu est conservé :
 * Feu > Plante > Eau > Feu.
 *
 *   Feu       bat Plante, Électricité   │ cédé à Eau, Roche
 *   Eau       bat Feu, Roche             │ cédé à Plante, Électricité
 *   Plante    bat Eau, Roche             │ cédé à Feu, Électricité
 *   Électricité bat Plante, Eau          │ cédé à Feu, Roche
 *   Roche     bat Feu, Électricité       │ cédé à Eau, Plante
 *   Normal    neutre (`normal` n'a ni force ni faiblesse)
 */
export const TYPE_MULTIPLIER: Record<MonsterType, Partial<Record<MonsterType, number>>> = {
  fire: { grass: 2, electric: 2, water: 0.5, rock: 0.5 },
  water: { fire: 2, rock: 2, grass: 0.5, electric: 0.5 },
  grass: { water: 2, rock: 2, fire: 0.5, electric: 0.5 },
  electric: { grass: 2, water: 2, fire: 0.5, rock: 0.5 },
  rock: { fire: 2, electric: 2, water: 0.5, grass: 0.5 },
  normal: {},
};

/**
 * Efficacité des types (magie) : **dampée** (×1.5 / ×0.67) pour que les gros
 * bursts de Savoir ne one-shot plus les monstres. Même structure réciproque
 * que la table physique.
 */
export const MAGIC_TYPE_MULTIPLIER: Record<MonsterType, Partial<Record<MonsterType, number>>> = {
  fire: { grass: 1.5, electric: 1.5, water: 0.67, rock: 0.67 },
  water: { fire: 1.5, rock: 1.5, grass: 0.67, electric: 0.67 },
  grass: { water: 1.5, rock: 1.5, fire: 0.67, electric: 0.67 },
  electric: { grass: 1.5, water: 1.5, fire: 0.67, rock: 0.67 },
  rock: { fire: 1.5, electric: 1.5, water: 0.67, grass: 0.67 },
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