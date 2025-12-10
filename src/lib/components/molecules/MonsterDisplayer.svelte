<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";

  export let monster: Monster;
  export let isPlayer: boolean;
</script>

<div
  class="
    {monsterStyles.container.base} 
    {isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy}
  "
>
  <div class={monsterStyles.spriteSection.overlay}></div>
  <SpriteDisplayer {monster} {isPlayer} />

  <div class="{monsterStyles.nameTag.wrapper_base} {isPlayer ? monsterStyles.nameTag.wrapper_player : monsterStyles.nameTag.wrapper_enemy}">
    <div class="flex justify-between items-baseline pr-2">
      <h2 class={monsterStyles.nameTag.text}>
        {monster.name}
      </h2>
      <div class="{isPlayer ? monsterStyles.nameTag.level_player : monsterStyles.nameTag.level_enemy}">Lvl {monster.level}</div>
    </div>
  </div>

  <div class={monsterStyles.info.container}>
    <div class={monsterStyles.info.healthWrapper}>
      <HealthBar current={monster.currentHp} max={monster.maxHp} />
    </div>

    <!-- EXP Bar -->
    {#if isPlayer}
    <div class="px-2 mt-1">
        <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-bold text-sky-300">EXP</span>
            <span class="text-xs text-stone-400">{monster.experience} / {monster.experienceToNextLevel}</span>
        </div>
        <div class="w-full bg-stone-700 rounded-full h-1.5 shadow-inner">
            <div class="bg-sky-400 h-1.5 rounded-full" style="width: {Math.min(100, (monster.experience / monster.experienceToNextLevel) * 100)}%"></div>
        </div>
    </div>
    {/if}

    <div class={monsterStyles.info.moveGrid}>
      {#each monster.moves as move}
        <div class="truncate">
          {move.name}
        </div>
      {/each}
    </div>
  </div>
</div>
