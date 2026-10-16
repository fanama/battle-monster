import type { MonsterStat, Move, MonsterType } from './Move';
import type { ActiveStatus, StatusEffectType } from './StatusEffect';
import type { Equipment, EquipmentSlot, EquipmentEffect } from './Equipment';
import { EQUIPMENT_SLOTS, equipmentTotals } from './Equipment';
import type { Relic } from './Relic';
import {
  RELIC_SLOT_COUNT,
  relicDamagePercent as sumRelicDamagePercent,
  relicLifestealPercent as sumRelicLifestealPercent,
  relicHealStartPercent as sumRelicHealStartPercent,
  relicExperiencePercent as sumRelicExperiencePercent,
  relicMaxCritRange,
} from './Relic';
export type { ActiveStatus, StatusEffectType };

/**
 * D&D ability modifier: floor((stat - 10) / 2). E.g. 10 → +0, 12 → +1, 18 → +4.
 */
export function abilityModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

/** Rang du monstre (dnd : PNJ / minion / boss) — sert au calcul d'XP. */
export type MonsterRank = 'normal' | 'boss';

/**
 * Diff chiffré d'un portage (convention DQ : voir le gain **avant** de
 * valider). Tous les champs sont des écarts signés : `+2` de Force, `-1` de CA.
 */
export interface MonsterDelta {
  stat: Partial<Record<MonsterStat, number>>;
  ac: number;
  maxHp: number;
}

/**
 * D&D hit dice par type (PV max = Dé de Vie + mod(Constitution)).
 *
 * **Uniforme (d10 pour tous)** : le dé de vie était le multiplicateur caché du
 * désavantage Constitution. Combiné aux affinités de type, Feu / Électricité /
 * Normal tombaient à Constitution 8 *et* d8, soit 44 PV max au niveau 7 contre
 * 65 pour l'Eau : ces trois types se faisaient désosser avant d'aligner un
 * coup. La différenciation se joue désormais sur la Constitution elle-même
 * (affinités, croissance), qui est lisible et affichée, et plus sur un
 * modificateur de PV non documenté.
 */
const HIT_DICE: Record<MonsterType, number> = {
  fire: 10,
  water: 10,
  grass: 10,
  normal: 10,
  electric: 10,
  rock: 10,
};

/**
 * Mise à l'échelle du pool de PV par niveau : `BASE + level × PER_LEVEL`.
 *
 * Recalibré deux fois après mesure. D'abord 2.1 + 0.50·lvl, parce que les
 * dégâts des moves ne montaient pas avec le niveau alors que les PV, eux,
 * explosaient. Puis 5 + 0.50·lvl : une fois `levelPaceFactor` appliqué aux
 * dégâts — dégâts et PV progressent désormais sur la même courbe — la
 * réserve restante était trop faible au regard des coups portés : les combats
 * se résolvient en 2 à 3 rounds. Un duel doit durer assez de tours pour que
 * statuts, soins et initiative aient le temps de peser.
 *
 * Mesuré sur 400 duels par palier, les deux sens de matchup joués pour
 * annuler l'avantage de type : les combats duraient 7,7 rounds au niv. 5 et
 * jusqu'à 15,1 au niv. 13 — bien trop long. Après recalibrage : 5,9 et 10,3.
 * Le taux de victoire, lui, reste stable (~55 % en miroir, ~51 % face à un
 * ennemi d'un niveau au-dessus) : on raccourcit les combats sans les rendre
 * plus faciles. Le niveau 1 est volontairement inchangé (2,6 ≈ ancien 2,65) :
 * seule la progression par niveau est adoucie.
 */
const HP_SCALE_BASE = 5;
const HP_SCALE_PER_LEVEL = 0.5;

/**
 * Facteur de cadence d'un combat : les **dégâts suivent la même courbe de
 * progression que les PV**, si bien qu'un round dure le même nombre de tours du
 * niveau 1 au niveau 13.
 *
 * Sans lui, les dégâts d'un move ne dépendaient que de ses dés (constants) et du
 * modificateur d'attribut (+1 tous les 2 points) : de `2.1 + 0.5·lvl` en PV, la
 * réserve doublait presque entre le niveau 5 (4.6) et le niveau 13 (8.6) alors
 * que les dégâts ne gagnaient que 1.23 ×. Conséquence directe : un
 * ennemi d'un seul niveau au-dessus absorbait ~70 % de PV en plus pour ~3
 * dégâts de plus — les combats s'allongeaient (4.5 rounds au niv. 5,
 * 12 au niv. 13) et le moindre décalage de niveau devenait un mur (les boss
 * des régions 2 et 3 étaient mesurés à 0-10 % de victoire).
 *
 * Désormais les deux grandeurs progressent ensemble : un écart de niveau est
 * un handicap lisible et réversible, pas une exécution.
 *
 * La référence est le **niveau 1** : `levelPaceFactor(1) === 1`, donc le
 * comportement d'un monstre de niveau 1 est exactement celui d'avant ce
 * rééquilibrage. Tout ce qui est au-dessus simply suit la même courbe que
 * les PV.
 */
export function levelPaceFactor(level: number): number {
  const pace = (lvl: number) => HP_SCALE_BASE + lvl * HP_SCALE_PER_LEVEL;
  return pace(level) / pace(1);
}

/** Nombre maximum d'attaques qu'un monstre peut équiper simultanément. */
export const MAX_MOVES = 4;

/**
 * Total de points de caractéristiques gagnés **par niveau**, identique pour
 * tous les types et à chaque palier (invariant des courbes de croissance,
 * `GROWTH_CURVES`). Chaque paire de points vaut +1 modificateur d'attribut :
 * c'est le budget de progression commun.
 */
export const STAT_GROWTH_TOTAL = 9;

