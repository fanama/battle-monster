<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { ArenaEnvironmentLayer } from "../../renderers/ArenaEnvironmentLayer";

  /**
   * Décor 3D de l'arène (sol bleu nuit, grille, piliers, horizon lumineux).
   * Le canvas est transparent : le ciel CSS et la teinte régionale restent
   * visibles au-dessus de l'horizon. Le décor est statique, il n'est redessiné
   * que lorsque l'arène change de taille.
   */

  let canvasEl: HTMLCanvasElement | null = null;
  let layer: ArenaEnvironmentLayer | null = null;
  let observer: ResizeObserver | null = null;

  onMount(() => {
    if (!canvasEl) return;
    layer = new ArenaEnvironmentLayer(canvasEl);
    layer.render();
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => layer?.render());
      observer.observe(canvasEl);
    }
  });

  onDestroy(() => {
    observer?.disconnect();
    observer = null;
    layer?.destroy();
    layer = null;
  });
</script>

<canvas
  bind:this={canvasEl}
  class="pointer-events-none absolute inset-0 z-0 h-full w-full"
  aria-hidden="true"
></canvas>
