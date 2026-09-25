<script lang="ts">
  import { REGIONS } from "../../../core/entities/Region";
  import type { Relic } from "../../../core/entities/Relic";
  import type { InventorySlot } from "../../../core/entities/Consumable";
  import { REGION_COLORS } from "../../styles/regionColors";

  export let regionIndex: number;
  export let mapLayer: number;
  export let mapLayers: number;
  export let relics: Relic[];
  export let inventory: InventorySlot[] = [];
  export let score: number;
  export let gold: number;
  export let isBossFight: boolean = false;
  export let onOpenInventory: (() => void) | undefined = undefined;

  let expandedRelicId: string | null = null;

  function toggleRelicTooltip(relicId: string): void {
    expandedRelicId = expandedRelicId === relicId ? null : relicId;
  }

  function closeRelicTooltipOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (!target?.closest("[data-relic-trigger]")) expandedRelicId = null;
  }

  function handleRelicTooltipKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") expandedRelicId = null;
  }

  $: region = REGIONS[regionIndex];
  $: dots = Array.from({ length: mapLayers }, (_, i) => i);
  $: totalPotions = (inventory ?? []).reduce((acc, slot) => acc + slot.quantity, 0);

  // Accent coloré par région — même source que l'arène de combat.
  $: regionColors = REGION_COLORS[region.id] ?? REGION_COLORS["region-verdure"];
</script>

<svelte:window on:click={closeRelicTooltipOnOutsideClick} on:keydown={handleRelicTooltipKeydown} />

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
      {#each relics as relic, relicIndex}
        <span class="group relative inline-flex shrink-0">
          <button
            type="button"
            data-relic-trigger={relic.id}
            on:click={() => toggleRelicTooltip(relic.id)}
            class="inline-flex h-11 w-11 touch-manipulation cursor-help items-center justify-center rounded-full border border-amber-300/70 bg-gradient-to-br from-amber-700 to-amber-900 text-sm shadow-[0_0_6px_rgba(251,191,36,0.4)] transition-transform group-hover:-translate-y-0.5 group-hover:border-amber-200 group-hover:shadow-[0_0_10px_rgba(251,191,36,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:h-6 sm:w-6"
            aria-label={`${relic.name} : ${relic.description}`}
            aria-describedby={`relic-description-${relic.id}`}
            aria-expanded={expandedRelicId === relic.id}
            aria-controls={`relic-description-${relic.id}`}
          >
            {relic.icon}
          </button>
          <span
            id={`relic-description-${relic.id}`}
            role="tooltip"
            class="pointer-events-none absolute top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-amber-400/70 bg-stone-950/95 px-3 py-2 text-left shadow-xl backdrop-blur-sm transition-all duration-150 sm:left-1/2 sm:right-auto sm:-translate-x-1/2
              {expandedRelicId === relic.id ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'}
              {relicIndex > (relics.length - 1) / 2 ? 'right-0' : 'left-0'}
              group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          >
            <span class="block font-serif text-xs font-bold text-amber-200">{relic.name}</span>
            <span class="mt-1 block text-[11px] leading-relaxed text-stone-300">{relic.description}</span>
          </span>
        </span>
      {/each}
    {:else}
      <span class="text-stone-500 text-[10px] uppercase tracking-wider">aucune relique</span>
    {/if}
  </div>

  <!-- Sacoche d'inventaire -->
  {#if onOpenInventory}
    <button
      type="button"
      on:click={onOpenInventory}
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-amber-500/40 bg-stone-900/80 hover:bg-amber-950/40 text-amber-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
      title="Ouvrir la sacoche d'objets et potions"
    >
      <span>🎒</span>
      <span>Sacoche ({totalPotions})</span>
    </button>
  {/if}

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