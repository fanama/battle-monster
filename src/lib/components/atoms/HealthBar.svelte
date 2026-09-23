<script lang="ts">
  import { onDestroy } from "svelte";

  // Props : Les données reçues du parent
  export let current: number;
  export let max: number;

  // 1. Calcul du pourcentage (borné entre 0 et 100)
  $: percent = Math.max(0, Math.min(100, (current / max) * 100));

  // 2. Dégradé dynamique (Vert > Jaune > Rouge) selon l'état
  $: gradient = percent > 50
    ? 'linear-gradient(90deg, #15803d, #4ade80)'
    : percent > 25
      ? 'linear-gradient(90deg, #d97706, #fde047)'
      : 'linear-gradient(90deg, #b91c1c, #f87171)';

  // --- Damage trail (semblable à la HP bar du projet dnd) ---
  let trailPercent = 100;
  let visiblePercent = 100;
  let trailTimer: ReturnType<typeof setTimeout> | undefined;

  $: if (percent !== visiblePercent) {
    if (percent > visiblePercent) {
      // Heal : la traînée remonte immédiatement
      trailPercent = percent;
    } else {
      // Dégâts : la traînée reste, puis rattrape après un court délai
      clearTimeout(trailTimer);
      trailTimer = setTimeout(() => {
        trailPercent = percent;
      }, 550);
    }
    visiblePercent = percent;
  }

  onDestroy(() => {
    if (trailTimer) clearTimeout(trailTimer);
  });
</script>

<div
  class="w-full h-4 md:h-5 rounded-md border-2 border-black overflow-hidden relative bg-gray-500/70 shadow-inner"
  role="progressbar"
  aria-valuenow={current}
  aria-valuemin={0}
  aria-valuemax={max}
>
  <!-- Traînée de dégâts (retardée) -->
  <div
    class="absolute inset-y-0 left-0 h-full bg-red-800/90"
    style="width: {trailPercent}%; transition: width 0.7s ease 0.15s;"
  ></div>

  <!-- Barre de vie principale (réactive, dégradé) -->
  <div
    class="absolute inset-y-0 left-0 h-full"
    style="width: {percent}%; background: {gradient}; transition: width 0.25s ease-out;"
  ></div>

  <!-- Pulsation quand les PV sont bas -->
  {#if percent <= 25}
    <div class="absolute inset-0 low-hp-pulse rounded-md"></div>
  {/if}

  <!-- Valeurs inscrites dans la barre -->
  <span
    class="absolute inset-0 flex items-center justify-center
      text-[9px] md:text-[10px] font-bold text-white drop-shadow-md
      pointer-events-none"
  >
    {current}/{max} PV
  </span>
</div>

<style>
  @keyframes low-pulse {
    0%, 100% { background-color: rgba(220, 38, 38, 0.1); }
    50% { background-color: rgba(220, 38, 38, 0.45); }
  }

  .low-hp-pulse {
    animation: low-pulse 1s ease-in-out infinite;
  }
</style>