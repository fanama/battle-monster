<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";
  import type { Move } from "../../../core/entities/Move";

  export let monster: Monster | null | undefined;
  export let isPlayer: boolean;
  export let isAttacking: boolean = false;

  export let lastMove: Move | null = null; // New prop to track the move used

  // Reactive statement to check if the move was a utility move (no damage)
  $: isUtilityMove = lastMove && lastMove.power === 0;
</script>

<div
  class:attack-player={isAttacking && isPlayer && !isUtilityMove}
  class:attack-enemy={isAttacking && !isPlayer && !isUtilityMove}
  class:jump-animation={isAttacking && isUtilityMove}
  class="
    {monsterStyles.container.base} 
    {isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy}
  "
>
  {#if monster}
    <div class={monsterStyles.spriteSection.wrapper}>
      <div class={monsterStyles.spriteSection.overlay}></div>
      <SpriteDisplayer {monster} {isPlayer} />
    </div>

    <div
      class="{monsterStyles.nameTag.wrapper_base} {isPlayer
        ? monsterStyles.nameTag.wrapper_player
        : monsterStyles.nameTag.wrapper_enemy}"
    >
      <div class="flex justify-between items-baseline pr-2">
        <h2 class={monsterStyles.nameTag.text}>
          {monster.name}
        </h2>
        <div
          class={isPlayer
            ? monsterStyles.nameTag.level_player
            : monsterStyles.nameTag.level_enemy}
        >
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
              style="width: {Math.min(
                100,
                (monster.experience / monster.experienceToNextLevel) * 100,
              )}%"
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
    <div
      class="flex h-full items-center justify-center text-stone-500 opacity-50"
    >
      <span class="text-sm">Waiting for combatant...</span>
    </div>
  {/if}
</div>

<style>
  /* --- Attacks (Slide/Lunge) --- */
  .attack-player {
    animation: attack-lunge-left 0.4s ease-in-out;
  }

  .attack-enemy {
    animation: attack-lunge-right 0.4s ease-in-out;
  }

  /* --- Utility (Heal/Boost Jump) --- */
  .jump-animation {
    animation: hop-up 0.4s ease-in-out;
  }

  @keyframes attack-lunge-left {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(-60%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes attack-lunge-right {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(60%);
    }
    100% {
      transform: translateX(0);
    }
  }

  /* Vertical jump for healing or buffs */
  @keyframes hop-up {
    0% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-40px) scale(1.1);
    } /* Jump up and slightly enlarge */
    100% {
      transform: translateY(0) scale(1);
    }
  }
</style>
