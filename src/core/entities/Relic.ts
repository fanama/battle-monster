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
  /** Range de critiques (1 = 20 seulement, 2 = 19-20, 3 = 18-20…). */
  critRange?: number;
  /** % d'EXP gagnée supplémentaire. */
  experiencePercent?: number;
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
  {
    id: 'relic-claws',
    name: 'Griffes de Sang',
    description: 'Vol de vie 12 % · Dégâts +5 %',
    icon: '🩸',
    effect: { lifestealPercent: 12, damagePercent: 5 },
  },
  {
    id: 'relic-cloak',
    name: "Cape de l'Ombre",
    description: 'Vitesse +2 · CA +1',
    icon: '🧥',
    effect: { stat: { speed: 2 }, acBonus: 1 },
  },
  {
    id: 'relic-vitality',
    name: 'Amulette de Vitalité',
    description: 'Constitution +2 · Soin de départ +10 %',
    icon: '📿',
    effect: { stat: { constitution: 2 }, healStartPercent: 10 },
  },
  {
    id: 'relic-crit',
    name: 'Talisman Critique',
    description: 'Critiques sur 19-20',
    icon: '🎯',
    effect: { critRange: 2 },
  },
  {
    id: 'relic-apprentice',
    name: "Médaillon de l'Apprenti",
    description: "+25 % d'EXP gagnée",
    icon: '🏅',
    effect: { experiencePercent: 25 },
  },
  {
    id: 'relic-beast-gauntlet',
    name: 'Gantelet de la Bête',
    description: 'Force +4',
    icon: '💪',
    effect: { stat: { strength: 4 } },
  },
  {
    id: 'relic-codex',
    name: 'Codex du Sage',
    description: 'Savoir +4',
    icon: '📖',
    effect: { stat: { intelligence: 4 } },
  },
  {
    id: 'relic-sea-tears',
    name: 'Larmes de la Mer',
    description: 'Soigne 25 % des PV max au début de combat',
    icon: '🌊',
    effect: { healStartPercent: 25 },
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

/** Range de critiques le plus élargi (2 → critiques sur 19-20). */
export function relicMaxCritRange(relics: Relic[]): number {
  return relics.reduce((max, r) => Math.max(max, r.effect.critRange ?? 0), 0);
}

/** % d'EXP gagnée supplémentaire, cumulés. */
export function relicExperiencePercent(relics: Relic[]): number {
  return relics.reduce((sum, r) => sum + (r.effect.experiencePercent ?? 0), 0);
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