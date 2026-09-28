import type { Relic } from '../../core/entities/Relic';

export interface RelicTag {
  /** Effet principal dominant (compréhension immédiate). */
  label: string;
  /** Classes du badge (texte + bordure + fond). */
  chip: string;
  /** Classes de la carte (bordure + survol). */
  card: string;
}

/**
 * Étiquette colorée par effet principal d'une relique — design system partagé
 * entre l'écran de choix (`RelicChooser`) et la liste des reliques obtenues.
 * Toutes les strings sont des classes Tailwind littérales (détectées par JIT).
 */
export function relicTag(relic: Relic): RelicTag {
  const e = relic.effect;
  if (e.stat?.strength)
    return { label: 'Force', chip: 'text-red-200 border-red-500/50 bg-red-950/60', card: 'border-red-500/60 hover:border-red-400 hover:shadow-[0_0_16px_rgba(239,68,68,0.35)]' };
  if (e.stat?.speed)
    return { label: 'Vitesse', chip: 'text-sky-200 border-sky-500/50 bg-sky-950/60', card: 'border-sky-500/60 hover:border-sky-400 hover:shadow-[0_0_16px_rgba(56,189,248,0.35)]' };
  if (e.stat?.constitution)
    return { label: 'Constitution', chip: 'text-emerald-200 border-emerald-500/50 bg-emerald-950/60', card: 'border-emerald-500/60 hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(52,211,153,0.35)]' };
  if (e.stat?.wisdom)
    return { label: 'Savoir', chip: 'text-violet-200 border-violet-500/50 bg-violet-950/60', card: 'border-violet-500/60 hover:border-violet-400 hover:shadow-[0_0_16px_rgba(167,139,250,0.35)]' };
  if (e.stat?.instinct)
    return { label: 'Instinct', chip: 'text-amber-200 border-amber-500/50 bg-amber-950/60', card: 'border-amber-500/60 hover:border-amber-400 hover:shadow-[0_0_16px_rgba(251,191,36,0.35)]' };
  if (e.acBonus)
    return { label: 'Armure', chip: 'text-indigo-200 border-indigo-500/50 bg-indigo-950/60', card: 'border-indigo-500/60 hover:border-indigo-400 hover:shadow-[0_0_16px_rgba(129,140,248,0.35)]' };
  if (e.healStartPercent)
    return { label: 'Soin', chip: 'text-teal-200 border-teal-500/50 bg-teal-950/60', card: 'border-teal-500/60 hover:border-teal-400 hover:shadow-[0_0_16px_rgba(45,212,191,0.35)]' };
  if (e.lifestealPercent)
    return { label: 'Vol de vie', chip: 'text-fuchsia-200 border-fuchsia-500/50 bg-fuchsia-950/60', card: 'border-fuchsia-500/60 hover:border-fuchsia-400 hover:shadow-[0_0_16px_rgba(232,121,249,0.35)]' };
  if (e.damagePercent)
    return { label: 'Dégâts', chip: 'text-orange-200 border-orange-500/50 bg-orange-950/60', card: 'border-orange-500/60 hover:border-orange-400 hover:shadow-[0_0_16px_rgba(251,146,60,0.35)]' };
  if (e.critRange)
    return { label: 'Critique', chip: 'text-yellow-200 border-yellow-500/50 bg-yellow-950/60', card: 'border-yellow-500/60 hover:border-yellow-300 hover:shadow-[0_0_16px_rgba(253,224,71,0.35)]' };
  if (e.experiencePercent)
    return { label: 'Expérience', chip: 'text-cyan-200 border-cyan-500/50 bg-cyan-950/60', card: 'border-cyan-500/60 hover:border-cyan-300 hover:shadow-[0_0_16px_rgba(103,232,249,0.35)]' };
  return { label: 'Relique', chip: 'text-stone-200 border-stone-500/50 bg-stone-800/60', card: 'border-stone-500/60 hover:border-stone-400 hover:shadow-[0_0_16px_rgba(168,162,158,0.35)]' };
}