// --- Plafonds de Classe d'Armure (rebalance P0) ---

/** Base D&D de la CA. */
export const AC_BASE = 10;

/** Part du modificateur de Vitesse qui compte : au-delà, la Vitesse n'esquive plus. */
export const AC_SPEED_MOD_CAP = 5;

/** Bonus d'armure (reliques, élixirs) à plein effet ; au-delà, demi-valeur. */
export const AC_ARMOR_SOFT_CAP = 6;

/** Plafond absolu de la CA effective (garde-fou anti-intouchabilité). */
export const AC_HARD_CAP = 24;

/** Bonus d'armure effectif : plein effet jusqu'à `+6`, puis un point sur deux. */
export function effectiveArmorBonus(armorBonus: number): number {
  if (armorBonus <= AC_ARMOR_SOFT_CAP) return armorBonus;
  return AC_ARMOR_SOFT_CAP + Math.floor((armorBonus - AC_ARMOR_SOFT_CAP) / 2);
}

// --- Charisme (rebalance P0) ---

/** Charisme de référence : en dessous, aucun bonus (valeur de création). */
export const CHARISMA_BASE = 10;

/** Points de Charisme nécessaires pour +100 % de dégâts magiques. */
export const CHARISMA_MAGIC_PER_POINT = 50;

/** Bonus de dégâts magiques (en %) apporté par un Charisme donné. */
export function charismaMagicPercent(charisma: number): number {
  return Math.floor((Math.max(0, charisma - CHARISMA_BASE) / CHARISMA_MAGIC_PER_POINT) * 100);
}

/** Bonus de soin (PV par sort de soin) apporté par un Charisme donné. */
export function charismaHealBonus(charisma: number): number {
  return Math.max(0, abilityModifier(charisma));
}

/**
 * Niveau maximum d'un monstre — le « plafond de classe » façon RPG Maker.
 *
 * La progression réellement jouée s'arrête bien avant (les régions culminent
 * vers le niveau 13-14) : cette borne est un garde-fou, pas un objectif.
 */
export const MAX_LEVEL = 99;

/**
 * Part des PV max rendue à chaque montée de niveau.
 *
 * RPG Maker ne soigne **pas** en montant de niveau (max PV monte, PV courants
 * inchangés — d'où les plugins « Recover On Level Up »). On garde une petite
 * restitution ({@link LEVEL_UP_HEAL_PERCENT} %) pour que la montée reste un
 * moment de soulagement sans annuler la logique d'attrition du run.
 */
export const LEVEL_UP_HEAL_PERCENT = 25;

/**
 * Paramètres de la courbe d'EXP — modèle RPG Maker MZ (`Game_Actor.expForLevel`),
 * qui remplace l'ancienne courbe linéaire du domaine (`80 × niveau − 40`).
 *
 *  - `base` : valeur de référence (baisse = toute la courbe baisse) ;
 *  - `extra` : montant ajouté à **chaque** niveau (aplatit le début de courbe) ;
 *  - `accA` : règle l'exposant de progression (`0.9 + accA / 250`) — c'est le
 *    « Accélération A » de l'éditeur, il durcit surtout les hauts niveaux ;
 *  - `accB` : règle la courbure de fin de courbe (« Accélération B »).
 *
 * Réglage (2026-10) : reproduit la **cadence** de l'ancienne courbe linéaire
 * sur la plage jouée — ~40 EXP pour le palier 1→2 et ~6 700 EXP cumulés au
 * niveau 14 — tout en adoptant la forme quadratique de RPG Maker (paliers qui
 * s'allongent en fin de partie).
 */
export interface ExperienceCurve {
  base: number;
  extra: number;
  accA: number;
  accB: number;
}

export const EXPERIENCE_CURVE: ExperienceCurve = {
  base: 14,
  extra: 26,
  accA: 25,
  accB: 30,
};

/**
 * EXP **cumulée** nécessaire pour atteindre `level` (formule RPG Maker MZ).
 * `experienceForLevel(1) === 0` : le niveau 1 est le point de départ.
 *
 * L'EXP est stockée comme un **total** (et non comme un reliquat remis à zéro
 * à chaque palier, comme avant) : l'UI affiche la part du niveau courant, et
 * deux monstres de même niveau partagent le même socle d'EXP.
 */
export function experienceForLevel(
  level: number,
  curve: ExperienceCurve = EXPERIENCE_CURVE,
): number {
  const l = Math.max(1, Math.floor(level));
  const exponent = 0.9 + curve.accA / 250;
  const numerator = curve.base * Math.pow(l - 1, exponent) * l * (l + 1);
  const denominator = 6 + Math.pow(l, 2) / 50 / curve.accB;
  return Math.round(numerator / denominator + (l - 1) * curve.extra);
}

/**
 * Vecteur de progression : points gagnés sur chaque caractéristique pour un
 * palier donné.
 *
 *  - Force : toucher et dégâts physiques
 *  - Savoir : toucher, dégâts magiques et puissance des soins
 *  - Vitesse : Classe d'Armure (CA)
 *  - Constitution : PV max
 *  - Instinct : perception martiale (chances de critique, regard du sprite)
 *  - Charisme : **croissance nulle par conception** — il ne s'obtient que par
 *    les reliques (dégâts magiques et soins).
 */
export interface StatGrowth {
  strength: number;
  speed: number;
  constitution: number;
  wisdom: number;
  charisma: number;
  instinct: number;
}

/** Clés de caractéristiques, dans l'ordre d'affichage de la fiche. */
export const STAT_GROWTH_KEYS: readonly (keyof StatGrowth)[] = [
  'strength',
  'speed',
  'constitution',
  'wisdom',
  'charisma',
  'instinct',
] as const;

