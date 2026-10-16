<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Monster } from "../../../core/entities/Monster";
  import {
    MonsterWebGLRenderer,
    type StageAction,
  } from "../../renderers/MonsterWebGLRenderer";
  import type { GearSlot } from "../../renderers/monsterRig";

  export let monster: Monster;
  export let isPlayer: boolean = false;
  /**
   * Espèce rendue. `null` (défaut) : le **champion** (`isPlayer`) est un humain
   * en armure, tout le reste est un monstre. Les vues qui affichent le
   * champion hors arène (fiche, Panthéon) passent explicitement `human`.
   */
  export let species: 'monster' | 'human' | null = null;
  /**
   * Action articulée de scène (attaque mêlée/à distance, canalisation,
   * blocage, victoire, défaite). `null` = pose de garde avec idle respirant.
   * Passé par MonsterDisplayer en variante « stage » ; hors combat (fiche,
   * Panthéon) il reste null.
   */
  export let stageAction: StageAction | null = null;

  let canvasEl: HTMLCanvasElement;
  let renderer: MonsterWebGLRenderer | null = null;

  // Espèce effective : par défaut le **champion** (isPlayer) est un humain en
  // armure, tout le reste un monstre.
  $: resolvedSpecies = species ?? (isPlayer ? 'human' : 'monster');

  // Emplacements d'équipement **portés**, relus en direct par le renderer
  // (le `Monster` est muté sur place : l'armure 3D apparaît dès qu'on équipe).
  const gearProvider = () =>
    (monster?.getEquippedList() ?? []).map((piece) => piece.slot) as GearSlot[];

  $: options = {
    type: monster?.type ?? 'normal',
    isPlayer,
    isBoss: monster?.rank === 'boss',
    isLowHp: (monster?.currentHp ?? 1) <= (monster?.maxHp ?? 1) * 0.35,
    isStrong: (monster?.strength ?? 10) >= 15,
    hasWisdom: (monster?.wisdom ?? 10) >= 15,
    species: resolvedSpecies,
    gear: gearProvider(),
    gearProvider
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
  <!-- `data-fighter` identifie le canvas d'un camp : le calque d'effets
       (`ArenaSpellLayer`) s'en sert pour ancrer les sorts sur la bonne
       silhouette (départ main, impact buste). -->
  <canvas
    bind:this={canvasEl}
    class="w-full h-full block cursor-default"
    data-fighter={isPlayer ? 'player' : 'enemy'}
    aria-label="Monstre 3D WebGL : {monster?.name ?? ''}"
  ></canvas>
</div>

<style>
  .webgl-sprite-wrapper {
    touch-action: none;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
  }
</style>
