<script lang="ts">
  import type { Move, MonsterType } from "../../../core/entities/Move";
  import { typeEffectiveness } from "../../../core/services/effectiveness";
  export let move: Move;
  export let targetType: MonsterType | null = null;
  export let onClick: () => void = () => {}; // Ensure coolDown is treated as 0 if undefined

  $: currentCooldown = move.coolDown ?? 0;
  $: isReady = currentCooldown === 0; // Calculate the percentage of recovery completed: (max - current) / max * 100
  // Note: We use the non-null assertion operator '!' on maxCoolDown because if a move
  // has a coolDown, it implicitly must have a maxCoolDown.

  $: progressPercent = isReady
    ? 100
    : ((move.maxCoolDown! - currentCooldown) / move.maxCoolDown!) * 100;

$: typeClasses = {
    fire: "bg-red-900/40 border-red-500 hover:bg-red-800/60",
    water: "bg-blue-900/40 border-blue-500 hover:bg-blue-800/60",
    grass: "bg-green-900/40 border-green-500 hover:bg-green-800/60",
    normal: "bg-gray-900/40 border-gray-500 hover:bg-gray-800/60",
  }[move.type];

  $: typeDot = {
    fire: "bg-red-500",
    water: "bg-blue-500",
    grass: "bg-green-500",
    normal: "bg-gray-400",
  }[move.type];

  $: typeLabel = {
    fire: "FEU",
    water: "EAU",
    grass: "PLANTE",
    normal: "NORMAL",
  }[move.type];

  $: typeBadge = {
    fire: "text-red-300 border-red-500/40 bg-red-950/40",
    water: "text-blue-300 border-blue-500/40 bg-blue-950/40",
    grass: "text-green-300 border-green-500/40 bg-green-950/40",
    normal: "text-gray-300 border-gray-500/40 bg-gray-900/40",
  }[move.type];

  // Indicateur « super efficace / peu efficace » contre la cible (réutilise la
  // même table que le moteur : physique ×2/×0.5, magie dampée ×1.5/×0.67).
  $: effectiveness =
    targetType && move.power > 0
      ? typeEffectiveness(move.type, targetType, move.isPhysical)
      : 1;
  $: effectivenessBadge =
    effectiveness > 1
      ? "text-green-300 border-green-500/40 bg-green-950/40"
      : effectiveness < 1
        ? "text-rose-300 border-rose-500/40 bg-rose-950/40"
        : "";
</script>

<button
  disabled={!isReady}
  on:click={onClick}
  class={`
    p-2 rounded-lg border-2 w-fit transition-all duration-300 shadow-xl text-center
    ${
      isReady
        ? `${typeClasses} text-white cursor-pointer opacity-100 hover:-translate-y-0.5 active:scale-95`
        : "border-gray-700 bg-gray-800/70 text-gray-400 cursor-default opacity-50"
    }
  `}
>
  <div class="flex items-center justify-between gap-3 mb-1">
    <span class="flex items-center gap-2">
      <span class={`w-2.5 h-2.5 rounded-full ${typeDot} inline-block`}></span>
      <span class="font-extrabold text-base">
        {move.name}
      </span>
    </span>

    {#if isReady}
      <span
        class="text-green-400 font-semibold flex items-center text-sm ready-pulse"
      >
        ⚡ PRÊT
      </span>
    {:else}
      <span class="text-xs italic">
        ⏳ {currentCooldown} tours
      </span>
    {/if}
  </div>

  <div class="flex items-center justify-between mt-1">
    <span
      class={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${typeBadge}`}
    >
      {typeLabel}
    </span>

    {#if targetType && move.power > 0}
      <span
        class={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${effectivenessBadge}`}
      >
        {effectiveness > 1 ? '⚔ Super eff.' : effectiveness < 1 ? '🛡 Peu eff.' : ''}
      </span>
    {/if}

    {#if isReady}
      <span class="text-[11px] font-bold text-stone-300">
        {move.power > 0 ? 'Dégâts' : move.isHeal ? 'Soin' : 'Buff'}
      </span>
    {:else}
      <span class="h-1.5 w-full bg-gray-600 rounded-full overflow-hidden ml-1" style="max-width: 56px">
        <div
          class="h-full bg-yellow-400 transition-all duration-300"
          style={`width: ${progressPercent}%`}
        ></div>
      </span>
    {/if}
  </div>
</button>

<style>
  @keyframes ready-glow {
    0%, 100% { text-shadow: 0 0 2px rgba(74, 222, 128, 0.5); }
    50% { text-shadow: 0 0 10px rgba(74, 222, 128, 0.95); }
  }

  .ready-pulse {
    animation: ready-glow 1.2s ease-in-out infinite;
  }
</style>
