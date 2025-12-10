import { writable, type Writable, get } from 'svelte/store';
import type { Monster } from '../../core/entities/Monster';
import { BattleEngine, type BattleLog } from '../../core/services/BattleEngine';
import { MonsterRepository } from '../../infra/repositories/MonsterRepositories';
import type { Move } from '../../core/entities/Move';
import { MoveRepository } from '../../infra/repositories/MoveRepositories';


// --- Types --
interface BattleState {
  playerMonster: Monster | null;
  enemyMonster: Monster | null;
  logs: string[];
  isPlayerTurn: boolean;
  winner: 'player' | 'enemy' | null;
  battleNumber: number;
  isAttacking: boolean;
  isEnemyAttacking: boolean;
}

class BattleStore {
  private readonly store: Writable<BattleState>;
  public subscribe;

  private readonly engine = new BattleEngine();
  private readonly monsterRepo = new MonsterRepository();
  private readonly moveRepo = new MoveRepository();


  constructor() {
    this.store = writable(this._getInitialState());
    this.subscribe = this.store.subscribe;
  }

  private _getInitialState(): BattleState {
    return {
      playerMonster: null,
      enemyMonster: null,
      logs: ['Choisissez votre monstre pour commencer.'],
      isPlayerTurn: true,
      winner: null,
      battleNumber: 1,
      isAttacking: false,
      isEnemyAttacking: false,
    };
  }

  public attack = (moveIndex: number) => {
    this.store.update(state => {
      if (!state.isPlayerTurn || state.winner || !state.playerMonster || !state.enemyMonster) return state;

      const move = state.playerMonster.moves[moveIndex];
      
      // Trigger animation
      state.isAttacking = true;

      let newState = this._applyMove(state as any, state.playerMonster, state.enemyMonster, move);

      if (!newState.winner) {
        setTimeout(() => this._triggerEnemyTurn(), 2000);
        newState = { ...newState, isPlayerTurn: false };
      }
      
      // End animation after a delay
      setTimeout(() => {
        this.store.update(s => ({ ...s, isAttacking: false }));
      }, 500);

      return newState;
    });
  };

  public nextBattle = () => {
    this.store.update(state => {
      if (state.winner !== 'player' || !state.playerMonster) return state;
      
      const nextBattleNumber = state.battleNumber + 1;
      const nextEnemyLevel = state.playerMonster.level;

      state.playerMonster.currentHp = state.playerMonster.maxHp;

      const newEnemy = this.monsterRepo.getRandomMonster(nextEnemyLevel);

      return {
          ...state,
          enemyMonster: newEnemy,
          winner: null,
          isPlayerTurn: true,
          logs: [`Un nouvel ennemi de niveau ${newEnemy.level} apparaît !`],
          battleNumber: nextBattleNumber
      };
  });
  };

  public selectMonster = (monster: Monster) => {
    const newEnemy = this.monsterRepo.getRandomMonster(monster.level);
    this.store.set({
        playerMonster: monster,
        enemyMonster: newEnemy,
        logs: [`En garde ! Un ${newEnemy.name} sauvage apparaît !`],
        isPlayerTurn: true,
        winner: null,
        battleNumber: 1,
        isAttacking: false,
        isEnemyAttacking: false,
    });
  };

  public reset = () => {
    this.store.set(this._getInitialState());
  };

  private _applyMove(state: BattleState, attacker: Monster, defender: Monster, move: Move): BattleState {
    const turnLogs: BattleLog[] = this.engine.executeTurn(attacker, defender, move);
    const newLogs = [...state.logs, ...turnLogs.map(l => l.message)];

    let winner = state.winner;

    if (defender.isFainted()) {
        winner = attacker === state.playerMonster ? 'player' : 'enemy';
        newLogs.push(winner === 'player' ? 'Victoire !' : 'Défaite...');
    }

    const levelUpLog = turnLogs.find(log => log.payload?.leveledUp);
    if (levelUpLog && attacker === state.playerMonster) {
        const newMoves = this.moveRepo.getMovesForMonster(attacker);
        attacker.moves = newMoves;
        newLogs.push(`${attacker.name} a appris de nouvelles attaques !`);
    }

    return { ...state, logs: newLogs, winner };
  }


  private _triggerEnemyTurn = () => {
    this.store.update(state => {
      if (state.winner || !state.playerMonster || !state.enemyMonster) return state;

      const aiMove = this._selectRandomMove(state.enemyMonster.moves);
      
      // Trigger enemy animation
      state.isEnemyAttacking = true;

      const newState = this._applyMove(state as any, state.enemyMonster, state.playerMonster, aiMove);

      // End enemy animation after a delay
      setTimeout(() => {
        this.store.update(s => ({ ...s, isEnemyAttacking: false }));
      }, 500);

      return { ...newState, isPlayerTurn: true };
    });
  };

  private _selectRandomMove(moves: Move[]): Move {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }
}

export const battleStore = new BattleStore();
