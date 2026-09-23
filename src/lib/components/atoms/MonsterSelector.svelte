<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { container } from "../../../lib/container";
  import type { MonsterStat } from "../../../core/entities/Move";
  import { STAT_LABELS, TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  // Les 3 starters définis (aucun hasard) — via le composition root.
  const monsters = container.starters.getAll();

  let selectedMonster: Monster | undefined;
  export let onclick: (monster: Monster) => void;

  $: tc = TYPE_COLORS[(selectedMonster?.type ?? 'normal')];

  $: statKeys = (Object.keys(STAT_LABELS) as MonsterStat[]);

  // Couleurs d'exposition des barres de stats par attribut
  const STAT_BAR: Record<MonsterStat, { color: string; bar: string }> = {
    strength: { color: 'text-red-300', bar: 'from-red-500 to-rose-400' },
    speed: { color: 'text-sky-300', bar: 'from-sky-500 to-cyan-400' },
    constitution: { color: 'text-emerald-300', bar: 'from-emerald-500 to-green-400' },
    intelligence: { color: 'text-violet-300', bar: 'from-violet-500 to-purple-400' },
    charisma: { color: 'text-amber-300', bar: 'from-amber-500 to-yellow-400' },
    wisdom: { color: 'text-teal-300', bar: 'from-teal-500 to-cyan-400' },
  };

  const ui = {
    container: `
      flex flex-col justify-center h-full w-full
      bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-600 rounded-xl
      shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]
      p-4 relative overflow-hidden group
    `,
    label: `
      block text-center font-serif font-bold uppercase tracking-widest
      text-amber-400 text-xs md:text-sm mb-2 drop-shadow-md
    `,
    select: `
      w-full appearance-none
      bg-stone-800/90 text-stone-200 font-mono text-sm
      border-2 rounded-md py-2 pl-3 pr-8
      focus:outline-none focus:ring-1 focus:ring-amber-400
      shadow-inner transition-colors duration-200 cursor-pointer
    `,
    button: `
      w-full py-2 px-4 rounded border border-amber-900/50
      font-serif font-bold tracking-[0.15em] uppercase
      text-stone-900 text-sm md:text-base
      bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700
      shadow-[0_2px_5px_rgba(0,0,0,0.5)]
      active:scale-95 active:shadow-none
      disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200
      flex items-center justify-center gap-2
    `,
  };
</script>

<div class={ui.container}>
  <div class="absolute inset-0 pointer-events-none opacity-15 sel-pattern"></div>

  <div class="relative z-10 w-full max-w-xs mx-auto flex flex-col gap-3">
    <label for="monster-select" class={ui.label}> Invoquer son champion </label>

    <div class="relative">
      <select
        id="monster-select"
        bind:value={selectedMonster}
        class="{ui.select} {tc.border}"
      >
        <option value={undefined} disabled selected>-- Aucune créature --</option>
        {#each monsters as monster}
          <option value={monster}>
            {TYPE_ICONS[monster.type]} {monster.name} — {TYPE_LABELS[monster.type]}
          </option>
        {/each}
      </select>

      <svg
        class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-amber-500 w-4 h-4 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
      </svg>
    </div>

    {#if selectedMonster}
      <div class="rounded-lg border-2 {tc.border} bg-black/40 p-2 md:p-3 max-h-[55%] overflow-y-auto">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-2xl">{TYPE_ICONS[selectedMonster.type]}</span>
          <div class="text-left leading-tight">
            <p class="font-serif font-bold text-amber-100 text-sm">{selectedMonster.name}</p>
            <p class="text-[10px] uppercase tracking-wider {tc.text}">
              {TYPE_ICONS[selectedMonster.type]} Lvl {selectedMonster.level}
            </p>
          </div>
        </div>

        <div class="mb-2">
          <div class="flex justify-between text-[9px] font-mono text-stone-400 mb-0.5">
            <span>PV</span>
            <span>{selectedMonster.maxHp}</span>
          </div>
          <div class="h-1.5 bg-stone-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-green-600 to-lime-400" style="width: 100%"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
          {#each statKeys as stat}
            {@const meta = STAT_BAR[stat]}
            <div class="flex items-center gap-1">
              <span class="w-6 text-[9px] font-bold {meta.color}">{STAT_LABELS[stat]}</span>
              <div class="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r {meta.bar}"
                  style="width: {Math.min(100, (selectedMonster[stat] / 20) * 100)}%"
                ></div>
              </div>
              <span class="w-6 text-right text-[9px] font-mono text-stone-400">{selectedMonster[stat]}</span>
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap gap-1">
          {#each selectedMonster.moves as move}
            <span class="text-[9px] px-1.5 py-0.5 rounded-full border font-medium {TYPE_COLORS[move.type].badge}">
              {TYPE_ICONS[move.type]} {move.name}
            </span>
          {/each}
        </div>
      </div>
    {:else}
      <p class="text-center text-xs text-stone-500 italic">
        Sélectionnez une créature pour afficher ses statistiques.
      </p>
    {/if}

    <button
      class={ui.button}
      disabled={!selectedMonster}
      on:click={() => selectedMonster && onclick(selectedMonster)}
    >
      <span>⚔ Lancer la partie</span>
    </button>
  </div>
</div>

<style>
  .sel-pattern {
    background-image: radial-gradient(rgba(251, 191, 36, 0.45) 1px, transparent 1px);
    background-size: 14px 14px;
  }
</style>