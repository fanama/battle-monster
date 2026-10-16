import type { MonsterStat, MonsterType } from './Move';
import { CONSUMABLE_CATALOG, type ConsumableItem } from './Consumable';
import {
  EQUIPMENT_CATALOG,
  type Equipment,
  type EquipmentSlot,
} from './Equipment';
export type { ConsumableItem, Equipment };

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
  /**
   * Provenance : le **monstre vaincu** dont cette relique est le pouvoir.
   * Absent pour une relique achetée en boutique. L'effet, le prix et l'`id`
   * restent ceux du catalogue — seule l'identité affichée change.
   */
  powerOf?: { name: string; type: MonsterType };
}

/** Identité minimale d'un monstre source d'un pouvoir (nom + type). */
export interface RelicSource {
  name: string;
  type: MonsterType;
}

/** Article vendu en boutique. Les reliques n'y figurent plus (pouvoir des monstres). */
export type ShopItemKind = 'heal' | 'consumable' | 'equipment';

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  price: number;
  label: string;
  icon: string;
  desc: string;
  /** Consommable vendu (si `kind === 'consumable'`). */
  consumable?: ConsumableItem;
  /** Pièce d'équipement vendue (si `kind === 'equipment'`). */
  equipment?: Equipment;
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

/**
 * Plafonds des effets **cumulables** des reliques (équilibrag 2026-10).
 *
 * Avant ces plafonds, les reliques s'additionnaient librement : le vol de vie
 * atteignait ~50 % avec cinq pièces d'élite (*Cristal Vampire* vaut déjà
 * 20 % à lui seul) — les combats longs devenaient « auto-chauffe » et le jeu
 * cessait d'être risqué. Instance roi du réglage : **legless but real**.
 *
 * Portée volontairement **restreinte aux reliques** : les passifs fournis
 * par l'équipement porté (`Monster.equipment*Percent()`) ne sont PAS clampés
 * ici — deux échelles indépendantes, choisi par design pour garder la
 * Forge attractive. La plage de critiques, elle, est **unique par
 * construction** (`relicMaxCritRange` prend le max, jamais une somme).
 */
export const RELIC_EFFECT_CAPS = {
  /** Vol de vie cumulé maximum (%). */
  lifestealPercent: 10,
  /** % de dégâts infligés supplémentaires cumulés max. */
  damagePercent: 10,
  /** Soin de début de combat cumulé max (%). */
  healStartPercent: 20,
  /** % d'EXP gagnée cumulé max. */
  experiencePercent: 25,
} as const;

/** % de dégâts supplémentaires cumulés, **plafonné** (reliques). */
export function relicDamagePercent(relics: Relic[]): number {
  const raw = relics.reduce((sum, r) => sum + (r.effect.damagePercent ?? 0), 0);
  return Math.min(raw, RELIC_EFFECT_CAPS.damagePercent);
}

/** % de vol de vie cumulés, **plafonné** (reliques). */
export function relicLifestealPercent(relics: Relic[]): number {
  const raw = relics.reduce((sum, r) => sum + (r.effect.lifestealPercent ?? 0), 0);
  return Math.min(raw, RELIC_EFFECT_CAPS.lifestealPercent);
}

/** % de PV max soignés au début de combat, cumulés **plafonné** (reliques). */
export function relicHealStartPercent(relics: Relic[]): number {
  const raw = relics.reduce((sum, r) => sum + (r.effect.healStartPercent ?? 0), 0);
  return Math.min(raw, RELIC_EFFECT_CAPS.healStartPercent);
}

/** Range de critiques le plus élargi (2 → critiques sur 19-20). Unique : le
 *  max est pris, jamais une somme — deux reliques à crit ne COUPENT pas. */
export function relicMaxCritRange(relics: Relic[]): number {
  return relics.reduce((max, r) => Math.max(max, r.effect.critRange ?? 0), 0);
}

/** % d'EXP gagnée supplémentaire, cumulés **plafonné** (reliques). */
export function relicExperiencePercent(relics: Relic[]): number {
  const raw = relics.reduce((sum, r) => sum + (r.effect.experiencePercent ?? 0), 0);
  return Math.min(raw, RELIC_EFFECT_CAPS.experiencePercent);
}

