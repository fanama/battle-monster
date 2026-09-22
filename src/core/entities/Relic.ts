import type { MonsterStat } from './Move';

/**
 * Effets d'une relique (objet passif de run roguelike).
 * Tous les champs sont optionnels et se cumulent entre reliques.
 */
export interface RelicEffect {
  /** Bonus de stat permanent, appliqué au monstre à la prise (règle boost D&D). */
  stat?: Partial<Record<MonsterStat, number>>;
  /** Bonus d'armure permanent (ajouté à la CA à chaque combat). */
  acBonus?: number;
  /** % des PV max soignés au début de chaque combat. */
  healStartPercent?: number;
  /** % des dégâts infligés restitués en PV (vol de vie). */
  lifestealPercent?: number;
  /** % de dégâts infligés supplémentaires. */
  damagePercent?: number;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: RelicEffect;
}

export const RELIC_CATALOG: Relic[] = [
  {
    id: 'relic-gauntlet',
    name: 'Gants de Fer',
    description: '+2 Force (permanent)',
    icon: '🥊',
    effect: { stat: { strength: 2 } },
  },
  {
    id: 'relic-scarf',
    name: 'Écharpe du Vent',
    description: '+3 Vitesse (permanent, +CA)',
    icon: '💨',
    effect: { stat: { speed: 3 } },
  },
  {
    id: 'relic-heart',
    name: 'Cœur de Titan',
    description: '+3 Constitution (PV max suivent)',
    icon: '❤️',
    effect: { stat: { constitution: 3 } },
  },
  {
    id: 'relic-crown',
    name: 'Couronne de Savoir',
    description: '+3 Intelligence (magie)',
    icon: '🧠',
    effect: { stat: { intelligence: 3 } },
  },
  {
    id: 'relic-plate',
    name: "Plaque d'Acier",
    description: '+2 à la CA (armure)',
    icon: '🛡️',
    effect: { acBonus: 2 },
  },
  {
    id: 'relic-bandage',
    name: 'Bandages Sacrés',
    description: 'Soigne 15 % des PV max au début de chaque combat',
    icon: '🩹',
    effect: { healStartPercent: 15 },
  },
  {
    id: 'relic-crystal',
    name: 'Cristal Vampire',
    description: 'Vol de vie : 20 % des dégâts infligés',
    icon: '🔮',
    effect: { lifestealPercent: 20 },
  },
  {
    id: 'relic-rune',
    name: 'Rune de Rage',
    description: '+10 % de dégâts infligés',
    icon: '⚔️',
    effect: { damagePercent: 10 },
  },
];

/** % de dégâts supplémentaires cumulés (reliques joueur). */
export function relicDamagePercent(relics: Relic[]): number {
  return relics.reduce((sum, r) => sum + (r.effect.damagePercent ?? 0), 0);
}

/** % de vol de vie cumulés (reliques joueur). */
export function relicLifestealPercent(relics: Relic[]): number {
  return relics.reduce((sum, r) => sum + (r.effect.lifestealPercent ?? 0), 0);
}

/** % de PV max soignés au début de combat, cumulés. */
export function relicHealStartPercent(relics: Relic[]): number {
  return relics.reduce((sum, r) => sum + (r.effect.healStartPercent ?? 0), 0);
}

/**
 * Retourne `count` reliques distinctes au hasard.
 * `random` est injectable pour des tests déterministes (défaut : Math.random).
 */
export function rollRelicOffers(count = 3, random: () => number = Math.random): Relic[] {
  const pool = [...RELIC_CATALOG];
  const offers: Relic[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const index = Math.floor(random() * pool.length);
    offers.push(pool.splice(index, 1)[0]);
  }
  return offers;
}