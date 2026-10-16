<script lang="ts">
  import type { Relic } from "../../../core/entities/Relic";
  import { relicEffectLines } from "../../styles/relicEffects";
  import { relicTag } from "../../styles/relicTags";
  import type { Equipment } from "../../../core/entities/Equipment";
  import { EQUIPMENT_SLOT_LABELS } from "../../../core/entities/Equipment";
  import { TYPE_ICONS } from "../../styles/typeColors";
  import { dq } from "../../styles/style";

  /**
   * Choix de butin après victoire (offres mixées, réglage 2026-10) :
   * reliques **et** pièces d'équipement s'exposent côte à côte. Une pièce
   * choisie rejoint la sacoche (inactive tant que non portée) ; une carte
   * non choisie est perdue.
   */
  export let offers: Relic[] | null;
  export let equipmentOffers: Equipment[] | null = null;
  export let onPickRelic: (relic: Relic) => void;
  export let onPickEquip: (piece: Equipment) => void;
  export let onSkip: () => void;

  /** Description courte des effets d'une pièce (lisible sur les cartes). */
  function equipLines(piece: Equipment): string[] {
    const eff = piece.effect;
    const out: string[] = [];
    if (eff.stat) {
      for (const [key, value] of Object.entries(eff.stat)) {
        out.push(`+${value} ${key}`);
      }
    }
    if (eff.acBonus) out.push(`+${eff.acBonus} CA`);
    if (eff.damagePercent) out.push(`+${eff.damagePercent}% dégâts`);
    if (eff.lifestealPercent) out.push(`vol de vie ${eff.lifestealPercent}%`);
    if (eff.critRange) out.push(`crit ${21 - eff.critRange}-20`);
    if (eff.healStartPercent) out.push(`+${eff.healStartPercent}% PV début`);
    if (eff.experiencePercent) out.push(`+${eff.experiencePercent}% EXP`);
    return out;
  }

  /**
   * Filet d'affichage : une pièce offerte = un exemplaire (clé `each` unique).
   * Les tirages excluent le possédé et la reprise de sauvegarde dé-duplique ;
   * ce filtre protège en plus une sauvegarde ancienne corrompue.
   */
  function uniqueEquipment(pieces: Equipment[] | null): Equipment[] {
    const seen = new Set<string>();
    return (pieces ?? []).filter(p => (seen.has(p.id) ? false : seen.add(p.id) && true));
  }

  $: equipList = uniqueEquipment(equipmentOffers);
  // Les colonnes suivent le mélange réel des offres (2 reliques + 1 pièce).
  $: allOffers = [...(offers ?? []), ...equipList];
</script>

<div
  class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-lg
    bg-[#050a14]/90 backdrop-blur-[2px] p-4 text-center"
>
  <p class="font-display text-xl sm:text-2xl font-extrabold tracking-[0.18em] text-amber-100 uppercase">
    ⚡ Pouvoir des monstres vaincus !
  </p>
  <p class="text-sm text-sky-100/70">
    Le monstre terrassé abandonne son pouvoir. Choisissez une seule carte : une
    relique (le pouvoir du monstre, permanent pour la run) ou une pièce
    d'équipement (à porter depuis l'onglet Champion) — ou passez.
  </p>

  <div
    class="grid gap-2 md:gap-3 w-full max-w-md max-h-full overflow-y-auto"
    style="grid-template-columns: repeat({Math.max(allOffers.length, 1)}, minmax(0, 1fr));"
  >
    {#each offers ?? [] as relic}
      {@const tag = relicTag(relic)}
      {@const lines = relicEffectLines(relic)}
      <button
        on:click={() => onPickRelic(relic)}
        title="{relic.name} — {lines.map((line) => `${line.label} ${line.value}`).join(' · ')}"
        class={`group flex flex-col items-center gap-1 min-w-0 p-2 md:p-3 ${dq.window}
          transition-transform duration-200 hover:-translate-y-1 active:scale-95 ${tag.card}`}
      >
        <span class="text-3xl md:text-4xl group-hover:scale-110 transition-transform">
          {relic.icon}
        </span>
        <span class="font-display font-bold text-amber-100 text-[11px] md:text-sm leading-tight truncate max-w-full">
          {relic.name}
        </span>

        {#if relic.powerOf}
          <span
            class="text-[9px] md:text-[10px] font-mono font-bold text-amber-100 bg-[#1b1a10]/80
              border border-amber-200/40 rounded px-1 leading-[14px] truncate max-w-full"
            title="Pouvoir arraché à {relic.powerOf.name}"
          >
            ⚡ Pouvoir de {relic.powerOf.name} {TYPE_ICONS[relic.powerOf.type]}
          </span>
        {/if}

        <!-- Effets chiffrés : l'information utile pour choisir, lisible sur mobile -->
        <span class="flex flex-wrap justify-center gap-0.5">
          {#each lines as line (line.label)}
            <span
              class="text-[9px] md:text-[10px] font-mono font-bold text-amber-100 bg-[#070d18]/80
                border border-sky-100/20 rounded px-1 leading-[14px] truncate max-w-full"
            >
              {line.label} {line.value}
            </span>
          {/each}
        </span>
      </button>
    {/each}

    {#each equipList as piece (piece.id)}
      <button
        on:click={() => onPickEquip(piece)}
        title="{piece.name} — {equipLines(piece).join(' · ')}"
        class={`group flex flex-col items-center gap-1 min-w-0 p-2 md:p-3 ${dq.window}
          border-sky-300/40 transition-transform duration-200 hover:-translate-y-1 active:scale-95`}
      >
        <span class="text-3xl md:text-4xl group-hover:scale-110 transition-transform">
          {piece.icon}
        </span>
        <span class="font-display font-bold text-sky-100 text-[11px] md:text-sm leading-tight truncate max-w-full">
          {piece.name}
        </span>
        <span class={`${dq.badge} uppercase`}>
          🧰 {EQUIPMENT_SLOT_LABELS[piece.slot]}
        </span>

        <span class="flex flex-wrap justify-center gap-0.5">
          {#each equipLines(piece) as line}
            <span
              class="text-[9px] md:text-[10px] font-mono font-bold text-sky-100 bg-[#070d18]/80
                border border-sky-100/20 rounded px-1 leading-[14px] truncate max-w-full"
            >
              {line}
            </span>
          {/each}
        </span>
      </button>
    {/each}
  </div>

  <button
    on:click={onSkip}
    class="text-sm px-3 py-1 rounded border border-sky-100/25 text-sky-100/70
      hover:text-white hover:border-sky-100/50 transition-colors"
  >
    Passer
  </button>
</div>
