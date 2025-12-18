<script lang="ts">
  import { battleStore } from "./lib/stores/battleStore";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import { styles } from "./lib/styles/style";

  import type { Monster } from "./core/entities/Monster";
  import MonsterSelector from "./lib/components/atoms/MonsterSelector.svelte";
</script>

<main class={styles.layout.main}>
  <h1 class={styles.layout.title}>Battle Monster</h1>

  {#if !$battleStore.playerMonster}
    <div class="flex flex-col items-center gap-4">
      <p class="text-center text-lg font-mono text-amber-200">
        Choisissez votre monstre pour commencer
      </p>
      <MonsterSelector
        onclick={(selectedMonster: Monster) => {
          battleStore.selectMonster(selectedMonster);
        }}
      />
    </div>
  {:else}
    {#if $battleStore.winner === "player"}
      <button
        class="{styles.buttons.base} {styles.buttons.primary}"
        on:click={() => battleStore.nextBattle()}
      >
        Prochain combat
      </button>
    {:else if $battleStore.winner === "enemy"}
      <button
        class="{styles.buttons.base} {styles.buttons.danger}"
        on:click={() => battleStore.reset()}
      >
        Recommencer
      </button>
    {/if}

    <div class={styles.layout.arena}>
      <MonsterDisplayer
        monster={$battleStore.playerMonster}
        isPlayer={true}
        isAttacking={$battleStore.isAttacking}
      />
      <MonsterDisplayer
        monster={$battleStore.enemyMonster}
        isPlayer={false}
        isAttacking={$battleStore.isEnemyAttacking}
      />
    </div>

    <div class="{styles.layout.bottomGrid} relative">
      <Logs bind:logs={$battleStore.logs} />

      <div class={styles.actionBar.container}>
        <div class={styles.actionBar.textureOverlay}></div>

        {#if !$battleStore.winner}
          {#each $battleStore.playerMonster.moves as move, i}
            <MoveDisplayer {move} onClick={() => battleStore.attack(i)} />
          {/each}
        {:else}
          <div
            class="
          {styles.winner.base}
          {$battleStore.winner === 'player'
              ? styles.winner.victory
              : styles.winner.defeat}
          "
          >
            {$battleStore.winner === "player"
              ? "⚔ Victoire ⚔"
              : "💀 Défaite..."}
          </div>

          <!-- Monster Selector on Win/Loss -->
          <div class="absolute -bottom-24 flex justify-center w-full">
            <MonsterSelector
              onclick={(selectedMonster: Monster) => {
                battleStore.selectMonster(selectedMonster);
              }}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    background-color: #1c1917;
    color: #e7e5e4;
    overscroll-behavior-y: none;
  }
</style>

