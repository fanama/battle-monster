import type { Move, MonsterType } from './Move';

export class Monster {
  public moves: Move[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: MonsterType,
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
  }

  isFainted(): boolean {
    return this.currentHp <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }
}
