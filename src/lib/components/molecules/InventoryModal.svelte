<script lang="ts">
  import { dq } from "../../styles/style";
  import { createEventDispatcher } from "svelte";
  import type { InventorySlot } from "../../../core/entities/Consumable";
  import type { Monster } from "../../../core/entities/Monster";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";

  export let inventory: InventorySlot[] = [];
  export let player: Monster | null = null;
  /** Un combat est en cours : utiliser un objet y **consomme l'action du tour**. */
  export let inBattle: boolean = false;
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
  class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050a14]/85 backdrop-blur-[2px]"
  on:click|self={handleClose}
  on:keydown={(e) => e.key === 'Escape' && handleClose()}
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  aria-label="Sacoche d'aventurier">
  <div
    class={`flex flex-col w-full max-w-xl max-h-[90dvh] pop-in overflow-hidden ${dq.window}`}>
    <!-- En-tête -->
    <div class="flex items-center justify-between gap-2 p-3.5 sm:p-4 border-b border-sky-100/15 bg-sky-100/[0.06]">
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-2xl sm:text-3xl shrink-0 p-1.5 rounded-lg border border-sky-100/25 bg-[#16233a]">🎒</span>
        <div class="min-w-0">
          <h2 class="font-display font-extrabold text-base sm:text-lg text-amber-100 uppercase tracking-widest truncate">
            Sacoche d'Aventurier
          </h2>
          <p class="text-xs text-sky-200/60 truncate">
            Soins, élixirs et contre-statut
          </p>
        </div>
      </div>

      <button
        type="button"
        on:click={handleClose}
        class="w-8 h-8 shrink-0 rounded-md border border-sky-100/25 bg-[#16233a] text-sky-100/70 hover:text-white hover:border-sky-100/50 transition-colors flex items-center justify-center cursor-pointer font-bold"
        aria-label="Fermer la sacoche">
        ✕
      </button>
    </div>

    <!-- État actuel du monstre (PV & Statuts) -->
    {#if player}
      <div class="px-4 py-2.5 bg-[#070d18]/70 border-b border-sky-100/15 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-3">
          <span class="font-display font-bold text-sky-50">{player.name}</span>
          <span class="font-mono text-sky-200/65">
            PV: <strong class="{player.currentHp <= player.maxHp * 0.3 ? 'text-rose-400' : 'text-emerald-400'}">{player.currentHp}</strong> / {player.maxHp}
          </span>
          <span class="font-mono text-sky-200/65">
            CA: <strong class="text-amber-100">{player.getAC()}</strong>
          </span>
        </div>

        <!-- Statuts actifs -->
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-sky-200/50 uppercase tracking-wider font-mono">Statuts :</span>
          {#if player.statuses.length === 0}
            <span class="text-emerald-400/90 text-xs font-display italic">Aucun (En forme)</span>
          {:else}
            {#each player.statuses as status}
              {@const cfg = STATUS_CONFIGS[status.type]}
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs font-mono font-bold animate-pulse"
                title="{cfg.description} (Sauvegarde {cfg.saveLabel})">
                <span>{cfg.icon}</span>
                <span>{cfg.name}</span>
              </span>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <!-- Liste des objets -->
    <div class="flex-grow overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[58dvh]">
      {#if inventory.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center text-sky-200/65">
          <span class="text-4xl mb-2 opacity-60">🎒</span>
          <p class="font-display text-sm">Votre sacoche est vide.</p>
          <p class="text-xs text-sky-200/60 mt-1 max-w-xs">
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
                : 'border-sky-100/15 bg-[#0d1526]/60 hover:border-sky-100/20'}">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 shrink-0 rounded-xl bg-black/50 border border-sky-100/20 flex items-center justify-center text-2xl shadow-inner">
                {slot.item.icon}
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-display font-bold text-sm text-sky-50 truncate">
                    {slot.item.name}
                  </h4>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-500/40 bg-[#1b1a10]/60 text-amber-100">
                    x{slot.quantity}
                  </span>
                  {#if curesCurrentStatus}
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-400 bg-emerald-900/60 text-emerald-100 animate-pulse">
                      Purge active !
                    </span>
                  {/if}
                </div>
                <p class="text-xs text-sky-100/80/80 mt-0.5 line-clamp-2">
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
                    ? 'border-sky-100/15 bg-[#0d1526] text-sky-200/40 cursor-not-allowed'
                    : curesCurrentStatus
                      ? 'border-emerald-200/35 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20 cursor-pointer shadow-md'
                      : 'border-amber-200/50 bg-[#1b2440] text-amber-100 hover:brightness-110 cursor-pointer shadow-sm'}">
                Utiliser
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Bas de page -->
    <div class="p-3 bg-[#0d1526] border-t border-sky-100/15 flex justify-between items-center text-xs text-sky-200/65">
      <span class="italic">
        {#if !isPlayerTurn}
          ⏳ En attente de votre tour pour utiliser un objet
        {:else if inBattle}
          ⚔️ Agir avec un objet passe votre tour (façon どうぐ) — l'ennemi riposte ensuite
        {:else}
          ✨ Hors combat, l'objet s'applique immédiatement
        {/if}
      </span>

      <button
        type="button"
        on:click={handleClose}
        class="px-4 py-1.5 rounded-lg border border-sky-100/20 bg-[#16233a] text-sky-50 hover:bg-[#1d2d49] font-display text-xs transition-colors cursor-pointer">
        Fermer
      </button>
    </div>
  </div>
</div>