/**
 * Retourne `count` reliques rares distinctes au hasard (prix >= 90 ou relique ancienne).
 * `random` est injectable pour des tests déterministes (défaut : Math.random).
 * `excludeRelicIds` : **anti-doublon** — les reliques déjà possédées par le
 * run ne sont plus offertes (une même pièce ne se cumule jamais).
 */
export function rollRareRelicOffers(
  count = 3,
  random: () => number = Math.random,
  excludeRelicIds: readonly string[] = [],
): Relic[] {
  const owned = new Set(excludeRelicIds);
  const rarePool = RELIC_CATALOG.filter(r => !owned.has(r.id) && (r.price >= 90 || r.id.startsWith('relic-ancient-')));
  const pool = rarePool.length >= count ? [...rarePool] : [...RELIC_CATALOG.filter(r => !owned.has(r.id))];
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
 * `excludeRelicIds` : anti-doublon, cf. `rollRareRelicOffers`.
 */
export function rollRelicOffers(
  count = 5,
  random: () => number = Math.random,
  excludeRelicIds: readonly string[] = [],
): Relic[] {
  const owned = new Set(excludeRelicIds);
  const pool = [...RELIC_CATALOG.filter(r => !owned.has(r.id))];
  const offers: Relic[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const index = Math.floor(random() * pool.length);
    offers.push(pool.splice(index, 1)[0]);
  }
  return offers;
}

/**
 * Revêt une relique de base du **pouvoir du monstre vaincu** : l'objet devient
 * explicitement le pouvoir arraché à cette créature. L'`id`, l'`effect` et le
 * `price` sont **conservés à l'identique** — l'anti-doublon continue de
 * fonctionner par `id` et les plafonds d'équilibrage ne bougent pas ; seuls
 * l'identité affichée et le champ `powerOf` changent.
 */
export function themeRelicAsMonsterPower(base: Relic, source: RelicSource): Relic {
  return {
    ...base,
    description: `${base.description} · Pouvoir arraché à ${source.name}.`,
    powerOf: { name: source.name, type: source.type },
  };
}

/**
 * Offres de reliques **tirées d'un monstre vaincu** (reliques ordinaires) :
 * même vivier et mêmes exclusions que `rollRelicOffers`, puis chaque relique
 * est rethémée en pouvoir de ce monstre. `random` injectable pour les tests.
 */
export function rollMonsterPowerOffers(
  source: RelicSource,
  count = 2,
  random: () => number = Math.random,
  excludeRelicIds: readonly string[] = [],
): Relic[] {
  return rollRelicOffers(count, random, excludeRelicIds).map(r =>
    themeRelicAsMonsterPower(r, source),
  );
}

/**
 * Offres de reliques **rares** tirées d'un monstre vaincu (boss) : même vivier
 * que `rollRareRelicOffers`, rethémées en pouvoir du monstre. `random`
 * injectable pour les tests.
 */
export function rollRareMonsterPowerOffers(
  source: RelicSource,
  count = 2,
  random: () => number = Math.random,
  excludeRelicIds: readonly string[] = [],
): Relic[] {
  return rollRareRelicOffers(count, random, excludeRelicIds).map(r =>
    themeRelicAsMonsterPower(r, source),
  );
}

/** Prix de la potion de boutique (soin total des PV). */
export const POTION_PRICE = 30;

/**
 * Familles **toujours en vitrine** dans le rayon Forge : une **arme**, une
 * **armure** et un **accessoire**. Les pièces suivantes du rayon (au-delà de
 * trois) sont tirées dans le poly entier — casques et boucliers compris.
 */
export const SHOP_SLOT_PRIORITY: readonly EquipmentSlot[] = [
  'weapon',
  'armor',
  'accessory',
];

/**
 * Rayon d'équipements d'une boutique (capacités signature) : `count` pièces
 * distinctes tirées dans le budget de la région (le poly s'étend avec la
 * profondeur du run — cf. `rollEquipmentDrop`).
 *
 * **Armes, armures et accessoires garantis** : les premières pièces sont tirées
 * une par famille dans `SHOP_SLOT_PRIORITY`, le reliquat dans le poly entier.
 * Une boutique ne peut donc pas ouvrir sans une arme, une armure et un
 * accessoire à vendre (tant que le budget régional et l'anti-doublon le
 * permettent).
 *
 * **Anti-doublon** : `excludeIds` liste les pièces déjà possédées (sacoche +
 * portées) — une pièce vendue deux fois créerait des clés dupliquées
 * inexistantes.
 */
export function buildEquipmentShopItems(
  regionIndex: number,
  count = 3,
  random: () => number = Math.random,
  excludeIds: readonly string[] = [],
): ShopItem[] {
  const maxPrice = [65, 80, 95, Infinity][Math.min(3, Math.max(0, regionIndex))]!;
  const owned = new Set(excludeIds);
  const poolFor = (slot?: EquipmentSlot): Equipment[] =>
    EQUIPMENT_CATALOG.filter(
      p =>
        !owned.has(p.id) &&
        p.price <= maxPrice &&
        (slot === undefined || p.slot === slot),
    );

  const picks: Equipment[] = [];
  const draw = (pool: Equipment[]): void => {
    const free = pool.filter(p => !picks.some(pick => pick.id === p.id));
    if (free.length === 0) return;
    picks.push(free[Math.floor(random() * free.length)]!);
  };

  // 1. Une pièce par famille garantie (arme → armure → accessoire)…
  for (const slot of SHOP_SLOT_PRIORITY) {
    if (picks.length >= count) break;
    draw(poolFor(slot));
  }
  // 2. …puis le reste du rayon dans le poly entier (casques, boucliers…).
  while (picks.length < count) {
    const before = picks.length;
    draw(poolFor());
    if (picks.length === before) break; // plus rien de disponible
  }

  return picks.map(piece => ({
    id: `shop-${piece.id}`,
    kind: 'equipment' as const,
    price: piece.price,
    label: piece.name,
    icon: piece.icon,
    desc: piece.description,
    equipment: piece,
    bought: false,
  }));
}

/**
 * Construit les articles « consommables » de la boutique à partir du catalogue
 * complet (`CONSUMABLE_CATALOG`). Toujours entièrement disponible : ces objets
 * à usage unique sont rachetables autant de fois que l'or le permet.
 */
export function buildConsumableShopItems(): ShopItem[] {
  return CONSUMABLE_CATALOG.map((item) => ({
    id: `shop-consumable-${item.id}`,
    kind: 'consumable' as const,
    price: item.price,
    label: item.name,
    icon: item.icon,
    desc: item.description,
    consumable: item,
    bought: false,
  }));
}

/**
 * Génère le stock d'une boutique : **potions et équipements uniquement**.
 *
 *  - **Potions** : TOUT le catalogue de consommables (rachetable) + 1 potion de
 *    soin immédiat à l'auberge ;
 *  - **Équipements** : un rayon de `equipmentCount` pièces adaptées à la
 *    profondeur de la région, avec **une arme, une armure et un accessoire
 *    garantis** (cf. `buildEquipmentShopItems`).
 *
 * **Aucune relique n'est vendue** : l'or n'achète que du consommable et du
 * matériel. Les reliques ne s'obtiennent qu'en battant des monstres (leur
 * pouvoir) — la boutique ne les propose plus.
 *
 * `random` est injectable pour des tests déterministes (défaut : Math.random).
 * `excludeEquipmentIds` : anti-doublon (pièces déjà possédées : sacoche + portées).
 */
export function rollShopStock(
  random: () => number = Math.random,
  regionIndex = 0,
  equipmentCount = 3,
  excludeEquipmentIds: readonly string[] = [],
): ShopItem[] {
  // 1. Potions & consommables (tout le catalogue)
  const stock: ShopItem[] = buildConsumableShopItems();

  // 2. Potion de soin immédiat à l'auberge
  stock.push({
    id: 'shop-potion-fullheal',
    kind: 'heal',
    price: POTION_PRICE,
    label: 'Repos & Potion Totale',
    icon: '🏨',
    desc: 'Restaure immédiatement tous les PV à l\'auberge',
    bought: false,
  });

  // 3. Rayon Forge & Équipements (capacités signature)
  stock.push(...buildEquipmentShopItems(regionIndex, equipmentCount, random, excludeEquipmentIds));

  return stock;
}