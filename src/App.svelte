<script lang="ts">
  import { battleStore } from "./lib/stores/battleStore";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import { styles } from "./lib/styles/style";
</script>

<main class={styles.layout.main}>
  <h1 class={styles.layout.title}>Battle Monster</h1>
  <div class={styles.layout.arena}>
    <MonsterDisplayer monster={$battleStore.playerMonster} isPlayer={true} />
    <MonsterDisplayer monster={$battleStore.enemyMonster} isPlayer={false} />
  </div>

  <div class={styles.layout.bottomGrid}>
    <Logs bind:logs={$battleStore.logs} />

    <div class={styles.actionBar.container}>
      <div class={styles.actionBar.textureOverlay}></div>

      {#each $battleStore.playerMonster.moves as move, i}
        <div class={styles.actionBar.moveWrapper}>
          <MoveDisplayer {move} onClick={() => battleStore.attack(i)} />
        </div>
      {/each}

      {#if $battleStore.winner}
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
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    /* Optional: Sets a dark background for the whole page to match the stone theme */
    background-color: #1c1917;
    color: #e7e5e4;
  }
</style>
