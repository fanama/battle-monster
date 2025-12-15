import type { Move, MonsterType } from './Move';

export class Monster {
  public moves: Move[];
  public experience: number;
  public experienceToNextLevel: number;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: MonsterType,
    public level: number,
    public maxHp: number,
    public currentHp: number,
    // Stats
    public strength: number,
    public speed: number,
    public constitution: number,
    public intelligence: number,
    public charisma: number,
    public wisdom: number,
    // Inputs
    initialMoves: Move[], // Pass moves in
    public spriteUrl: string
  ) {
    // CLONE THE MOVES: This ensures this monster has its own unique instances
    // If we don't do this, Player and Enemy sharing "Tackle" will share the cooldown.
    this.moves = initialMoves.map(move => ({
      ...move,
      coolDown: 0 // Ensure starts ready
    }));
    this.experience = 0;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);
  }

  isFainted(): boolean {
    return this.currentHp <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  private calculateExperienceToNextLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  public gainExperience(amount: number): { leveledUp: boolean, logs: string[] } {
    this.experience += amount;
    const logs: string[] = [];
    logs.push(`${this.name} gained ${amount} experience points!`);

    let leveledUp = false;
    while (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;
      this.levelUp();
      leveledUp = true;
      logs.push(`${this.name} grew to level ${this.level}!`);
    }
    return { leveledUp, logs };
  }

  private levelUp(): void {
    this.level++;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);

    // 1. Get the growth modifiers based on the Monster's type
    const growth = this.getStatGrowth(this.type);

    // 2. Apply the growth to current stats
    this.maxHp += growth.maxHp;
    this.currentHp = this.maxHp; // Full heal on level up

    this.strength += growth.strength;
    this.speed += growth.speed;
    this.constitution += growth.constitution;
    this.intelligence += growth.intelligence;
    this.wisdom += growth.wisdom;
    this.charisma += growth.charisma;
  }

  /**
   * Returns the stat increases per level based on the element type.
   */
  private getStatGrowth(type: MonsterType) {
    // Default/Base growth (minimums)
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
        // Fire: High Offense (Strength/Int) and Speed, lower defense
        return { ...base, strength: 3, speed: 2, intelligence: 2 };

      case 'water':
        // Water: High Health and Defense (Constitution), decent Wisdom
        return { ...base, maxHp: 15, constitution: 3, wisdom: 2, strength: 2 };

      case 'grass':
        // Grass: High Special (Int/Wis) and Sustainability
        return { ...base, intelligence: 3, wisdom: 3, constitution: 2 };

      case 'normal':
        // Normal: Balanced jack-of-all-trades
        return {
          maxHp: 12, strength: 2, speed: 2, constitution: 2,
          intelligence: 2, wisdom: 2, charisma: 2
        };

      default:
        return base;
    }
  }
}
