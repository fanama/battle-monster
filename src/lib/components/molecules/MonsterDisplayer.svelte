<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import MoveDisplayer from "../atoms/MoveDisplayer.svelte";

  export let monster: Monster;

  export let isPlayer: boolean;
</script>

<div
  class={`
  relative w-56 flex flex-col items-center
  bg-stone-800 border-4 border-amber-600 rounded-xl
  shadow-2xl overflow-hidden
  ${isPlayer ? "left-4" : "right-4 absolute top-4"}
`}
>
  <div
    class="relative w-full h-40 bg-stone-900 border-b-4 border-stone-950 flex items-center justify-center overflow-hidden"
  >
    <div
      class="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent z-0"
    ></div>

    <img
      src={monster.spriteUrl}
      alt="enemy"
      class={`
        relative z-10 h-32 object-contain pixelated drop-shadow-lg
        ${isPlayer && "transform scale-x-[-1]"}
      `}
    />
  </div>

  <div
    class="relative -mt-4 z-20 w-11/12 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 border-2 border-amber-300 shadow-md py-1 transform skew-x-[-10deg]"
  >
    <h2
      class="text-sm font-bold text-white text-center uppercase tracking-widest transform skew-x-[10deg] drop-shadow-md"
    >
      {monster.name}
    </h2>
  </div>

  <div class="w-full p-3 pt-4 flex flex-col gap-2">
    <div class="bg-stone-950/50 p-1 rounded border border-stone-600">
      <HealthBar current={monster.currentHp} max={monster.maxHp} />
    </div>

    <div
      class="grid grid-cols-2 justify-between text-xs text-stone-400 px-1 h-20 font-mono overflow-scroll"
    >
      {#each monster.moves as move}
        <div>
          {move.name}
        </div>
      {/each}
    </div>
  </div>
</div>
