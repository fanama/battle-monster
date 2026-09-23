<script lang="ts">
  import { container } from "./lib/container";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import RunHud from "./lib/components/atoms/RunHud.svelte";
  import RelicChooser from "./lib/components/atoms/RelicChooser.svelte";
  import MapView from "./lib/components/atoms/MapView.svelte";
  import ShopView from "./lib/components/atoms/ShopView.svelte";
  import ChampionCard from "./lib/components/molecules/ChampionCard.svelte";
  import Header from "./lib/components/molecules/Header.svelte";
  import Footer from "./lib/components/molecules/Footer.svelte";
  import CodexModal from "./lib/components/molecules/CodexModal.svelte";
  import Home from "./lib/components/molecules/Home.svelte";
  import { styles } from "./lib/styles/style";
  import { REGION_COLORS } from "./lib/styles/regionColors";

  import type { Monster } from "./core/entities/Monster";
  import { REGIONS } from "./core/entities/Region";

  const battleStore = container.store;
  const savedRun = battleStore.savedRun;

  $: run = $battleStore.run;
  $: phase = run.phase;
  $: player = $battleStore.playerMonster;
  $: region = REGIONS[run.regionIndex];
  // Palette de l'arène = couleurs de la région courante (partagées avec le HUD).
  $: regionColors = REGION_COLORS[region.id] ?? REGION_COLORS["region-verdure"];

  // Menu titre : si une partie est sauvegardée → bouton « Continuer ».
  $: saveInfo = $savedRun ? battleStore.getSaveInfo() : null;

  let isCodexOpen = false;
  let codexTab: 'rules' | 'elements' | 'regions' = 'rules';

  function openCodex(tab: 'rules' | 'elements' | 'regions' = 'rules') {
    codexTab = tab;
    isCodexOpen = true;
  }
</script>

<div class="min-h-dvh flex flex-col bg-[#141210] text-stone-200">
  <!-- HEADER PERSISTANT SUR TOUTES LES PAGES (Home, Map, Arène, Shop, etc.) -->
  <Header
    {phase}
    {player}
    {region}
    gold={run.gold}
    score={run.score}
    {saveInfo}
    onContinue={() => battleStore.loadSaved()}
    onStartClick={() => {
      if (phase === "starter") {
        const el = document.getElementById("starters");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    }}
    onOpenCodex={openCodex}
    onQuitToMenu={() => battleStore.quitToMenu()}
  />

  <div class="flex-1 flex flex-col">
    {#if phase === "starter"}
      <Home
        saveInfo={saveInfo}
        onContinue={() => battleStore.loadSaved()}
        onNewGame={() => battleStore.deleteSave()}
        onStartRun={(monster: Monster) => {
          battleStore.startRun(monster);
        }}
      />
    {:else}
      <main class="{styles.layout.main} relative flex-1">
        {#if phase === "runover"}
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
            mapLayer={run.mapLayer}
            mapLayers={run.map?.layers.length ?? 0}
            relics={run.relics}
            score={run.score}
            gold={run.gold}
            isBossFight={$battleStore.isBossFight}
          />

          {#if phase === "map"}
            <div class="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              <div class="w-full md:w-auto min-w-[320px] max-w-[640px]">
                <MapView
                  map={run.map!}
                  currentLayer={run.mapLayer}
                  path={run.path}
                  onNodeSelect={(col) => battleStore.chooseNode(col)}
                />
              </div>
              <div class="w-full md:w-auto md:min-w-[320px] md:max-w-[440px]">
                <ChampionCard monster={player} />
              </div>
            </div>
          {:else if phase === "shop"}
            <ShopView
              stock={run.shopStock}
              gold={run.gold}
              player={player}
              onBuy={(item) => battleStore.buyShopItem(item)}
              onLeave={() => battleStore.leaveShop()}
            />
          {:else}
          <div
            class="{styles.layout.arena} {regionColors.border}"
            style={regionColors.arenaBg}
          >
            <span
              class="absolute top-2 left-2 z-10 font-mono font-bold uppercase tracking-widest
                text-[10px] text-sky-300 border border-sky-400/40 bg-sky-950/60 rounded px-1.5 py-0.5"
            >
              Vous
            </span>
            <span
              class="absolute top-2 right-2 z-10 font-mono font-bold uppercase tracking-widest
                text-[10px] text-rose-300 border border-rose-500/40 bg-rose-950/60 rounded px-1.5 py-0.5"
            >
              Ennemi
            </span>

            {#if $battleStore.isBossFight}
              <div
                class="absolute top-2 left-1/2 -translate-x-1/2 z-20 font-serif font-bold uppercase
                  tracking-widest text-amber-100 text-sm md:text-base animate-pulse
                  border-2 border-amber-300/70 bg-gradient-to-b from-rose-800 to-rose-900
                  rounded-md px-3 py-1 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
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
            <div class="order-2 min-w-0 md:order-1">
              <Logs logs={$battleStore.logs} />
            </div>

            <div
              class="order-1 md:order-2 sticky bottom-0 md:static z-30
                pb-[env(safe-area-inset-bottom)] md:pb-0"
            >
              <div class="{styles.actionBar.container}">
                <div class={styles.actionBar.textureOverlay}></div>

                {#if phase === "encounter" && !$battleStore.winner && player}
                  {#each player.moves as move, i}
                    <MoveDisplayer
                      {move}
                      targetType={$battleStore.enemyMonster?.type ?? null}
                      disabled={!$battleStore.isPlayerTurn || !!$battleStore.winner}
                      onClick={() => battleStore.attack(i)}
                    />
                  {/each}
                {/if}
              </div>
            </div>
          </div>
          {/if}
        {/if}
      </main>
    {/if}
  </div>

  <!-- FOOTER PERSISTANT SUR TOUTES LES PAGES -->
  <Footer
    {saveInfo}
    onOpenCodex={openCodex}
    onChooseStarter={() => {
      if (phase !== "starter") {
        battleStore.quitToMenu();
      } else {
        const el = document.getElementById("starters");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    }}
  />

  <!-- MODAL CODEX ET RÈGLES INTERACTIF DISPONIBLE PARTOUT -->
  <CodexModal
    isOpen={isCodexOpen}
    activeTab={codexTab}
    onClose={() => isCodexOpen = false}
  />
</div>

<style>
  :global(body) {
    background-color: #141210;
    color: #e7e5e4;
    overscroll-behavior-y: none;
  }

  :global(*),
  :global(*::before),
  :global(*::after) {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  :global(.pattern-dots) {
    background-image: radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px);
    background-size: 12px 12px;
  }
</style>