<script lang="ts">
  // Props : Les données reçues du parent
  export let current: number;
  export let max: number;

  // Réactivité Svelte ($:)
  // Ces variables sont recalculées automatiquement dès que 'current' ou 'max' change.

  // 1. Calcul du pourcentage (borné entre 0 et 100 pour éviter les bugs visuels)
  $: percent = Math.max(0, Math.min(100, (current / max) * 100));

  // 2. Changement de couleur dynamique (Vert > Jaune > Rouge)
  $: color = percent > 50 ? "#4caf50" : percent > 20 ? "#ffeb3b" : "#f44336";
</script>

<div
  class="w-full bg-gray-300 h-4 rounded border-2 border-black overflow-hidden relative"
>
  <div
    class="h-full transition-all duration-500 ease-out"
    style="width: {percent}%; background-color: {color};"
  ></div>
</div>

<div class="text-xs text-white font-bold text-right mt-1">
  {current}/{max} HP
</div>
