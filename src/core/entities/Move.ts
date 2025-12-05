export type MonsterType = 'fire' | 'water' | 'grass' | 'normal';

export interface Move {
  id: string;
  name: string;
  power: number;
  type: MonsterType;
  isPhysical: boolean;
  coolDown?: number;
  maxCoolDown?: number;
}
