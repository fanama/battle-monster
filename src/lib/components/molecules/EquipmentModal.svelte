<script lang="ts">
  import { dq } from "../../styles/style";
  import { createEventDispatcher } from "svelte";
  import type { Monster, MonsterDelta } from "../../../core/entities/Monster";
  import type { Equipment } from "../../../core/entities/Equipment";
  import {
    EQUIPMENT_SLOTS,
    EQUIPMENT_SLOT_LABELS,
    type EquipmentSlot,
  } from "../../../core/entities/Equipment";
  import { RELIC_SLOT_COUNT, type Relic } from "../../../core/entities/Relic";
  import { relicEffectLines } from "../../styles/relicEffects";
  import { STAT_LABELS, type MonsterStat } from "../../../core/entities/Move";

  export let isOpen: boolean;
  export let monster: Monster | null = null;
  /** Sacoche d'équipements non portés (une pièce ici est INACTIVE). */
  export let bag: Equipment[] = [];
  /**
   * Pièces **portées**, passées en propriété (copie) plutôt que lues sur
   * `monster` : Svelte ne suit pas les mutations en place du monstre, une
   * valeur fraîche à chaque mise à jour du store garantit le rafraîchissement.
   */
  export let equipped: Partial<Record<EquipmentSlot, Equipment>> = {};
  /** Réserve de reliques du run : possédées, mais inertes tant que non portées. */
  export let relics: Relic[] = [];
  /** Reliques **portées** (max `RELIC_SLOT_COUNT`). */
  export let wornRelics: Relic[] = [];
  /** L'équipement et les reliques se changent **hors combat uniquement**. */
  export let canManage: boolean = true;

  const dispatch = createEventDispatcher<{
    equip: string;
    unequip: EquipmentSlot;
    wearRelic: string;
    takeoffRelic: string;
    optimize: void;
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

  // --- Aperçu « avant / après » (convention DQ) -------------------------

  const STAT_ORDER: MonsterStat[] = [
    "strength",
    "speed",
    "constitution",
    "charisma",
    "wisdom",
    "instinct",
  ];

  interface DeltaChip {
    label: string;
    value: string;
    positive: boolean;
  }

  /** Traduit un `MonsterDelta` (écarts signés) en pastilles lisibles. */
  function deltaChips(delta: MonsterDelta | null | undefined): DeltaChip[] {
    if (!delta) return [];
    const chips: DeltaChip[] = [];
    for (const stat of STAT_ORDER) {
      const value = delta.stat[stat] ?? 0;
      if (value === 0) continue;
      chips.push({
        label: STAT_LABELS[stat],
        value: `${value > 0 ? "+" : ""}${value}`,
        positive: value > 0,
      });
    }
    if (delta.ac !== 0) {
      chips.push({ label: "CA", value: `${delta.ac > 0 ? "+" : ""}${delta.ac}`, positive: delta.ac > 0 });
    }
    if (delta.maxHp !== 0) {
      chips.push({ label: "PV max", value: `${delta.maxHp > 0 ? "+" : ""}${delta.maxHp}`, positive: delta.maxHp > 0 });
    }
    return chips;
  }

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
  $: uniqueRelics = (() => {
    const seen = new Set<string>();
    return relics.filter((r) => (seen.has(r.id) ? false : seen.add(r.id) && true));
  })();
  $: wornIds = new Set(wornRelics.map((relic) => relic.id));
  $: relicReserve = uniqueRelics.filter((relic) => !wornIds.has(relic.id));
  $: relicSlotsFull = wornRelics.length >= RELIC_SLOT_COUNT;
  $: shieldBlocked = equipped.weapon?.twoHanded === true;
  $: weaponPiece = equipped.weapon ?? null;

  /**
   * Aperçu par pièce de sacoche : « ce que ça donnerait si je la portais »,
   * recalculé dès que la sacoche ou le monstre change (nouveaux tableaux
   * fournis par le parent → réactivité garantie).
   */
  $: equipPreviews = new Map(
    bagList.map((piece) => [piece.id, monster ? monster.previewEquip(piece) : null]),
  );
  /** Aperçu par relique : zéro partout si les emplacements sont pleins. */
  $: relicPreviews = new Map(
    relicReserve.map((relic) => [relic.id, monster ? monster.previewRelic(relic) : null]),
  );
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#050a14]/85" role="dialog" aria-modal="true">
    <div class={`w-full max-w-md max-h-[88dvh] overflow-y-auto ${dq.window}`}>
      <!-- EN-TÊTE -->
      <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-sky-100/15 bg-[#0d1526] px-3 py-2">
        <h2 class="font-display text-sm font-extrabold uppercase tracking-widest text-amber-100">
          🧰 Équipement & Reliques
        </h2>
        <button
          type="button"
          on:click={() => dispatch("close")}
          class="rounded-md border border-sky-100/25 bg-[#16233a] px-2 py-0.5 font-mono text-xs text-sky-100/70 hover:bg-[#1d2d49] cursor-pointer"
        >✕</button>
      </div>

      <!-- BRIEFING « seuls les portés sont actifs » -->
      <p class="border-b border-sky-100/15 bg-[#070d18]/70 px-3 py-1.5 font-mono text-[10px] leading-snug text-sky-100/70">
        Seuls les équipements <span class="text-amber-100 font-bold">portés</span> sont actifs —
        une pièce dans la sacoche ne fait rien. Les reliques suivent la même règle :
        la réserve n'agit pas, il faut les <span class="text-amber-100 font-bold">porter</span>
        ({wornRelics.length}/{RELIC_SLOT_COUNT} emplacements). Changement
        <span class="text-amber-100 font-bold">hors combat</span> seulement.
      </p>

      <!-- MEILLEUR ÉQUIPEMENT (最強装備 de RPG Maker) -->
      <div class="border-b border-sky-100/15 px-3 py-2">
        <button
          type="button"
          disabled={!canManage}
          on:click={() => dispatch("optimize")}
          class="w-full rounded-md border border-amber-200/50 bg-[#1b1a10]/70 px-2 py-1.5 font-display text-[11px] font-extrabold uppercase tracking-widest text-amber-100
            transition-colors hover:bg-[#252211] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Porte automatiquement la meilleure pièce possédée par emplacement et les meilleures reliques de la réserve"
        >
          ⚙️ Meilleur équipement
        </button>
      </div>

      <!-- LES 5 EMPLACEMENTS FAÇON DRAGON QUEST -->
      <div class="grid gap-1.5 px-3 py-2">
        {#each EQUIPMENT_SLOTS as slot (slot)}
          {@const piece = equipped[slot] ?? null}
          {@const locked = slot === 'shield' && shieldBlocked}
          <div class="flex items-center gap-2 rounded-lg border px-2 py-1.5
            {locked
              ? 'border-rose-500/40 bg-rose-950/20'
              : piece
                ? 'border-amber-200/40 bg-[#1b1a10]/40'
                : 'border-sky-100/15 bg-[#070d18]/40'}">
            <!-- Slot label -->
            <span class="w-28 shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-200/65">
              {EQUIPMENT_SLOT_LABELS[slot]}
            </span>
            <!-- Pièce portée (ACTIVE) -->
            {#if piece}
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span>{piece.icon}</span>
                  <span class="truncate text-xs font-bold text-amber-100">{piece.name}</span>
                  {#if piece.twoHanded}
                    <span class="shrink-0 rounded border border-violet-300/40 bg-violet-500/10 px-1 font-mono text-[8px] font-black uppercase text-violet-200"
                      title="Arme à deux mains : le bouclier est interdit tant qu'elle est tenue">Deux mains</span>
                  {/if}
                  <span class="shrink-0 rounded border border-emerald-200/35 bg-emerald-400/10 px-1 font-mono text-[8px] font-black uppercase text-emerald-300">Actif</span>
                </div>
                <div class="truncate font-mono text-[10px] text-sky-200/65">{describe(piece)}</div>
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
              <span class="flex-1 font-mono text-[10px] text-sky-200/40">
                {locked ? '⛔ fermé — arme à deux mains' : '(vide)'}
              </span>
            {/if}
          </div>
        {/each}
      </div>

      <!-- SORTIE DE LA RÈGLE DES DEUX MAINS -->
      {#if weaponPiece?.twoHanded}
        <p class="border-y border-violet-300/25 bg-violet-950/20 px-3 py-1.5 font-mono text-[10px] leading-snug text-violet-100/80">
          ⚔️ <span class="font-bold">{weaponPiece.name}</span> se manie à deux mains :
          le bouclier est lâché — retirez l'arme pour en reporter un.
        </p>
      {/if}

      <!-- SACOCHE : pièces non portées, donc inertes -->
      <div class="border-t border-sky-100/15 px-3 py-2">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-display text-[11px] font-extrabold uppercase tracking-widest text-amber-100">🎒 Sacoche</span>
          <span class="font-mono text-[10px] text-sky-200/50">{bagList.length} pièce(s) — inactive(s)</span>
        </div>
        {#if bagList.length === 0}
          <p class="rounded-md border border-sky-100/15 bg-[#070d18]/40 px-2 py-3 text-center font-mono text-[10px] text-sky-200/60">
            Aucune pièce de rechange — les drops de sauvages, le butin des boss
            et la boutique y déposent leurs pièces.
          </p>
        {:else}
          <div class="grid gap-1.5">
            {#each bagList as piece (piece.id)}
              {@const chips = deltaChips(equipPreviews.get(piece.id))}
              <div class="rounded-md border border-sky-100/15 bg-[#070d18]/40 px-2 py-1.5">
                <div class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span>{piece.icon}</span>
                      <span class="truncate text-xs font-bold text-sky-50">{piece.name}</span>
                      <span class="shrink-0 rounded border border-sky-100/20 bg-[#16233a] px-1 font-mono text-[8px] uppercase text-sky-200/65">
                        {EQUIPMENT_SLOT_LABELS[piece.slot]}
                      </span>
                      {#if piece.twoHanded}
                        <span class="shrink-0 rounded border border-violet-300/40 bg-violet-500/10 px-1 font-mono text-[8px] font-black uppercase text-violet-200">Deux mains</span>
                      {/if}
                    </div>
                    <div class="truncate font-mono text-[10px] text-sky-200/50">{describe(piece)}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!canManage || (piece.slot === 'shield' && shieldBlocked)}
                    on:click={() => dispatch("equip", piece.id)}
                    class="shrink-0 rounded-md border border-emerald-500/60 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300
                      transition-colors hover:bg-emerald-900/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Équiper (remplace la pièce de l'emplacement)"
                  >Porter</button>
                </div>

                <!-- Aperçu AVANT / APRÈS (Dragon Quest) -->
                {#if chips.length > 0}
                  <div class="mt-1 flex flex-wrap items-center gap-1">
                    <span class="font-mono text-[9px] uppercase tracking-wider text-sky-200/45">Aperçu</span>
                    {#each chips as chip (chip.label)}
                      <span class="rounded border px-1 font-mono text-[9px] font-bold leading-[14px]
                        {chip.positive
                          ? 'border-emerald-400/40 bg-emerald-950/50 text-emerald-300'
                          : 'border-rose-400/40 bg-rose-950/50 text-rose-300'}">
                        {chip.label} {chip.value}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- RELIQUES : 3 emplacements + réserve inerte (réglage DQ) -->
      <div class="border-t border-sky-100/15 px-3 py-2">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-display text-[11px] font-extrabold uppercase tracking-widest text-amber-100">
            🔱 Reliques portées
          </span>
          <span class="font-mono text-[10px] text-sky-200/50">{wornRelics.length}/{RELIC_SLOT_COUNT} emplacement(s)</span>
        </div>

        <div class="grid gap-1.5">
          {#each wornRelics as relic (relic.id)}
            <div class="flex items-start gap-2 rounded-md border border-amber-200/40 bg-[#1b1a10]/40 px-2 py-1.5">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span>{relic.icon}</span>
                  <span class="truncate text-xs font-bold text-amber-100">{relic.name}</span>
                  <span class="shrink-0 rounded border border-emerald-200/35 bg-emerald-400/10 px-1 font-mono text-[8px] font-black uppercase text-emerald-300">Active</span>
                </div>
                <div class="truncate font-mono text-[10px] text-sky-200/65">
                  {relicEffectLines(relic).map((line) => `${line.label} ${line.value}`).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                disabled={!canManage}
                on:click={() => dispatch("takeoffRelic", relic.id)}
                class="shrink-0 rounded-md border border-rose-500/50 bg-rose-950/50 px-1.5 py-0.5 font-mono text-[10px] text-rose-200
                  transition-colors hover:bg-rose-900/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Retirer (la relique reste dans la réserve)"
              >Retirer</button>
            </div>
          {/each}

          {#if wornRelics.length === 0}
            <p class="rounded-md border border-sky-100/15 bg-[#070d18]/40 px-2 py-2 text-center font-mono text-[10px] text-sky-200/55">
              Aucune relique portée — les pouvoirs arrachés attendent dans la réserve.
            </p>
          {/if}
        </div>

        <!-- Réserve -->
        <div class="mt-2 flex items-center justify-between">
          <span class="font-display text-[10px] font-extrabold uppercase tracking-widest text-sky-200/70">Réserve</span>
          <span class="font-mono text-[10px] text-sky-200/50">{relicReserve.length} — inactive(s)</span>
        </div>
        {#if relicReserve.length === 0}
          <p class="mt-1 rounded-md border border-sky-100/15 bg-[#070d18]/40 px-2 py-2 text-center font-mono text-[10px] text-sky-200/55">
            Rien en réserve : battez des monstres pour arracher de nouveaux pouvoirs.
          </p>
        {:else}
          <div class="mt-1 grid gap-1.5">
            {#each relicReserve as relic (relic.id)}
              {@const chips = deltaChips(relicPreviews.get(relic.id))}
              <div class="rounded-md border border-sky-100/15 bg-[#070d18]/40 px-2 py-1.5">
                <div class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span>{relic.icon}</span>
                      <span class="truncate text-xs font-bold text-sky-50">{relic.name}</span>
                    </div>
                    <div class="truncate font-mono text-[10px] text-sky-200/50">
                      {relicEffectLines(relic).map((line) => `${line.label} ${line.value}`).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canManage || relicSlotsFull}
                    on:click={() => dispatch("wearRelic", relic.id)}
                    class="shrink-0 rounded-md border border-emerald-500/60 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300
                      transition-colors hover:bg-emerald-900/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={relicSlotsFull ? "Emplacements pleins — retirez-en une d'abord" : "Porter la relique"}
                  >Porter</button>
                </div>

                {#if chips.length > 0}
                  <div class="mt-1 flex flex-wrap items-center gap-1">
                    <span class="font-mono text-[9px] uppercase tracking-wider text-sky-200/45">Aperçu</span>
                    {#each chips as chip (chip.label)}
                      <span class="rounded border px-1 font-mono text-[9px] font-bold leading-[14px]
                        {chip.positive
                          ? 'border-emerald-400/40 bg-emerald-950/50 text-emerald-300'
                          : 'border-rose-400/40 bg-rose-950/50 text-rose-300'}">
                        {chip.label} {chip.value}
                      </span>
                    {/each}
                  </div>
                {:else if relicSlotsFull}
                  <p class="mt-1 font-mono text-[9px] text-sky-200/50">
                    ⛔ Emplacements pleins — retirez une relique portée pour porter celle-ci.
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- fiche du champion courte -->
      {#if monster}
        <div class="border-t border-sky-100/15 px-3 py-2">
          <p class="font-mono text-[10px] text-sky-200/50">
            Champion : <span class="text-sky-100/80">{monster.name}</span> · CA <span class="text-sky-300 font-bold">{monster.getAC()}</span>
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}
