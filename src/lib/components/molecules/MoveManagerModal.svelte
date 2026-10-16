<script lang="ts">
  import { dq } from "../../styles/style";
  import type { Move } from "../../../core/entities/Move";
  import type { Monster } from "../../../core/entities/Monster";
  import { TYPE_LABELS, STAT_LABELS, moveAccuracyBonus } from "../../../core/entities/Move";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { MAX_MOVES } from "../../../core/entities/Monster";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  export let isOpen = false;
  export let isLevelUp = false;
  export let monster: Monster | null = null;
  export let availableMoves: Move[] = [];
  export let onSave: (selectedMoves: Move[]) => void;
  export let onClose: () => void;

  let selectedMoves: Move[] = [];

  $: if (isOpen && monster) {
    selectedMoves = [...monster.moves];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && isOpen) {
      onClose();
    }
  }

  function isEquipped(moveId: string): boolean {
    return selectedMoves.some(m => m.id === moveId);
  }

  function toggleEquip(move: Move) {
    if (isEquipped(move.id)) {
      if (selectedMoves.length <= 1) return; // Garder au moins 1 attaque
      selectedMoves = selectedMoves.filter(m => m.id !== move.id);
    } else {
      if (selectedMoves.length < MAX_MOVES) {
        selectedMoves = [...selectedMoves, { ...move, coolDown: 0 }];
      } else {
        // Déjà 4 attaques : on remplace la dernière
        selectedMoves = [...selectedMoves.slice(0, MAX_MOVES - 1), { ...move, coolDown: 0 }];
      }
    }
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...selectedMoves];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    selectedMoves = next;
  }

  function moveDown(index: number) {
    if (index >= selectedMoves.length - 1) return;
    const next = [...selectedMoves];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    selectedMoves = next;
  }

  function handleConfirm() {
    if (selectedMoves.length >= 1 && selectedMoves.length <= MAX_MOVES) {
      onSave(selectedMoves);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && monster}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
    <!-- Backdrop button -->
    <button
      type="button"
      class="fixed inset-0 w-full h-full bg-[#050a14]/85 backdrop-blur-[2px] cursor-default transition-opacity"
      on:click={onClose}
      aria-label="Fermer le menu des attaques"></button>

    <!-- Modal Dialog -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="moves-modal-title"
      class={`relative z-10 w-full max-w-4xl max-h-[90dvh] flex flex-col pop-in overflow-hidden ${dq.window} text-sky-100/90`}>
      <!-- Modal Header -->
      <div class="px-4 sm:px-5 py-4 border-b border-sky-100/15 flex items-center justify-between gap-2 bg-sky-100/[0.06]">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 shrink-0 rounded-lg border border-sky-100/25 bg-[#16233a] flex items-center justify-center text-xl">
            {isLevelUp ? '🎉' : '📜'}
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2
                id="moves-modal-title"
                class="font-display font-extrabold text-base sm:text-lg md:text-xl uppercase tracking-wider text-amber-100">
                {isLevelUp ? 'Montée de Niveau !' : 'Grimoire des Capacités'}
              </h2>
              <span class={`shrink-0 ${dq.badge}`}>
                {monster.name} · Niv. {monster.level}
              </span>
            </div>
            <p class="text-[11px] sm:text-xs font-mono text-sky-200/60 mt-0.5">
              {isLevelUp
                ? 'Choisissez les attaques à équiper parmi votre arsenal débloqué (1 à 4).'
                : 'Configurez et ordonnez votre set de combat actif.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          on:click={onClose}
          class="w-8 h-8 shrink-0 rounded-md border border-sky-100/25 bg-[#16233a] hover:bg-[#1d2d49] text-sky-100/70 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          aria-label="Fermer">
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
        <!-- Section 1 : Attaques Actives / Équipées (Slots 1 à 4) -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="font-display font-bold text-sm md:text-base text-amber-100 uppercase tracking-wider flex items-center gap-2">
              <span>⚔️</span>
              <span>Attaques Équipées ({selectedMoves.length}/{MAX_MOVES})</span>
            </h3>
            <span class="text-[11px] font-mono text-sky-200/65">
              {selectedMoves.length === 1 ? '1 capacité minimale requise' : 'Cliquez pour réordonner ou retirer'}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {#each Array(MAX_MOVES) as _, idx}
              {@const equippedMove = selectedMoves[idx]}
              {#if equippedMove}
                {@const tc = TYPE_COLORS[equippedMove.type] ?? TYPE_COLORS.normal}
                {@const isPhys = equippedMove.isPhysical}
                {@const isHeal = equippedMove.isHeal}
                {@const isBuff = Boolean(equippedMove.statBoosts)}
                <div
                  class="relative flex flex-col justify-between p-3 rounded-lg border {tc.borderStrong} bg-[#070d18]/70 transition-colors">
                  <!-- Filet haut -->
                  <span class="absolute top-0 inset-x-0 h-1 {tc.gradient} rounded-t-xl"></span>

                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-1">
                      <span class="text-[10px] font-mono font-bold text-amber-100 bg-black/40 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full border {tc.badge}">
                        {TYPE_ICONS[equippedMove.type]} {TYPE_LABELS[equippedMove.type]}
                      </span>
                    </div>

                    <h4 class="font-display font-bold text-sm text-sky-50 truncate mt-1">
                      {equippedMove.name}
                    </h4>

                    <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      {#if equippedMove.power > 0}
                        <span class="px-1.5 py-0.5 rounded bg-black/40 text-amber-100 font-bold">
                          ⚡ P.{equippedMove.power}
                        </span>
                        <span class="px-1.5 py-0.5 rounded bg-black/40 {isPhys ? 'text-rose-200' : 'text-sky-200'}">
                          {isPhys ? '⚔ Physique' : '✨ Magie'}
                        </span>
                      {:else if isHeal}
                        <span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                          💚 Soin{equippedMove.healPower ? ` +${equippedMove.healPower} PV` : ''}
                        </span>
                      {:else if isBuff}
                        <span class="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 font-bold">
                          ⬆ +{equippedMove.statBoosts?.value} {STAT_LABELS[equippedMove.statBoosts!.stat]}
                        </span>
                      {/if}

                      {#if equippedMove.maxCoolDown && equippedMove.maxCoolDown > 0}
                        <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300">
                          ⏳ {equippedMove.maxCoolDown} tr
                        </span>
                      {/if}

                      {#if equippedMove.statusEffect}
                        {@const st = STATUS_CONFIGS[equippedMove.statusEffect.type]}
                        <span class="px-1.5 py-0.5 rounded {st.badgeClass} font-bold">
                          {st.icon} {st.name} {equippedMove.statusEffect.chance}%
                        </span>
                      {/if}
                    </div>
                  </div>

                  <!-- Boutons d'ordre & retrait -->
                  <div class="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-sky-100/15">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        on:click={() => moveUp(idx)}
                        class="px-1.5 py-0.5 rounded border border-sky-100/20 bg-[#16233a] hover:bg-[#1d2d49] text-sky-100/80 disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                        title="Monter">
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedMoves.length - 1}
                        on:click={() => moveDown(idx)}
                        class="px-1.5 py-0.5 rounded border border-sky-100/20 bg-[#16233a] hover:bg-[#1d2d49] text-sky-100/80 disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                        title="Descendre">
                        →
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={selectedMoves.length <= 1}
                      on:click={() => toggleEquip(equippedMove)}
                      class="px-2 py-0.5 rounded border border-rose-600/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-bold disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer">
                      Retirer
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Slot Vide -->
                <div class="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-sky-100/15 bg-[#0d1526]/30 text-sky-200/40 min-h-[140px]">
                  <span class="text-xs font-mono font-bold">Emplacement #{idx + 1}</span>
                  <span class="text-[11px] mt-1 text-sky-200/50 italic">Vide</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Section 2 : Toutes les Capacités Débloquées -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="font-display font-bold text-sm md:text-base text-sky-100 uppercase tracking-wider flex items-center gap-2">
              <span>📜</span>
              <span>Grimoire des Capacités Disponibles ({availableMoves.length})</span>
            </h3>
            <span class="text-[11px] font-mono text-sky-200/65">
              Débloquées au fil de vos montées de niveau
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each availableMoves as move}
              {@const equipped = isEquipped(move.id)}
              {@const tc = TYPE_COLORS[move.type] ?? TYPE_COLORS.normal}
              {@const isPhys = move.isPhysical}
              {@const isHeal = move.isHeal}
              {@const isBuff = Boolean(move.statBoosts)}
              {@const accBonus = moveAccuracyBonus(move)}
              <div
                class="flex flex-col justify-between p-3.5 rounded-xl border transition-all {equipped ? 'border-amber-500/70 bg-[#0d1526]/93 shadow-md' : 'border-sky-100/15 bg-[#070d18]/40 hover:border-sky-100/20'}">
                <div>
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border {tc.badge}">
                      {TYPE_ICONS[move.type]} {TYPE_LABELS[move.type]}
                    </span>
                    <span class="text-[10px] font-mono text-sky-200/65">
                      Niv. {move.level}
                    </span>
                  </div>

                  <h4 class="font-display font-bold text-base text-sky-50 mt-2">
                    {move.name}
                  </h4>

                  <div class="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-mono">
                    {#if move.power > 0}
                      <span class="px-1.5 py-0.5 rounded bg-black/40 text-amber-100 font-bold">
                        ⚡ P.{move.power}
                      </span>
                      <span class="px-1.5 py-0.5 rounded bg-black/40 {isPhys ? 'text-rose-200' : 'text-sky-200'}">
                        {isPhys ? '⚔ Physique' : '✨ Magie'}
                      </span>
                      {#if accBonus > 0}
                        <span class="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300">
                          🎯 +{accBonus}
                        </span>
                      {/if}{:else if isHeal}
                        <span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                          💚 Soin{move.healPower ? ` +${move.healPower} PV` : ''}
                        </span>
                      {:else if isBuff}
                        <span class="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 font-bold">
                          ⬆ +{move.statBoosts?.value} {STAT_LABELS[move.statBoosts!.stat]}
                        </span>
                      {/if}

                    {#if move.maxCoolDown && move.maxCoolDown > 0}
                      <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300">
                        ⏳ Recharge {move.maxCoolDown} tours
                      </span>
                    {/if}

                    {#if move.statusEffect}
                      {@const st = STATUS_CONFIGS[move.statusEffect.type]}
                      <span class="px-1.5 py-0.5 rounded {st.badgeClass} font-bold">
                        {st.icon} {st.name} {move.statusEffect.chance}%
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="mt-3.5 pt-2.5 border-t border-sky-100/15 flex items-center justify-between">
                  {#if equipped}
                    <span class="text-xs font-display font-bold text-amber-100 flex items-center gap-1">
                      <span>✓</span>
                      <span>Équipée</span>
                    </span>
                    <button
                      type="button"
                      disabled={selectedMoves.length <= 1}
                      on:click={() => toggleEquip(move)}
                      class="px-2.5 py-1 rounded-lg border border-sky-100/20 bg-[#16233a] hover:bg-rose-950 hover:border-rose-600/50 hover:text-rose-300 text-sky-100/80 text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
                      Retirer
                    </button>
                  {:else}
                    <span class="text-xs font-mono text-sky-200/50">Disponible</span>
                    <button
                      type="button"
                      on:click={() => toggleEquip(move)}
                      class="px-3 py-1 rounded-lg font-display font-bold text-xs uppercase tracking-wider
                        border border-sky-100/25 bg-[#16233a] hover:bg-[#1d2d49] text-sky-50 transition-all cursor-pointer shadow-sm">
                      + Équiper
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3.5 border-t border-sky-100/15 flex items-center justify-between bg-[#0d1526]/93">
        <div class="text-xs font-mono text-sky-200/65">
          {selectedMoves.length} / {MAX_MOVES} attaques sélectionnées
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            on:click={onClose}
            class="px-4 py-2 rounded-xl font-display text-xs uppercase tracking-wider text-sky-200/65 hover:text-sky-50 transition-colors cursor-pointer">
            Fermer
          </button>

          <button
            type="button"
            disabled={selectedMoves.length === 0}
            on:click={handleConfirm}
            class="px-5 py-2 rounded-xl font-display font-bold text-xs uppercase tracking-wider
              bg-[#1b2440] text-amber-100 border border-amber-300
              hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(251,191,36,0.3)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
            💾 Valider mes Attaques
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