/**
 * Courbe de paramètre d'un type — modèle **RPG Maker « Generate Curve »** :
 * un incrément au premier palier, un incrément au dernier, et un paramètre de
 * courbure qui penche la progression tôt (précoce) ou tard (tardive).
 *
 * Les valeurs sont des **incréments par niveau** et non des valeurs absolues :
 * le champion étant forgé avec des stats de niveau 1 choisies par le joueur,
 * la courbe décrit la *croissance* ancrée sur ces stats (l'équivalent de la
 * valeur au niveau 1, côté RPG Maker, est la stat de forge).
 *
 * **Invariant d'équilibrage conservé** : `start` et `end` totalisent chacun
 * {@link STAT_GROWTH_TOTAL} points. La croissance d'un palier étant une
 * interpolation linéaire des deux, la somme des six caractéristiques vaut
 * exactement {@link STAT_GROWTH_TOTAL} à *chaque* niveau, quelle que soit la
 * courbure : la courbe redistribue *quand* un type reçoit ses points, jamais
 * leur budget total — aucun avantage caché en cours de run.
 */
export interface GrowthCurve {
  /** Incrément appliqué au premier palier de progression (niveau 2). */
  start: StatGrowth;
  /** Incrément appliqué au dernier palier de la courbe. */
  end: StatGrowth;
  /** < 1 = croissance précoce (front-loadée), 1 = linéaire, > 1 = tardive. */
  curvature: number;
}

/**
 * Niveau auquel une courbe atteint son incrément final (`end`). Au-delà, la
 * croissance reste bloquée sur `end` : la courbe est calibrée sur la
 * progression **réellement jouée** (les régions s'arrêtent vers le niveau 13),
 * pas sur le plafond théorique de {@link MAX_LEVEL}. Sans ce recalage, une
 * courbe étalée sur 99 niveaux ne bougerait quasiment pas sur les 14 niveaux
 * d'une run — la courbure serait invisible.
 */
export const GROWTH_CURVE_REFERENCE_LEVEL = 20;

/**
 * Courbes de croissance par type. Chaque couple `start`/`end` a la **même
 * moyenne** que l'ancien incrément plat du type (ex. Feu `3/2/2/1/0/1`) : la
 * courbure redistribue quand un type reçoit ses points (Feu frappe tôt, Roche
 * et Eau encaissent tard), sans déplacer son budget. La moyenne est conservée
 * pour ne pas rouvrir l'équilibrage déjà mesuré sur les incréments plats.
 */
export const GROWTH_CURVES: Record<MonsterType, GrowthCurve> = {
  // Feu : offensive précoce, la Constitution rattrape en fin de partie.
  fire: {
    start: { strength: 4, speed: 3, constitution: 1, wisdom: 1, charisma: 0, instinct: 0 },
    end: { strength: 2, speed: 1, constitution: 3, wisdom: 1, charisma: 0, instinct: 2 },
    curvature: 0.8,
  },
  // Eau : gardien — encaisse d'abord, puis bascule sur la réserve de PV.
  water: {
    start: { strength: 2, speed: 1, constitution: 4, wisdom: 2, charisma: 0, instinct: 0 },
    end: { strength: 2, speed: 1, constitution: 2, wisdom: 2, charisma: 0, instinct: 2 },
    curvature: 1.15,
  },
  // Plante : mage — le Savoir arrive surtout sur la seconde moitié.
  grass: {
    start: { strength: 1, speed: 3, constitution: 2, wisdom: 2, charisma: 0, instinct: 1 },
    end: { strength: 1, speed: 1, constitution: 2, wisdom: 4, charisma: 0, instinct: 1 },
    curvature: 1.2,
  },
  // Normal : polyvalent, courbe quasi linéaire (glisse de l'offense au Savoir).
  normal: {
    start: { strength: 3, speed: 2, constitution: 2, wisdom: 1, charisma: 0, instinct: 1 },
    end: { strength: 1, speed: 2, constitution: 2, wisdom: 3, charisma: 0, instinct: 1 },
    curvature: 1,
  },
  // Électricité : la Vitesse (donc la CA) arrive d'abord, la Force ensuite.
  electric: {
    start: { strength: 1, speed: 5, constitution: 1, wisdom: 1, charisma: 0, instinct: 1 },
    end: { strength: 1, speed: 1, constitution: 3, wisdom: 3, charisma: 0, instinct: 1 },
    curvature: 0.8,
  },
  // Roche : colosse — lent à démarrer, mur en fin de progression.
  rock: {
    start: { strength: 4, speed: 1, constitution: 2, wisdom: 1, charisma: 0, instinct: 1 },
    end: { strength: 2, speed: 1, constitution: 4, wisdom: 1, charisma: 0, instinct: 1 },
    curvature: 1.25,
  },
};

/** Vecteur de croissance nul (`charisma` y est toujours à 0). */
export function zeroGrowth(): StatGrowth {
  return { strength: 0, speed: 0, constitution: 0, wisdom: 0, charisma: 0, instinct: 0 };
}

/** Ajoute `growth` à `stats` (mutation, sert à cumuler plusieurs paliers). */
export function addGrowth(stats: StatGrowth, growth: StatGrowth): void {
  stats.strength += growth.strength;
  stats.speed += growth.speed;
  stats.constitution += growth.constitution;
  stats.wisdom += growth.wisdom;
  stats.charisma += growth.charisma;
  stats.instinct += growth.instinct;
}

/** Retire `growth` à `stats` (mutation) — paliers « non franchis » d'un ennemi. */
export function subGrowth(stats: StatGrowth, growth: StatGrowth): void {
  stats.strength -= growth.strength;
  stats.speed -= growth.speed;
  stats.constitution -= growth.constitution;
  stats.wisdom -= growth.wisdom;
  stats.charisma -= growth.charisma;
  stats.instinct -= growth.instinct;
}

