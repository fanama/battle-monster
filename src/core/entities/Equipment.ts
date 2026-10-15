import type { MonsterStat } from './Move';

/**
 * Équipement porté par le monstre (capacités signature 2026-10).
 *
 * **Seuls les équipements équipés sont actifs** : une pièce de la sacoche n'a
 * aucun effet tant qu'elle n'est pas portée dans l'un des cinq emplacements
 * façon Dragon Quest (Arme / Armure / Casque / Bouclier / Accessoire).
 *
 * Chaque **élément est porté par le monstre** : le portage vit sur la fiche
 * du `Monster` (champ `equipped`, sérialisé dans `MonsterSnapshot`), la
 * sacoche des pièces non portées vit sur le `RunState` (`equipmentBag`).
 *
 * Trois familles d'effets (par pièce) :
 *  - **Stats & CA** — caractéristiques + armure, appliquées/désappliquées à
 *    l'acte d'équipement ( équipement ↔ déséquipement se résume exactement) ;
 *  - **Effets passifs** — vol de vie, % de dégâts, plage de crit, soin de
 *    départ, % d'EXP : lus par le moteur via `MONSTER*` helpers ci-dessous,
 *    **en addition des reliques** ;
 *  - **Compétence spéciale** — les pièces « ⭐ » combinent des passifs rares
 *    en une signature de build (aucune mécanique nouvelle : des accroches
 *    déjà jouées par le moteur, réassemblées).
 */
export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'helm', 'shield', 'accessory'] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: '⚔️ Arme',
  armor: '🛡️ Armure',
  helm: '⛑️ Casque',
  shield: '🛡️ Bouclier',
  accessory: '💍 Accessoire',
};

/** Effets d'une pièce d'équipement (cumulables entre pièces portées). */
export interface EquipmentEffect {
  /** Bonus de caractéristiques (appliqué à l'équipement, retiré au déséquipement). */
  stat?: Partial<Record<MonsterStat, number>>;
  /** Bonus d'armure ajouté à la CA (idem). */
  acBonus?: number;
  /** % des dégâts infligés restitués en PV (vol de vie). */
  lifestealPercent?: number;
  /** % de dégâts infligés supplémentaires. */
  damagePercent?: number;
  /** Plage de critiques élargie (2 = 19-20, 3 = 18-20…). */
  critRange?: number;
  /** % des PV max soignés au début de chaque combat. */
  healStartPercent?: number;
  /** % d'EXP gagnée supplémentaire. */
  experiencePercent?: number;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Emplacement occupé par la pièce. */
  slot: EquipmentSlot;
  effect: EquipmentEffect;
  /** Prix en or en boutique (les drops restent gratuits). */
  price: number;
}

