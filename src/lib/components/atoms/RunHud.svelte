<script lang="ts">
  import { REGIONS } from "../../../core/entities/Region";
  import type { Relic } from "../../../core/entities/Relic";
  import { REGION_COLORS } from "../../styles/regionColors";

  export let regionIndex: number;
  export let mapLayer: number;
  export let mapLayers: number;
  export let relics: Relic[];
  export let score: number;
  export let gold: number;
  export let isBossFight: boolean = false;

  $: region = REGIONS[regionIndex];
  $: dots = Array.from({ length: mapLayers }, (_, i) => i);

  // Accent coloré par région — même source que l'arène de combat.
  $: regionColors = REGION_COLORS[region.id] ?? REGION_COLORS["region-verdure"];
</script>

<div
  class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-2 text-xs md:text-sm text-stone-300"
>
  <!-- Région courante (pastille dégradée + nom coloré) -->
  <span class="inline-flex items-center gap-2">
    <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-br {regionColors.accent} shadow"></span>
    <span class="font-serif font-bold tracking-widest uppercase {regionColors.text}">
      🏴 {region.name}
    </span>
  </span>

  <!-- Progression dans la carte de la région (couche par couche) -->
  <div class="flex items-center gap-1.5" title="Progression dans la carte">
    {#each dots as i}
      {@const done = i < mapLayer}
      {@const isCurrent = i === mapLayer}
      <span
        class="w-2 h-3.5 rounded-sm transition-all
          {done
            ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
            : isCurrent
              ? 'bg-amber-400 scale-y-110 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
              : 'bg-stone-700 border border-stone-600'}"
      ></span>
    {/each}
    <span
      class="text-sm leading-none
        {isBossFight ? 'text-rose-400 animate-pulse' : 'text-stone-600'}"
    >
      👑
    </span>
  </div>

  <!-- Reliques collectées (anneau doré) -->
  <div class="flex items-center gap-1">
    {#if relics.length > 0}
      {#each relics as relic}
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-300/70 text-sm shadow-[0_0_6px_rgba(251,191,36,0.4)]"
          title={relic.name}
        >
          {relic.icon}
        </span>
      {/each}
    {:else}
      <span class="text-stone-500 text-[10px] uppercase tracking-wider">aucune relique</span>
    {/if}
  </div>

  <!-- Or + score -->
  <span class="ml-auto flex items-center gap-3">
    <span class="font-mono font-bold text-amber-200" title="Or">
      💰 <span class="text-yellow-300">{gold}</span>
    </span>
    <span class="font-mono font-bold text-amber-200" title="Score">
      ⭐ <span class="text-yellow-300">{score}</span>
    </span>
  </span>
</div>