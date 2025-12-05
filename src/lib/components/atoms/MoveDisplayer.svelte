<script lang="ts">
  import type { Move } from "../../../core/entities/Move";
  export let move: Move;
  export let onClick: () => void = () => {}; // Ensure coolDown is treated as 0 if undefined

  $: currentCooldown = move.coolDown ?? 0;
  $: isReady = currentCooldown === 0; // Calculate the percentage of recovery completed: (max - current) / max * 100
  // Note: We use the non-null assertion operator '!' on maxCoolDown because if a move
  // has a coolDown, it implicitly must have a maxCoolDown.

  $: progressPercent = isReady
    ? 100
    : ((move.maxCoolDown! - currentCooldown) / move.maxCoolDown!) * 100;
</script>

<button
  disabled={!isReady}
  on:click={onClick}
  class={`
    p-2 rounded-lg border-2 w-fit transition-all duration-300 shadow-xl **text-center**
    ${
    isReady
      ? // Ready state classes: Green border, subtle background, interactive hover
        "border-green-500 bg-green-900/40 text-white cursor-pointer hover:bg-green-800/60 opacity-100"
      : // Cooldown state classes: Muted border, low opacity, disabled visual
        "border-gray-700 bg-gray-800/70 text-gray-400 cursor-default opacity-50"
  }
  `}
>
  <div class="flex items-center justify-between mb-1">
    <span class="font-extrabold text-base">
      {move.name}
    </span>

    {#if isReady}
      <span class="text-green-400 font-semibold flex items-center text-sm">
        ⚡ PRÊT
      </span>
    {:else}
      <span class="text-xs italic">
        ⏳ {currentCooldown} tours restants
      </span>
    {/if}
  </div>

  {#if !isReady}
    <div class="h-1.5 bg-gray-600 rounded-full overflow-hidden">
      <div
        class="h-full bg-yellow-400 transition-all duration-300"
        style={`width: ${progressPercent}%`}
      />
    </div>
  {/if}
</button>
