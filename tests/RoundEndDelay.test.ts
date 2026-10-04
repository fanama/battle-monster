import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { BattleStore } from "../src/lib/stores/battleStore";
import type { BattleState } from "../src/core/entities/BattleState";

/**
 * Comportement de fin de round : le vainqueur doit être connu tout de suite
 * (pour jouer l'animation de victoire/défaite), mais `run.phase` ne doit pas
 * changer avant l'écoulement de `ROUND_END_DELAY`.
 *
 * Store isolé avec des doublures : ni `localStorage` ni moteur de combat réel.
 * Les tests utilisent de vrais timers — ils durent ~2,5 s.
 */
const ROUND_END_DELAY = 800;
/** Marge au-delà du délai pour laisser le `setTimeout` s'exécuter. */
const SLACK = 400;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Accès typé à l'état interne du store (readonly non exposé publiquement). */
type Internals = {
  store: {
    subscribe: (fn: (s: BattleState) => void) => () => void;
    set: (s: BattleState) => void;
  };
  _scheduleRoundEnd: (winner: "player" | "enemy") => void;
  _clearTimers: () => void;
};

function makeStore(controller: unknown, cleared: { count: number }) {
  const saveRepository = {
    load: () => null,
    save: () => {},
    clear: () => {
      cleared.count++;
    },
  } as never;
  const championRepository = {
    list: () => [],
    saveChampion: () => {},
  } as never;
  return new BattleStore(
    controller as never,
    saveRepository,
    championRepository,
  ) as unknown as Internals;
}

/**
 * Renseigne un vainqueur et retourne un accesseur d'état.
 *
 * L'abonnement est **délibérément conservé** : `set`/`update` d'un writable
 * Svelte ne notifient que les abonnés actifs, un abonnement résilié ne reçoit
 * plus rien et l'accesseur resterait figé sur la valeur initiale.
 */
function withWinner(
  store: Internals,
  winner: "player" | "enemy",
): () => BattleState {
  let state!: BattleState;
  store.store.subscribe((s) => {
    state = s;
  });
  store.store.set({ ...state, winner });
  return () => state;
}

describe("Fin de round : tous les chemins de coup fatal sont différés", () => {
  // Régression : les deux branches « le premier frappeur frappe d'abord »
  // appliquaient `_applyRoundWinner` immédiatement, ce qui faisait sauter
  // l'écran suivant (donc l'animation) quand le coup fatal venait du premier
  // tour — c'est-à-dire le cas le plus fréquent.
  test("aucune branche n’applique la fin de round en direct sur un vainqueur", () => {
    const src = readFileSync(
      new URL("../src/lib/stores/battleStore.ts", import.meta.url),
      "utf8",
    );
    // Chaque application directe doit être conditionnée à l'absence de vainqueur.
    const directCalls = [...src.matchAll(/= this\._applyRoundWinner\(s\)/g)];
    expect(directCalls.length).toBeGreaterThan(0);
    for (const call of directCalls) {
      const before = src.slice(Math.max(0, call.index - 400), call.index);
      // Le bloc qui précède doit tester le vainqueur.
      expect(before).toMatch(/if \(s\.winner\)|if \(followUp\)/);
    }
  });

  test("le report est utilisé sur les quatre chemins de résolution de tour", () => {
    const src = readFileSync(
      new URL("../src/lib/stores/battleStore.ts", import.meta.url),
      "utf8",
    );
    const scheduled = src.match(/_scheduleRoundEnd\(/g) ?? [];
    // 1 définition + 4 appels (2 branches « premier frappeur », tour joueur,
    // tour ennemi).
    expect(scheduled.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Fin de round : animation puis écran suivant", () => {
  test("la victoire est annoncée aussitôt mais la phase attend le délai", async () => {
    const cleared = { count: 0 };
    const controller = {
      handlePlayerVictory: ({ run }: { run: BattleState["run"] }) => ({
        run: { ...run, phase: "regionClear" as const },
        logs: ["Région conquise"],
      }),
    };
    const store = makeStore(controller, cleared);
    const get = withWinner(store, "player");

    // Le vainqueur est connu immédiatement : l'animation peut se jouer.
    expect(get().winner).toBe("player");
    // ... mais l'écran suivant n'est pas encore affiché.
    expect(get().run.phase).not.toBe("regionClear");

    store._scheduleRoundEnd("player");
    await wait(ROUND_END_DELAY + SLACK);

    expect(get().run.phase).toBe("regionClear");
    store._clearTimers();
  });

  test("la défaite n’efface la sauvegarde qu’après le délai (permadeath)", async () => {
    const cleared = { count: 0 };
    const store = makeStore({}, cleared);
    const get = withWinner(store, "enemy");

    store._scheduleRoundEnd("enemy");
    expect(cleared.count).toBe(0); // rien pendant l'animation de défaite

    await wait(ROUND_END_DELAY + SLACK);

    expect(cleared.count).toBe(1); // sauvegarde effacée une fois
    expect(get().run.phase).toBe("runover");
    store._clearTimers();
  });

  test("des fins de round empilées n’en appliquent qu’une seule", async () => {
    let applied = 0;
    const cleared = { count: 0 };
    const controller = {
      handlePlayerVictory: ({ run }: { run: BattleState["run"] }) => {
        applied++;
        return { run: { ...run, phase: "regionClear" as const }, logs: [] };
      },
    };
    const store = makeStore(controller, cleared);
    withWinner(store, "player");

    // Trois appels rapprochés : le garde-fou doit n’en retenir qu’un.
    store._scheduleRoundEnd("player");
    store._scheduleRoundEnd("player");
    store._scheduleRoundEnd("player");

    await wait(ROUND_END_DELAY + SLACK);

    expect(applied).toBe(1);
    store._clearTimers();
  });
});
