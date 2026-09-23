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

  // Accent coloré par région (Verdure, Abysse, Braise, Céleste…)
  $: regionAccent = [
    'from-emerald-600 to-green-500',
    'from-sky-600 to-blue-500',
    'from-orange-600 to-red-500',
    'from-violet-600 to-fuchsia-500',
  ][regionIndex % 4];

  $: regionText = [
    'text-emerald-300',
    'text-sky-300',
    'text-orange-300',
    'text-fuchsia-300',
  ][regionIndex % 4];
</script>

<div
  class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-2 text-xs md:text-sm text-stone-300"
>
  <!-- Région courante (pastille dégradée + nom coloré) -->
  <span class="inline-flex items-center gap-2">
    <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-br {regionAccent} shadow"></span>
    <span class="font-serif font-bold tracking-widest uppercase {regionText}">
      🏴 {region.name}
    </span>
  </span>

  <!-- Progression sauvage → boss -->
  <div class="flex items-center gap-1">
    {#each steps as i}
      {@const isBossStep = i === region.encounters}
      {@const done = i < encounterIndex}
      {@const isCurrent = i === encounterIndex}
      <span
        title={isBossStep ? 'Boss de région' : `Combat sauvage ${i + 1}`}
        class="flex items-center justify-center w-6 h-6 rounded-md border-2 text-[10px] leading-none transition-all
          {isBossStep
            ? done
              ? 'bg-rose-500 border-rose-300 text-white'
              : isBossFight
                ? 'bg-rose-600 border-rose-300 scale-110 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
                : 'bg-stone-700 border-rose-500/60 text-rose-300'
            : done
              ? 'bg-green-600 border-green-400 text-white'
              : isCurrent
                ? 'bg-amber-400 border-amber-200 text-stone-900 scale-105 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                : 'bg-stone-700 border-stone-600 text-stone-400'}"
      >
        {isBossStep ? '👑' : i + 1}
      </span>
    {/each}
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

  <!-- Score (or) -->
  <span class="ml-auto font-mono font-bold text-amber-200">
    ⭐ <span class="text-yellow-300">{score}</span>
  </span>
</div>