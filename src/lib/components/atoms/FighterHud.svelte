<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "./HealthBar.svelte";
  import { TYPE_LABELS } from "../../../core/entities/Move";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { TYPE_ICONS } from "../../styles/typeColors";
  import { dq } from "../../styles/style";

  export let monster: Monster | null | undefined = null;
  export let isPlayer: boolean = true;

  // Le joueur occupe le coin haut-gauche, l'ennemi le coin haut-droit.
  $: align = isPlayer ? "items-start text-left" : "items-end text-right";
  $: flexRow = isPlayer ? "flex-row" : "flex-row-reverse";
  // Seule couleur vive conservée : l'accent de camp, qui distingue les deux
  // combattants d'un coup d'œil. Tout le reste est du chrome DQ neutre.
  $: nameColor = isPlayer ? "text-sky-100" : "text-rose-100";
</script>

{#if monster}
  <div class="flex min-w-0 max-w-[46%] flex-col gap-1 {align}">
    <!-- Plaque de nom + niveau -->
    <div class="flex min-w-0 items-center gap-1.5 {flexRow}">
      {#if monster.rank === 'boss'}
        <span
          class="shrink-0 rounded border border-amber-200/50 bg-[#2a1f10]/90 px-1.5 py-0.5
            font-display text-[9px] font-extrabold uppercase tracking-[0.15em] text-amber-100"
          title="Boss de région"
        >
          👑 Boss
        </span>
      {/if}
      <span class="truncate font-display text-xs sm:text-sm font-extrabold uppercase tracking-wide {nameColor}">
        {monster.name}
      </span>
      <span class="shrink-0 rounded border border-sky-100/25 bg-[#070d18]/85 px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-sky-100/85">
        N{monster.level}
      </span>
    </div>

    <!-- Fenêtre de vie -->
    <div class={`${dq.window} w-full px-2 py-1.5`}>
      <div class="relative w-full">
        <HealthBar current={monster.currentHp} max={monster.maxHp} />
      </div>
    </div>

    <!-- Type et statuts : une seule ligne de pastilles, sous la fenêtre -->
    <div class="flex w-full min-w-0 flex-wrap gap-1 {align}">
      <span class={dq.badge}>
        {TYPE_ICONS[monster.type]} {TYPE_LABELS[monster.type]}
      </span>
      {#if monster.statuses && monster.statuses.length > 0}
        {#each monster.statuses as st}
          {@const cfg = STATUS_CONFIGS[st.type]}
          <span
            class={dq.badge}
            title="{cfg.name} : {cfg.description}"
          >
            {cfg.icon} {st.duration}
          </span>
        {/each}
      {/if}
    </div>
  </div>
{/if}
