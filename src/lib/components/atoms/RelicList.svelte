<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import type { Relic } from "../../../core/entities/Relic";
  import { relicEffectLines, relicEffectTotals } from "../../styles/relicEffects";
  import { relicTag } from "../../styles/relicTags";
  import { TYPE_ICONS } from "../../styles/typeColors";
  import { dq } from "../../styles/style";

  export let relics: Relic[] = [];
  export let player: Monster | null = null;

  // Effets cumulés de tout le run, avec les conséquences chiffrées.
  $: totals = relicEffectTotals(relics, player);
</script>

<!--
  Onglet « Reliques » : ce que le joueur a récolté, ce que chaque relique
  apporte réellement (dérivé de `RelicEffect`, pas du texte libre) et ce que
  ça cumule. Contenu présentatif : le panneau parent gère le défilement.
-->
<div class="flex flex-col gap-3">
  <!-- Effets cumulés du run -->
  {#if totals.length > 0}
    <section class={`${dq.window} p-3`}>
      <header class="flex items-center gap-2 pb-2 mb-1.5 border-b border-sky-100/15">
        <span class="text-xl p-1 rounded-lg border border-sky-100/25 bg-[#16233a]">🔱</span>
        <div class="min-w-0">
          <h3 class="font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider text-amber-100">
            Effets cumulés
          </h3>
          <p class="text-[11px] text-sky-200/60">
            {relics.length} relique{relics.length > 1 ? "s" : ""} sur l'ensemble du périple
          </p>
        </div>
      </header>

      <ul class="grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-1.5">
        {#each totals as total (total.label)}
          <li class="flex items-baseline gap-2 min-w-0">
            <span class="text-[11px] text-sky-100/70 shrink-0 w-[86px] xs:w-auto truncate">
              {total.label}
            </span>
            <span class="font-mono text-xs font-bold text-amber-100 shrink-0">{total.value}</span>
            {#if total.hint}
              <span class="text-[10px] text-sky-200/50 truncate min-w-0">· {total.hint}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if relics.length === 0}
    <p
      class={`${dq.inset} text-center text-xs sm:text-sm text-sky-200/60 font-mono py-10 px-4`}
    >
      Aucune relique obtenue pour l'instant.<br />
      Terminez des rencontres pour en repartir avec.
    </p>
  {:else}
    <!-- Liste détaillée, des plus récentes aux plus anciennes -->
    {#each relics.slice().reverse() as relic, index (relic.id + index)}
      {@const tag = relicTag(relic)}
      {@const lines = relicEffectLines(relic)}
      <article class={`${dq.window} p-2.5`}>
        <div class="flex items-start gap-2.5">
          <span
            class="shrink-0 w-9 h-9 flex items-center justify-center text-lg rounded border
              border-sky-100/25 bg-[#16233a]"
          >
            {relic.icon}
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-display text-sm font-bold text-amber-100">{relic.name}</span>
              <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border {tag.chip}">
                {tag.label}
              </span>
              {#if relic.powerOf}
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200/40 bg-[#1b1a10]/80 text-amber-100"
                  title="Pouvoir arraché à {relic.powerOf.name}"
                >
                  ⚡ Pouvoir de {relic.powerOf.name} {TYPE_ICONS[relic.powerOf.type]}
                </span>
              {/if}
            </div>

            <!-- Effets chiffrés (issus de `effect`, donc exacts) -->
            <ul class="mt-1.5 flex flex-wrap gap-1">
              {#each lines as line (line.label)}
                <li
                  class="inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded border border-sky-100/20
                    bg-[#070d18]/80 text-[10px] leading-tight"
                >
                  <span class="text-sky-200/60">{line.label}</span>
                  <span class="font-mono font-bold text-amber-100">{line.value}</span>
                </li>
              {/each}
            </ul>

            <!-- Ce que ça change en jeu -->
            {#if lines.some((line) => line.hint)}
              <p class="mt-1 text-[10px] leading-snug text-sky-200/50">
                {lines
                  .filter((line) => line.hint)
                  .map((line) => `${line.label} : ${line.hint}`)
                  .join(" · ")}
              </p>
            {/if}

            <p class="mt-1 text-[11px] leading-relaxed text-sky-100/60 italic">
              {relic.description}
            </p>
          </div>
        </div>
      </article>
    {/each}
  {/if}
</div>
