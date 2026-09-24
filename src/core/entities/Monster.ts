import type { MonsterStat, Move, MonsterType } from './Move';

/**
 * D&D ability modifier: floor((stat - 10) / 2). E.g. 10 → +0, 12 → +1, 18 → +4.
 */
export function abilityModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

/** Rang du monstre (dnd : PNJ / minion / boss) — sert au calcul d'XP. */
export type MonsterRank = 'normal' | 'boss';

/** D&D hit dice per monster type (max PV = max dice + mod(Constitution)). */
const HIT_DICE: Record<MonsterType, number> = {
  fire: 8,
  water: 10,
  grass: 10,
  normal: 8,
  electric: 8,
  rock: 10,
};

/**
 * Mise à l'échelle du pool de PV par niveau : `BASE + level × PER_LEVEL`.
 * Recalibré (1.8 + 0.85·lvl, cf. rebalance §5) pour absorber les critiques
 * magiques sans one-shot sans pour autant allonger les combats.
 */
const HP_SCALE_BASE = 1.8;
const HP_SCALE_PER_LEVEL = 0.85;

/** Nombre maximum d'attaques qu'un monstre peut équiper simultanément. */
export const MAX_MOVES = 4;

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

  /**
   * Armor Class (CA), D&D rule: 10 + mod(Vitesse) + BonusArmure.
   * L'armure provient des reliques (+2 par exemple).
   */
  getAC(): number {
    return 10 + abilityModifier(this.speed) + this.armorBonus;
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

  /**
   * Croissance de stats par type (« archetype ») :
   *  - Force : toucher et dégâts physiques
   *  - Savoir : toucher, dégâts magiques et puissance des soins
   *  - Vitesse : Classe d'Armure (CA)
   *  - Constitution : PV max
   *  - Instinct : perception martiale (chances de critique, regard du sprite)
   */
  private getStatGrowth(type: MonsterType) {
    switch (type) {
      case 'fire':
        return { strength: 3, speed: 3, constitution: 1, wisdom: 1, charisma: 0, instinct: 1 };
      case 'water':
        return { strength: 2, speed: 1, constitution: 3, wisdom: 2, charisma: 0, instinct: 1 };
      case 'grass':
        return { strength: 1, speed: 2, constitution: 2, wisdom: 3, charisma: 0, instinct: 1 };
      case 'normal':
        return { strength: 2, speed: 2, constitution: 2, wisdom: 1, charisma: 0, instinct: 1 };
      case 'electric':
        return { strength: 1, speed: 3, constitution: 1, wisdom: 3, charisma: 0, instinct: 2 };
      case 'rock':
        return { strength: 3, speed: 1, constitution: 3, wisdom: 0, charisma: 0, instinct: 1 };
      default:
        return { strength: 1, speed: 1, constitution: 1, wisdom: 1, charisma: 0, instinct: 1 };
    }
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
    };
  }

  /**
   * Reconstruction d'un monstre depuis un snapshot : repasse par le constructeur
   * (qui recale `maxHp`, `currentHp` et `experienceToNextLevel`), puis restaure
   * l'état sauvegardé (expérience, PV courants, cooldowns, rang, armure).
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
    return monster;
  }
}