/**
 * Incrément de statistiques appliqué au **niveau atteint** (passer au niveau `n`
 * applique `statGrowthForLevel(type, n)`).
 *
 * Interpole la courbe `start → end` du type, puis arrondit **au plus fort
 * reste** : les parties fractionnaires servent à distribuer les points
 * manquants, si bien que la somme des six caractéristiques reste exactement
 * {@link STAT_GROWTH_TOTAL} à chaque niveau (invariant de budget : deux points
 * valent +1 modificateur).
 */
export function statGrowthForLevel(type: MonsterType, level: number): StatGrowth {
  const curve = GROWTH_CURVES[type] ?? GROWTH_CURVES.normal;
  const span = Math.max(1, GROWTH_CURVE_REFERENCE_LEVEL - 1);
  const progress = Math.min(1, Math.max(0, (level - 1) / span));
  const eased = Math.pow(progress, curve.curvature);

  const raw = STAT_GROWTH_KEYS.map((stat) => {
    const from = curve.start[stat];
    const to = curve.end[stat];
    return from + (to - from) * eased;
  });

  const values = raw.map((value) => Math.floor(value));
  let remaining = STAT_GROWTH_TOTAL - values.reduce((sum, value) => sum + value, 0);
  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remaining > 0) {
    values[byFraction[cursor % byFraction.length]!.index]!++;
    remaining--;
    cursor++;
  }

  return {
    strength: values[0]!,
    speed: values[1]!,
    constitution: values[2]!,
    wisdom: values[3]!,
    charisma: values[4]!,
    instinct: values[5]!,
  };
}

/**
 * Represents a Monster entity in the game.
 * Handles stats, leveling logic, and stat buffs.
 */
