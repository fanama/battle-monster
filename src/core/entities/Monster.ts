import type { MonsterStat, Move, MonsterType } from './Move';
import type { ActiveStatus, StatusEffectType } from './StatusEffect';
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
 * tous les types (invariant de `Monster.getStatGrowth`). Chaque paire de points
 * vaut +1 modificateur d'attribut : c'est le budget de progression commun.
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
 * Croissance de stats par type (« archetype »), en **points par niveau** :
 *
 *  - Force : toucher et dégâts physiques
 *  - Savoir : toucher, dégâts magiques et puissance des soins
 *  - Vitesse : Classe d'Armure (CA)
 *  - Constitution : PV max
 *  - Instinct : perception martiale (chances de critique, regard du sprite)
 *  - Charisme : **croissance nulle par conception** — il ne s'obtient que par
 *    les reliques (dégâts magiques et soins). Les reliques qui en donnent
 *    seraient sinon inertes.
 *
 * **Deux invariants d'équilibrage :**
 *
 * 1. tous les types gagnent exactement {@link STAT_GROWTH_TOTAL} points par
 *    niveau — chaque paire de points vaut +1 modificateur d'attribut, donc un
 *    total différent est un avantage caché de ±1 mod par quelques niveaux
 *    (l'Électricité en gagnait 10 quand la Roche et le Normal s'en
 *    contenaient de 8) ;
 * 2. la même fonction sert **au champion et aux ennemis**
 *    (`RandomEnemyFactory`). Quand l'ennemi avait une croissance plate sur ses
 *    six caractéristiques, il gagnait de l'Instinct (donc de la plage de
 *    critique) et du Charisme (donc de l'amplification magique) que le joueur
 *    n'obtient jamais : à niveau 13 l'ennemi gagnait +34 % de magie et deux
 *    points de critique de plus par coup, ce qui rendait les derniers paliers
 *    injouables.
 */
export function statGrowthForType(type: MonsterType) {
  switch (type) {
    case 'fire':
      return { strength: 3, speed: 2, constitution: 2, wisdom: 1, charisma: 0, instinct: 1 };
    case 'water':
      return { strength: 2, speed: 1, constitution: 3, wisdom: 2, charisma: 0, instinct: 1 };
    case 'grass':
      return { strength: 1, speed: 2, constitution: 2, wisdom: 3, charisma: 0, instinct: 1 };
    case 'normal':
      return { strength: 2, speed: 2, constitution: 2, wisdom: 2, charisma: 0, instinct: 1 };
    case 'electric':
      return { strength: 1, speed: 3, constitution: 2, wisdom: 2, charisma: 0, instinct: 1 };
    case 'rock':
      return { strength: 3, speed: 1, constitution: 3, wisdom: 1, charisma: 0, instinct: 1 };
    default:
      return { strength: 1, speed: 1, constitution: 2, wisdom: 1, charisma: 0, instinct: 1 };
  }
}

/**
 * Represents a Monster entity in the game.
 * Handles stats, leveling logic, and stat buffs.
 */
export class Monster {
  public moves: Move[];
  public experience: number;
  public experienceToNextLevel: number;
  public maxHp: number;
  public currentHp: number;
  /** Rang du monstre : 'boss' → XP accrue (dnd : 10/20/50). */
  public rank: MonsterRank = 'normal';
  /** Bonus d'armure (reliques/équipement), ajouté à la CA. */
  public armorBonus: number = 0;
  /** Statuts élémentaires actifs (Brûlure, Gel, Paralysie, Poison). */
  public statuses: ActiveStatus[] = [];

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

    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp;
    this.experience = 0;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);
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
   * XP requise pour passer au niveau suivant : `80 × niveau - 40` (courbe
   * **linéaire douce**, ~40 au niv. 1, 360 au niv. 5, 760 au niv. 10).
   * L'ancienne courbe `100 × niveau^1.5` (1 118 XP au niv. 5) exigeait des
   * dizaines de combats en début de run — trop raide (cf. rebalance §16 P1).
   */
  private calculateExperienceToNextLevel(level: number): number {
    return Math.floor(80 * level - 40);
  }

  /**
   * Repart au niveau demandé sans toucher aux caractéristiques.
   *
   * Utilisé quand on rejoue avec un champion enregistré : le champion est
   * gravé tel qu'il était en fin de région (caractéristiques conservées), mais
   * le run repart du niveau 1. L'expérience est remise à zéro et le seuil de
   * montée recalculé ; les PV sont réétendus sur la nouvelle base de niveau.
   *
   * Note : les PV max dépendent du niveau (`calculateMaxHp`) ; remettre le
   * niveau à 1 fait donc baisser la réserve d'un monstre dont les
   * caractéristiques restent celles de la fin de run — comportement voulu ici.
   */
  public resetLevelTo(level: number): void {
    this.level = Math.max(1, Math.floor(level));
    this.experience = 0;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);
    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp;
  }

  /**
   * Adds experience and handles potential multiple level-ups.
   */
  public gainExperience(amount: number): { leveledUp: boolean, logs: string[] } {
    this.experience += amount;
    const logs: string[] = [`${this.name} a gagné ${amount} points d'expérience !`];

    let leveledUp = false;
    while (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;
      this.levelUp();
      leveledUp = true;
      logs.push(`${this.name} passe au niveau ${this.level} !`);
    }
    return { leveledUp, logs };
  }

  /**
   * Increases level and scales base stats + recomputes the PV pool.
   */
  private levelUp(): void {
    this.level++;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);

    const growth = this.getStatGrowth(this.type);

    this.strength += growth.strength;
    this.speed += growth.speed;
    this.constitution += growth.constitution;
    this.wisdom += growth.wisdom;
    this.charisma += growth.charisma;
    this.instinct += growth.instinct;

    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp; // Heal to full on level up
  }

  private getStatGrowth(type: MonsterType) {
    return statGrowthForType(type);
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
    return monster;
  }
}
