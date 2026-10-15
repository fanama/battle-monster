<script lang="ts">
  import type { Relic } from "../../../core/entities/Relic";
  import { relicEffectLines } from "../../styles/relicEffects";
  import { relicTag } from "../../styles/relicTags";
  import type { Equipment } from "../../../core/entities/Equipment";
  import { EQUIPMENT_SLOT_LABELS } from "../../../core/entities/Equipment";

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
    bg-black/80 backdrop-blur-sm p-4 text-center"
>
  <p class="text-2xl font-serif font-bold tracking-widest text-amber-300 uppercase drop-shadow">
    ⭐ Objet trouvé !
  </p>
  <p class="text-sm text-stone-400">
    Choisissez une seule carte : une relique (permanente pour la run) ou une
    pièce d'équipement (à porter depuis l'onglet Champion) — ou passez.
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
        class="group flex flex-col items-center gap-1 rounded-xl border-2 min-w-0
          bg-gradient-to-b from-stone-800 to-stone-900 p-2 md:p-3
          transition-all duration-200 hover:-translate-y-1 active:scale-95 {tag.card}"
      >
        <span class="text-3xl md:text-4xl drop-shadow group-hover:scale-110 transition-transform">
          {relic.icon}
        </span>
        <span class="font-bold text-amber-100 text-[11px] md:text-sm leading-tight drop-shadow truncate max-w-full">
          {relic.name}
        </span>

        <!-- Effets chiffrés : l'information utile pour choisir, lisible sur mobile -->
        <span class="flex flex-wrap justify-center gap-0.5">
          {#each lines as line (line.label)}
            <span
              class="text-[9px] md:text-[10px] font-mono font-bold text-amber-200 bg-stone-950/70
                border border-stone-700/80 rounded px-1 leading-[14px] truncate max-w-full"
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
        class="group flex flex-col items-center gap-1 rounded-xl border-2 min-w-0
          bg-gradient-to-b from-sky-950 to-stone-900 p-2 md:p-3 border-sky-500/60
          transition-all duration-200 hover:-translate-y-1 hover:border-sky-400 active:scale-95"
      >
        <span class="text-3xl md:text-4xl drop-shadow group-hover:scale-110 transition-transform">
          {piece.icon}
        </span>
        <span class="font-bold text-sky-100 text-[11px] md:text-sm leading-tight drop-shadow truncate max-w-full">
          {piece.name}
        </span>
        <span class="text-[9px] font-mono uppercase font-bold text-sky-300 border border-sky-500/60 bg-sky-950/70 rounded px-1">
          🧰 {EQUIPMENT_SLOT_LABELS[piece.slot]}
        </span>

        <span class="flex flex-wrap justify-center gap-0.5">
          {#each equipLines(piece) as line}
            <span
              class="text-[9px] md:text-[10px] font-mono font-bold text-sky-200 bg-stone-950/70
                border border-stone-700/80 rounded px-1 leading-[14px] truncate max-w-full"
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
    class="text-sm px-3 py-1 rounded-full border border-stone-600 text-stone-400
      hover:text-stone-200 hover:border-stone-400 transition-colors"
  >
    Passer
  </button>
</div>