export class Monster {
  public moves: Move[];
  /** EXP **cumulée** depuis le niveau 1 (total, façon RPG Maker — pas un reliquat de palier). */
  public experience: number;
  public maxHp: number;
  public currentHp: number;
  /** Rang du monstre : 'boss' → XP accrue (dnd : 10/20/50). */
  public rank: MonsterRank = 'normal';
  /** Bonus d'armure (reliques/équipement), ajouté à la CA. */
  public armorBonus: number = 0;
  /** Statuts élémentaires actifs (Brûlure, Gel, Paralysie, Poison). */
  public statuses: ActiveStatus[] = [];
  /**
   * Multiplicateur de **charge armée** (« ちからため »), 0 = aucune.
   * Consommé par la prochaine attaque qui **touche** : un raté le laisse en
   * place (la charge est tenue, pas dépensée).
   */
  public chargedStrike = 0;
  /**
   * Équipements **portés** (un par emplacement, 5 slots façon DQ).
   * Une pièce hors de cette carte (dans la sacoche du run) est inactive.
   * Les stats & CA sont appliquées/désappliquées à l'acte d'équipement
   * (`equip`/`unequip`) ; les passifs se lisent via les getters
   * `equipment*Percent()` ci-dessous, **en addition des reliques**.
   */
  public equipped: Partial<Record<EquipmentSlot, Equipment>> = {};
  /**
   * Reliques **portées** (réglage DQ, 2026-10) : la réserve du run
   * (`RunState.relics`) contient tout ce qui a été arraché aux monstres, mais
   * **seules les reliques de cette liste agissent** — dans la limite de
   * `RELIC_SLOT_COUNT` emplacements. Une relique en réserve n'a aucun effet,
   * exactement comme une pièce d'équipement restée en sacoche.
   *
   * Stats & CA suivent l'acte de portage (`wearRelic`/`takeOffRelic`,
   * inverses exacts) ; les passifs se lisent via `relic*Percent()`.
   */
  public wornRelics: Relic[] = [];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: MonsterType,
    public level: number,
    // Base Stats
    public strength: number,
    public speed: number,
    public constitution: number,
    public charisma: number,
    public wisdom: number,
    public instinct: number,
    // Moves and Visuals
    initialMoves: Move[],
    public spriteUrl: string = ''
  ) {
    // CLONE THE MOVES: Ensures each monster instance has its own cooldown state, capped at MAX_MOVES.
    this.moves = initialMoves.slice(0, MAX_MOVES).map(move => ({
      ...move,
      coolDown: 0
    }));

    // Plafond de classe : un monstre ne peut pas naître au-delà de MAX_LEVEL.
    this.level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(this.level)));
    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp;
    // L'EXP est cumulée : naître au niveau N, c'est détenir l'EXP du niveau N.
    this.experience = experienceForLevel(this.level);
  }

  /** EXP cumulée au début du niveau courant (RPG Maker `currentLevelExp`). */
  public currentLevelExperience(): number {
    return experienceForLevel(this.level);
  }

  /** EXP cumulée nécessaire pour atteindre le **niveau suivant** (RPG Maker `nextLevelExp`). */
  public nextLevelExperience(): number {
    return experienceForLevel(Math.min(this.level + 1, MAX_LEVEL));
  }

  /** EXP déjà engrangée **dans** le niveau courant (numérateur de la barre). */
  public experienceInLevel(): number {
    return Math.max(0, this.experience - this.currentLevelExperience());
  }

  /** Nombre d'EXP que couvre le niveau courant (dénominateur de la barre). */
  public experienceLevelSpan(): number {
    return Math.max(1, this.nextLevelExperience() - this.currentLevelExperience());
  }

  /** EXP **restantes** avant la prochaine montée (0 une fois le plafond atteint). */
  get experienceToNextLevel(): number {
    if (this.level >= MAX_LEVEL) return 0;
    return Math.max(0, this.nextLevelExperience() - this.experience);
  }

  /** Le monstre a-t-il atteint le plafond de niveau ? */
  get isMaxLevel(): boolean {
    return this.level >= MAX_LEVEL;
  }

  // --- Charge (« ちからため ») ---

  /** Arme la prochaine attaque d'un multiplicateur de dégâts. */
  public armCharge(multiplier: number): void {
    this.chargedStrike = Math.max(0, multiplier);
  }

  /** Consomme la charge et rend son multiplicateur (0 si aucune). */
  public consumeCharge(): number {
    const multiplier = this.chargedStrike;
    this.chargedStrike = 0;
    return multiplier;
  }

  /** La charge est-elle armée ? */
  get isCharged(): boolean {
    return this.chargedStrike > 0;
  }

  /** Désarme la charge sans l'appliquer (début de combat). */
  public clearCharge(): void {
    this.chargedStrike = 0;
  }

  /**
   * Apprend une nouvelle capacité en respectant la limite de 4 attaques max.
   * Si le monstre a moins de 4 attaques, elle est ajoutée directement.
   * Si le monstre a déjà 4 attaques et qu'un `replaceIndex` est fourni (0..3),
   * l'ancienne attaque à cet index est remplacée.
   */
  public learnMove(newMove: Move, replaceIndex?: number): { replacedMove: Move | null; success: boolean } {
    const existingIndex = this.moves.findIndex(m => m.id === newMove.id);
    if (existingIndex !== -1) {
      // Déjà connue, on conserve l'état existant
      return { replacedMove: null, success: false };
    }

    const cloned = { ...newMove, coolDown: 0 };
    if (this.moves.length < MAX_MOVES) {
      this.moves = [...this.moves, cloned];
      return { replacedMove: null, success: true };
    }

    const targetIdx = replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < this.moves.length
      ? replaceIndex
      : 0;
    const replaced = this.moves[targetIdx] ?? null;
    const nextMoves = [...this.moves];
    nextMoves[targetIdx] = cloned;
    this.moves = nextMoves;
    return { replacedMove: replaced, success: true };
  }

  /**
   * Définit l'ensemble des attaques équipées (entre 1 et MAX_MOVES).
   * Conserve les cooldowns en cours pour les attaques qui étaient déjà équipées.
   */
  public setMoves(newMoves: Move[]): void {
    const valid = newMoves.slice(0, MAX_MOVES);
    if (valid.length === 0) return;
    this.moves = valid.map(m => {
      const existing = this.moves.find(em => em.id === m.id);
      return existing ? { ...m, coolDown: existing.coolDown ?? 0 } : { ...m, coolDown: 0 };
    });
  }

  /**
   * Max PV (D&D rule): max(Dé de Vie) + mod(Constitution), scaled by level so
   * the pool grows with progression. Minimum 1 PV.
   */
  private calculateMaxHp(): number {
    const base = (HIT_DICE[this.type] ?? 8) + abilityModifier(this.constitution);
    const factor = HP_SCALE_BASE + this.level * HP_SCALE_PER_LEVEL;
    return Math.max(1, Math.floor(base * factor));
  }

  // --- Combat Logic ---

  /**
   * Checks if the monster's HP has reached zero.
   */
  isFainted(): boolean {
    return this.currentHp <= 0;
  }

  /**
   * Reduces current HP by a specific amount.
   */
  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  /**
   * Restores HP (potion/soin partiel), capped at max HP.
   * Returns the amount actually restored.
   */
  heal(amount: number): number {
    const restored = Math.min(this.maxHp, this.currentHp + amount) - this.currentHp;
    this.currentHp += restored;
    return restored;
  }

  /** Remet tous les cooldowns de moves à zéro (début de combat). */
  resetCooldowns(): void {
    this.moves.forEach(move => {
      move.coolDown = 0;
    });
  }

  // --- Équipement porté (capacités signature) ---

  /** Liste des pièces portées, ordonnée par emplacement. */
  getEquippedList(): Equipment[] {
    return EQUIPMENT_SLOTS.map(slot => this.equipped[slot]).filter((p): p is Equipment => !!p);
  }

  /**
   * Porte une pièce dans son emplacement. La pièce déjà portée (le cas
   * échéant) est **déséquipée d'abord** — ses effets sont inversés exactement,
   * sous le poids de sa valeur (chaque boost est édité via une saisie secrète
   * testable : les stats s'ajoutent seulement via l'acte de portage).
   *
   * **Règle Dragon Quest des armes à deux mains** : la pose est **refusée**
   * (aucun effet, `null` renvoyé) pour un bouclier tant qu'une arme à deux
   * mains est tenue. Le retrait de l'arme libère le bouclier.
   *
   * @returns la pièce délogée (null si l'emplacement était vide, ou si la pose
   *          est refusée par la règle des deux mains).
   */
  equip(piece: Equipment): Equipment | null {
    if (!this.canEquip(piece)) return null;
    const displaced = this.unequip(piece.slot);
    this.equipped[piece.slot] = piece;
    this._applyEquipmentEffect(piece.effect);
    return displaced;
  }

  /**
   * La pièce peut-elle être portée ? Seule la règle des **armes à deux mains**
   * (DQ) refuse quelque chose : le bouclier, tant que l'arme tenue l'est.
   * Les appelants doivent consulter ce verdict AVANT d'appeler `equip` —
   * `equip` refuse silencieusement un portage interdit.
   */
  canEquip(piece: Equipment): boolean {
    if (piece.slot === 'shield') return !this.equipped.weapon?.twoHanded;
    return true;
  }

  /**
   * Emplacements vidés **de force** par la pose de cette pièce : porter une
   * arme à deux mains chasse le bouclier (il retourne en sacoche), comme dans
   * Dragon Quest où l'arme à deux mains libère la main du bouclier.
   */
  conflictingSlots(piece: Equipment): EquipmentSlot[] {
    const bothHands = piece.slot === 'weapon' && piece.twoHanded === true;
    return bothHands && this.equipped.shield ? ['shield'] : [];
  }

  /**
   * Déséquipe la pièce de l'emplacement (aucun effet si vide) et inverse ses
   * bonus de stats/CA. Les passifs étaient lus à la volée : rien à inverser.
   */
  unequip(slot: EquipmentSlot): Equipment | null {
    const piece = this.equipped[slot];
    if (!piece) return null;
    delete this.equipped[slot];
    this._applyEquipmentEffect(piece.effect, -1);
    return piece;
  }

  /**
   * Applique (ou inverse) les bonus de stats & CA d'un effet porté — pièce
   * d'équipement **ou** relique, les deux familles partageant la même forme
   * `{ stat, acBonus }`. C'est ce qui rend le portage exactement inversible.
   */
  private _applyEquipmentEffect(
    effect: Pick<EquipmentEffect, 'stat' | 'acBonus'>,
    direction: 1 | -1 = 1,
  ): void {
    if (effect.stat) {
      for (const [key, value] of Object.entries(effect.stat)) {
        if (value) this.boostStat(key as MonsterStat, value * direction);
      }
    }
    if (effect.acBonus) {
      this.armorBonus += effect.acBonus * direction;
    }
  }

  // --- Reliques portées (réglage DQ : 3 emplacements) ---

  /** Reliques actuellement portées (copie : la liste interne reste privée). */
  getWornRelics(): Relic[] {
    return [...this.wornRelics];
  }

  /** L'emplacement de relique est-il libre ? */
  get relicSlotsFree(): number {
    return Math.max(0, RELIC_SLOT_COUNT - this.wornRelics.length);
  }

  /**
   * Porte une relique de la réserve. Refusée (false, aucun effet) si elle est
   * déjà portée ou si les `RELIC_SLOT_COUNT` emplacements sont pris — c'est un
   * choix : on retire avant de remplacer.
   */
  wearRelic(relic: Relic): boolean {
    if (this.wornRelics.some(worn => worn.id === relic.id)) return false;
    if (this.wornRelics.length >= RELIC_SLOT_COUNT) return false;
    this.wornRelics = [...this.wornRelics, relic];
    this._applyEquipmentEffect(relic.effect, 1);
    return true;
  }

  /**
   * Retire une relique portée et **inverse exactement** ses bonus de stats/CA.
   * La relique retourne dans la réserve du run (jamais perdue).
   */
  takeOffRelic(relicId: string): Relic | null {
    const relic = this.wornRelics.find(worn => worn.id === relicId);
    if (!relic) return null;
    this.wornRelics = this.wornRelics.filter(worn => worn.id !== relicId);
    this._applyEquipmentEffect(relic.effect, -1);
    return relic;
  }

  /** Retire TOUTES les reliques portées (début de run : chacun se ré-équipe). */
  clearWornRelics(): Relic[] {
    const removed = [...this.wornRelics];
    for (const relic of removed) this.takeOffRelic(relic.id);
    return removed;
  }

  // --- Passifs des reliques portées (plafonnés, cf. RELIC_EFFECT_CAPS) ---

  /** « % de dégâts » cumulés des reliques **portées** (plafonné). */
  relicDamagePercent(): number {
    return sumRelicDamagePercent(this.wornRelics);
  }

  /** « % de vol de vie » cumulés des reliques **portées** (plafonné). */
  relicLifestealPercent(): number {
    return sumRelicLifestealPercent(this.wornRelics);
  }

  /** Plage de critiques la plus large des reliques **portées**. */
  relicCritRange(): number {
    return relicMaxCritRange(this.wornRelics);
  }

  /** « % d'EXP » cumulés des reliques **portées** (plafonné). */
  relicExperiencePercent(): number {
    return sumRelicExperiencePercent(this.wornRelics);
  }

  /** « % de soin de début de combat » cumulés des reliques **portées** (plafonné). */
  relicHealStartPercent(): number {
    return sumRelicHealStartPercent(this.wornRelics);
  }

  // --- Passifs d'équipement porté (lus en addition des reliques) ---

  /** Somme des « % de dégâts » de l'équipement porté. */
  equipmentDamagePercent(): number {
    return equipmentTotals(this.equipped).damagePercent ?? 0;
  }

  /** Somme des « % de vol de vie » de l'équipement porté. */
  equipmentLifestealPercent(): number {
    return equipmentTotals(this.equipped).lifestealPercent ?? 0;
  }

  /** Plage de critiques la plus élargie de l'équipement porté (0 sinon). */
  equipmentCritRange(): number {
    return equipmentTotals(this.equipped).critRange ?? 0;
  }


  /** Somme des « % d'EXP » de l'équipement porté. */
  equipmentExperiencePercent(): number {
    return equipmentTotals(this.equipped).experiencePercent ?? 0;
  }

  /** Somme des « % de soin de début de combat » de l'équipement porté. */
  equipmentHealStartPercent(): number {
    return equipmentTotals(this.equipped).healStartPercent ?? 0;
  }

  // --- Aperçu avant/après (convention DQ : voir le gain avant de valider) ---

  /**
   * Diff chiffré qu'apporterait une pose, **sans muter le monstre** : le
   * monstre est cloné par snapshot, la pose y est jouée, seules les
   * différences sont renvoyées. C'est la **vraie** CA qui est comparée
   * (plafonds de vitesse et d'armure compris), pas une approximation — la
   * pièce portée de l'emplacement est retirée au préalable, comme le fera
   * `equip`.
   */
  previewEquip(piece: Equipment): MonsterDelta {
    const clone = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(this));
    clone.unequip(piece.slot);
    clone.equip(piece);
    return this._deltaAgainst(clone);
  }

  /**
   * Idem pour une relique. Zéro partout si les emplacements sont pleins (la
   * relique ne serait pas portée) — c'est à l'interface de le dire.
   */
  previewRelic(relic: Relic): MonsterDelta {
    const clone = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(this));
    clone.wearRelic(relic);
    return this._deltaAgainst(clone);
  }

  private _deltaAgainst(other: Monster): MonsterDelta {
    const stat: Partial<Record<MonsterStat, number>> = {};
    const keys: MonsterStat[] = [
      'strength',
      'speed',
      'constitution',
      'charisma',
      'wisdom',
      'instinct',
    ];
    for (const key of keys) {
      const delta = other[key] - this[key];
      if (delta !== 0) stat[key] = delta;
    }
    return { stat, ac: other.getAC() - this.getAC(), maxHp: other.maxHp - this.maxHp };
  }

  // --- Gestion des Statuts Élémentaires ---

  hasStatus(type: StatusEffectType): boolean {
    return this.statuses.some(s => s.type === type);
  }

  getStatus(type: StatusEffectType): ActiveStatus | undefined {
    return this.statuses.find(s => s.type === type);
  }

  addStatus(type: StatusEffectType, duration = 3, potency = 1): boolean {
    const existing = this.getStatus(type);
    if (existing) {
      // Renouvelle la durée si supérieure
      existing.duration = Math.max(existing.duration, duration);
      if (potency > (existing.potency ?? 1)) {
        existing.potency = potency;
      }
      return false; // Pas un nouveau statut
    }
    this.statuses.push({ type, duration, potency });
    return true; // Nouveau statut appliqué
  }

  removeStatus(type: StatusEffectType): void {
    this.statuses = this.statuses.filter(s => s.type !== type);
  }

  clearStatuses(): void {
    this.statuses = [];
  }

  /**
   * Armor Class (CA), D&D rule: 10 + mod(Vitesse) + BonusArmure.
   * L'armure provient des reliques (+2 par exemple).
   *
   * **Plafonnée (rebalance P0)** : sans plafond, empiler de la CA (19 reliques
   * + un élixir rachtable à l'infini) rendait le monstre mathématiquement
   * intouchable — au-delà de CA ≈ 28, l'attaquant ne passe plus que par
   * naturel 20 ou critique, donc plus aucun jet ne peut le toucher. La
   * conversion stats → CA est donc bornée :
   *  - Vitesse : seul `mod(Vitesse)` jusqu'à `+5` compte (au-delà, la Vitesse
   *    n'esquive plus) ;
   *  - Armure : plein effet jusqu'à `+6`, puis chaque point suivant ne compte
   *    que pour un demi-point ;
   *  - Plafond absolu : `AC_HARD_CAP`.
   */
  getAC(): number {
    const speedMod = Math.min(abilityModifier(this.speed), AC_SPEED_MOD_CAP);
    const raw = AC_BASE + speedMod + effectiveArmorBonus(this.armorBonus);
    return Math.min(AC_HARD_CAP, raw);
  }

  /**
   * CA *brute* (sans plafond). Sert à afficher au joueur la part de sa CA qui
   * est bridée : `getACCappedPoints()` vaut 0 tant que rien n'est saturé.
   */
  getRawAC(): number {
    return AC_BASE + abilityModifier(this.speed) + this.armorBonus;
  }

  /** Points de CA ajoutés mais non appliqués (saturation vitesse / armure). */
  getACCappedPoints(): number {
    return Math.max(0, this.getRawAC() - this.getAC());
  }

  /**
   * Charisme → dégâts magiques : `× (1 + (charisme - 10) / 50)`.
   * Le Charisme n'est ni alloué à la création ni accordé par la croissance : il
   * ne vient que des reliques. On utilise un **ratio** et non un modificateur
   * pour que les petits incréments de relique (+3, +5) comptent vraiment.
   */
  charismaMagicFactor(): number {
    return 1 + charismaMagicPercent(this.charisma) / 100;
  }

  /**
   * Applies a permanent additive stat boost (D&D buff rule). A Constitution
   * buff raises the max PV pool accordingly (PV max follows automatically).
   */
  public boostStat(stat: MonsterStat, value: number): void {
    switch (stat) {
      case 'strength':
        this.strength += value;
        break;
      case 'speed':
        this.speed += value;
        break;
      case 'constitution':
        this.constitution += value;
        this.maxHp = this.calculateMaxHp();
        this.currentHp = Math.min(this.currentHp, this.maxHp);
        break;
      case 'wisdom':
        this.wisdom += value;
        break;
      case 'charisma':
        this.charisma += value;
        break;
      case 'instinct':
        this.instinct += value;
        break;
    }
  }

  // --- Experience & Leveling Logic ---

  /**
   * Repart au niveau demandé sans toucher aux caractéristiques.
   *
   * Utilisé quand on rejoue avec un champion enregistré : le champion est
   * gravé tel qu'il était en fin de région (caractéristiques conservées), mais
   * le run repart du niveau 1. L'expérience est remise à zéro (cumul du niveau
   * 1) ; les PV sont réétendus sur la nouvelle base de niveau.
   *
   * Note : les PV max dépendent du niveau (`calculateMaxHp`) ; remettre le
   * niveau à 1 fait donc baisser la réserve d'un monstre dont les
   * caractéristiques restent celles de la fin de run — comportement voulu ici.
   */
  public resetLevelTo(level: number): void {
    this.level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
    this.experience = experienceForLevel(this.level);
    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp;
  }

  /**
   * Ajoute de l'EXP **cumulée** et absorbe les montées de niveau en cascade.
   *
   * Rend, en plus des lignes de journal, le **total des points gagnés par
   * caractéristique** et le **nombre de niveaux franchis** — de quoi alimenter
   * le rapport de montée de niveau (façon RPG Maker, qui liste les gains).
   */
  public gainExperience(amount: number): {
    leveledUp: boolean;
    levels: number;
    logs: string[];
    statGains: StatGrowth;
  } {
    const gained = Math.max(0, Math.floor(amount));
    this.experience += gained;
    const logs: string[] = [`${this.name} a gagné ${gained} points d'expérience !`];
    const statGains = zeroGrowth();

    let levels = 0;
    while (this.level < MAX_LEVEL && this.experience >= experienceForLevel(this.level + 1)) {
      addGrowth(statGains, this.levelUp());
      levels++;
      logs.push(`${this.name} passe au niveau ${this.level} !`);
    }

    return { leveledUp: levels > 0, levels, logs, statGains };
  }

  /**
   * Monte d'un niveau : applique l'incrément **du palier atteint** (courbe de
   * paramètre du type), recalcule les PV max et rend une part des PV
   * ({@link LEVEL_UP_HEAL_PERCENT} % — RPG Maker ne soigne pas du tout).
   * Rend le gain de caractéristiques, pour le rapport de montée de niveau.
   */
  private levelUp(): StatGrowth {
    this.level++;
    const growth = statGrowthForLevel(this.type, this.level);

    this.strength += growth.strength;
    this.speed += growth.speed;
    this.constitution += growth.constitution;
    this.wisdom += growth.wisdom;
    this.charisma += growth.charisma;
    this.instinct += growth.instinct;

    this.maxHp = this.calculateMaxHp();
    const heal = Math.floor((this.maxHp * LEVEL_UP_HEAL_PERCENT) / 100);
    this.currentHp = Math.min(this.maxHp, this.currentHp + heal);
    return growth;
  }
}

