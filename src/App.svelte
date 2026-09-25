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
  import MoveManagerModal from "./lib/components/molecules/MoveManagerModal.svelte";
  import InventoryModal from "./lib/components/molecules/InventoryModal.svelte";
  import Home from "./lib/components/molecules/Home.svelte";
  import { styles } from "./lib/styles/style";
  import { REGION_COLORS } from "./lib/styles/regionColors";

  import type { Monster } from "./core/entities/Monster";
  import { REGIONS } from "./core/entities/Region";

  const battleStore = container.store;
  const savedRun = battleStore.savedRun;
  const savedChampions = battleStore.savedChampions;
  const isMoveModalOpen = battleStore.isMoveModalOpen;
  const isLevelUpMovePrompt = battleStore.isLevelUpMovePrompt;

  $: run = $battleStore.run;
  $: phase = run.phase;
  $: player = $battleStore.playerMonster;
  $: region = REGIONS[run.regionIndex];
  // Palette de l'arène = couleurs de la région courante (partagées avec le HUD).
  $: regionColors = REGION_COLORS[region.id] ?? REGION_COLORS["region-verdure"];

  // Menu titre : si une partie est sauvegardée → bouton « Continuer ».
  $: saveInfo = $savedRun ? battleStore.getSaveInfo() : null;
  $: availableMoves = player ? battleStore.getAvailableMoves() : [];

  let isCodexOpen = false;
  let codexTab: 'rules' | 'elements' | 'regions' = 'rules';
  let isInventoryOpen = false;

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
    onOpenMoves={() => battleStore.openMoveModal(false)}
    onQuitToMenu={() => battleStore.quitToMenu()}
  />

  <div class="flex-1 flex flex-col">
    {#if phase === "starter"}
      <Home
        saveInfo={saveInfo}
        savedChampions={$savedChampions}
        onContinue={() => battleStore.loadSaved()}
        onNewGame={() => battleStore.deleteSave()}
        onDeleteChampion={(id) => battleStore.deleteSavedChampion(id)}
        onSaveImportedChampion={(monster, regionIndex, regionName) => {
          battleStore.saveImportedChampion(monster, regionIndex, regionName);
        }}
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
              Partie Terminée
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
              Nouvelle partie
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
              Nouvelle partie
            </button>
          </div>

        {:else}
          <!-- En cours de run -->
          <RunHud
            regionIndex={run.regionIndex}
            mapLayer={run.mapLayer}
            mapLayers={run.map?.layers.length ?? 0}
            relics={run.relics}
            inventory={run.inventory}
            score={run.score}
            gold={run.gold}
            isBossFight={$battleStore.isBossFight}
            onOpenInventory={() => (isInventoryOpen = true)}
          />

          {#if phase === "map"}
            <div class="flex flex-col lg:flex-row gap-4 md:gap-6 items-start justify-center w-full">
              <div class="w-full lg:flex-1 min-w-0 max-w-full lg:max-w-xl mx-auto lg:mx-0">
                <MapView
                  map={run.map!}
                  currentLayer={run.mapLayer}
                  path={run.path}
                  onNodeSelect={(col) => battleStore.chooseNode(col)}
                />
              </div>
              <div class="w-full lg:w-80 xl:w-96 flex flex-col gap-3 mx-auto lg:mx-0 shrink-0">
                <button
                  type="button"
                  on:click={() => battleStore.openMoveModal(false)}
                  class="w-full py-2.5 px-4 rounded-xl font-serif font-bold text-xs sm:text-sm uppercase tracking-wider
                    border border-violet-500/60 bg-gradient-to-r from-violet-950/80 to-purple-900/70 hover:from-violet-900 hover:to-purple-800
                    text-violet-200 hover:text-white shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Ouvrir le grimoire pour configurer vos attaques"
                >
                  <span>📜</span>
                  <span>Grimoire des Attaques (Modifier)</span>
                </button>
                <ChampionCard monster={player} onOpenMoves={() => battleStore.openMoveModal(false)} />
              </div>
            </div>
          {:else if phase === "shop"}
            <ShopView
              stock={run.shopStock}
              gold={run.gold}
              player={player}
              inventory={run.inventory}
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
                pb-[env(safe-area-inset-bottom)] md:pb-0 flex flex-col gap-2"
            >
              <div class="{styles.actionBar.container}">
                <div class={styles.actionBar.textureOverlay}></div>

                {#if phase === "encounter" && !$battleStore.winner && player}
                  {#each player.moves as move, i}
                    <MoveDisplayer
                      {move}
                      targetType={$battleStore.enemyMonster?.type ?? null}
                      disabled={!$battleStore.isPlayerTurn || !!$battleStore.winner || $battleStore.isAttacking || $battleStore.isEnemyAttacking}
                      onClick={() => battleStore.attack(i)}
                    />
                  {/each}
                {/if}
              </div>

              {#if phase === "encounter" && !$battleStore.winner && player}
                <div class="flex items-center justify-between px-1">
                  <button
                    type="button"
                    on:click={() => (isInventoryOpen = true)}
                    class="px-3.5 py-1.5 rounded-xl border border-amber-500/50 bg-stone-900/90 hover:bg-amber-950/40 text-amber-200 text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
                  >
                    <span>🎒</span>
                    <span>Ouvrir la Sacoche ({run.inventory.reduce((a, s) => a + s.quantity, 0)} potion{run.inventory.reduce((a, s) => a + s.quantity, 0) > 1 ? 's' : ''})</span>
                  </button>

                  <button
                    type="button"
                    on:click={() => openCodex('elements')}
                    class="text-xs font-mono text-stone-400 hover:text-stone-200 underline cursor-pointer"
                  >
                    📖 Faiblesses & Statuts
                  </button>
                </div>
              {/if}
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

  <!-- MODAL INVENTAIRE / SACOCHE -->
  {#if isInventoryOpen}
    <InventoryModal
      inventory={run.inventory}
      player={player}
      isPlayerTurn={$battleStore.isPlayerTurn && !$battleStore.isAttacking && !$battleStore.isEnemyAttacking && !$battleStore.winner}
      disabled={phase === 'encounter' && (!$battleStore.isPlayerTurn || !!$battleStore.winner || $battleStore.isAttacking || $battleStore.isEnemyAttacking)}
      on:use={(e) => battleStore.useConsumable(e.detail.itemId)}
      on:close={() => (isInventoryOpen = false)}
    />
  {/if}

  <!-- MODAL CODEX ET RÈGLES INTERACTIF DISPONIBLE PARTOUT -->
  <CodexModal
    isOpen={isCodexOpen}
    activeTab={codexTab}
    onClose={() => isCodexOpen = false}
  />

  <!-- MODAL DE GESTION DES CAPACITÉS & MONTÉE DE NIVEAU -->
  <MoveManagerModal
    isOpen={$isMoveModalOpen}
    isLevelUp={$isLevelUpMovePrompt}
    monster={player}
    availableMoves={availableMoves}
    onSave={(selectedMoves) => battleStore.setPlayerMoves(selectedMoves)}
    onClose={() => battleStore.closeMoveModal()}
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