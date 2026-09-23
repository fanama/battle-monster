<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { container } from "../../../lib/container";
  import type { MonsterStat } from "../../../core/entities/Move";
  import { STAT_LABELS, TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  // Les 5 starters définis (aucun hasard) — via le composition root.
  const monsters = container.starters.getAll();

  let selectedId: string | undefined;
  $: selectedMonster = monsters.find(m => m.id === selectedId);
  export let onclick: (monster: Monster) => void;

  $: statKeys = (Object.keys(STAT_LABELS) as MonsterStat[]);

  // Couleurs d'exposition des barres de stats par attribut
  const STAT_BAR: Record<MonsterStat, { color: string; bar: string }> = {
    strength: { color: 'text-red-300', bar: 'from-red-500 to-rose-400' },
    speed: { color: 'text-sky-300', bar: 'from-sky-500 to-cyan-400' },
    constitution: { color: 'text-emerald-300', bar: 'from-emerald-500 to-green-400' },
    charisma: { color: 'text-amber-300', bar: 'from-amber-500 to-yellow-400' },
    wisdom: { color: 'text-violet-300', bar: 'from-violet-500 to-purple-400' },
    instinct: { color: 'text-cyan-300', bar: 'from-cyan-500 to-sky-400' },
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

  <div class="relative z-10 w-full mx-auto flex flex-col gap-3">
    <p class={ui.label}> Invoquer son champion </p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {#each monsters as monster}
        {@const tc = TYPE_COLORS[monster.type]}
        {@const selected = selectedId === monster.id}

        <button
          type="button"
          aria-pressed={selected}
          class="card-btn rounded-xl border-2 p-3 text-left transition-all duration-200
            {selected
              ? tc.border + ' bg-black/50 ring-2 ring-offset-0 scale-[1.03]'
              : 'border-stone-700 bg-black/30 hover:border-stone-500 hover:bg-black/45'}"
          on:click={() => (selectedId = monster.id)}
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">{TYPE_ICONS[monster.type]}</span>
            <div class="leading-tight">
              <p class="font-serif font-bold text-amber-100 text-sm md:text-base">{monster.name}</p>
              <p class="text-[10px] uppercase tracking-wider {tc.text}">
                Lvl {monster.level} · {TYPE_LABELS[monster.type]}
              </p>
            </div>
            {#if selected}
              <span class="ml-auto text-emerald-400 font-bold">✓</span>
            {/if}
          </div>

          <div class="mb-2">
            <div class="flex justify-between text-[9px] font-mono text-stone-400 mb-0.5">
              <span>PV</span>
              <span>{monster.maxHp}</span>
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
                    style="width: {Math.min(100, (monster[stat] / 20) * 100)}%"
                  ></div>
                </div>
                <span class="w-6 text-right text-[9px] font-mono text-stone-400">{monster[stat]}</span>
              </div>
            {/each}
          </div>

          <div class="flex flex-wrap gap-1">
            {#each monster.moves as move}
              <span class="text-[9px] px-1.5 py-0.5 rounded-full border font-medium {TYPE_COLORS[move.type].badge}">
                {TYPE_ICONS[move.type]} {move.name}
              </span>
            {/each}
          </div>
        </button>
      {/each}
    </div>

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
  .card-btn {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }
</style>