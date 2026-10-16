<script lang="ts">
  import type { RunTab, RunTabId } from "../../runTabs";
  import { playSound } from "../../audio/gameAudio";
  import { dq } from "../../styles/style";

  export let tabs: RunTab[] = [];
  export let activeTab: RunTabId;
  export let onSelect: (id: RunTabId) => void = () => {};
</script>

<!--
  Barre d'onglets du run : une seule ligne, colonnes de largeur égale
  (`flex-1 min-w-0`) → jamais de débordement horizontal, quelle que soit la
  largeur de l'écran. Sous 416 px (6 onglets) le libellé s'efface au profit de
  l'icône, qui reste un bouton de 44 px minimum avec `aria-label` + `title`.

  Look DQ : un bandeau plat, l'onglet actif marqué par un fond clair et un
  filet doré — plus de dégradé ambré ni de lueur.
-->
<nav aria-label="Sections du périple" class="w-full max-w-full shrink-0">
  <div class="w-full max-w-4xl mx-auto px-2 sm:px-3 pb-1.5">
    <div
      role="tablist"
      class="flex items-stretch gap-1 rounded-lg border border-sky-100/20 bg-[#0d1526]/93
        p-1 shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
    >
      {#each tabs as tab (tab.id)}
        {@const isActive = activeTab === tab.id}
        <button
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-label={tab.label}
          title={tab.label}
          on:click={() => {
            playSound("select");
            onSelect(tab.id);
          }}
          on:mouseenter={() => {
            // populations souris : bip sur le focus/hover plutôt qu'au clic
            if (!(typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches && tab.id !== activeTab)) return;
            playSound("select");
          }}
          class="relative flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center gap-0.5
            rounded-md px-0.5 py-1.5 cursor-pointer transition-colors active:scale-95
            {isActive
              ? 'bg-sky-50/10 text-white shadow-[inset_0_-2px_0_rgba(252,211,77,0.75)]'
              : 'text-sky-100/60 hover:text-sky-50 hover:bg-sky-50/5'}"
        >
          <span class="text-base sm:text-lg leading-none">{tab.icon}</span>
          <span
            class="hidden xs:block w-full truncate text-center text-[9px] sm:text-[11px] font-display
              font-bold uppercase tracking-wide leading-tight"
          >
            {tab.label}
          </span>

          {#if tab.badge}
            <span
              class="absolute top-0 right-0.5 min-w-[14px] px-1 rounded-full
                text-[9px] font-mono font-bold leading-[14px] text-center
                {isActive ? 'bg-amber-200 text-[#0d1526]' : 'bg-sky-100/20 text-sky-50'}"
              aria-hidden="true"
            >
              {tab.badge}
            </span>
          {/if}

          {#if tab.alert}
            <span
              class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400"
              aria-label="Action disponible"
            ></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</nav>
