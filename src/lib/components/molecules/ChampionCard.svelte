<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import type { MonsterStat } from "../../../core/entities/Move";
  import { STAT_LABELS, TYPE_LABELS } from "../../../core/entities/Move";
  import { abilityModifier } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
  import { monsterStyles } from "../../styles/monsterStyles";
  import { dq } from "../../styles/style";

  export let monster: Monster | null = null;
  export let onOpenMoves: (() => void) | undefined = undefined;

  $: tc = TYPE_COLORS[(monster?.type ?? 'normal')];
  $: stats = monster ? (Object.keys(STAT_LABELS) as MonsterStat[]) : [];

  function mod(value: number): string {
    const m = abilityModifier(value);
    return m >= 0 ? `+${m}` : `${m}`;
  }
</script>

{#if monster}
  <div class={`relative flex flex-col w-full overflow-hidden ${dq.window}`}>
    <div class="h-1 md:h-1.5 w-full {tc.gradient}"></div>

    <!-- En-tête / sprite du champion -->
    <div class={monsterStyles.spriteSection.wrapper} style="background: {tc.ambient}">
      <div class={monsterStyles.spriteSection.overlay}></div>
      <SpriteDisplayer {monster} isPlayer={false} species="human" />
    </div>

    <div class={monsterStyles.nameTag.wrapper_base}>
      <div class="flex justify-between items-baseline pr-2 {monsterStyles.nameTag.wrapper_player}">
        <h2 class={monsterStyles.nameTag.text}>{monster.name}</h2>
        <div class="{monsterStyles.nameTag.text} {monsterStyles.nameTag.level_player}">
          Niv. {monster.level}
        </div>
      </div>
    </div>

    <!-- Détails : badges, PV, EXP, stats, attaques -->
    <div class={monsterStyles.info.container}>
      <div class="flex items-center gap-1.5">
        <span
          class="text-[10px] md:text-xs uppercase tracking-wider px-2 py-0.5
            rounded-full border font-bold {tc.badge}"
        >
          {TYPE_ICONS[monster.type]} {TYPE_LABELS[monster.type]}
        </span>
        <span class={`ml-auto ${dq.badge}`}>
          🛡 CA {monster.getAC()}
        </span>
      </div>

      <div class={monsterStyles.info.healthWrapper}>
        <HealthBar current={monster.currentHp} max={monster.maxHp} />
      </div>

      <div class="px-1 mt-0.5">
        <div class="flex justify-between items-center mb-0.5">
          <span class="text-xs font-bold text-sky-200">EXP</span>
          {#if monster.isMaxLevel}
            <span class="text-xs font-bold text-amber-200">NIVEAU MAX</span>
          {:else}
            <span class="text-xs text-sky-100/70" title="EXP du niveau / taille du niveau · restantes · total">
              {monster.experienceInLevel()} / {monster.experienceLevelSpan()}
              <span class="text-sky-200/45">
                · ⏭ {monster.experienceToNextLevel} · Σ {monster.experience}
              </span>
            </span>
          {/if}
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            class="h-1.5 rounded-full bg-[linear-gradient(90deg,#1d4ed8,#67e8f9)]"
            style="width: {monster.isMaxLevel
              ? 100
              : Math.min(100, (monster.experienceInLevel() / monster.experienceLevelSpan()) * 100)}%"
          ></div>
        </div>
      </div>

      <!-- Stats complètes, toujours visibles -->
      <div class="px-1 mt-0.5">
        <p
          class="mb-0.5 uppercase tracking-widest text-[10px] md:text-[11px] font-bold text-sky-200/60"
        >
          📊 Statistiques
        </p>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {#each stats as stat}
            <div class="flex justify-between items-baseline text-xs py-0.5">
              <span class="text-sky-100/70">{STAT_LABELS[stat]}</span>
              <span class="font-mono font-bold">
                {monster[stat]}
                <span class="text-sky-200/50 font-normal">({mod(monster[stat])})</span>
              </span>
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-1 flex items-center justify-between">
        <div class="flex items-center gap-1 uppercase tracking-widest text-[10px] md:text-[11px] font-bold text-sky-200/60">
          <span class="w-1.5 h-1.5 rounded-full {tc.dot}"></span> Attaques
        </div>
        {#if onOpenMoves}
          <button
            type="button"
            on:click={onOpenMoves}
            class={`${dq.badge} cursor-pointer transition-colors hover:border-sky-100/40 hover:text-white`}
          >
            📜 Modifier
          </button>
        {/if}
      </div>
      <div class={monsterStyles.info.moveGrid}>
        {#each monster.moves as move}
          <div class="flex items-center gap-1.5 truncate">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 {TYPE_COLORS[move.type].dot}"></span>
            <span class="truncate font-medium">{move.name}</span>
            {#if move.isPhysical}
              <span class="ml-auto shrink-0 text-xs text-sky-200/50">⚔</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else}
  <div class={`${dq.inset} w-full flex items-center justify-center text-sky-200/60 text-sm italic p-4`}>
    Aucun champion…
  </div>
{/if}