/** DTO JSON-safe d'un monstre — utilisé par la persistance (localStorage). */
export interface MonsterSnapshot {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  strength: number;
  speed: number;
  constitution: number;
  charisma: number;
  wisdom: number;
  instinct: number;
  moves: Move[];
  spriteUrl: string;
  experience: number;
  currentHp: number;
  rank: MonsterRank;
  armorBonus: number;
  statuses?: ActiveStatus[];
  /** Charge armée en cours (multiplicateur) — absente des sauvegardes antérieures. */
  chargedStrike?: number;
  /** Équipements portés (capacités signature) : sérialisés tels quels. */
  equipped?: Partial<Record<EquipmentSlot, Equipment>>;
  /**
   * Reliques **portées** (réglage DQ, 3 emplacements) : sérialisées telles
   * quelles. Leurs effets sont **déjà** comptés dans les stats ci-dessus —
   * jamais re-appliqués à la reconstruction (même règle que l'équipement).
   */
  wornRelics?: Relic[];
}

export namespace MonsterIO {
  /**
   * Sérialisation JSON-safe d'un monstre (avec cooldowns & état courant).
   * `maxHp` / `experienceToNextLevel` sont recalculés à la reconstruction
   * (déterministes depuis `level` et les stats).
   */
  export function toSnapshot(monster: Monster): MonsterSnapshot {
    return {
      id: monster.id,
      name: monster.name,
      type: monster.type,
      level: monster.level,
      strength: monster.strength,
      speed: monster.speed,
      constitution: monster.constitution,
      charisma: monster.charisma,
      wisdom: monster.wisdom,
      instinct: monster.instinct,
      moves: monster.moves.map(move => ({ ...move })),
      spriteUrl: monster.spriteUrl,
      experience: monster.experience,
      currentHp: monster.currentHp,
      rank: monster.rank,
      armorBonus: monster.armorBonus,
      statuses: monster.statuses.map(s => ({ ...s })),
      chargedStrike: monster.chargedStrike,
      equipped: monster.equipped ?? {},
      wornRelics: monster.wornRelics.map(relic => ({ ...relic })),
    };
  }

