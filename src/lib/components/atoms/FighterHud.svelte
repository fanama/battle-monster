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
  $: nameColor = isPlayer ? "text-sky-200" : "text-rose-200";
  $: frame = isPlayer
    ? "border-sky-500/40 bg-gradient-to-b from-sky-950/85 to-slate-950/80"
    : "border-rose-500/40 bg-gradient-to-b from-rose-950/85 to-slate-950/80";
</script>

{#if monster}
  <div class="flex min-w-0 max-w-[46%] flex-col gap-1 {align}">
    <div class="flex min-w-0 items-baseline gap-1.5 {align}">
      <span class="truncate font-mono text-[11px] sm:text-xs font-extrabold uppercase tracking-wider {nameColor}">
        {monster.name}
      </span>
      <span class="shrink-0 font-mono text-[9px] sm:text-[10px] opacity-70 {nameColor}">
        Niv. {monster.level}
      </span>
    </div>

    <!-- Barre de vie : version « Street Fighter », ancrée au coin de l'écran -->
    <div class="w-full rounded border px-1.5 py-1 shadow-md backdrop-blur-sm {frame}">
      <HealthBar current={monster.currentHp} max={monster.maxHp} />
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