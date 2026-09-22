<script lang="ts">
  import { REGIONS } from "../../../core/entities/Region";
  import type { Relic } from "../../../core/entities/Relic";

  export let regionIndex: number;
  export let encounterIndex: number;
  export let relics: Relic[];
  export let score: number;
  export let isBossFight: boolean = false;

  $: region = REGIONS[regionIndex];
  $: steps = Array.from({ length: region.encounters + 1 }, (_, i) => i);
</script>

<div
  class="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-2 text-xs md:text-sm text-stone-300"
>
  <!-- Région courante -->
  <span class="font-serif font-bold tracking-widest text-amber-300 uppercase">
    🏴 {region.name}
  </span>

  <!-- Progression sauvage → boss -->
  <div class="flex items-center gap-1">
    {#each steps as i}
      {@const isBossStep = i === region.encounters}
      {@const done = i < encounterIndex}
      {@const isCurrent = i === encounterIndex}
      <span
        title={isBossStep ? 'Boss de région' : `Combat sauvage ${i + 1}`}
        class="flex items-center justify-center w-6 h-6 rounded-md border text-[10px] leading-none transition-all
          {isBossStep
            ? done
              ? 'bg-rose-500 border-rose-300 text-white'
              : isBossFight
                ? 'bg-rose-600 border-rose-300 scale-110 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
                : 'bg-stone-700 border-rose-500/60 text-rose-300'
            : done
              ? 'bg-green-600 border-green-400 text-white'
              : isCurrent
                ? 'bg-amber-500 border-amber-300 text-stone-900'
                : 'bg-stone-700 border-stone-600 text-stone-400'}"
      >
        {isBossStep ? '👑' : i + 1}
      </span>
    {/each}
  </div>

  <!-- Reliques collectées -->
  <div class="flex items-center gap-1">
    {#if relics.length > 0}
      {#each relics as relic}
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-900/60 border border-amber-400/50 text-sm"
          title={relic.name}
        >
          {relic.icon}
        </span>
      {/each}
    {:else}
      <span class="text-stone-500 text-[10px] uppercase tracking-wider">aucune relique</span>
    {/if}
  </div>

  <!-- Score -->
  <span class="ml-auto font-mono text-amber-200">★ {score}</span>
</div>