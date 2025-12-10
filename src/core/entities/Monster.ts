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

  public gainExperience(amount: number): {leveledUp: boolean, logs: string[]} {
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
    return {leveledUp, logs};
  }

  private levelUp(): void {
    this.level++;
    this.experienceToNextLevel = this.calculateExperienceToNextLevel(this.level);

    // Improve stats
    this.maxHp += 10;
    this.currentHp = this.maxHp; // Heal on level up
    this.strength += 2;
    this.constitution += 2;
    this.intelligence += 2;
    this.speed += 1;
    this.wisdom += 1;
    this.charisma +=1;
  }
}
