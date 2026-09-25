import type { StatusEffectType } from './StatusEffect';
import type { MonsterStat } from './Move';

export type ConsumableCategory = 'anti-status' | 'heal' | 'energy' | 'buff';

export interface ConsumableItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: ConsumableCategory;
  /** Statut spécifique guéri, ou 'all' pour tous les statuts. */
  cureStatus?: StatusEffectType | 'all';
  /** Pourcentage des PV max soignés (ex: 40 pour 40 %). */
  healPercent?: number;
  /** Soin fixe en PV. */
  healFlat?: number;
  /** Réinitialise tous les cooldowns des capacités du monstre. */
  resetCooldowns?: boolean;
  /** Bonus temporaire/combat sur une caractéristique. */
  statBoost?: { stat: MonsterStat; value: number };
  /** Bonus d'armure temporaire/combat (ajouté à la CA). */
  acBonus?: number;
}

export interface InventorySlot {
  item: ConsumableItem;
  quantity: number;
}

export const CONSUMABLE_CATALOG: ConsumableItem[] = [
  // --- POTIONS ANTI-STATUT ---
  {
    id: 'potion-panacea',
    name: 'Panacée Universelle',
    description: 'Purge TOUS les statuts (Brûlure, Gel, Paralysie, Poison) et restaure 25 % des PV max.',
    icon: '✨',
    price: 40,
    category: 'anti-status',
    cureStatus: 'all',
    healPercent: 25,
  },
  {
    id: 'potion-anti-burn',
    name: 'Onguent Ignifuge',
    description: 'Éteint immédiatement la Brûlure et apaise les plaies.',
    icon: '🔥',
    price: 20,
    category: 'anti-status',
    cureStatus: 'burn',
  },
  {
    id: 'potion-anti-freeze',
    name: 'Baume Dégivrant',
    description: 'Brise instantanément la glace du Gel et réchauffe le monstre.',
    icon: '❄️',
    price: 20,
    category: 'anti-status',
    cureStatus: 'freeze',
  },
  {
    id: 'potion-anti-paralysis',
    name: 'Infusion Isolante',
    description: 'Neutralise la Paralysie et rétablit les influx nerveux normaux.',
    icon: '⚡',
    price: 20,
    category: 'anti-status',
    cureStatus: 'paralysis',
  },
  {
    id: 'potion-anti-poison',
    name: 'Antidote Végétal',
    description: 'Purge le Poison et élimine complètement la toxicité accumulée.',
    icon: '🌿',
    price: 20,
    category: 'anti-status',
    cureStatus: 'poison',
  },

  // --- SOINS DE POCHE ---
  {
    id: 'potion-pocket-heal',
    name: 'Potion de Soin de Poche',
    description: 'Restaure 45 % des PV max utilisable directement en combat.',
    icon: '🧪',
    price: 30,
    category: 'heal',
    healPercent: 45,
  },

  // --- ÉNERGIE & BUFFS TACTIQUES ---
  {
    id: 'potion-vigor-elixir',
    name: 'Élixir de Vigueur',
    description: 'Réinitialise instantanément le temps de recharge de toutes vos capacités.',
    icon: '⚡',
    price: 25,
    category: 'energy',
    resetCooldowns: true,
  },
  {
    id: 'potion-iron-skin',
    name: 'Élixir de Peau de Pierre',
    description: 'Renforce la défense (+3 CA pour le reste du combat).',
    icon: '🛡️',
    price: 30,
    category: 'buff',
    acBonus: 3,
  },
  {
    id: 'potion-fury-draught',
    name: 'Breuvage de Furie',
    description: 'Décuple la force martiale (+4 Force pour le reste du combat).',
    icon: '🥊',
    price: 30,
    category: 'buff',
    statBoost: { stat: 'strength', value: 4 },
  },
];

/** Pack d'objets de départ offert à chaque début de run. */
export const STARTER_INVENTORY: InventorySlot[] = [
  {
    item: CONSUMABLE_CATALOG.find(c => c.id === 'potion-panacea')!,
    quantity: 1,
  },
  {
    item: CONSUMABLE_CATALOG.find(c => c.id === 'potion-pocket-heal')!,
    quantity: 1,
  },
];
