<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Monster } from "../../../core/entities/Monster";
  import {
    MonsterWebGLRenderer,
    type StageAction,
  } from "../../renderers/MonsterWebGLRenderer";

  export let monster: Monster;
  export let isPlayer: boolean = false;
  /**
   * Action articulée de scène (attaque mêlée/à distance, canalisation,
   * blocage, victoire, défaite). `null` = pose de garde avec idle respirant.
   * Passé par MonsterDisplayer en variante « stage » ; hors combat (fiche,
   * Panthéon) il reste null.
   */
  export let stageAction: StageAction | null = null;

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

  // Rejoue l'action articulée à chaque changement (attaque, blocage subi…).
  $: if (renderer) {
    renderer.setAction(stageAction);
  }

  onMount(() => {
    if (canvasEl) {
      renderer = new MonsterWebGLRenderer(canvasEl, options);
      renderer.setAction(stageAction);
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
