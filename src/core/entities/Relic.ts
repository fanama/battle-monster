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
  /** Prix en or (boutique). Les reliques gagnées en combat restent gratuites. */
  price: number;
}

/** Article vendu en boutique. */
export type ShopItemKind = 'relic' | 'heal';

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  price: number;
  label: string;
  icon: string;
  desc: string;
  /** Relique vendue (si `kind === 'relic'`). */
  relic?: Relic;
  /** Acheté dans la boutique courante (état local). */
  bought?: boolean;
}

export const RELIC_CATALOG: Relic[] = [
  {
    id: 'relic-gauntlet',
    name: 'Gants de Fer',
    description: '+2 Force (permanent)',
    icon: '🥊',
    effect: { stat: { strength: 2 } },
    price: 50,
  },
  {
    id: 'relic-scarf',
    name: 'Écharpe du Vent',
    description: '+3 Vitesse (permanent, +CA)',
    icon: '💨',
    effect: { stat: { speed: 3 } },
    price: 55,
  },
  {
    id: 'relic-heart',
    name: 'Cœur de Titan',
    description: '+3 Constitution (PV max suivent)',
    icon: '❤️',
    effect: { stat: { constitution: 3 } },
    price: 60,
  },
  {
    id: 'relic-crown',
    name: 'Couronne de Savoir',
    description: '+3 Savoir (bonus général)',
    icon: '🧠',
    effect: { stat: { wisdom: 3 } },
    price: 60,
  },
  {
    id: 'relic-plate',
    name: "Plaque d'Acier",
    description: '+2 à la CA (armure)',
    icon: '🛡️',
    effect: { acBonus: 2 },
    price: 65,
  },
  {
    id: 'relic-bandage',
    name: 'Bandages Sacrés',
    description: 'Soigne 15 % des PV max au début de chaque combat',
    icon: '🩹',
    effect: { healStartPercent: 15 },
    price: 70,
  },
  {
    id: 'relic-crystal',
    name: 'Cristal Vampire',
    description: 'Vol de vie : 20 % des dégâts infligés',
    icon: '🔮',
    effect: { lifestealPercent: 20 },
    price: 80,
  },
  {
    id: 'relic-rune',
    name: 'Rune de Rage',
    description: '+10 % de dégâts infligés',
    icon: '⚔️',
    effect: { damagePercent: 10 },
    price: 75,
  },
  {
    id: 'relic-claws',
    name: 'Griffes de Sang',
    description: 'Vol de vie 12 % · Dégâts +5 %',
    icon: '🩸',
    effect: { lifestealPercent: 12, damagePercent: 5 },
    price: 85,
  },
  {
    id: 'relic-cloak',
    name: "Cape de l'Ombre",
    description: 'Vitesse +2 · CA +1',
    icon: '🧥',
    effect: { stat: { speed: 2 }, acBonus: 1 },
    price: 55,
  },
  {
    id: 'relic-vitality',
    name: 'Amulette de Vitalité',
    description: 'Constitution +2 · Soin de départ +10 %',
    icon: '📿',
    effect: { stat: { constitution: 2 }, healStartPercent: 10 },
    price: 70,
  },
  {
    id: 'relic-crit',
    name: 'Talisman Critique',
    description: 'Critiques sur 19-20',
    icon: '🎯',
    effect: { critRange: 2 },
    price: 85,
  },
  {
    id: 'relic-apprentice',
    name: "Médaillon de l'Apprenti",
    description: "+25 % d'EXP gagnée",
    icon: '🏅',
    effect: { experiencePercent: 25 },
    price: 60,
  },
  {
    id: 'relic-beast-gauntlet',
    name: 'Gantelet de la Bête',
    description: 'Force +4',
    icon: '💪',
    effect: { stat: { strength: 4 } },
    price: 70,
  },
  {
    id: 'relic-codex',
    name: 'Codex du Sage',
    description: '+4 Savoir',
    icon: '📖',
    effect: { stat: { wisdom: 4 } },
    price: 70,
  },
  {
    id: 'relic-sea-tears',
    name: 'Larmes de la Mer',
    description: 'Soigne 25 % des PV max au début de combat',
    icon: '🌊',
    effect: { healStartPercent: 25 },
    price: 85,
  },
  {
    id: 'relic-boots',
    name: "Bottes d'Élan",
    description: '+4 Vitesse (permanent, +CA)',
    icon: '👟',
    effect: { stat: { speed: 4 } },
    price: 80,
  },
  {
    id: 'relic-bastion',
    name: 'Bastion de la Garde',
    description: '+1 CA · +1 Constitution',
    icon: '🧱',
    effect: { acBonus: 1, stat: { constitution: 1 } },
    price: 75,
  },
  {
    id: 'relic-holy-water',
    name: 'Eau Bénite',
    description: 'Soigne 15 % des PV max au début · Dégâts +5 %',
    icon: '💧',
    effect: { healStartPercent: 15, damagePercent: 5 },
    price: 80,
  },
  {
    id: 'relic-bloodrunes',
    name: 'Runogrammes Sanguins',
    description: 'Vol de vie 8 % · +8 % d’EXP',
    icon: '📜',
    effect: { lifestealPercent: 8, experiencePercent: 8 },
    price: 80,
  },
  {
    id: 'relic-predator',
    name: 'Dents du Prédateur',
    description: '+2 Force · Vol de vie 6 %',
    icon: '🦴',
    effect: { stat: { strength: 2 }, lifestealPercent: 6 },
    price: 75,
  },
  {
    id: 'relic-deadeye',
    name: "Œil du Faucon",
    description: 'Critiques sur 18-20',
    icon: '👁️',
    effect: { critRange: 3 },
    price: 100,
  },
  {
    id: 'relic-professor',
    name: 'Jonc du Professeur',
    description: '+2 Savoir · +15 % d’EXP',
    icon: '🎓',
    effect: { stat: { wisdom: 2 }, experiencePercent: 15 },
    price: 80,
  },
  {
    id: 'relic-second-wind',
    name: 'Seconde Souffle',
    description: 'Soigne 20 % des PV max au début · +1 Vitesse',
    icon: '🌬️',
    effect: { healStartPercent: 20, stat: { speed: 1 } },
    price: 85,
  },
  {
    id: 'relic-chaos',
    name: 'Gantelet du Chaos',
    description: '+3 Force · +5 % de dégâts',
    icon: '⚔️',
    effect: { stat: { strength: 3 }, damagePercent: 5 },
    price: 90,
  },
  {
    id: 'relic-ancient-sword',
    name: 'Épée Ancienne',
    description: '+4 Force · +2 CA',
    icon: '⚔️',
    effect: { stat: { strength: 4 }, acBonus: 2 },
    price: 95,
  },
  {
    id: 'relic-ancient-armor',
    name: 'Armure Ancienne',
    description: '+3 Constitution · +3 CA',
    icon: '🛡️',
    effect: { stat: { constitution: 3 }, acBonus: 3 },
    price: 100,
  },
  {
    id: 'relic-ancient-staff',
    name: 'Baguette Ancienne',
    description: '+5 Savoir · +10 % d’EXP',
    icon: '🔮',
    effect: { stat: { wisdom: 5 }, experiencePercent: 10 },
    price: 95,
  },
  {
    id: 'relic-ancient-ring',
    name: 'Anneau Ancien',
    description: '+2 Charisme · +3 % de vol de vie',
    icon: '💍',
    effect: { stat: { charisma: 2 }, lifestealPercent: 3 },
    price: 90,
  },
  {
    id: 'relic-ancient-coin',
    name: 'Pièce Ancienne',
    description: '+2 Charisme · +2 Constitution',
    icon: '🪙',
    effect: { stat: { charisma: 2, constitution: 2 } },
    price: 85,
  },
  {
    id: 'relic-ancient-potion',
    name: 'Potion Ancienne',
    description: 'Soigne 20 % des PV max au début de combat',
    icon: '🧪',
    effect: { healStartPercent: 20 },
    price: 90,
  },
  {
    id: 'relic-ancient-crown',
    name: 'Couronne Ancienne',
    description: '+4 Charisme · +2 CA',
    icon: '👑',
    effect: { stat: { charisma: 4 }, acBonus: 2 },
    price: 100,
  },
  {
    id: 'relic-ancient-blade',
    name: 'Lame Ancienne',
    description: '+3 Force · +3 Vitesse',
    icon: '🗡️',
    effect: { stat: { strength: 3, speed: 3 } },
    price: 95,
  },
  {
    id: 'relic-ancient-shield',
    name: 'Bouclier Ancien',
    description: '+4 CA · +2 Constitution',
    icon: '🛡️',
    effect: { acBonus: 4, stat: { constitution: 2 } },
    price: 105,
  },
  {
    id: 'relic-ancient-helm',
    name: 'Casque Ancien',
    description: '+2 CA · +3 Vitesse',
    icon: '⛑️',
    effect: { acBonus: 2, stat: { speed: 3 } },
    price: 90,
  },
  {
    id: 'relic-ancient-gauntlet',
    name: 'Gantelet Ancien',
    description: '+5 Force',
    icon: '💪',
    effect: { stat: { strength: 5 } },
    price: 100,
  },
  {
    id: 'relic-ancient-slippers',
    name: 'Bottes Anciennes',
    description: '+5 Vitesse · +2 CA',
    icon: '👞',
    effect: { stat: { speed: 5 }, acBonus: 2 },
    price: 105,
  },
  {
    id: 'relic-ancient-bracers',
    name: 'Bracers Anciens',
    description: '+3 Constitution · +2 Savoir',
    icon: '⚡',
    effect: { stat: { constitution: 3, wisdom: 2 } },
    price: 95,
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
export function rollRelicOffers(count = 5, random: () => number = Math.random): Relic[] {
  const pool = [...RELIC_CATALOG];
  const offers: Relic[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const index = Math.floor(random() * pool.length);
    offers.push(pool.splice(index, 1)[0]);
  }
  return offers;
}

/** Prix de la potion de boutique (soin total des PV). */
export const POTION_PRICE = 30;

/**
 * Génère le stock d'une boutique : `count` reliques distinctes + 1 potion
 * (le store appelle `rollShopStock(3)`). `random` est injectable pour des
 * tests déterministes (défaut : Math.random).
 */
export function rollShopStock(count = 2, random: () => number = Math.random): ShopItem[] {
  const stock: ShopItem[] = rollRelicOffers(count, random).map((relic) => ({
    id: `shop-${relic.id}`,
    kind: 'relic',
    price: relic.price,
    label: relic.name,
    icon: relic.icon,
    desc: relic.description,
    relic,
    bought: false,
  }));
  stock.push({
    id: 'shop-potion',
    kind: 'heal',
    price: POTION_PRICE,
    label: 'Potion de Soin',
    icon: '🧪',
    desc: 'Restaure tous les PV',
    bought: false,
  });
  return stock;
}