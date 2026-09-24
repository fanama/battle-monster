import type { MonsterStat, MonsterType } from './Move';

/**
 * Création de champion personnalisé (remplace le choix d'un starter figé).
 *
 * Le joueur : 1) choisit un **type élémentaire**, 2) répartit ses **points de
 * destin** sur les caractéristiques de combat, 3) **nomme** sa créature.
 *
 * Ce module est du **domaine pur** (aucune dépendance UI/infra) : il décrit les
 * règles de répartition et la validation d'un brouillon (`MonsterDraft`).
 */

/** Niveau de départ d'un champion fraîchement forgé. */
export const CREATION_LEVEL = 5;

/** Points de destin distribuables (budget aligné sur les anciens starters). */
export const FATE_POINTS_TOTAL = 10;

/** Valeur plancher d'une caractéristique avant affinité et points de destin. */
export const STAT_FLOOR = 8;

/** Plafond D&D d'une caractéristique à la création. */
export const STAT_CAP = 18;

/** Charisme fixe (stat de fluff : expression du sprite, pas de combat). */
export const CREATION_CHARISMA = 10;

/** Instinct fixe de départ (regard du sprite et réflexes critiques). */
export const CREATION_INSTINCT = 10;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 18;

/** Caractéristiques sur lesquelles les points de destin sont distribuables. */
export type AllocatableStat = 'strength' | 'speed' | 'constitution' | 'wisdom';

export const ALLOCATABLE_STATS: readonly AllocatableStat[] = [
  'strength',
  'speed',
  'constitution',
  'wisdom',
] as const;

/** Points de destin affectés à chaque caractéristique. */
export type FateAllocation = Record<AllocatableStat, number>;

export interface TypeAffinity {
  /** Bonus innés du type, ajoutés au plancher (total : +6). */
  bonus: Partial<Record<AllocatableStat, number>>;
  /** Archétype affiché dans l'interface de création. */
  title: string;
  /** Résumé du rôle en combat. */
  blurb: string;
}

/**
 * Affinités innées par type (+6 points répartis), calquées sur les courbes de
 * progression de `Monster.getStatGrowth` : le type oriente l'archétype, les
 * points de destin permettent de le confirmer ou de le contredire.
 */
export const TYPE_AFFINITIES: Record<MonsterType, TypeAffinity> = {
  fire: {
    bonus: { strength: 3, speed: 3 },
    title: 'Frappeur ardent',
    blurb: 'Offensive brutale et initiative élevée, mais peu de réserve de PV.',
  },
  water: {
    bonus: { constitution: 4, wisdom: 2 },
    title: 'Gardien des flots',
    blurb: 'Réserve de PV massive et magie de soutien : tient la distance.',
  },
  grass: {
    bonus: { wisdom: 4, constitution: 2 },
    title: 'Mage sylvestre',
    blurb: 'Sorts puissants adossés à une bonne endurance.',
  },
  electric: {
    bonus: { speed: 4, wisdom: 2 },
    title: 'Éclair vif',
    blurb: "Frappe toujours en premier et esquive grâce à une CA élevée.",
  },
  rock: {
    bonus: { strength: 3, constitution: 3 },
    title: 'Colosse de pierre',
    blurb: 'Frappe lourde et encaisse, au prix de la vitesse.',
  },
  normal: {
    bonus: { strength: 2, speed: 2, constitution: 1, wisdom: 1 },
    title: 'Polyvalent',
    blurb: 'Aucune faiblesse élémentaire : un profil modulable à volonté.',
  },
};

/** Brouillon de champion en cours de création. */
export interface MonsterDraft {
  name: string;
  type: MonsterType;
  allocation: FateAllocation;
}

/** Répartition vierge (0 point placé). */
export function emptyAllocation(): FateAllocation {
  return { strength: 0, speed: 0, constitution: 0, wisdom: 0 };
}

/** Brouillon initial pour un type donné. */
export function createDraft(type: MonsterType = 'fire', name = ''): MonsterDraft {
  return { name, type, allocation: emptyAllocation() };
}

/** Valeur d'une caractéristique avant points de destin (plancher + affinité). */
export function baseStat(type: MonsterType, stat: AllocatableStat): number {
  return STAT_FLOOR + (TYPE_AFFINITIES[type].bonus[stat] ?? 0);
}

/** Valeur finale d'une caractéristique du brouillon. */
export function draftStat(draft: MonsterDraft, stat: AllocatableStat): number {
  return baseStat(draft.type, stat) + draft.allocation[stat];
}

/** Total de points de destin déjà placés. */
export function spentFatePoints(allocation: FateAllocation): number {
  return ALLOCATABLE_STATS.reduce((sum, stat) => sum + allocation[stat], 0);
}

/** Points de destin encore disponibles. */
export function remainingFatePoints(allocation: FateAllocation): number {
  return FATE_POINTS_TOTAL - spentFatePoints(allocation);
}

