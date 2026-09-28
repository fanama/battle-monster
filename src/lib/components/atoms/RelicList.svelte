<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import type { Relic } from "../../../core/entities/Relic";
  import { relicEffectLines, relicEffectTotals } from "../../styles/relicEffects";
  import { relicTag } from "../../styles/relicTags";

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
    <section
      class="rounded-2xl border-2 border-amber-600/50 bg-gradient-to-b from-amber-950/25 to-stone-950 p-3"
    >
      <header class="flex items-center gap-2 pb-2 mb-1.5 border-b border-amber-800/40">
        <span class="text-xl p-1 rounded-lg bg-amber-500/20 border border-amber-400/40">🔱</span>
        <div class="min-w-0">
          <h3 class="font-serif font-bold text-xs sm:text-sm uppercase tracking-wider text-amber-200">
            Effets cumulés
          </h3>
          <p class="text-[11px] text-stone-400">
            {relics.length} relique{relics.length > 1 ? "s" : ""} sur l'ensemble du périple
          </p>
        </div>
      </header>

      <ul class="grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-1.5">
        {#each totals as total (total.label)}
          <li class="flex items-baseline gap-2 min-w-0">
            <span class="text-[11px] text-stone-400 shrink-0 w-[86px] xs:w-auto truncate">
              {total.label}
            </span>
            <span class="font-mono text-xs font-bold text-amber-300 shrink-0">{total.value}</span>
            {#if total.hint}
              <span class="text-[10px] text-stone-500 truncate min-w-0">· {total.hint}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if relics.length === 0}
    <p
      class="text-center text-xs sm:text-sm text-stone-500 font-mono py-10 px-4
        border-2 border-dashed border-stone-800 rounded-xl"
    >
      Aucune relique obtenue pour l'instant.<br />
      Terminez des rencontres pour en repartir avec.
    </p>
  {:else}
    <!-- Liste détaillée, des plus récentes aux plus anciennes -->
    {#each relics.slice().reverse() as relic, index (relic.id + index)}
      {@const tag = relicTag(relic)}
      {@const lines = relicEffectLines(relic)}
      <article class="rounded-xl border-2 bg-stone-900/70 p-2.5 {tag.card}">
        <div class="flex items-start gap-2.5">
          <span
            class="shrink-0 w-9 h-9 flex items-center justify-center text-lg rounded-full border
              border-amber-300/70 bg-gradient-to-br from-amber-700 to-amber-900"
          >
            {relic.icon}
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-serif text-sm font-bold text-amber-200">{relic.name}</span>
              <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border {tag.chip}">
                {tag.label}
              </span>
            </div>

            <!-- Effets chiffrés (issus de `effect`, donc exacts) -->
            <ul class="mt-1.5 flex flex-wrap gap-1">
              {#each lines as line (line.label)}
                <li
                  class="inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded border border-stone-700/80
                    bg-stone-950/60 text-[10px] leading-tight"
                >
                  <span class="text-stone-400">{line.label}</span>
                  <span class="font-mono font-bold text-amber-200">{line.value}</span>
                </li>
              {/each}
            </ul>

            <!-- Ce que ça change en jeu -->
            {#if lines.some((line) => line.hint)}
              <p class="mt-1 text-[10px] leading-snug text-stone-500">
                {lines
                  .filter((line) => line.hint)
                  .map((line) => `${line.label} : ${line.hint}`)
                  .join(" · ")}
              </p>
            {/if}

            <p class="mt-1 text-[11px] leading-relaxed text-stone-400 italic">
              {relic.description}
            </p>
          </div>
        </div>
      </article>
    {/each}
  {/if}
</div>
