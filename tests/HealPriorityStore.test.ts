import { describe, expect, test } from 'bun:test';
import { BattleStore } from '../src/lib/stores/battleStore';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';
import type { BattleState } from '../src/core/entities/BattleState';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * La règle « le soin passe avant l'attaque » doit être vérifiée **jusqu'au
 * store** : `beginRound` n'est qu'un calcul d'ordre, l'utile est que le soin
 * soit réellement résolu dans la même frame que le clic du joueur.
 *
 * Assertions **synchrones uniquement** : `bun test` exécute les fichiers
 * concurremment dans un même processus, et les `setTimeout` de plusieurs
 * secondes y sont ininterprétables (cf. `RoundEndDelay.test.ts`). On observe
 * donc l'état juste après `attack()`, avant que le tour différé ne se joue.
 */
type StoreInternals = {
  store: {
    subscribe: (fn: (s: BattleState) => void) => () => void;
    set: (s: BattleState) => void;
  };
  attack: (moveIndex: number) => void;
  _clearTimers: () => void;
};

const mend: Move = {
  id: 'mend',
  name: 'Souffle',
  type: 'normal',
  power: 0,
  healPower: 12,
  level: 1,
  isHeal: true,
};
const tackle: Move = {
  id: 'tackle',
  name: 'Charge',
  type: 'normal',
  power: 40,
  level: 1,
  isPhysical: true,
};

/**
 * Dés scriptés : les deux premiers jets sont les initiatives (3 puis 18),
 * c'est-à-dire un net avantage à l'ennemi. Les suivants servent au tour.
 */
const sequenceDice = (rolls: number[]): Dice => {
  let i = 0;
  return { roll: () => (i < rolls.length ? rolls[i++] : 1) };
};

function buildStore(
  rolls: number[],
  opts: { enemyMoves?: Move[]; freezeEnemy?: boolean } = {},
): {
  store: StoreInternals;
  read: () => BattleState;
} {
  const dice = sequenceDice(rolls);
  const controller = new BattleController({
    engine: new BattleEngine({ dice }),
    moveProvider: { getMovesForMonster: () => [] as Move[] } as MoveProvider,
    enemyFactory: {
      createRandomEnemy: () => {
        throw new Error('unused in this test');
      },
      createBoss: () => {
        throw new Error('unused in this test');
      },
    } as EnemyFactory,
    dice,
  });

  const store = new BattleStore(
    controller,
    { load: () => null, save: () => {}, clear: () => {} } as never,
    { list: () => [], saveChampion: () => {} } as never,
  ) as unknown as StoreInternals;

  const player = new Monster('p', 'Héro', 'normal', 1, 12, 14, 14, 10, 10, 10, [mend, tackle]);
  const enemy = new Monster('e', 'Sloub', 'normal', 1, 12, 10, 14, 10, 10, 10, opts.enemyMoves ?? [tackle]);
  player.takeDamage(player.maxHp - 8); // blessé : le soin est utile
  enemy.takeDamage(enemy.maxHp - 8);
  if (opts.freezeEnemy) enemy.addStatus('freeze', 3);

  let state!: BattleState;
  store.store.subscribe((s) => {
    state = s;
  });
  store.store.set({ ...state, playerMonster: player, enemyMonster: enemy, isPlayerTurn: true });

  return { store, read: () => state };
}

describe('Store : le soin du joueur est résolu avant toute attaque', () => {
  test('malgré une initiative adverse, le soin joue dans la frame du clic', () => {
    const { store, read } = buildStore([3, 18, 12, 8]);

    store.attack(0); // index 0 = soin

    const state = read();
    // Le soin a été joué immédiatement, par le joueur.
    expect(state.playerLastMove?.id).toBe('mend');
    expect(state.isAttacking).toBe(true);
    // L'ennemi n'a pas encore agi : son tour est différé, donc le soin a
    // bien passé devant son attaque.
    expect(state.enemyLastMove).toBeNull();
    // Le joueur a été soigné avant de subir quoi que ce soit.
    expect(state.playerMonster!.currentHp).toBeGreaterThan(8);
    expect(state.logs.join('\n')).toContain('soin passe avant');

    store._clearTimers();
  });

  test('sans soin, une initiative adverse laisse l’ennemi jouer en premier', () => {
    const { store, read } = buildStore([3, 18, 12, 8]);

    store.attack(1); // index 1 = attaque

    const state = read();
    // Initiative adverse : c'est l'ennemi qui a joué dans la frame.
    expect(state.enemyLastMove?.id).toBe('tackle');
    expect(state.playerLastMove).toBeNull();
    expect(state.logs.join('\n')).not.toContain('soin passe avant');

    store._clearTimers();
  });
});

describe('Store : le soin disponible de l’ennemi est réellement joué', () => {
  test('placé en premier pour soigner, il soigne — et pas seulement par l’initiative', () => {
    // Initiative adverse, mais l'ennemi peut soigner : il passe devant et joue
    // le soin. Sans cela, la règle n'aurait donné que le bonus d'initiative.
    const { store, read } = buildStore([3, 18, 1, 1, 12, 8], { enemyMoves: [mend, tackle] });

    store.attack(1); // le joueur attaque : ce n'est pas un soin

    const state = read();
    expect(state.enemyLastMove?.id).toBe('mend');
    expect(state.logs.join('\n')).toContain('soin passe avant');
    // Ses PV ont remonté : le soin a bien été appliqué.
    expect(state.enemyMonster!.currentHp).toBeGreaterThan(20);

    store._clearTimers();
  });

  test('ennemi gelé désigné premier : il perd son tour, le joueur n’est pas bloqué', () => {
    const { store, read } = buildStore([3, 18, 1, 1, 12, 8], {
      enemyMoves: [mend, tackle],
      freezeEnemy: true,
    });

    store.attack(1);

    const state = read();
    // L'ennemi passe bien en premier, mais le gel lui fait perdre son tour…
    expect(state.logs.join('\n')).toContain('gelé et ne peut pas agir');
    // …et le round n'est pas mort pour autant : le joueur reste jouable.
    expect(state.winner).toBeNull();
    expect(state.isPlayerTurn).toBe(false); // son tour est programmé, pas annulé

    store._clearTimers();
  });
});