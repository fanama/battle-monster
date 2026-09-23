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
};

/**
 * Mise à l'échelle du pool de PV par niveau : `BASE + level × PER_LEVEL`.
 * Recalibré (1.8 + 0.85·lvl, cf. rebalance §5) pour absorber les critiques
 * magiques sans one-shot sans pour autant allonger les combats.
 */
const HP_SCALE_BASE = 1.8;
const HP_SCALE_PER_LEVEL = 0.85;

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
    public intelligence: number,
    public charisma: number,
    public wisdom: number,
    // Moves and Visuals
    initialMoves: Move[],
    public spriteUrl: string
  ) {
    // CLONE THE MOVES: Ensures each monster instance has its own cooldown state.
    this.moves = initialMoves.map(move => ({
      ...move,
      coolDown: 0
    }));

    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp;
    this.experience = 0;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);
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
      case 'intelligence':
        this.intelligence += value;
        break;
      case 'charisma':
        this.charisma += value;
        break;
      case 'wisdom':
        this.wisdom += value;
        break;
    }
  }

  // --- Experience & Leveling Logic ---

  private calculateExperienceToNextLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
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
    this.intelligence += growth.intelligence;
    this.wisdom += growth.wisdom;
    this.charisma += growth.charisma;

    this.maxHp = this.calculateMaxHp();
    this.currentHp = this.maxHp; // Heal to full on level up
  }

  /**
   * Defines how stats grow based on the Monster's element.
   */
  private getStatGrowth(type: MonsterType) {
    const base = {
      strength: 1,
      speed: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1
    };

    switch (type) {
      case 'fire':
        return { ...base, strength: 3, speed: 2, intelligence: 2 };
      case 'water':
        return { ...base, constitution: 3, wisdom: 2, strength: 2 };
      case 'grass':
        return { ...base, intelligence: 3, wisdom: 3, constitution: 2 };
      case 'normal':
        return {
          strength: 2, speed: 2, constitution: 2,
          intelligence: 2, wisdom: 2, charisma: 2
        };
      default:
        return base;
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
  intelligence: number;
  charisma: number;
  wisdom: number;
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
      intelligence: monster.intelligence,
      charisma: monster.charisma,
      wisdom: monster.wisdom,
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
      snapshot.intelligence,
      snapshot.charisma,
      snapshot.wisdom,
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
