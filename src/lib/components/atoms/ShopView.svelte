<script lang="ts">
  import { styles } from "../../styles/style";
  import type { ShopItem } from "../../../core/entities/Relic";
  import type { Monster } from "../../../core/entities/Monster";

  export let stock: ShopItem[] | null;
  export let gold: number;
  export let player: Monster | null = null;
  export let onBuy: (item: ShopItem) => void;
  export let onLeave: () => void;

  $: isFullHp = player ? player.currentHp >= player.maxHp : false;
</script>

<div
  class="flex flex-col flex-grow rounded-lg border-4 border-stone-600
    bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950
    p-3 md:p-5 mb-3 md:mb-4 shadow-xl overflow-x-clip"
>
  <div class="flex items-center justify-between gap-2 mb-3">
    <p class="font-serif font-bold tracking-widest text-amber-200 uppercase">
      🛒 Boutique d'aventurier
    </p>
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
        bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-300/60
        font-mono font-bold text-amber-200 text-sm"
    >
      💰 {gold}
    </span>
  </div>

  {#if !stock || stock.length === 0}
    <p class="text-stone-400 text-sm italic">Le rayon est vide…</p>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 flex-grow content-center">
      {#each stock as item}
        {@const isHealItem = item.kind === 'heal'}
        {@const isHealBlocked = isHealItem && isFullHp}
        {@const affordable = !item.bought && gold >= item.price && !isHealBlocked}
        <div
          class="flex flex-col rounded-lg border-2 p-2 md:p-3 text-center
            {item.bought
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200/70'
              : affordable
                ? 'border-amber-500/50 bg-amber-950/20'
                : 'border-stone-700 bg-stone-900/60 text-stone-400'}"
        >
          <span class="text-2xl md:text-3xl leading-none mb-1">{item.icon}</span>
          <span class="font-serif font-bold text-sm md:text-base tracking-wide">{item.label}</span>
          <span class="text-[10px] md:text-xs mt-0.5 opacity-80">{item.desc}</span>

          <div class="mt-auto pt-2">
            {#if item.bought}
              <span
                class="block py-1 rounded-md border border-emerald-400/40 bg-emerald-950/50
                  font-mono font-bold text-emerald-300 text-xs uppercase tracking-widest"
              >
                Acheté ✓
              </span>
            {:else}
              <button
                type="button"
                on:click={() => onBuy(item)}
                disabled={!affordable}
                class="w-full py-1 rounded-md border font-mono font-bold text-xs uppercase tracking-widest
                  transition-all active:scale-95
                  {affordable
                    ? 'border-amber-300 bg-amber-500 text-stone-900 hover:bg-amber-400'
                    : 'border-stone-600 bg-stone-950/60 text-stone-400 cursor-not-allowed'}"
              >
                {isHealBlocked
                  ? "PV pleins"
                  : affordable
                    ? `Acheter · ${item.price}💰`
                    : gold < item.price
                      ? `${item.price}💰`
                      : "Épuisé"}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <button
    type="button"
    on:click={onLeave}
    class="{styles.buttons.base} {styles.buttons.primary} !self-center mt-3"
  >
    Poursuivre →
  </button>
</div>