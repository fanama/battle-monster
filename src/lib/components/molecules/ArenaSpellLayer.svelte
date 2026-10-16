<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Move } from "../../../core/entities/Move";
  import type { CombatFeedback } from "../../../core/services/BattleEngine";
  import {
    SpellVfxLayer,
    type SpellCast,
    type SpellChannel,
  } from "../../renderers/SpellVfxLayer";
  import {
    attackFamily,
    casterMuzzle,
    targetChest,
    toArenaRect,
    type Rect,
  } from "../../renderers/spellVfx";
  import { spellVfxReady } from "../../stores/vfxStore";

  /**
   * Calque 3D des sorts : un canvas WebGL posé sur **toute l'arène**, au-dessus
   * des combattants. Il reçoit les mêmes entrées que `MonsterDisplayer`, si
   * bien que l'effet et la pose articulée partent du même front montant.
   *
   * La géométrie du sort (trajectoire, impact, canalisation) est calculée par
   * `spellVfx.ts` — ici on ne fait que mesurer les combattants et router
   * l'attaque vers le bon effet.
   */

  export let isPlayerAttacking = false;
  export let isEnemyAttacking = false;
  export let playerLastMove: Move | null = null;
  export let enemyLastMove: Move | null = null;
  export let playerFeedback: CombatFeedback | null = null;
  export let enemyFeedback: CombatFeedback | null = null;

  let canvasEl: HTMLCanvasElement | null = null;
  let layer: SpellVfxLayer | null = null;

  // Fronts montants : un effet part quand l'attaque **commence**, jamais deux
  // fois pour le même coup.
  let playerWasAttacking = false;
  let enemyWasAttacking = false;

  /** L'arène : le canvas est son enfant direct, donc son parent. */
  function arenaRoot(): HTMLElement | null {
    return canvasEl?.parentElement ?? null;
  }

  /**
   * Rectangle d'un combattant, relatif à l'arène et converti dans le repère de
   * la couche (origine bas-gauche, pixels CSS). Le canvas du combattant est
   * repéré par sa **face** (`data-fighter`), posée par `SpriteDisplayer`.
   */
  function fighterRect(arena: DOMRect, side: "player" | "enemy"): Rect | null {
    const el = arenaRoot()?.querySelector(`[data-fighter="${side}"]`);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return toArenaRect(
      {
        left: box.left - arena.left,
        top: box.top - arena.top,
        width: box.width,
        height: box.height,
      },
      { width: arena.width, height: arena.height },
    );
  }

  /**
   * Joue l'effet d'une attaque.
   *
   * `self` est le feedback du **lanceur** (un soin ou un buff s'affiche sur
   * celui qui le lance), `foe` celui de la **cible** (touché / raté / critique).
   * Le routeur de familles (`attackFamily`) est partagé avec `MonsterDisplayer` :
   * le projectile part donc exactement sur les coups joués en `ranged`.
   */
  function fire(
    move: Move | null,
    isPlayer: boolean,
    self: CombatFeedback | null,
    foe: CombatFeedback | null,
  ): void {
    if (!layer || !move) return;
    const arena = arenaRoot()?.getBoundingClientRect();
    if (!arena) return;

    const family = attackFamily(move);
    const own = fighterRect(arena, isPlayer ? "player" : "enemy");

    // Soin / amplification : le pouvoir monte sur le lanceur, il ne part pas.
    if (family === "utility") {
      if (!own) return;
      if (self?.kind !== "heal" && self?.kind !== "buff") return;
      const channel: SpellChannel = {
        type: move.type,
        at: { x: own.left + own.width * 0.5, y: own.top + own.height * 0.45 },
      };
      layer.channel(channel);
      return;
    }

    // Le corps à corps garde sa charge CSS (aucun projectile).
    if (family !== "ranged" || !own) return;

    const other = fighterRect(arena, isPlayer ? "enemy" : "player");
    if (!other) return;

    const cast: SpellCast = {
      type: move.type,
      from: casterMuzzle(own, isPlayer),
      to: targetChest(other),
      // Coup manqué : le sort se dissipe avant la cible au lieu d'exploser.
      dissipate: foe?.kind === "miss" || foe?.kind === "fumble",
      crit: Boolean(foe?.isCrit),
    };
    layer.cast(cast);
  }

  $: if (layer && isPlayerAttacking !== playerWasAttacking) {
    playerWasAttacking = isPlayerAttacking;
    if (isPlayerAttacking) {
      fire(playerLastMove, true, playerFeedback, enemyFeedback);
    }
  }

  $: if (layer && isEnemyAttacking !== enemyWasAttacking) {
    enemyWasAttacking = isEnemyAttacking;
    if (isEnemyAttacking) {
      fire(enemyLastMove, false, enemyFeedback, playerFeedback);
    }
  }

  onMount(() => {
    if (!canvasEl) return;
    layer = new SpellVfxLayer(canvasEl);
    spellVfxReady.set(layer.supported);
  });

  onDestroy(() => {
    layer?.destroy();
    layer = null;
    spellVfxReady.set(false);
  });
</script>

<!-- `pointer-events-none` : la couche ne capte aucun clic (les boutons de
     l'arène, le HUD et les overlays restent accessibles). `z-[25]` : au-dessus
     des combattants (z-20), sous le HUD (z-30) et sous les overlays (z-40). -->
<canvas
  bind:this={canvasEl}
  class="pointer-events-none absolute inset-0 z-[25] h-full w-full"
  aria-hidden="true"
></canvas>
