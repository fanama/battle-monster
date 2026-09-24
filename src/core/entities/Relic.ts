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
  // --- FORCE (10 reliques) ---
  {
    id: 'relic-gauntlet',
    name: 'Gants de Fer',
    description: '+2 Force (permanent)',
    icon: '🥊',
    effect: { stat: { strength: 2 } },
    price: 50,
  },
  {
    id: 'relic-belt-bravery',
    name: 'Ceinture de Bravoure',
    description: '+2 Force · +1 CA',
    icon: '🥋',
    effect: { stat: { strength: 2 }, acBonus: 1 },
    price: 65,
  },
  {
    id: 'relic-beast-gauntlet',
    name: 'Gantelet de la Bête',
    description: '+4 Force',
    icon: '💪',
    effect: { stat: { strength: 4 } },
    price: 70,
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
    id: 'relic-pack-sense',
    name: 'Sens de la Meute',
    description: '+2 Force · +2 Instinct',
    icon: '🐺',
    effect: { stat: { strength: 2, instinct: 2 } },
    price: 75,
  },
  {
    id: 'relic-giant-hammer',
    name: 'Marteau de Géant',
    description: '+3 Force · +1 Constitution',
    icon: '🔨',
    effect: { stat: { strength: 3, constitution: 1 } },
    price: 80,
  },
  {
    id: 'relic-obsidian-mace',
    name: "Masse d'Obsidienne",
    description: '+4 Force · +5 % de dégâts',
    icon: '🌋',
    effect: { stat: { strength: 4 }, damagePercent: 5 },
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
    id: 'relic-ancient-blade',
    name: 'Lame Ancienne',
    description: '+3 Force · +3 Vitesse',
    icon: '🗡️',
    effect: { stat: { strength: 3, speed: 3 } },
    price: 95,
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
    id: 'relic-ancient-gauntlet',
    name: 'Gantelet Ancien',
    description: '+5 Force',
    icon: '💪',
    effect: { stat: { strength: 5 } },
    price: 100,
  },

  // --- VITESSE (10 reliques) ---
  {
    id: 'relic-cloak',
    name: "Cape de l'Ombre",
    description: 'Vitesse +2 · CA +1',
    icon: '🧥',
    effect: { stat: { speed: 2 }, acBonus: 1 },
    price: 55,
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
    id: 'relic-feather-haste',
    name: 'Plume de Vivacité',
    description: '+2 Vitesse · +10 % d’EXP',
    icon: '🪶',
    effect: { stat: { speed: 2 }, experiencePercent: 10 },
    price: 60,
  },
  {
    id: 'relic-stalker-hood',
    name: 'Capuche de Traqueur',
    description: '+3 Instinct · +1 Vitesse',
    icon: '🥷',
    effect: { stat: { instinct: 3, speed: 1 } },
    price: 70,
  },
  {
    id: 'relic-winged-sandals',
    name: 'Sandales Ailées',
    description: '+3 Vitesse · +1 Instinct',
    icon: '👡',
    effect: { stat: { speed: 3, instinct: 1 } },
    price: 75,
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
    id: 'relic-second-wind',
    name: 'Second Souffle',
    description: 'Soigne 20 % des PV max au début · +1 Vitesse',
    icon: '🌬️',
    effect: { healStartPercent: 20, stat: { speed: 1 } },
    price: 85,
  },
  {
    id: 'relic-tempest-needle',
    name: 'Aiguille Tempétueuse',
    description: '+4 Vitesse · +1 CA',
    icon: '⚡',
    effect: { stat: { speed: 4 }, acBonus: 1 },
    price: 85,
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
    id: 'relic-ancient-slippers',
    name: 'Bottes Anciennes',
    description: '+5 Vitesse · +2 CA',
    icon: '👞',
    effect: { stat: { speed: 5 }, acBonus: 2 },
    price: 105,
  },

  // --- CONSTITUTION (10 reliques) ---
  {
    id: 'relic-heart',
    name: 'Cœur de Titan',
    description: '+3 Constitution (PV max suivent)',
    icon: '❤️',
    effect: { stat: { constitution: 3 } },
    price: 60,
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
    id: 'relic-bastion',
    name: 'Bastion de la Garde',
    description: '+1 CA · +1 Constitution',
    icon: '🧱',
    effect: { acBonus: 1, stat: { constitution: 1 } },
    price: 75,
  },
  {
    id: 'relic-rock-belt',
    name: 'Ceinture du Roc',
    description: '+4 Constitution (PV renforcés)',
    icon: '🪨',
    effect: { stat: { constitution: 4 } },
    price: 75,
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
    id: 'relic-shaman-collar',
    name: 'Collier Chamanique',
    description: '+3 Instinct · +2 Constitution',
    icon: '🧿',
    effect: { stat: { instinct: 3, constitution: 2 } },
    price: 85,
  },
  {
    id: 'relic-primordial-bark',
    name: 'Écorce Primordiale',
    description: '+3 Constitution · +1 CA',
    icon: '🪵',
    effect: { stat: { constitution: 3 }, acBonus: 1 },
    price: 80,
  },
  {
    id: 'relic-ancient-bracers',
    name: 'Bracelets Anciens',
    description: '+3 Constitution · +2 Savoir',
    icon: '⚡',
    effect: { stat: { constitution: 3, wisdom: 2 } },
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
    id: 'relic-living-aegis',
    name: 'Égide Vivante',
    description: '+5 Constitution (vitalité colossale)',
    icon: '🌱',
    effect: { stat: { constitution: 5 } },
    price: 100,
  },
  {
    id: 'relic-ancient-shield',
    name: 'Bouclier Ancien',
    description: '+4 CA · +2 Constitution',
    icon: '🛡️',
    effect: { acBonus: 4, stat: { constitution: 2 } },
    price: 105,
  },

  // --- SAVOIR / INT (10 reliques) ---
  {
    id: 'relic-crown',
    name: 'Couronne de Savoir',
    description: '+3 Savoir (puissance arcanique & soins)',
    icon: '🧠',
    effect: { stat: { wisdom: 3 } },
    price: 60,
  },
  {
    id: 'relic-scholar-glasses',
    name: 'Lunettes de Prescience',
    description: '+2 Savoir · +2 Instinct',
    icon: '👓',
    effect: { stat: { wisdom: 2, instinct: 2 } },
    price: 70,
  },
  {
    id: 'relic-spirit-bell',
    name: 'Clochette des Esprits',
    description: '+2 Savoir · +2 Instinct',
    icon: '🔔',
    effect: { stat: { wisdom: 2, instinct: 2 } },
    price: 70,
  },
  {
    id: 'relic-codex',
    name: 'Codex du Sage',
    description: '+4 Savoir (amplification magique)',
    icon: '📖',
    effect: { stat: { wisdom: 4 } },
    price: 70,
  },
  {
    id: 'relic-scholar-tome',
    name: "Grimoire d'Érudit",
    description: '+3 Savoir · +1 CA',
    icon: '📚',
    effect: { stat: { wisdom: 3 }, acBonus: 1 },
    price: 75,
  },
  {
    id: 'relic-runic-diadem',
    name: 'Diadème Runique',
    description: '+3 Savoir · Soin de départ +10 %',
    icon: '👑',
    effect: { stat: { wisdom: 3 }, healStartPercent: 10 },
    price: 75,
  },
  {
    id: 'relic-arcane-orb',
    name: 'Orbe Arcanique',
    description: '+4 Savoir · +5 % de dégâts',
    icon: '🔮',
    effect: { stat: { wisdom: 4 }, damagePercent: 5 },
    price: 85,
  },
  {
    id: 'relic-arcane-scepter',
    name: 'Sceptre des Arcanes',
    description: '+3 Savoir · +2 Charisme',
    icon: '🪄',
    effect: { stat: { wisdom: 3, charisma: 2 } },
    price: 90,
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
    id: 'relic-stellar-tome',
    name: 'Tome Stellaire',
    description: '+5 Savoir (puissance absolue)',
    icon: '✨',
    effect: { stat: { wisdom: 5 } },
    price: 95,
  },

  // --- INSTINCT / SAG (10 reliques) ---
  {
    id: 'relic-feral-talisman',
    name: 'Talisman Féral',
    description: '+3 Instinct (perception accrue)',
    icon: '🐾',
    effect: { stat: { instinct: 3 } },
    price: 60,
  },
  {
    id: 'relic-presence-amulet',
    name: 'Amulette de Présence',
    description: '+3 Charisme · +1 Instinct',
    icon: '✨',
    effect: { stat: { charisma: 3, instinct: 1 } },
    price: 70,
  },
  {
    id: 'relic-lynx-eye',
    name: 'Œil du Lynx',
    description: '+4 Instinct (sens aiguisés)',
    icon: '🐱',
    effect: { stat: { instinct: 4 } },
    price: 75,
  },
  {
    id: 'relic-lookout-horn',
    name: 'Cor de Guet',
    description: '+4 Instinct · +1 CA',
    icon: '📯',
    effect: { stat: { instinct: 4 }, acBonus: 1 },
    price: 80,
  },
  {
    id: 'relic-professor',
    name: 'Jonc du Professeur',
    description: '+2 Instinct · +15 % d’EXP',
    icon: '🎓',
    effect: { stat: { instinct: 2 }, experiencePercent: 15 },
    price: 80,
  },
  {
    id: 'relic-instinct-amulet',
    name: 'Amulette Instinctive',
    description: '+3 Instinct · Soin de départ +10 %',
    icon: '🌿',
    effect: { stat: { instinct: 3 }, healStartPercent: 10 },
    price: 80,
  },
  {
    id: 'relic-spiritual-prism',
    name: 'Prisme Spirituel',
    description: '+3 Instinct · +2 Savoir',
    icon: '💎',
    effect: { stat: { instinct: 3, wisdom: 2 } },
    price: 85,
  },
  {
    id: 'relic-predator-fang',
    name: 'Crocs du Traqueur',
    description: '+3 Instinct · +2 Force',
    icon: '🦷',
    effect: { stat: { instinct: 3, strength: 2 } },
    price: 85,
  },
  {
    id: 'relic-totem-vigilance',
    name: 'Totem de Vigilance',
    description: '+5 Instinct (vision martiale)',
    icon: '🗿',
    effect: { stat: { instinct: 5 } },
    price: 95,
  },
  {
    id: 'relic-astral-compass',
    name: 'Boussole Astrale',
    description: '+4 Instinct · +2 Vitesse',
    icon: '🧭',
    effect: { stat: { instinct: 4, speed: 2 } },
    price: 95,
  },

  // --- CHARISME (10 reliques) ---
  {
    id: 'relic-royal-cape',
    name: 'Cape Royale',
    description: '+3 Charisme · +1 CA',
    icon: '👑',
    effect: { stat: { charisma: 3 }, acBonus: 1 },
    price: 70,
  },
  {
    id: 'relic-enchanted-mirror',
    name: 'Miroir Ensorcelé',
    description: '+3 Charisme · +1 Savoir',
    icon: '🪞',
    effect: { stat: { charisma: 3, wisdom: 1 } },
    price: 70,
  },
  {
    id: 'relic-seal-authority',
    name: "Sceau d'Autorité",
    description: '+4 Charisme (aura imposante)',
    icon: '🏅',
    effect: { stat: { charisma: 4 } },
    price: 75,
  },
  {
    id: 'relic-majestic-veil',
    name: 'Voile Majestueux',
    description: '+2 Charisme · Soin de départ +15 %',
    icon: '🧣',
    effect: { stat: { charisma: 2 }, healStartPercent: 15 },
    price: 80,
  },
  {
    id: 'relic-prestige-ring',
    name: 'Bague de Prestige',
    description: '+3 Charisme · +10 % d’EXP',
    icon: '💍',
    effect: { stat: { charisma: 3 }, experiencePercent: 10 },
    price: 80,
  },
  {
    id: 'relic-commander-crest',
    name: 'Blason de Commandant',
    description: '+3 Charisme · +2 Force',
    icon: '🛡️',
    effect: { stat: { charisma: 3, strength: 2 } },
    price: 85,
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
    id: 'relic-glamour-scepter',
    name: 'Sceptre de Charme',
    description: '+4 Charisme · +5 % de dégâts',
    icon: '🪄',
    effect: { stat: { charisma: 4 }, damagePercent: 5 },
    price: 90,
  },
  {
    id: 'relic-apparat-tiara',
    name: "Tiare d'Apparat",
    description: '+5 Charisme (magnétisme radieux)',
    icon: '👸',
    effect: { stat: { charisma: 5 } },
    price: 95,
  },
  {
    id: 'relic-ancient-crown',
    name: 'Couronne Ancienne',
    description: '+4 Charisme · +2 CA',
    icon: '👑',
    effect: { stat: { charisma: 4 }, acBonus: 2 },
    price: 100,
  },

  // --- ARMURE / CLASSE D'ARMURE (10 reliques) ---
  {
    id: 'relic-plate',
    name: "Plaque d'Acier",
    description: '+2 à la CA (armure)',
    icon: '🛡️',
    effect: { acBonus: 2 },
    price: 65,
  },
  {
    id: 'relic-reinforced-cuirass',
    name: 'Cuirasse Renforcée',
    description: '+3 à la CA (blindage lourd)',
    icon: '🥋',
    effect: { acBonus: 3 },
    price: 80,
  },
  {
    id: 'relic-runic-buckler',
    name: 'Bouclette Runique',
    description: '+2 CA · +2 Savoir',
    icon: '🛡️',
    effect: { acBonus: 2, stat: { wisdom: 2 } },
    price: 80,
  },
  {
    id: 'relic-carapace-shield',
    name: 'Bouclier Carapace',
    description: '+3 CA · +1 Constitution',
    icon: '🐢',
    effect: { acBonus: 3, stat: { constitution: 1 } },
    price: 85,
  },
  {
    id: 'relic-iron-bulwark',
    name: 'Pavois de Fer',
    description: '+4 à la CA (mur impénétrable)',
    icon: '🏰',
    effect: { acBonus: 4 },
    price: 95,
  },

  // --- SOINS & POTIONS (10 reliques) ---
  {
    id: 'relic-dew-flower',
    name: 'Fleur de Rosée',
    description: 'Soigne 15 % des PV max au début · +2 Savoir',
    icon: '🌸',
    effect: { healStartPercent: 15, stat: { wisdom: 2 } },
    price: 75,
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
    id: 'relic-holy-water',
    name: 'Eau Bénite',
    description: 'Soigne 15 % des PV max au début · Dégâts +5 %',
    icon: '💧',
    effect: { healStartPercent: 15, damagePercent: 5 },
    price: 80,
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
    id: 'relic-ancient-potion',
    name: 'Potion Ancienne',
    description: 'Soigne 20 % des PV max au début de combat',
    icon: '🧪',
    effect: { healStartPercent: 20 },
    price: 90,
  },
  {
    id: 'relic-regeneration-chalice',
    name: 'Calice de Régénération',
    description: 'Soigne 30 % des PV max au début de combat',
    icon: '🏆',
    effect: { healStartPercent: 30 },
    price: 100,
  },

  // --- COMBAT SPÉCIAL (Vol de vie, Dégâts %, Plage de critiques, EXP) (10 reliques) ---
  {
    id: 'relic-apprentice',
    name: "Médaillon de l'Apprenti",
    description: "+25 % d'EXP gagnée",
    icon: '🏅',
    effect: { experiencePercent: 25 },
    price: 60,
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
    id: 'relic-bloodrunes',
    name: 'Runogrammes Sanguins',
    description: 'Vol de vie 8 % · +8 % d’EXP',
    icon: '📜',
    effect: { lifestealPercent: 8, experiencePercent: 8 },
    price: 80,
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
    id: 'relic-crit',
    name: 'Talisman Critique',
    description: 'Critiques sur 19-20',
    icon: '🎯',
    effect: { critRange: 2 },
    price: 85,
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
    id: 'relic-martial-flame',
    name: 'Flamme Martiale',
    description: '+15 % de dégâts infligés',
    icon: '🔥',
    effect: { damagePercent: 15 },
    price: 95,
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
    id: 'relic-hunter-vest',
    name: 'Veste de Chasseur',
    description: 'Vol de vie 10 % · Critiques sur 19-20',
    icon: '🎯',
    effect: { lifestealPercent: 10, critRange: 2 },
    price: 105,
  },
  {
    id: 'relic-war-standard',
    name: 'Étendard de Triomphe',
    description: '+10 % de dégâts · +20 % d’EXP',
    icon: '🚩',
    effect: { damagePercent: 10, experiencePercent: 20 },
    price: 100,
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
 * Retourne `count` reliques rares distinctes au hasard (prix >= 90 ou relique ancienne).
 * `random` est injectable pour des tests déterministes (défaut : Math.random).
 */
export function rollRareRelicOffers(count = 3, random: () => number = Math.random): Relic[] {
  const rarePool = RELIC_CATALOG.filter(r => r.price >= 90 || r.id.startsWith('relic-ancient-'));
  const pool = rarePool.length >= count ? [...rarePool] : [...RELIC_CATALOG];
  const offers: Relic[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const index = Math.floor(random() * pool.length);
    offers.push(pool.splice(index, 1)[0]);
  }
  return offers;
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