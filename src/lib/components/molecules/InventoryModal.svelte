<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { InventorySlot } from "../../../core/entities/Consumable";
  import type { Monster } from "../../../core/entities/Monster";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { styles } from "../../styles/style";

  export let inventory: InventorySlot[] = [];
  export let player: Monster | null = null;
  export let isPlayerTurn: boolean = true;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    use: { itemId: string };
    close: void;
  }>();

  function handleUse(slot: InventorySlot) {
    if (disabled || !isPlayerTurn) return;
    dispatch("use", { itemId: slot.item.id });
  }

  function handleClose() {
    dispatch("close");
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
  on:click|self={handleClose}
  on:keydown={(e) => e.key === 'Escape' && handleClose()}
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  aria-label="Sacoche d'aventurier"
>
  <div
    class="flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border-2 sm:border-4 border-stone-600
      bg-gradient-to-b from-stone-900 via-stone-925 to-stone-950 shadow-2xl overflow-hidden"
  >
    <!-- En-tête -->
    <div class="flex items-center justify-between p-3.5 sm:p-4 border-b border-stone-700/80 bg-stone-900/90">
      <div class="flex items-center gap-2.5">
        <span class="text-2xl sm:text-3xl p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">🎒</span>
        <div>
          <h2 class="font-serif font-bold text-base sm:text-lg text-amber-200 uppercase tracking-widest">
            Sacoche d'Aventurier
          </h2>
          <p class="text-xs text-stone-400">
            Potions anti-statut, soins rapides et élixirs de combat
          </p>
        </div>
      </div>

      <button
        type="button"
        on:click={handleClose}
        class="w-8 h-8 rounded-lg border border-stone-700 bg-stone-800 text-stone-400 hover:text-stone-100 hover:border-stone-500 transition-colors flex items-center justify-center cursor-pointer font-bold"
        aria-label="Fermer la sacoche"
      >
        ✕
      </button>
    </div>

    <!-- État actuel du monstre (PV & Statuts) -->
    {#if player}
      <div class="px-4 py-2.5 bg-stone-950/70 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-3">
          <span class="font-serif font-bold text-stone-200">{player.name}</span>
          <span class="font-mono text-stone-400">
            PV: <strong class="{player.currentHp <= player.maxHp * 0.3 ? 'text-rose-400' : 'text-emerald-400'}">{player.currentHp}</strong> / {player.maxHp}
          </span>
          <span class="font-mono text-stone-400">
            CA: <strong class="text-amber-300">{player.getAC()}</strong>
          </span>
        </div>

        <!-- Statuts actifs -->
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-stone-500 uppercase tracking-wider font-mono">Statuts :</span>
          {#if player.statuses.length === 0}
            <span class="text-emerald-400/90 text-xs font-serif italic">Aucun (En forme)</span>
          {:else}
            {#each player.statuses as status}
              {@const cfg = STATUS_CONFIGS[status.type]}
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs font-mono font-bold animate-pulse"
                title="{cfg.description} (Sauvegarde {cfg.saveLabel})"
              >
                <span>{cfg.icon}</span>
                <span>{cfg.name}</span>
              </span>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <!-- Liste des objets -->
    <div class="flex-grow overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[55vh]">
      {#if inventory.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center text-stone-400">
          <span class="text-4xl mb-2 opacity-60">🎒</span>
          <p class="font-serif text-sm">Votre sacoche est vide.</p>
          <p class="text-xs text-stone-500 mt-1 max-w-xs">
            Visitez la boutique d'aventurier lors de votre périple pour acheter des potions anti-statut et des élixirs.
          </p>
        </div>
      {:else}
        {#each inventory as slot}
          {@const isAntiStatus = Boolean(slot.item.cureStatus)}
          {@const curesCurrentStatus = isAntiStatus && player && (slot.item.cureStatus === 'all' ? player.statuses.length > 0 : player.hasStatus(slot.item.cureStatus!))}
          <div
            class="flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all
              {curesCurrentStatus
                ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'}"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 shrink-0 rounded-xl bg-black/50 border border-stone-700 flex items-center justify-center text-2xl shadow-inner">
                {slot.item.icon}
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-serif font-bold text-sm text-stone-100 truncate">
                    {slot.item.name}
                  </h4>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border border-amber-500/40 bg-amber-950/40 text-amber-300">
                    x{slot.quantity}
                  </span>
                  {#if curesCurrentStatus}
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border border-emerald-400 bg-emerald-900/60 text-emerald-200 animate-pulse">
                      Purge active !
                    </span>
                  {/if}
                </div>
                <p class="text-xs text-stone-300/80 mt-0.5 line-clamp-2">
                  {slot.item.description}
                </p>
              </div>
            </div>

            <div class="shrink-0">
              <button
                type="button"
                on:click={() => handleUse(slot)}
                disabled={disabled || !isPlayerTurn}
                class="px-3.5 py-1.5 rounded-lg border font-mono font-bold text-xs uppercase tracking-wider transition-all
                  {disabled || !isPlayerTurn
                    ? 'border-stone-800 bg-stone-950 text-stone-600 cursor-not-allowed'
                    : curesCurrentStatus
                      ? 'border-emerald-400 bg-emerald-600 text-stone-950 hover:bg-emerald-500 cursor-pointer shadow-md'
                      : 'border-amber-400/80 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:brightness-110 cursor-pointer shadow-sm'}"
              >
                Utiliser
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Bas de page -->
    <div class="p-3 bg-stone-900 border-t border-stone-800 flex justify-between items-center text-xs text-stone-400">
      <span class="italic">
        {#if !isPlayerTurn}
          ⏳ En attente de votre tour pour utiliser un objet
        {:else}
          ✨ L'utilisation d'une potion est instantanée
        {/if}
      </span>

      <button
        type="button"
        on:click={handleClose}
        class="px-4 py-1.5 rounded-lg border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700 font-serif text-xs transition-colors cursor-pointer"
      >
        Fermer
      </button>
    </div>
  </div>
</div>
