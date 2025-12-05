import { writable } from 'svelte/store';
import type { Monster } from '../../core/entities/Monster';
import { BattleEngine } from '../../core/services/BattleEngine';
import { MonsterRepository } from '../../infra/repositories/MonsterRepositories';
import type { Move } from '../../core/entities/Move';

// --- Types ---
interface BattleState {
  playerMonster: Monster;
  enemyMonster: Monster;
  logs: string[];
  isPlayerTurn: boolean;
  winner: 'player' | 'enemy' | null;
}

// --- Setup ---
const engine = new BattleEngine();
const repo = new MonsterRepository();

const getInitialState = (): BattleState => {
  return {
    playerMonster: repo.getStarter('fire'),
    enemyMonster: repo.getStarter('water'),
    logs: [`Un enemi apparaît !`],
    isPlayerTurn: true,
    winner: null
  };
};

// --- Store ---
function createBattleStore() {
  const { subscribe, set, update } = writable<BattleState>(getInitialState());

  const applyMove = (state: BattleState, attacker: Monster, defender: Monster, move: Move): BattleState => {
    // 1. Get logs from the engine (This likely includes the first "K.O." or "Fainted" message)
    const turnLogs = engine.executeTurn(attacker, defender, move).map(l => l.message);
    const newLogs = [...state.logs, ...turnLogs];

    let winner = state.winner;

    // 2. Check for Game Over
    if (defender.isFainted()) {
      winner = state.isPlayerTurn ? 'player' : 'enemy';

      newLogs.push(winner === 'player' ? 'Victoire !' : 'Défaite...');
    }

    return { ...state, logs: newLogs, winner };
  };

  function selectRandomMove(moves: Move[]): Move {


    // Generate a random index between 0 (inclusive) and moves.length (exclusive)
    const randomIndex = Math.floor(Math.random() * moves.length);

    // Return the move at the randomly generated index
    return moves[randomIndex];
  }

  // 1. Enemy Turn Logic
  const triggerEnemyTurn = () => {
    update(state => {
      if (state.winner) return state;

      // Simple AI: Pick first move
      // const aiMove = state.enemyMonster.moves[2]
      const aiMove = selectRandomMove(state.enemyMonster.moves)
      const newState = applyMove(state, state.enemyMonster, state.playerMonster, aiMove);

      return { ...newState, isPlayerTurn: true };
    });
  };

  // 2. Player Turn Logic
  const playerAttack = (moveIndex: number) => {
    update(state => {
      if (!state.isPlayerTurn || state.winner) return state;

      const move = state.playerMonster.moves[moveIndex];
      const newState = applyMove(state, state.playerMonster, state.enemyMonster, move);

      // If game isn't over, queue enemy turn
      if (!newState.winner) {
        setTimeout(triggerEnemyTurn, 2000);
        return { ...newState, isPlayerTurn: false };
      }

      return newState;
    });
  };

  const selectMonster = (monster: Monster) => {
    update(state => {
      if (state.isPlayerTurn) {



        return { ...state, playerMonster: monster };


      }
      return { ...state, enemyMonster: monster };



    });
  };

  return {
    subscribe,
    attack: playerAttack,
    reset: () => set(getInitialState()),
    selectMonster: selectMonster
  };
}

export const battleStore = createBattleStore();