/** Un point peut-il encore être ajouté à cette caractéristique ? */
export function canIncrement(draft: MonsterDraft, stat: AllocatableStat): boolean {
  return remainingFatePoints(draft.allocation) > 0 && draftStat(draft, stat) < STAT_CAP;
}

/** Un point peut-il être retiré de cette caractéristique ? */
export function canDecrement(draft: MonsterDraft, stat: AllocatableStat): boolean {
  return draft.allocation[stat] > 0;
}

/** Ajoute un point de destin (retourne un nouveau brouillon, immuable). */
export function incrementStat(draft: MonsterDraft, stat: AllocatableStat): MonsterDraft {
  if (!canIncrement(draft, stat)) return draft;
  return {
    ...draft,
    allocation: { ...draft.allocation, [stat]: draft.allocation[stat] + 1 },
  };
}

/** Retire un point de destin (retourne un nouveau brouillon, immuable). */
export function decrementStat(draft: MonsterDraft, stat: AllocatableStat): MonsterDraft {
  if (!canDecrement(draft, stat)) return draft;
  return {
    ...draft,
    allocation: { ...draft.allocation, [stat]: draft.allocation[stat] - 1 },
  };
}

/** Change le type (les affinités bougent : on remet les points de destin à zéro). */
export function setDraftType(draft: MonsterDraft, type: MonsterType): MonsterDraft {
  if (draft.type === type) return draft;
  return { ...draft, type, allocation: emptyAllocation() };
}

/**
 * Répartition automatique : distribue tous les points restants sur les
 * caractéristiques favorisées par le type (puis les autres si plafonnées).
 */
export function autoAllocate(draft: MonsterDraft): MonsterDraft {
  const affinity = TYPE_AFFINITIES[draft.type].bonus;
  const priority = [...ALLOCATABLE_STATS].sort(
    (a, b) => (affinity[b] ?? 0) - (affinity[a] ?? 0)
  );

  let next = draft;
  let guard = FATE_POINTS_TOTAL * ALLOCATABLE_STATS.length;
  while (remainingFatePoints(next.allocation) > 0 && guard-- > 0) {
    const target = priority.find(stat => canIncrement(next, stat));
    if (!target) break;
    next = incrementStat(next, target);
  }
  return next;
}

/** Normalise un nom saisi : espaces compressés et longueur bornée. */
export function sanitizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
}

/** Erreurs bloquant la forge d'un champion (liste vide = brouillon valide). */
export function validateDraft(draft: MonsterDraft): string[] {
  const errors: string[] = [];
  const name = sanitizeName(draft.name);

  if (name.length < NAME_MIN_LENGTH) {
    errors.push(`Le nom doit contenir au moins ${NAME_MIN_LENGTH} caractères.`);
  }
  if (remainingFatePoints(draft.allocation) !== 0) {
    errors.push('Tous les points de destin doivent être répartis.');
  }
  if (ALLOCATABLE_STATS.some(stat => draftStat(draft, stat) > STAT_CAP)) {
    errors.push(`Aucune caractéristique ne peut dépasser ${STAT_CAP}.`);
  }
  return errors;
}

export function isDraftValid(draft: MonsterDraft): boolean {
  return validateDraft(draft).length === 0;
}

/** Jeu de caractéristiques complet issu du brouillon (prêt pour `Monster`). */
export function draftStats(draft: MonsterDraft): Record<MonsterStat, number> {
  return {
    strength: draftStat(draft, 'strength'),
    speed: draftStat(draft, 'speed'),
    constitution: draftStat(draft, 'constitution'),
    wisdom: draftStat(draft, 'wisdom'),
    charisma: CREATION_CHARISMA,
    instinct: CREATION_INSTINCT,
  };
}

/** Fragments de noms par type, pour le bouton « nom aléatoire ». */
const NAME_PREFIXES: Record<MonsterType, string[]> = {
  fire: ['Pyro', 'Brasi', 'Igni', 'Cendr'],
  water: ['Hydro', 'Ondi', 'Abys', 'Maré'],
  grass: ['Sylv', 'Rona', 'Verdo', 'Lian'],
  electric: ['Volt', 'Fulgu', 'Ardi', 'Storm'],
  rock: ['Cairn', 'Gran', 'Mono', 'Basal'],
  normal: ['Ferox', 'Nomi', 'Valo', 'Aster'],
};

const NAME_SUFFIXES = ['ax', 'is', 'or', 'ym', 'eth', 'ok'];

/** Propose un nom cohérent avec le type (aléatoire injectable pour les tests). */
export function suggestName(type: MonsterType, random: () => number = Math.random): string {
  const prefixes = NAME_PREFIXES[type];
  const prefix = prefixes[Math.floor(random() * prefixes.length)];
  const suffix = NAME_SUFFIXES[Math.floor(random() * NAME_SUFFIXES.length)];
  return `${prefix}${suffix}`;
}
