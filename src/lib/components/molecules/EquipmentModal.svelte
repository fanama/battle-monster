<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Monster } from "../../../core/entities/Monster";
  import type { Equipment } from "../../../core/entities/Equipment";
  import {
    EQUIPMENT_SLOTS,
    EQUIPMENT_SLOT_LABELS,
    type EquipmentSlot,
  } from "../../../core/entities/Equipment";

  export let isOpen: boolean;
  export let monster: Monster | null = null;
  /** Sacoche d'équipements non portés (une pièce ici est INACTIVE). */
  export let bag: Equipment[] = [];
  /** L'équipement se change **hors combat uniquement**. */
  export let canManage: boolean = true;

  const dispatch = createEventDispatcher<{
    equip: string;
    unequip: EquipmentSlot;
    close: void;
  }>();

  function describe(e: Equipment): string {
    const parts: string[] = [];
    const eff = e.effect;
    if (eff.stat) {
      for (const [key, value] of Object.entries(eff.stat)) {
        parts.push(`+${value} ${key}`);
      }
    }
    if (eff.acBonus) parts.push(`+${eff.acBonus} CA`);
    if (eff.damagePercent) parts.push(`+${eff.damagePercent}% dégâts`);
    if (eff.lifestealPercent) parts.push(`vol de vie ${eff.lifestealPercent}%`);
    if (eff.critRange) parts.push(`crit ${21 - eff.critRange}-20`);
    if (eff.healStartPercent) parts.push(`+${eff.healStartPercent}% PV début`);
    if (eff.experiencePercent) parts.push(`+${eff.experiencePercent}% EXP`);
    return parts.join(" · ");
  }

  $: equippedPiece = (slot: EquipmentSlot) =>
    monster?.equipped?.[slot] ?? null;

  /**
   * Filet d'affichage : une pièce = un exemplaire dans la sacoche. Les tirages
   * excluent désormais les doublons et la restauration dé-duplique, mais une
   * sauvegarde ancienne corrompue ne doit jamais faire crasher le `each` keyé.
   */
  function uniqueById(pieces: Equipment[]): Equipment[] {
    const seen = new Set<string>();
    return pieces.filter((p) => (seen.has(p.id) ? false : seen.add(p.id) && true));
  }

  $: bagList = uniqueById(bag);
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75" role="dialog" aria-modal="true">
    <div class="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-xl border-2 border-amber-600/70 bg-stone-950/95 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      <!-- EN-TÊTE -->
      <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-amber-700/40 bg-gradient-to-b from-amber-950 to-stone-950 px-3 py-2">
        <h2 class="font-serif text-sm font-black uppercase tracking-widest text-amber-200">
          🧰 Équipement
        </h2>
        <button
          type="button"
          on:click={() => dispatch("close")}
          class="rounded-md border border-stone-600 bg-stone-900 px-2 py-0.5 font-mono text-xs text-stone-300 hover:bg-stone-800 cursor-pointer"
        >✕</button>
      </div>

      <!-- BRIEFING « seuls les équipés sont actifs » -->
      <p class="border-b border-stone-800 bg-stone-900/60 px-3 py-1.5 font-mono text-[10px] leading-snug text-stone-400">
        Seuls les équipements <span class="text-amber-300 font-bold">portés</span> sont actifs —
        une pièce dans la sacoche ne fait rien. Portage possible <span class="text-amber-300 font-bold">hors combat</span> seulement.
      </p>

      <!-- LES 5 EMPLACEMENTS FAÇON DRAGON QUEST -->
      <div class="grid gap-1.5 px-3 py-2">
        {#each EQUIPMENT_SLOTS as slot (slot)}
          {@const piece = equippedPiece(slot)}
          <div class="flex items-center gap-2 rounded-lg border px-2 py-1.5
            {piece ? 'border-amber-500/60 bg-amber-950/30' : 'border-stone-700/70 bg-stone-900/40'}">
            <!-- Slot label -->
            <span class="w-28 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {EQUIPMENT_SLOT_LABELS[slot]}
            </span>
            <!-- Pièce portée (ACTIVE) -->
            {#if piece}
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span>{piece.icon}</span>
                  <span class="truncate text-xs font-bold text-amber-200">{piece.name}</span>
                  <span class="shrink-0 rounded border border-emerald-500/50 bg-emerald-950/50 px-1 font-mono text-[8px] font-black uppercase text-emerald-300">Actif</span>
                </div>
                <div class="truncate font-mono text-[10px] text-stone-400">{describe(piece)}</div>
              </div>
              <button
                type="button"
                disabled={!canManage}
                on:click={() => dispatch("unequip", slot)}
                class="shrink-0 rounded-md border border-rose-500/50 bg-rose-950/50 px-1.5 py-0.5 font-mono text-[10px] text-rose-200
                  transition-colors hover:bg-rose-900/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Retirer (retour à la sacoche)"
              >Retirer</button>
            {:else}
              <span class="flex-1 font-mono text-[10px] text-stone-600">(vide)</span>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Sacoche : pièces non portées, donc inertes -->
      <div class="border-t border-stone-800 px-3 py-2">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-serif text-[11px] font-black uppercase tracking-widest text-amber-300">🎒 Sacoche</span>
          <span class="font-mono text-[10px] text-stone-500">{bagList.length} pièce(s) — inactive(s)</span>
        </div>
        {#if bagList.length === 0}
          <p class="rounded-lg border border-stone-800 bg-stone-900/40 px-2 py-3 text-center font-mono text-[10px] text-stone-500">
            Aucune pièce de rechange — les drops de sauvages, le butin des boss
            et la boutique y déposent leurs pièces.
          </p>
        {:else}
          <div class="grid gap-1.5">
            {#each bagList as piece (piece.id)}
              <div class="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/40 px-2 py-1.5">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span>{piece.icon}</span>
                    <span class="truncate text-xs font-bold text-stone-200">{piece.name}</span>
                    <span class="shrink-0 rounded border border-stone-600 bg-stone-800 px-1 font-mono text-[8px] uppercase text-stone-400">
                      {EQUIPMENT_SLOT_LABELS[piece.slot]}
                    </span>
                  </div>
                  <div class="truncate font-mono text-[10px] text-stone-500">{describe(piece)}</div>
                </div>
                <button
                  type="button"
                  disabled={!canManage}
                  on:click={() => dispatch("equip", piece.id)}
                  class="shrink-0 rounded-md border border-emerald-500/60 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300
                    transition-colors hover:bg-emerald-900/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Équiper (remplace la pièce de l'emplacement)"
                >Porter</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- fiche du champion courte -->
      {#if monster}
        <div class="border-t border-stone-800 px-3 py-2">
          <p class="font-mono text-[10px] text-stone-500">
            Champion : <span class="text-stone-300">{monster.name}</span> · CA <span class="text-sky-300 font-bold">{monster.getAC()}</span>
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}
