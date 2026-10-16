import { STAT_LABELS, type MonsterStat } from './Move';

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
  /**
   * **Arme à deux mains** (règle Dragon Quest) : elle occupe les deux mains,
   * donc le **bouclier est interdit** tant qu'elle est portée. La porter
   * **déséquipe** le bouclier (retour en sacoche) ; porter un bouclier alors
   * qu'une arme à deux mains est tenue est **refusé**.
   * N'a de sens que sur `slot: 'weapon'`.
   */
  twoHanded?: boolean;
}

/**
 * Catalogue d'équipements : 3 à 8 pièces par emplacement, du commun à la
 * spéciale. Les **armes**, **armures** et **accessoires** sont les familles les
 * plus fournies : la boutique en garantit une de chaque à chaque visite
 * (cf. `buildEquipmentShopItems`), il faut donc du choix à tous les budgets.
 */
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
    twoHanded: true,
  },
  {
    id: 'eq-hatchet',
    name: 'Hachette du Bûcheron',
    description: '+2 Force · +1 Constitution',
    icon: '🪓',
    slot: 'weapon',
    effect: { stat: { strength: 2, constitution: 1 } },
    price: 55,
  },
  {
    id: 'eq-short-bow',
    name: 'Arc de Chasse',
    description: '+1 Vitesse · Critiques 19-20',
    icon: '🏹',
    slot: 'weapon',
    effect: { stat: { speed: 1 }, critRange: 2 },
    price: 70,
    twoHanded: true,
  },
  {
    id: 'eq-tide-trident',
    name: 'Trident des Marées',
    description: '+3 Force · +1 Vitesse (à deux mains)',
    icon: '🔱',
    slot: 'weapon',
    effect: { stat: { strength: 3, speed: 1 } },
    price: 90,
    twoHanded: true,
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
  {
    id: 'eq-studded-vest',
    name: 'Gilet Clouté',
    description: '+1 CA · +1 Force',
    icon: '🦺',
    slot: 'armor',
    effect: { acBonus: 1, stat: { strength: 1 } },
    price: 50,
  },
  {
    id: 'eq-chain-mail',
    name: 'Cotte de Mailles',
    description: '+2 CA · +1 Vitesse',
    icon: '⛓️',
    slot: 'armor',
    effect: { acBonus: 2, stat: { speed: 1 } },
    price: 70,
  },
  {
    id: 'eq-colossus-cuirass',
    name: 'Cuirasse du Colosse',
    description: '+4 CA · +2 Constitution (⭐ rempart inébranlable)',
    icon: '🗿',
    slot: 'armor',
    effect: { acBonus: 4, stat: { constitution: 2 } },
    price: 110,
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
  {
    id: 'eq-ebony-amulet',
    name: "Amulette d'Ébène",
    description: '+1 Force · +1 Constitution',
    icon: '📿',
    slot: 'accessory',
    effect: { stat: { strength: 1, constitution: 1 } },
    price: 45,
  },
  {
    id: 'eq-traveler-compass',
    name: 'Boussole du Voyageur',
    description: "+1 Vitesse · +10 % d'EXP",
    icon: '🧭',
    slot: 'accessory',
    effect: { stat: { speed: 1 }, experiencePercent: 10 },
    price: 55,
  },
  {
    id: 'eq-golem-heart',
    name: 'Cœur de Golem',
    description: '+1 CA · Soin de départ +15 %',
    icon: '🪨',
    slot: 'accessory',
    effect: { acBonus: 1, healStartPercent: 15 },
    price: 85,
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
 * Score de puissance d'une pièce — base du bouton « Meilleur équipement »
 * (最強装備 RPG Maker). Même barème **entier** que `relicScore` (les deux
 * échelles restent indépendantes et équilibrées séparément) : 1 CA ≈ 3 points
 * de caractéristique, 1 point de plage de critique vaut 4, les pourcentages
 * la moitié d'un point de caractéristique, l'EXP un dixième.
 */
export function equipmentScore(piece: Equipment): number {
  const e = piece.effect;
  let score = 0;
  if (e.stat) {
    for (const value of Object.values(e.stat)) score += (value ?? 0) * 10;
  }
  score += (e.acBonus ?? 0) * 30;
  score += (e.critRange ?? 0) * 40;
  score += (e.damagePercent ?? 0) * 5;
  score += (e.lifestealPercent ?? 0) * 5;
  score += (e.healStartPercent ?? 0) * 2;
  score += (e.experiencePercent ?? 0) * 1;
  return score;
}

/**
 * « Meilleur équipement » (最強装備 de RPG Maker, そうびの最適化 de DQ) :
 * choisit, **emplacement par emplacement**, la pièce la plus puissante parmi
 * celles possédées (sacoche + déjà portées) selon `equipmentScore`.
 *
 * Une pièce déjà portée fait partie des candidats : à score égal c'est elle
 * qui l'emporte (l'égalité ne fait donc jamais tourner l'équipement pour
 * rien, la comparaison garde l'ordre des candidats). La **règle des armes à
 * deux mains** est appliquée en sortie : si la meilleure arme l'est, le
 * bouclier n'est pas retenu (il restera en sacoche).
 */
export function bestLoadout(
  owned: readonly Equipment[],
  equipped: Partial<Record<EquipmentSlot, Equipment>> | undefined,
): Partial<Record<EquipmentSlot, Equipment>> {
  const chosen: Partial<Record<EquipmentSlot, Equipment>> = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const candidates = [equipped?.[slot], ...owned].filter(
      (piece): piece is Equipment => !!piece && piece.slot === slot,
    );
    if (candidates.length === 0) continue;
    chosen[slot] = candidates.reduce((best, piece) =>
      equipmentScore(piece) > equipmentScore(best) ? piece : best,
    );
  }
  if (chosen.weapon?.twoHanded) delete chosen.shield;
  return chosen;
}

/** Prix maximal du catalogue (plafond des budgets de drops élargis). */
const CATALOG_MAX_PRICE = Math.max(...EQUIPMENT_CATALOG.map(p => p.price));

/**
 * Échelle de puissance des **drops** selon le **niveau de l'ennemi vaincu**
 * (choix joueur 2026-10 : « l'équipement gagné doit avoir plus d'effet si
 * l'ennemi est haut niveau ») : les pièces tombées sur un ennemi haut niveau
 * sont **amplifiées**, jusqu'à **×2** au niveau 16. Sous le niveau 8, aucune
 * amplification : le catalogue d'origine reste intact.
 */
export function equipmentLevelScale(enemyLevel: number): number {
  return Math.min(2, 1 + Math.max(0, enemyLevel - 8) * 0.125);
}

/** Queue « (⭐ …) » d'une description : signature des pièces spéciales. */
const SPECIAL_TAIL = /\s*\(⭐[^)]*\)\s*$/;

/**
 * Recompose une description à partir des effets (après amplification), en
 * conservant la signature « (⭐ …) » des pièces spéciales.
 */
export function describeEquipmentEffect(effect: EquipmentEffect, original = ''): string {
  const parts: string[] = [];
  if (effect.stat) {
    for (const key of Object.keys(effect.stat) as MonsterStat[]) {
      const value = effect.stat[key]!;
      if (value) parts.push(`+${value} ${STAT_LABELS[key]}`);
    }
  }
  if (effect.acBonus) parts.push(`+${effect.acBonus} CA`);
  if (effect.critRange) parts.push(`Critiques ${21 - effect.critRange}-20`);
  if (effect.lifestealPercent) parts.push(`Vol de vie ${effect.lifestealPercent} %`);
  if (effect.damagePercent) parts.push(`+${effect.damagePercent} % de dégâts`);
  if (effect.healStartPercent) parts.push(`Soin de départ +${effect.healStartPercent} %`);
  if (effect.experiencePercent) parts.push(`+${effect.experiencePercent} % d'EXP`);
  const special = original.match(SPECIAL_TAIL)?.[0]?.trim();
  return special ? `${parts.join(' · ')} ${special}` : parts.join(' · ');
}

/**
 * Amplifie une pièce selon le niveau de l'ennemi vaincu : stats, CA et
 * pourcentages suivent l'échelle (jamais arrondis à 0). La **plage de critiques
 * reste discrète** (un ×2 donnerait 17-20, hors échelle du jeu). L'id est
 * conservé (anti-doublon sacoche/boutique inchangé) ; le nom porte un ✦ et la
 * description est recomposée pour afficher les vrais chiffres.
 */
export function scaleEquipment(piece: Equipment, enemyLevel: number): Equipment {
  const scale = equipmentLevelScale(enemyLevel);
  if (scale <= 1) return piece;
  const boosted = (value: number) => Math.max(1, Math.round(value * scale));
  const effect: EquipmentEffect = {};
  if (piece.effect.stat) {
    const stat: Partial<Record<MonsterStat, number>> = {};
    for (const [key, value] of Object.entries(piece.effect.stat)) {
      stat[key as MonsterStat] = boosted(value!);
    }
    effect.stat = stat;
  }
  if (piece.effect.acBonus) effect.acBonus = boosted(piece.effect.acBonus);
  if (piece.effect.lifestealPercent) effect.lifestealPercent = boosted(piece.effect.lifestealPercent);
  if (piece.effect.damagePercent) effect.damagePercent = boosted(piece.effect.damagePercent);
  // La plage de critiques est un mécanique discret (19-20, 18-20…) : jamais
  // amplifiée.
  if (piece.effect.critRange) effect.critRange = piece.effect.critRange;
  if (piece.effect.healStartPercent) effect.healStartPercent = boosted(piece.effect.healStartPercent);
  if (piece.effect.experiencePercent) effect.experiencePercent = boosted(piece.effect.experiencePercent);
  return {
    ...piece,
    name: `${piece.name} ✦`,
    effect,
    description: describeEquipmentEffect(effect, piece.description),
  };
}

/**
 * Tire une pièce d'équipement pour un drop (combat sauvage) ou un butin de
 * boss, adapté à la région **et au niveau de l'ennemi vaincu** : le poly
 * entier, pondéré par la profondeur du run (plus la région est tardive, plus
 * les pièces chères tombent), puis élargi vers le haut du catalogue pour les
 * ennemis haut niveau (budget + 10 💰 par niveau au-dessus de 8). La pièce
 * est ensuite **amplifiée** selon ce même niveau (`scaleEquipment`, jusqu'à
 * ×2 sur les effets). La boutique, elle, vend le catalogue d'origine.
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
  enemyLevel = 0,
): Equipment {
  // Prix lissés : région 1 → ≤ 65, région 2 → ≤ 80, région 3 → ≤ 95, région 4 → tout.
  const regionCap = [65, 80, 95, Infinity][Math.min(3, Math.max(0, regionIndex))]!;
  // Un ennemi haut niveau ouvre le poly vers les pièces chères (paliers de
  // prix plus hauts), plafonné au prix maximal du catalogue.
  const maxPrice = Math.min(CATALOG_MAX_PRICE, regionCap + Math.max(0, enemyLevel - 8) * 10);
  const owned = new Set(excludeIds);
  const uniquePoly = EQUIPMENT_CATALOG.filter(p => !owned.has(p.id) && p.price <= maxPrice);
  const pool = uniquePoly.length > 0
    ? uniquePoly
    : EQUIPMENT_CATALOG.filter(p => p.price <= maxPrice);
  return scaleEquipment(
    pool[Math.floor(random() * pool.length)] ?? EQUIPMENT_CATALOG[0]!,
    enemyLevel,
  );
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
