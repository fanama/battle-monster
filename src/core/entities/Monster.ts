import type { Move, MonsterType, StatBoosts } from './Move';

/**
 * Represents a Monster entity in the game.
 * Handles stats, leveling logic, and temporary battle modifiers.
 */
export class Monster {
  public moves: Move[];
  public experience: number;
  public experienceToNextLevel: number;

  // --- Temporary Battle Modifiers ---
  // These are multipliers applied during combat and reset afterward.
  public attackMultiplier: number = 1;
  public defenseMultiplier: number = 1;
  public speedMultiplier: number = 1;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: MonsterType,
    public level: number,
    public maxHp: number,
    public currentHp: number,
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

    this.experience = 0;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);
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
   * Applies temporary stat boosts (e.g., 1.2 for +20% or 0.8 for -20%).
   */
  public applyBoosts(boosts: StatBoosts): void {
    if (boosts.attack) this.attackMultiplier *= boosts.attack;
    if (boosts.defense) this.defenseMultiplier *= boosts.defense;
    if (boosts.speed) this.speedMultiplier *= boosts.speed;
  }

  /**
   * Resets all multipliers to default (1.0). 
   * IMPORTANT: Call this at the start or end of every battle.
   */
  public resetModifiers(): void {
    this.attackMultiplier = 1;
    this.defenseMultiplier = 1;
    this.speedMultiplier = 1;
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
   * Increases level and scales base stats.
   */
  private levelUp(): void {
    this.level++;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);

    const growth = this.getStatGrowth(this.type);

    this.maxHp += growth.maxHp;
    this.currentHp = this.maxHp; // Heal to full on level up

    this.strength += growth.strength;
    this.speed += growth.speed;
    this.constitution += growth.constitution;
    this.intelligence += growth.intelligence;
    this.wisdom += growth.wisdom;
    this.charisma += growth.charisma;
  }

  /**
   * Defines how stats grow based on the Monster's element.
   */
  private getStatGrowth(type: MonsterType) {
    const base = {
      maxHp: 10,
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
        return { ...base, maxHp: 15, constitution: 3, wisdom: 2, strength: 2 };
      case 'grass':
        return { ...base, intelligence: 3, wisdom: 3, constitution: 2 };
      case 'normal':
        return {
          maxHp: 12, strength: 2, speed: 2, constitution: 2,
          intelligence: 2, wisdom: 2, charisma: 2
        };
      default:
        return base;
    }
  }
}
