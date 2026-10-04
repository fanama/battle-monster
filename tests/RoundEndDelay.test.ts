import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { BattleStore } from '../src/lib/stores/battleStore';
import type { BattleState } from '../src/core/entities/BattleState';

/**
 * Fin de round : le vainqueur est connu immédiatement (l'animation se joue),
 * mais l'écran suivant est **programmé** et non appliqué dans la même frame.
 *
 * Ces tests n'utilisent **pas de `await` sur l'horloge murale** : `bun test`
 * exécute les fichiers de test concurremment dans un même processus, ce qui
 * rend les `setTimeout` de plusieurs secondes ininterprétables. On vérifie donc
 * l'état et la programmation des timers, qui sont déterministes.
 *
 * Store isolé avec des doublures : ni `localStorage` ni moteur de combat réel.
 */
type Internals = {
  store: {
    subscribe: (fn: (s: BattleState) => void) => () => void;
    set: (s: BattleState) => void;
  };
  pendingTimers: Set<unknown>;
  _scheduleRoundEnd: (winner: 'player' | 'enemy') => void;
  _clearTimers: () => void;
};

function makeStore(controller: unknown, cleared = { count: 0 }) {
  const saveRepository = {
    load: () => null,
    save: () => {},
    clear: () => {
      cleared.count++;
    },
  } as never;
  const championRepository = { list: () => [], saveChampion: () => {} } as never;
  return new BattleStore(
    controller as never,
    saveRepository,
    championRepository,
  ) as unknown as Internals;
}

/**
 * Renseigne un vainqueur et retourne un accesseur d'état.
 * L'abonnement est **délibérément conservé** : un writable Svelte ne notifie
 * que ses abonnés actifs, un abonnement résilié figerait l'accesseur.
 */
function withWinner(store: Internals, winner: 'player' | 'enemy'): () => BattleState {
  let state!: BattleState;
  store.store.subscribe((s) => {
    state = s;
  });
  store.store.set({ ...state, winner });
  return () => state;
}

describe('Fin de round : le vainqueur est immédiat, l’écran suivant est différé', () => {
  test('le vainqueur est dans l’état tout de suite, la phase ne change pas', () => {
    let applied = 0;
    const controller = {
      handlePlayerVictory: ({ run }: { run: BattleState['run'] }) => {
        applied++;
        return { run: { ...run, phase: 'regionClear' as const }, logs: [] };
      },
    };
    const store = makeStore(controller);
    const state = withWinner(store, 'player');

    // L'animation peut se jouer : le vainqueur est connu.
    expect(state().winner).toBe('player');

    // L'écran suivant, lui, n'est pas encore là.
    store._scheduleRoundEnd('player');
    expect(applied).toBe(0);
    expect(state().run.phase).not.toBe('regionClear');
    store._clearTimers();
  });

  test('la fin de round est programmée, pas appliquée dans la frame', () => {
    const controller = {
      handlePlayerVictory: ({ run }: { run: BattleState['run'] }) => ({
        run: { ...run, phase: 'regionClear' as const },
        logs: [],
      }),
    };
    const store = makeStore(controller);
    withWinner(store, 'player');

    const before = store.pendingTimers.size;
    store._scheduleRoundEnd('player');
    // Un timer a été programmé : le basculement est bien différé.
    expect(store.pendingTimers.size).toBe(before + 1);
    store._clearTimers();
  });

  test('des fins de round empilées n’en programment qu’une seule', () => {
    let applied = 0;
    const controller = {
      handlePlayerVictory: ({ run }: { run: BattleState['run'] }) => {
        applied++;
        return { run: { ...run, phase: 'regionClear' as const }, logs: [] };
      },
    };
    const store = makeStore(controller);
    withWinner(store, 'player');

    const before = store.pendingTimers.size;
    store._scheduleRoundEnd('player');
    store._scheduleRoundEnd('player');
    store._scheduleRoundEnd('player');

    expect(store.pendingTimers.size).toBe(before + 1);
    expect(applied).toBe(0);
    store._clearTimers();
  });

  test('la permadeath n’efface pas la sauvegarde dans la frame du coup fatal', () => {
    const cleared = { count: 0 };
    const store = makeStore({}, cleared);
    const state = withWinner(store, 'enemy');

    store._scheduleRoundEnd('enemy');

    expect(cleared.count).toBe(0);
    expect(state().run.phase).not.toBe('runover');
    store._clearTimers();
  });

  test('_clearTimers annule le report (nouveau run)', () => {
    const store = makeStore({});
    withWinner(store, 'player');
    store._scheduleRoundEnd('player');
    expect(store.pendingTimers.size).toBe(1);

    store._clearTimers();
    expect(store.pendingTimers.size).toBe(0);
  });
});

describe('Tous les chemins de coup fatal passent par le report', () => {
  // Régression : les deux branches « le premier frappeur frappe d'abord »
  // appliquaient `_applyRoundWinner` immédiatement, ce qui faisait sauter
  // l'écran suivant — donc l'animation — sur le coup fatal du premier tour,
  // le cas le plus fréquent.
  test('aucune branche n’applique la fin de round en direct sur un vainqueur', () => {
    const src = readFileSync(
      new URL('../src/lib/stores/battleStore.ts', import.meta.url),
      'utf8',
    );
    const directCalls = [...src.matchAll(/= this\._applyRoundWinner\(s\)/g)];
    expect(directCalls.length).toBeGreaterThan(0);
    for (const call of directCalls) {
      const before = src.slice(Math.max(0, call.index - 400), call.index);
      expect(before).toMatch(/if \(s\.winner\)|if \(followUp\)/);
    }
  });

  test('le report couvre les quatre chemins de résolution de tour', () => {
    const src = readFileSync(
      new URL('../src/lib/stores/battleStore.ts', import.meta.url),
      'utf8',
    );
    // 1 définition + 4 appels (2 branches « premier frappeur », tour joueur,
    // tour ennemi).
    expect((src.match(/_scheduleRoundEnd\(/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});