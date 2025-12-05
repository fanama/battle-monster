<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { MonsterRepository } from "../../../infra/repositories/MonsterRepositories";

  // Assuming you might import the styles object, or we mirror its aesthetic here
  // based on the design system provided.

  const monsterRepo = new MonsterRepository();
  const monsters = monsterRepo.getAllMonsters();

  let selectedMonster: Monster | undefined;
  export let onclick: (monster: Monster) => void;

  // Local style definitions derived from your global 'styles' object
  // to maintain consistency (Stone, Amber, Serif/Mono mix)
  const ui = {
    container: `
      flex flex-col justify-center h-full w-full
      bg-stone-900 border-2 border-stone-600 rounded-xl
      shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]
      p-4 relative overflow-hidden group
    `,
    label: `
      block text-center font-serif font-bold uppercase tracking-widest
      text-amber-500 text-xs md:text-sm mb-2
      drop-shadow-md opacity-90
    `,
    selectWrapper: `
      relative w-full mb-3
    `,
    select: `
      w-full appearance-none
      bg-stone-800 text-stone-300 font-mono text-sm
      border border-stone-600 rounded
      py-2 px-3 pr-8
      focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500
      shadow-inner transition-colors duration-200 cursor-pointer
    `,
    chevron: `
      pointer-events-none absolute top-1/2 right-2 -translate-y-1/2
      text-amber-600 w-4 h-4 fill-current
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
    texture:
      "absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]",
  };
</script>

<div class={ui.container}>
  <div class={ui.texture}></div>

  <div class="relative z-10 w-full max-w-xs mx-auto">
    <label for="monster-select" class={ui.label}> Summon Champion </label>

    <div class={ui.selectWrapper}>
      <select
        id="monster-select"
        bind:value={selectedMonster}
        class={ui.select}
      >
        <option value={undefined} disabled selected>-- Select Entity --</option>
        {#each monsters as monster}
          <option value={monster}>
            {monster.name}
          </option>
        {/each}
      </select>

      <svg
        class={ui.chevron}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path
          d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
        />
      </svg>
    </div>

    <button
      class={ui.button}
      disabled={!selectedMonster}
      on:click={() => selectedMonster && onclick(selectedMonster)}
    >
      <span>Engage</span>
      {#if selectedMonster}
        <svg
          class="w-4 h-4 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          ></path></svg
        >
      {/if}
    </button>
  </div>
</div>
