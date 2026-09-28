<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Monster } from "../../../core/entities/Monster";
  import { MonsterWebGLRenderer } from "../../renderers/MonsterWebGLRenderer";

  export let monster: Monster;
  export let isPlayer: boolean = false;

  let canvasEl: HTMLCanvasElement;
  let renderer: MonsterWebGLRenderer | null = null;

  $: options = {
    type: monster?.type ?? 'normal',
    isPlayer,
    isBoss: monster?.rank === 'boss',
    isLowHp: (monster?.currentHp ?? 1) <= (monster?.maxHp ?? 1) * 0.35,
    isStrong: (monster?.strength ?? 10) >= 15,
    hasWisdom: (monster?.wisdom ?? 10) >= 15
  };

  $: if (renderer && options) {
    renderer.updateOptions(options);
  }

  onMount(() => {
    if (canvasEl) {
      renderer = new MonsterWebGLRenderer(canvasEl, options);
    }
  });

  onDestroy(() => {
    if (renderer) {
      renderer.destroy();
      renderer = null;
    }
  });
</script>

<div class="webgl-sprite-wrapper relative w-full h-full flex items-center justify-center select-none overflow-hidden">
  <canvas
    bind:this={canvasEl}
    class="w-full h-full block cursor-default"
    aria-label="Monstre 3D WebGL : {monster?.name ?? ''}"
  ></canvas>
</div>

<style>
  .webgl-sprite-wrapper {
    touch-action: none;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
  }
</style>