/** Catalogue d'équipements : ~2-4 pièces par emplacement, du commun à la spéciale. */
export const EQUIPMENT_CATALOG: Equipment[] = [
  // --- ARMES (contact & magie) ---
  {
    id: 'eq-bone-toothpick',
    name: 'Pointe-Brûle',
    description: '+1 Force',
    icon: '🗡️',
    slot: 'weapon',
    effect: { stat: { strength: 1 } },
    price: 35,
  },
  {
    id: 'eq-fang-blade',
    name: 'Lame-Fang',
    description: '+2 Force · Vol de vie 5 %',
    icon: '🔪',
    slot: 'weapon',
    effect: { stat: { strength: 2 }, lifestealPercent: 5 },
    price: 65,
  },
  {
    id: 'eq-storm-fang',
    name: 'Croc d\'Orage',
    description: '+3 Force · Critiques 19-20',
    icon: '⚡',
    slot: 'weapon',
    effect: { stat: { strength: 3 }, critRange: 2 },
    price: 95,
  },
  {
    id: 'eq-arcane-staff',
    name: 'Bâton Arcanique',
    description: '+3 Savoir · +5 % de dégâts',
    icon: '🪄',
    slot: 'weapon',
    effect: { stat: { wisdom: 3 }, damagePercent: 5 },
    price: 80,
  },
  {
    id: 'eq-titan-hammer',
    name: 'Marteau du Titan',
    description: '+4 Force · +2 CA (⭐ dégâts lourds avec le blindage)',
    icon: '🔨',
    slot: 'weapon',
    effect: { stat: { strength: 4 }, acBonus: 2 },
    price: 110,
  },

  // --- ARMURES ---
  {
    id: 'eq-leather-wrap',
    name: 'Bandage Cuir',
    description: '+1 CA',
    icon: '🧵',
    slot: 'armor',
    effect: { acBonus: 1 },
    price: 35,
  },
  {
    id: 'eq-scale-mail',
    name: 'Maille d\'Écailles',
    description: '+2 CA · +1 Constitution',
    icon: '🎣',
    slot: 'armor',
    effect: { acBonus: 2, stat: { constitution: 1 } },
    price: 65,
  },
  {
    id: 'eq-plate-armor',
    name: 'Plaque de Garde',
    description: '+3 CA · +2 Constitution',
    icon: '🛡️',
    slot: 'armor',
    effect: { acBonus: 3, stat: { constitution: 2 } },
    price: 95,
  },
  {
    id: 'eq-mystic-robe',
    name: 'Robe Mystique',
    description: '+2 CA · +2 Savoir · Soin de départ +10 %',
    icon: '🧙',
    slot: 'armor',
    effect: { acBonus: 2, stat: { wisdom: 2 }, healStartPercent: 10 },
    price: 95,
  },

  // --- CASQUES ---
  {
    id: 'eq-scavenger-cap',
    name: 'Calotte du Ratisseur',
    description: '+1 Instinct',
    icon: '🧢',
    slot: 'helm',
    effect: { stat: { instinct: 1 } },
    price: 35,
  },
  {
    id: 'eq-steel-helm',
    name: 'Trou de Feuillure',
    description: '+2 Instinct · +1 CA',
    icon: '⛑️',
    slot: 'helm',
    effect: { stat: { instinct: 2 }, acBonus: 1 },
    price: 65,
  },
  {
    id: 'eq-ledger-helm',
    name: 'Hermine du Savant',
    description: '+3 Savoir',
    icon: '🎓',
    slot: 'helm',
    effect: { stat: { wisdom: 3 } },
    price: 70,
  },
  {
    id: 'eq-crit-goggles',
    name: 'Lunettes d\'Œil-Brûlé',
    description: '+3 Instinct · Critiques 19-20',
    icon: '🕶️',
    slot: 'helm',
    effect: { stat: { instinct: 3 }, critRange: 2 },
    price: 100,
  },

  // --- BOUCLIERS ---
  {
    id: 'eq-wooden-buckler',
    name: 'Rondache de Chêne',
    description: '+1 CA',
    icon: '🪵',
    slot: 'shield',
    effect: { acBonus: 1 },
    price: 35,
  },
  {
    id: 'eq-iron-kite',
    name: 'Pavois de Fer',
    description: '+2 CA · Vitesse +1',
    icon: '🏺',
    slot: 'shield',
    effect: { acBonus: 2, stat: { speed: 1 } },
    price: 65,
  },
  {
    id: 'eq-thorn-guard',
    name: 'Écu d\'Épines',
    description: '+3 CA · +5 % de dégâts',
    icon: '🌵',
    slot: 'shield',
    effect: { acBonus: 3, damagePercent: 5 },
    price: 95,
  },

  // --- ACCESSOIRES ---
  {
    id: 'eq-speed-ring',
    name: 'Anneau du Vent',
    description: '+2 Vitesse',
    icon: '💨',
    slot: 'accessory',
    effect: { stat: { speed: 2 } },
    price: 40,
  },
  {
    id: 'eq-vamp-fang',
    name: 'Croce de Vampire',
    description: 'Vol de vie 10 %',
    icon: '🧛',
    slot: 'accessory',
    effect: { lifestealPercent: 10 },
    price: 75,
  },
  {
    id: 'eq-lucky-clover',
    name: 'Trèfle de Chance',
    description: '+15 % d\'EXP · Soin de départ +10 %',
    icon: '🍀',
    slot: 'accessory',
    effect: { experiencePercent: 15, healStartPercent: 10 },
    price: 70,
  },
  {
    id: 'eq-berserk-band',
    name: 'Bracelet de Furie',
    description: '+3 Force · +5 % de dégâts',
    icon: '🩸',
    slot: 'accessory',
    effect: { stat: { strength: 3 }, damagePercent: 5 },
    price: 90,
  },
  {
    id: 'eq-phoenix-tail',
    name: 'Plume du Phénix',
    description: 'Soin de départ +25 % · +1 Constitution',
    icon: '🪽',
    slot: 'accessory',
    effect: { healStartPercent: 25, stat: { constitution: 1 } },
    price: 105,
  },
];