  /**
   * Reconstruction d'un monstre depuis un snapshot : repasse par le constructeur
   * (qui recale `maxHp`, `currentHp` et `experienceToNextLevel`), puis restaure
   * l'état sauvegardé (expérience, PV courants, cooldowns, rang, armure, statuts).
   */
  export function fromSnapshot(snapshot: MonsterSnapshot): Monster {
    const monster = new Monster(
      snapshot.id,
      snapshot.name,
      snapshot.type,
      snapshot.level,
      snapshot.strength,
      snapshot.speed,
      snapshot.constitution,
      snapshot.charisma,
      snapshot.wisdom,
      snapshot.instinct,
      snapshot.moves,
      snapshot.spriteUrl
    );
    monster.experience = snapshot.experience;
    monster.currentHp = snapshot.currentHp;
    monster.rank = snapshot.rank;
    monster.armorBonus = snapshot.armorBonus ?? 0;
    monster.moves = snapshot.moves.map(move => ({ ...move }));
    monster.statuses = (snapshot.statuses ?? []).map(s => ({ ...s }));
    monster.chargedStrike = snapshot.chargedStrike ?? 0;
    // Le portage est restauré TEL QUEL (stats & CA déjà incluses dans les
    // champs du snapshot — ne JAMAIS re-appliquer les effets ici, sinon
    // double comptabilisation à chaque chargement).
    monster.equipped = snapshot.equipped ? { ...snapshot.equipped } : {};
    // Reliques portées : reprises telles quelles, **sans** re-appliquer leurs
    // effets (déjà portés par les stats restaurées). Le plafond d'emplacements
    // est réimposé, une sauvegarde incohérente ne peut pas dépasser la règle.
    monster.wornRelics = (snapshot.wornRelics ?? []).slice(0, RELIC_SLOT_COUNT);
    return monster;
  }
}
