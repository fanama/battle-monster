<script lang="ts">
  import type { Move, MonsterType } from "../../../core/entities/Move";
  import { TYPE_LABELS, moveAccuracyBonus } from "../../../core/entities/Move";
  import { typeEffectiveness } from "../../../core/services/effectiveness";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  export let move: Move;
  export let targetType: MonsterType | null = null;
  export let onClick: () => void = () => {};

  $: currentCooldown = move.coolDown ?? 0;
  $: isReady = currentCooldown === 0;

  $: progressPercent = isReady
    ? 100
    : ((move.maxCoolDown! - currentCooldown) / move.maxCoolDown!) * 100;

  $: tc = TYPE_COLORS[move.type];

  // Nature de l'action (colorée et explicite)
  $: nature = move.power > 0
    ? (move.isPhysical ? 'physique' : 'magie')
    : move.isHeal ? 'soin' : 'buff';

  $: natureChip = {
    physique: 'text-amber-200 border-amber-500/50 bg-amber-950/50',
    magie: 'text-violet-200 border-violet-500/50 bg-violet-950/50',
    soin: 'text-emerald-200 border-emerald-500/50 bg-emerald-950/50',
    buff: 'text-orange-200 border-orange-500/50 bg-orange-950/50',
  }[nature];

  $: natureLabel = {
    physique: '⚔ Physique',
    magie: '✨ Magie',
    soin: '💚 Soin',
    buff: '⬆ Buff',
  }[nature];

  // Indicateur « super efficace / peu efficace » contre la cible
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
    relative flex flex-col gap-1.5
    min-w-[120px] md:min-w-[170px] w-fit
    p-2 rounded-xl border-2 shadow-lg text-center overflow-hidden
    transition-all duration-300
    ${
      isReady
        ? `${tc.cardBg} ${tc.borderStrong} text-white cursor-pointer hover:-translate-y-0.5 active:scale-95 ${tc.glow}`
        : "border-gray-700 bg-gray-800/70 text-gray-400 cursor-default opacity-50"
    }
  `}
>
  <!-- Filet coloré par type en haut de carte -->
  <span class="absolute top-0 inset-x-0 h-0.5 {tc.gradient}"></span>

  <div class="flex items-center justify-between gap-1 md:gap-2 min-w-0">
    <span class="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
      <span class="w-2 h-2 rounded-full {tc.dot} inline-block shrink-0 shadow"></span>
      <span class="font-extrabold text-sm md:text-base truncate">
        {move.name}
      </span>
    </span>

    {#if isReady}
      <span
        class="text-green-400 font-semibold flex items-center text-xs md:text-sm ready-pulse shrink-0"
      >
        ⚡ PRÊT
      </span>
    {:else}
      <span class="text-[10px] md:text-xs italic shrink-0">
        ⏳ {currentCooldown} tours
      </span>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
    <span
      class="text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-bold {tc.badge}"
    >
      {TYPE_ICONS[move.type]} {TYPE_LABELS[move.type]}
    </span>

    {#if isReady}
      <span
        class="text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-bold {natureChip}"
      >
        {natureLabel}
      </span>

      {#if move.power > 0}
        <span
          class="text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-bold border-sky-500/40 bg-sky-950/40 text-sky-200"
          title="Bonus de toucher (inversé à la puissance : les attaques faibles touchent plus souvent)"
        >
          🎯 +{moveAccuracyBonus(move)}
        </span>
      {/if}

      {#if targetType && move.power > 0}
        <span
          class={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 font-bold ${effectivenessBadge}`}
        >
          {effectiveness > 1 ? '⚔ Super eff.' : effectiveness < 1 ? '🛡 Peu eff.' : ''}
        </span>
      {/if}
    {:else}
      <span class="h-2 w-full bg-gray-600/70 rounded-full overflow-hidden ml-1" style="max-width: 64px">
        <div
          class="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-300"
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