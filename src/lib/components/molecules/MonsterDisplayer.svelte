<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";

  export let monster: Monster | null | undefined; 
  export let isPlayer: boolean;
  export let isAttacking: boolean = false;
</script>

<div
  class:attack-player={isAttacking && isPlayer}
  class:attack-enemy={isAttacking && !isPlayer}
  class="
    {monsterStyles.container.base} 
    {isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy}
  "
>
  {#if monster}
    <div class="{monsterStyles.spriteSection.wrapper}">
      <div class="{monsterStyles.spriteSection.overlay}"></div>
      <SpriteDisplayer {monster} {isPlayer} />
    </div>

    <div class="{monsterStyles.nameTag.wrapper_base} {isPlayer ? monsterStyles.nameTag.wrapper_player : monsterStyles.nameTag.wrapper_enemy}">
      <div class="flex justify-between items-baseline pr-2">
        <h2 class={monsterStyles.nameTag.text}>
          {monster.name}
        </h2>
        <div class="{isPlayer ? monsterStyles.nameTag.level_player : monsterStyles.nameTag.level_enemy}">
            Lvl {monster.level}
        </div>
      </div>
    </div>

    <div class={monsterStyles.info.container}>
      <div class={monsterStyles.info.healthWrapper}>
        <HealthBar current={monster.currentHp} max={monster.maxHp} />
      </div>

      {#if isPlayer}
        <div class="px-2 mt-1">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-bold text-sky-300">EXP</span>
            <span class="text-xs text-stone-400">
                {monster.experience} / {monster.experienceToNextLevel}
            </span>
          </div>
          <div class="w-full bg-stone-700 rounded-full h-1.5 shadow-inner">
            <div 
                class="bg-sky-400 h-1.5 rounded-full" 
                style="width: {Math.min(100, (monster.experience / monster.experienceToNextLevel) * 100)}%"
            ></div>
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
  
  {:else}
    <div class="flex h-full items-center justify-center text-stone-500 opacity-50">
       <span class="text-sm">Waiting for combatant...</span>
    </div>
  {/if}
</div>

<style>
  /* Player is on the Right, moves Left (Negative X) to center */
  .attack-player {
    animation: attack-lunge-left 0.4s ease-in-out;
  }

  /* Enemy is on the Left, moves Right (Positive X) to center */
  .attack-enemy {
    animation: attack-lunge-right 0.4s ease-in-out;
  }

  @keyframes attack-lunge-left {
    0% { transform: translateX(0); }
    50% { transform: translateX(-60%); } /* Lunges Left */
    75% { transform: translateX(100%); } /* Lunges Left */
    100% { transform: translateX(0); }
  }

  @keyframes attack-lunge-right {
    0% { transform: translateX(0); }
    50% { transform: translateX(60%); } /* Lunges Right */
    75% { transform: translateX(-100%); } /* Lunges Right */
    100% { transform: translateX(0); }
  }
</style>