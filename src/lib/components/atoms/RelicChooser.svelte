<script lang="ts">
  import type { Relic } from "../../../core/entities/Relic";

  export let offers: Relic[] | null;
  export let onPick: (relic: Relic) => void;
  export let onSkip: () => void;

  // Couleur / étiquette par type d'effet (compréhension immédiate)
  function relicTag(relic: Relic): { label: string; chip: string; card: string } {
    const e = relic.effect;
    if (e.stat?.strength)
      return { label: 'Force', chip: 'text-red-200 border-red-500/50 bg-red-950/60', card: 'border-red-500/60 hover:border-red-400 hover:shadow-[0_0_16px_rgba(239,68,68,0.35)]' };
    if (e.stat?.speed)
      return { label: 'Vitesse', chip: 'text-sky-200 border-sky-500/50 bg-sky-950/60', card: 'border-sky-500/60 hover:border-sky-400 hover:shadow-[0_0_16px_rgba(56,189,248,0.35)]' };
    if (e.stat?.constitution)
      return { label: 'Constitution', chip: 'text-emerald-200 border-emerald-500/50 bg-emerald-950/60', card: 'border-emerald-500/60 hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(52,211,153,0.35)]' };
    if (e.stat?.intelligence)
      return { label: 'Savoir', chip: 'text-violet-200 border-violet-500/50 bg-violet-950/60', card: 'border-violet-500/60 hover:border-violet-400 hover:shadow-[0_0_16px_rgba(167,139,250,0.35)]' };
    if (e.acBonus)
      return { label: 'Armure', chip: 'text-indigo-200 border-indigo-500/50 bg-indigo-950/60', card: 'border-indigo-500/60 hover:border-indigo-400 hover:shadow-[0_0_16px_rgba(129,140,248,0.35)]' };
    if (e.healStartPercent)
      return { label: 'Soin', chip: 'text-teal-200 border-teal-500/50 bg-teal-950/60', card: 'border-teal-500/60 hover:border-teal-400 hover:shadow-[0_0_16px_rgba(45,212,191,0.35)]' };
    if (e.lifestealPercent)
      return { label: 'Vol de vie', chip: 'text-fuchsia-200 border-fuchsia-500/50 bg-fuchsia-950/60', card: 'border-fuchsia-500/60 hover:border-fuchsia-400 hover:shadow-[0_0_16px_rgba(232,121,249,0.35)]' };
    if (e.damagePercent)
      return { label: 'Dégâts', chip: 'text-orange-200 border-orange-500/50 bg-orange-950/60', card: 'border-orange-500/60 hover:border-orange-400 hover:shadow-[0_0_16px_rgba(251,146,60,0.35)]' };
    if (e.critRange)
      return { label: 'Critique', chip: 'text-yellow-200 border-yellow-500/50 bg-yellow-950/60', card: 'border-yellow-500/60 hover:border-yellow-300 hover:shadow-[0_0_16px_rgba(253,224,71,0.35)]' };
    if (e.experiencePercent)
      return { label: 'Expérience', chip: 'text-cyan-200 border-cyan-500/50 bg-cyan-950/60', card: 'border-cyan-500/60 hover:border-cyan-300 hover:shadow-[0_0_16px_rgba(103,232,249,0.35)]' };
    return { label: 'Relique', chip: 'text-stone-200 border-stone-500/50 bg-stone-800/60', card: 'border-stone-500/60 hover:border-stone-400 hover:shadow-[0_0_16px_rgba(168,162,158,0.35)]' };
  }
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
      <button
        on:click={() => onPick(relic)}
        title={relic.description}
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
        <span
          class="text-[9px] md:text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-bold truncate max-w-full {tag.chip}"
        >
          {tag.label}
        </span>
        <span class="hidden md:block text-[11px] text-stone-400 leading-tight mt-0.5">
          {relic.description}
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