<script lang="ts">
  import type { Relic } from "../../../core/entities/Relic";
  import { relicEffectLines } from "../../styles/relicEffects";
  import { relicTag } from "../../styles/relicTags";

  export let offers: Relic[] | null;
  export let onPick: (relic: Relic) => void;
  export let onSkip: () => void;
</script>

<div
  class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-lg
    bg-black/80 backdrop-blur-sm p-4 text-center"
>
  <p class="text-2xl font-serif font-bold tracking-widest text-amber-300 uppercase drop-shadow">
    ⭐ Objet trouvé !
  </p>
  <p class="text-sm text-stone-400">
    Choisissez une relique (permanente pour la run) ou passez votre chemin.
  </p>

  <div class="grid grid-cols-3 gap-2 md:gap-3 w-full max-w-md max-h-full overflow-y-auto">
    {#each offers ?? [] as relic}
      {@const tag = relicTag(relic)}
      {@const lines = relicEffectLines(relic)}
      <button
        on:click={() => onPick(relic)}
        title="{relic.name} — {lines.map((line) => `${line.label} ${line.value}`).join(' · ')}"
        class="group flex flex-col items-center gap-1 rounded-xl border-2 min-w-0
          bg-gradient-to-b from-stone-800 to-stone-900 p-2 md:p-3
          transition-all duration-200 hover:-translate-y-1 active:scale-95 {tag.card}"
      >
        <span class="text-3xl md:text-4xl drop-shadow group-hover:scale-110 transition-transform">
          {relic.icon}
        </span>
        <span class="font-bold text-amber-100 text-[11px] md:text-sm leading-tight drop-shadow truncate max-w-full">
          {relic.name}
        </span>

        <!-- Effets chiffrés : l'information utile pour choisir, lisible sur mobile -->
        <span class="flex flex-wrap justify-center gap-0.5">
          {#each lines as line (line.label)}
            <span
              class="text-[9px] md:text-[10px] font-mono font-bold text-amber-200 bg-stone-950/70
                border border-stone-700/80 rounded px-1 leading-[14px] truncate max-w-full"
            >
              {line.label} {line.value}
            </span>
          {/each}
        </span>
      </button>
    {/each}
  </div>

  <button
    on:click={onSkip}
    class="text-sm px-3 py-1 rounded-full border border-stone-600 text-stone-400
      hover:text-stone-200 hover:border-stone-400 transition-colors"
  >
    Passer
  </button>
</div>
