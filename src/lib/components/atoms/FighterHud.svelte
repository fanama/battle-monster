<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "./HealthBar.svelte";
  import { TYPE_LABELS } from "../../../core/entities/Move";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  export let monster: Monster | null | undefined = null;
  export let isPlayer: boolean = true;

  $: tc = TYPE_COLORS[(monster?.type ?? "normal")];
  // Le joueur occupe le coin haut-gauche, l'ennemi le coin haut-droit.
  $: align = isPlayer ? "items-start text-left" : "items-end text-right";
  $: flexRow = isPlayer ? "flex-row" : "flex-row-reverse";
  $: nameColor = isPlayer ? "text-sky-100" : "text-rose-100";
  // Boîte d'infos accentuée : bord épais coloré (camp), lueur du type.
  $: frame = isPlayer
    ? "border-sky-400/70 from-sky-950/90 to-slate-950/85 shadow-[0_2px_10px_rgba(14,165,233,0.25)]"
    : "border-rose-400/70 from-rose-950/90 to-slate-950/85 shadow-[0_2px_10px_rgba(244,63,94,0.25)]";
</script>

{#if monster}
  <div class="flex min-w-0 max-w-[46%] flex-col gap-1 {align}">
    <!-- Plaque de nom + badge de niveau (pastille arrondie, lisible en 1 coup d'œil) -->
    <div class="flex min-w-0 items-center gap-1.5 {flexRow}">
      {#if monster.rank === 'boss'}
        <span
          class="shrink-0 rounded-full border border-amber-300/70 bg-amber-950/90 px-1.5 py-0.5
            font-display text-[9px] font-extrabold uppercase tracking-widest text-amber-200
            shadow-[0_0_8px_rgba(251,191,36,0.55)] animate-pulse"
          title="Boss de région"
        >
          👑 Boss
        </span>
      {/if}
      <span
        class="truncate font-display text-xs sm:text-sm font-extrabold uppercase tracking-wide
          drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] {nameColor}"
      >
        {monster.name}
      </span>
      <span
        class="{isPlayer ? 'rounded-full border border-sky-400/50 bg-sky-950/90 px-1.5' : 'rounded-full border border-rose-400/50 bg-rose-950/90 px-1.5'}
          px-1 py-0.5 font-mono text-[9px] font-bold leading-none {nameColor}"
      >
        N{monster.level}
      </span>
    </div>

    <!-- Barre de vie : version « boîte d'infos Pokémon », coins arrondis épais -->
    <div
      class="sheen relative w-full rounded-lg border-2 bg-gradient-to-b px-2 py-2 backdrop-blur-md {frame}"
    >
      <span class="sheen-target rounded-lg" aria-hidden="true"></span>
      <!-- Marqueur de type : pastille ronde colorée collée au bord de la boîte -->
      <span
        class="absolute -top-1.5 {isPlayer ? 'left-2' : 'right-2'} flex h-4 w-4 items-center justify-center
          rounded-full border-2 border-stone-950 text-[9px] shadow {tc.dot}"
        title="{TYPE_LABELS[monster.type]}"
        aria-hidden="true"
      >
        {TYPE_ICONS[monster.type]}
      </span>
      <div class="relative w-full">
        <HealthBar current={monster.currentHp} max={monster.maxHp} />
      </div>
    </div>

    <div class="flex w-full min-w-0 flex-wrap gap-1 {align}">
      <span
        class="rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold {tc.badge}"
      >
        {TYPE_ICONS[monster.type]} {TYPE_LABELS[monster.type]}
      </span>
      {#if monster.statuses && monster.statuses.length > 0}
        {#each monster.statuses as st}
          {@const cfg = STATUS_CONFIGS[st.type]}
          <span
            class="rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold {cfg.badgeClass}"
            title="{cfg.name} : {cfg.description}"
          >
            {cfg.icon} {st.duration}
          </span>
        {/each}
      {/if}
    </div>
  </div>
{/if}
