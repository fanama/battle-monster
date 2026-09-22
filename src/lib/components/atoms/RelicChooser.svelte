<script lang="ts">
  import type { Relic } from "../../../core/entities/Relic";

  export let offers: Relic[] | null;
  export let onPick: (relic: Relic) => void;
  export let onSkip: () => void;
</script>

<div
  class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-lg
    bg-black/80 backdrop-blur-sm p-4 text-center"
>
  <p class="text-2xl font-serif font-bold tracking-widest text-amber-300 uppercase drop-shadow">
    Objet trouvé !
  </p>
  <p class="text-sm text-stone-400">
    Choisissez une relique (permanente pour la run) ou passez votre chemin.
  </p>

  <div class="grid grid-cols-3 gap-2 md:gap-3 w-full max-w-md">
    {#each offers ?? [] as relic}
      <button
        on:click={() => onPick(relic)}
        class="group flex flex-col items-center gap-1.5 rounded-xl border-2 border-amber-500/40
          bg-gradient-to-b from-stone-800 to-stone-900 p-3
          transition-all duration-200 hover:-translate-y-1 hover:border-amber-300
          hover:shadow-[0_0_16px_rgba(251,191,36,0.35)] active:scale-95"
      >
        <span class="text-4xl drop-shadow group-hover:scale-110 transition-transform">
          {relic.icon}
        </span>
        <span class="font-bold text-amber-200 text-sm leading-tight">{relic.name}</span>
        <span class="text-[11px] text-stone-400 leading-tight">{relic.description}</span>
      </button>
    {/each}
  </div>

  <button
    on:click={onSkip}
    class="text-stone-400 text-sm underline underline-offset-4 hover:text-stone-200 transition-colors"
  >
    Passer
  </button>
</div>