<script lang="ts">
  // Props : Les données reçues du parent
  export let current: number;
  export let max: number;

  // 1. Calcul du pourcentage (borné entre 0 et 100 pour éviter les bugs visuels)
  $: percent = Math.max(0, Math.min(100, (current / max) * 100));

  // 2. Changement de couleur dynamique (Vert > Jaune > Rouge)
  $: color = percent > 50 ? "#4caf50" : percent > 20 ? "#ffeb3b" : "#f44336";

  // --- Damage trail (semblable à la HP bar du projet dnd) ---
  // La barre principale réagit vite ; une traînée rouge la « rattrape » lentement.
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
</script>

<div
  class="w-full h-4 rounded border-2 border-black overflow-hidden relative bg-gray-500/60"
>
  <!-- Traînée de dégâts (retardée) -->
  <div
    class="absolute inset-y-0 left-0 h-full bg-red-700/80"
    style="width: {trailPercent}%; transition: width 0.7s ease 0.15s;"
  ></div>

  <!-- Barre de vie principale (réactive) -->
  <div
    class="absolute inset-y-0 left-0 h-full"
    style="width: {percent}%; background-color: {color}; transition: width 0.25s ease-out;"
  ></div>

  <!-- Pulsation quand les PV sont bas -->
  {#if percent <= 25}
    <div class="absolute inset-0 low-hp-pulse"></div>
  {/if}
</div>

<div class="text-xs text-white font-bold text-right mt-1">
  {current}/{max} HP
</div>

<style>
  @keyframes low-pulse {
    0%, 100% { background-color: rgba(220, 38, 38, 0.05); }
    50% { background-color: rgba(220, 38, 38, 0.4); }
  }

  .low-hp-pulse {
    animation: low-pulse 1s ease-in-out infinite;
  }
</style>