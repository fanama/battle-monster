export type StatusEffectType = 'burn' | 'freeze' | 'paralysis' | 'poison';

/**
 * Instance d'un statut actif sur un monstre.
 */
export interface ActiveStatus {
  type: StatusEffectType;
  duration: number; // Nombre de tours restants
  potency?: number; // Pour le poison progressif ou amplification
}

/**
 * Définition de l'effet de statut porté par une capacité.
 */
export interface MoveStatusEffect {
  type: StatusEffectType;
  chance: number; // Pourcentage de chance de déclenchement (1..100)
  duration?: number; // Durée par défaut en tours (défaut: 3)
  dc?: number; // Degré de Difficulté (DD) D&D 5e pour le jet de sauvegarde (défaut: 12)
}

export interface StatusConfig {
  type: StatusEffectType;
  name: string;
  icon: string;
  description: string;
  saveStat: 'constitution' | 'strength' | 'speed';
  saveLabel: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
}

export const STATUS_CONFIGS: Record<StatusEffectType, StatusConfig> = {
  burn: {
    type: 'burn',
    name: 'Brûlure',
    icon: '🔥',
    description: 'Dégâts de feu réguliers (8 % PV max) à chaque fin de tour. Jet de sauvegarde CON pour éteindre.',
    saveStat: 'constitution',
    saveLabel: 'Constitution',
    badgeClass: 'bg-orange-950/80 text-orange-200 border-orange-500/60 shadow-[0_0_8px_rgba(249,115,22,0.35)]',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/50',
    glowClass: 'shadow-orange-500/30',
  },
  freeze: {
    type: 'freeze',
    name: 'Gel',
    icon: '❄️',
    description: 'Immobilise le monstre (tour sauté). Jet de sauvegarde d20 CON au début de chaque tour pour briser la glace.',
    saveStat: 'constitution',
    saveLabel: 'Constitution',
    badgeClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.35)]',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-400/50',
    glowClass: 'shadow-cyan-400/30',
  },
  paralysis: {
    type: 'paralysis',
    name: 'Paralysie',
    icon: '⚡',
    description: "Réduit l'initiative (-4) et risque d'échec d'action sur jet de sauvegarde d20 CON (DD 11).",
    saveStat: 'constitution',
    saveLabel: 'Constitution',
    badgeClass: 'bg-yellow-950/80 text-yellow-200 border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.35)]',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-400/50',
    glowClass: 'shadow-yellow-400/30',
  },
  poison: {
    type: 'poison',
    name: 'Poison',
    icon: '🌿',
    description: 'Toxine insidieuse causant des dégâts croissants (+5 % par tour cumulé). Jet de sauvegarde CON pour purger.',
    saveStat: 'constitution',
    saveLabel: 'Constitution',
    badgeClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.35)]',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/50',
    glowClass: 'shadow-emerald-500/30',
  },
};
