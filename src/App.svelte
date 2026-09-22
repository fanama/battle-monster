<script lang="ts">
  import { container } from "./lib/container";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import RunHud from "./lib/components/atoms/RunHud.svelte";
  import RelicChooser from "./lib/components/atoms/RelicChooser.svelte";
  import { styles } from "./lib/styles/style";

  import type { Monster } from "./core/entities/Monster";
  import { REGIONS } from "./core/entities/Region";
  import MonsterSelector from "./lib/components/atoms/MonsterSelector.svelte";

  const battleStore = container.store;

  $: run = $battleStore.run;
  $: phase = run.phase;
  $: player = $battleStore.playerMonster;
  $: region = REGIONS[run.regionIndex];
</script>

<main class="{styles.layout.main} relative">
  <h1 class={styles.layout.title}>Battle Monster</h1>

  {#if phase === "starter"}
    <div class="flex flex-col items-center gap-5 flex-1 justify-center">
      <div class="text-center max-w-md">
        <p class="text-lg font-serif font-bold text-amber-200">
          Choisissez votre monstre pour commencer
        </p>
        <p class="text-sm text-stone-400 mt-2 leading-relaxed">
          Roguelike : traversez les régions, battez les ⚔️ ennemis sauvages,
          collectez 🃏 des reliques passives et vainquez 👑 le boss de chaque
          région. Une défaite = fin de la partie.
        </p>
      </div>
      <MonsterSelector
        onclick={(selectedMonster: Monster) => {
          battleStore.startRun(selectedMonster);
        }}
      />
    </div>

  {:else if phase === "runover"}
    <div
      class="flex flex-col items-center justify-center gap-4 text-center py-10 flex-1"
    >
      <p class="text-4xl font-serif font-extrabold tracking-widest text-rose-500 uppercase drop-shadow">
        Game Over
      </p>
      <div class="text-stone-300 space-y-1 font-mono text-sm">
        <p>⚔️ {player?.name} (niv. {player?.level})</p>
        <p>🗺️ Arrivé en {region.name}</p>
        <p>🎖️ Score final : <span class="text-amber-300">★ {run.score}</span></p>
        <p>🃏 Reliques : {run.relics.map(r => r.icon).join(' ') || 'aucune'}</p>
      </div>
      <button
        class="{styles.buttons.base} {styles.buttons.danger}"
        on:click={() => battleStore.newRun()}
      >
        Nouveau run
      </button>
    </div>

  {:else if phase === "victory"}
    <div
      class="flex flex-col items-center justify-center gap-4 text-center py-10 flex-1"
    >
      <p class="text-5xl font-serif font-extrabold tracking-widest text-amber-300 uppercase drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
        🏆 Champion !
      </p>
      <p class="text-stone-300 font-mono text-sm">
        Les 4 régions sont conquises. Score : <span class="text-amber-300">★ {run.score}</span>
        · Niveau atteint : <span class="text-amber-300">{player?.level}</span>
      </p>
      <button
        class="{styles.buttons.base} {styles.buttons.primary}"
        on:click={() => battleStore.newRun()}
      >
        Nouveau run
      </button>
    </div>

  {:else}
    <!-- En cours de run -->
    <RunHud
      regionIndex={run.regionIndex}
      encounterIndex={run.encounterIndex}
      relics={run.relics}
      score={run.score}
      isBossFight={$battleStore.isBossFight}
    />

    <div class={styles.layout.arena}>
      {#if $battleStore.isBossFight}
        <div
          class="absolute top-2 left-1/2 -translate-x-1/2 z-20 font-serif font-bold uppercase
            tracking-widest text-rose-300 text-sm md:text-base animate-pulse
            border border-rose-500/60 bg-rose-950/70 rounded-md px-3 py-1"
        >
          👑 Boss de région
        </div>
      {/if}

      <MonsterDisplayer
        monster={$battleStore.playerMonster}
        isPlayer={true}
        isAttacking={$battleStore.isAttacking}
        lastMove={$battleStore.playerLastMove}
        feedback={$battleStore.playerFeedback}
      />
      <MonsterDisplayer
        monster={$battleStore.enemyMonster}
        isPlayer={false}
        isAttacking={$battleStore.isEnemyAttacking}
        lastMove={$battleStore.enemyLastMove}
        feedback={$battleStore.enemyFeedback}
      />

      {#if phase === "relic"}
        <RelicChooser
          offers={run.relicOffers}
          onPick={(r) => battleStore.pickRelic(r)}
          onSkip={() => battleStore.skipRelic()}
        />
      {:else if phase === "regionClear"}
        <div
          class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-lg
            bg-black/80 backdrop-blur-sm p-4 text-center"
        >
          <p class="text-3xl font-serif font-bold tracking-widest text-amber-300 uppercase drop-shadow">
            ⚔️ {region.name} conquise !
          </p>
          <p class="text-stone-300 font-mono text-sm">
            Score : ★ {run.score} · Niveau : {player?.level}
          </p>
          <button
            class="{styles.buttons.base} {styles.buttons.primary}"
            on:click={() => battleStore.advanceRegion()}
          >
            Région suivante →
          </button>
        </div>
      {/if}
    </div>

    <div class="{styles.layout.bottomGrid} relative">
      <Logs bind:logs={$battleStore.logs} />

      <div class={styles.actionBar.container}>
        <div class={styles.actionBar.textureOverlay}></div>

        {#if phase === "encounter" && !$battleStore.winner && player}
          {#each player.moves as move, i}
            <MoveDisplayer
              {move}
              targetType={$battleStore.enemyMonster?.type ?? null}
              onClick={() => battleStore.attack(i)}
            />
          {/each}
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