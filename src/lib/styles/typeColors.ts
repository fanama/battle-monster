import type { MonsterType } from '../../core/entities/Move';

/**
 * Palette de couleurs par type de monstre/move — design system coloré.
 * Toutes les strings sont des classes Tailwind littérales (détectées par JIT).
 */
export interface TypeColors {
  /** Pastille / point coloré */
  dot: string;
  /** Bordure de carte */
  border: string;
  /** Bordure « renforcée » (cartes de move) */
  borderStrong: string;
  /** Texte accentué */
  text: string;
  /** Badge verre teinté (fond + bordure + texte) */
  badge: string;
  /** Fond translucide de carte */
  cardBg: string;
  /** Bandeau dégradé */
  gradient: string;
  /** Anneau / griffe lumineuse */
  ring: string;
  /** Lueur colorée (fond de sprite) */
  ambient: string;
  /** Ombre colorée */
  glow: string;
}

export const TYPE_COLORS: Record<MonsterType, TypeColors> = {
  fire: {
    dot: 'bg-red-500',
    border: 'border-red-500/60',
    borderStrong: 'border-red-400',
    text: 'text-red-300',
    badge: 'bg-red-950/60 text-red-100 border-red-500/50',
    cardBg: 'bg-red-950/25',
    gradient: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400',
    ring: 'ring-red-400',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(239,68,68,0.22) 0%, rgba(249,115,22,0.08) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-red-500/40',
  },
  water: {
    dot: 'bg-blue-500',
    border: 'border-blue-500/60',
    borderStrong: 'border-blue-400',
    text: 'text-blue-300',
    badge: 'bg-blue-950/60 text-blue-100 border-blue-500/50',
    cardBg: 'bg-blue-950/25',
    gradient: 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400',
    ring: 'ring-blue-400',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(59,130,246,0.22) 0%, rgba(34,211,238,0.08) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-blue-500/40',
  },
  grass: {
    dot: 'bg-green-500',
    border: 'border-green-500/60',
    borderStrong: 'border-green-400',
    text: 'text-green-300',
    badge: 'bg-green-950/60 text-green-100 border-green-500/50',
    cardBg: 'bg-green-950/25',
    gradient: 'bg-gradient-to-r from-green-600 via-emerald-500 to-lime-400',
    ring: 'ring-green-400',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(34,197,94,0.22) 0%, rgba(163,230,53,0.08) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-green-500/40',
  },
  electric: {
    dot: 'bg-yellow-400',
    border: 'border-yellow-400/60',
    borderStrong: 'border-yellow-300',
    text: 'text-yellow-200',
    badge: 'bg-yellow-950/60 text-yellow-100 border-yellow-400/50',
    cardBg: 'bg-yellow-950/25',
    gradient: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-200',
    ring: 'ring-yellow-300',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(250,204,21,0.24) 0%, rgba(253,224,71,0.08) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-yellow-400/40',
  },
  rock: {
    dot: 'bg-stone-500',
    border: 'border-stone-500/60',
    borderStrong: 'border-stone-300',
    text: 'text-stone-300',
    badge: 'bg-amber-950/40 text-amber-100 border-stone-500/40',
    cardBg: 'bg-stone-900/40',
    gradient: 'bg-gradient-to-r from-stone-600 via-stone-500 to-amber-300',
    ring: 'ring-stone-300',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(168,162,158,0.22) 0%, rgba(245,158,11,0.07) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-stone-400/40',
  },
  normal: {
    dot: 'bg-stone-400',
    border: 'border-stone-400/60',
    borderStrong: 'border-stone-300',
    text: 'text-stone-300',
    badge: 'bg-stone-800/60 text-stone-100 border-stone-400/50',
    cardBg: 'bg-stone-800/30',
    gradient: 'bg-gradient-to-r from-stone-500 via-stone-400 to-amber-200',
    ring: 'ring-stone-300',
    ambient: 'radial-gradient(circle at 50% 30%, rgba(168,162,158,0.18) 0%, rgba(245,158,11,0.07) 45%, rgba(0,0,0,0) 72%)',
    glow: 'shadow-stone-400/40',
  },
};

/** Icône emoji par type. */
export const TYPE_ICONS: Record<MonsterType, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  normal: '✊',
  electric: '⚡',
  rock: '🪨',
};

/** Couleurs secondaires pour éléments divers de l'UI (HUD, reliques…). */
export const UI_COLORS = {
  player: 'border-sky-400 bg-sky-400/10',
  enemy: 'border-rose-500 bg-rose-500/10',
  gold: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500',
  xp: 'bg-gradient-to-r from-sky-500 to-cyan-400',
  ac: 'border-sky-400/60',
} as const;