/** Somme des effets de toutes les pièces portées (les seules actives). */
export function equipmentTotals(
  equipped: Partial<Record<EquipmentSlot, Equipment>> | undefined,
): EquipmentEffect {
  const total: Required<Pick<EquipmentEffect, 'acBonus' | 'lifestealPercent' | 'damagePercent' | 'critRange' | 'healStartPercent' | 'experiencePercent'>> & {
    stat: Partial<Record<MonsterStat, number>>;
  } = {
    stat: {},
    acBonus: 0,
    lifestealPercent: 0,
    damagePercent: 0,
    critRange: 0,
    healStartPercent: 0,
    experiencePercent: 0,
  };
  if (!equipped) return total;
  for (const slot of EQUIPMENT_SLOTS) {
    const piece = equipped[slot];
    if (!piece) continue;
    if (piece.effect.stat) {
      for (const [key, value] of Object.entries(piece.effect.stat)) {
        total.stat[key as MonsterStat] = (total.stat[key as MonsterStat] ?? 0) + value!;
      }
    }
    total.acBonus += piece.effect.acBonus ?? 0;
    total.lifestealPercent += piece.effect.lifestealPercent ?? 0;
    total.damagePercent += piece.effect.damagePercent ?? 0;
    total.critRange = Math.max(total.critRange, piece.effect.critRange ?? 0);
    total.healStartPercent += piece.effect.healStartPercent ?? 0;
    total.experiencePercent += piece.effect.experiencePercent ?? 0;
  }
  return total;
}

/**
 * Tire une pièce d'équipement pour un drop (combat sauvage) ou un butin de
 * boss, adapté à la région : le poly entier, mais pondéré par la profondeur
 * du run (plus la région est tardive, plus les pièces chères tombent).
 *
 * **Anti-doublon (régler crash `each_key_duplicate`)** : `excludeIds` liste les
 * pièces déjà possédées (sacoche + portées) — elles sont retirées du poly.
 * Si le poly filtré est épuisé (run très long), on retombe sur le poly du
 * budget régional : mieux un rare doublon assumé qu'un flux de gains cassé —
 * les filets d'affichage/résaustoration couvrent ce cas exceptionnel.
 * `random` est injectable pour des tests déterministes.
 */
export function rollEquipmentDrop(
  regionIndex: number,
  random: () => number = Math.random,
  excludeIds: readonly string[] = [],
): Equipment {
  // Prix lissés : région 1 → ≤ 65, région 2 → ≤ 80, région 3 → ≤ 95, région 4 → tout.
  const maxPrice = [65, 80, 95, Infinity][Math.min(3, Math.max(0, regionIndex))]!;
  const owned = new Set(excludeIds);
  const uniquePoly = EQUIPMENT_CATALOG.filter(p => !owned.has(p.id) && p.price <= maxPrice);
  const pool = uniquePoly.length > 0
    ? uniquePoly
    : EQUIPMENT_CATALOG.filter(p => p.price <= maxPrice);
  return pool[Math.floor(random() * pool.length)] ?? EQUIPMENT_CATALOG[0]!;
}

/**
 * Sacoche **sans doublon** (une pièce = un exemplaire) : filet de sécurité à
 * la restauration — des sauvegardes de l'ancien règle de drops (recouvrement
 * drop/offre) pouvaient contenir des clés dupliquées, mortelles pour un `each`
 * keyé à l'affichage.
 */
export function dedupeEquipmentBag(bag: Equipment[]): Equipment[] {
  const seen = new Set<string>();
  const out: Equipment[] = [];
  for (const piece of bag) {
    if (!piece || seen.has(piece.id)) continue;
    seen.add(piece.id);
    out.push(piece);
  }
  return out;
}

/** Chances de drop d'équipement sur un sauvage vaincu (par victoire). */
export const WILD_EQUIP_DROP_CHANCE = 0.12;
