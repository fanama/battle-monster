<script lang="ts">
  import type { RunTab, RunTabId } from "../../runTabs";

  export let tabs: RunTab[] = [];
  export let activeTab: RunTabId;
  export let onSelect: (id: RunTabId) => void = () => {};
</script>

<!--
  Barre d'onglets du run : une seule ligne, colonnes de largeur égale
  (`flex-1 min-w-0`) → jamais de débordement horizontal, quelle que soit la
  largeur de l'écran. Sous 416 px (6 onglets) le libellé s'efface au profit de
  l'icône, qui reste un bouton de 44 px minimum avec `aria-label` + `title`.
-->
<nav aria-label="Sections du périple" class="w-full max-w-full shrink-0">
  <div class="w-full max-w-4xl mx-auto px-2 sm:px-3 pb-1.5">
    <div
      role="tablist"
      class="flex items-stretch gap-1 rounded-xl border-2 border-stone-700/80 bg-stone-900/70
        p-1 shadow-[inset_0_1px_6px_rgba(0,0,0,0.6)]"
    >
      {#each tabs as tab (tab.id)}
        {@const isActive = activeTab === tab.id}
        <button
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-label={tab.label}
          title={tab.label}
          on:click={() => onSelect(tab.id)}
          class="relative flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center gap-0.5
            rounded-lg px-0.5 py-1.5 cursor-pointer transition-all duration-200 active:scale-95
            {isActive
              ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
              : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/70'}"
        >
          <span class="text-base sm:text-lg leading-none">{tab.icon}</span>
          <span
            class="hidden xs:block w-full truncate text-center text-[9px] sm:text-[11px] font-serif
              font-bold uppercase tracking-wide leading-tight"
          >
            {tab.label}
          </span>

          {#if tab.badge}
            <span
              class="absolute top-0 right-0.5 min-w-[14px] px-1 rounded-full bg-amber-500/90
                text-[9px] font-mono font-bold text-stone-950 leading-[14px] text-center
                {isActive ? 'bg-stone-950/80 text-amber-200' : ''}"
              aria-hidden="true"
            >
              {tab.badge}
            </span>
          {/if}

          {#if tab.alert}
            <span
              class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]"
              aria-label="Action disponible"
            ></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</nav>
