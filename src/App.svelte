<script lang="ts">
  import { container } from "./lib/container";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import RunHud from "./lib/components/atoms/RunHud.svelte";
  import RunTabs from "./lib/components/atoms/RunTabs.svelte";
  import RelicList from "./lib/components/atoms/RelicList.svelte";
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
  import { tabForPhase, type RunTab, type RunTabId } from "./lib/runTabs";

  import type { Monster } from "./core/entities/Monster";
  import type { RunPhase } from "./core/entities/BattleState";
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

  // --- Onglets du run (mobile first) ---------------------------------------
  let activeTab: RunTabId = 'arena';
  let lastPhase = phase;

  // L'onglet suit les changements de phase (carte → boutique → arène), sans
  // jamais éjecter l'utilisateur d'un onglet qu'il consulte (hors phases
  // bloquantes, où l'arène est imposée).
  $: if (phase !== lastPhase) {
    lastPhase = phase;
    activeTab = tabForPhase(phase);
  }

  $: forcedTab = phase === 'relic' || phase === 'regionClear' ? ('arena' as RunTabId) : null;
  $: currentTab = (forcedTab ?? activeTab) as RunTabId;

  $: isMyTurn =
    phase === 'encounter' &&
    !!$battleStore.isPlayerTurn &&
    !$battleStore.winner &&
    !$battleStore.isAttacking &&
    !$battleStore.isEnemyAttacking;

  // `relicCount` est passé explicitement : Svelte ne suit pas les variables
  // lues dans le corps d'une fonction, le badge doit donc rester réactif.
  $: tabs = buildTabs(phase, isMyTurn, run.relics.length);

  function buildTabs(currentPhase: RunPhase, canAct: boolean, relicCount: number): RunTab[] {
    const list: RunTab[] = [
      { id: 'arena', label: 'Arène', icon: '⚔️', alert: canAct },
      { id: 'map', label: 'Carte', icon: '🗺️' },
    ];

    if (currentPhase === 'shop') {
      list.push({ id: 'shop', label: 'Boutique', icon: '🛒' });
    }

    list.push({ id: 'champion', label: 'Champion', icon: '🐉' });
    list.push({
      id: 'relics',
      label: 'Reliques',
      icon: '🔱',
      badge: relicCount || undefined,
    });
    list.push({ id: 'logs', label: 'Journal', icon: '📜' });
    return list;
  }

  $: totalPotions = run.inventory.reduce((a, s) => a + s.quantity, 0);

  // L'arène s'agrandit sur les phases plein écran (choix de relique, région
  // conquise) pour que l'overlay tienne sans déborder.
  $: arenaStyle =
    phase === 'relic' || phase === 'regionClear'
      ? `${regionColors.arenaBg}; min-height: min(70dvh, 520px);`
      : regionColors.arenaBg;

  function openCodex(tab: 'rules' | 'elements' | 'regions' = 'rules') {
    codexTab = tab;
    isCodexOpen = true;
  }
</script>

<!--
  SHELL MOBILE FIRST : `h-dvh` + `overflow-hidden` → l'application occupe
  exactement la fenêtre, sans débordement ni en largeur ni en hauteur.
  Seul le panneau actif défile.
-->
<div class="h-dvh w-full max-w-full overflow-hidden flex flex-col bg-[#141210] text-stone-200">
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

  {#if phase === "starter"}
    <div class="flex-1 min-h-0 scroll-panel">
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

      <!-- FOOTER (écran titre) -->
      <Footer
        {saveInfo}
        onOpenCodex={openCodex}
        onChooseStarter={() => {
          const el = document.getElementById("starters");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  {:else if phase === "runover"}
    <div class="flex-1 min-h-0 scroll-panel flex flex-col">
      <div
        class="flex flex-col items-center justify-center gap-4 text-center py-10 px-4 flex-1"
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

      <Footer
        {saveInfo}
        onOpenCodex={openCodex}
        onChooseStarter={() => battleStore.quitToMenu()}
      />
    </div>
  {:else if phase === "victory"}
    <div class="flex-1 min-h-0 scroll-panel flex flex-col">
      <div
        class="flex flex-col items-center justify-center gap-4 text-center py-10 px-4 flex-1"
      >
        <p class="text-4xl sm:text-5xl font-serif font-extrabold tracking-widest text-amber-300 uppercase drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
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

      <Footer
        {saveInfo}
        onOpenCodex={openCodex}
        onChooseStarter={() => battleStore.quitToMenu()}
      />
    </div>
  {:else}
    <!-- ================= EN COURS DE RUN ================= -->
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
      onOpenRelics={() => (activeTab = 'relics')}
    />

    {#if !forcedTab}
      <RunTabs
        {tabs}
        activeTab={currentTab}
        onSelect={(id) => (activeTab = id)}
      />
    {/if}

    <main class="flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col overflow-hidden font-mono select-none">
      <!-- ================= ONGLET : ARÈNE ================= -->
      {#if currentTab === 'arena'}
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 pt-1 pb-2">
            <div class="{styles.layout.arena} {regionColors.border}" style={arenaStyle}>
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
                    tracking-widest text-amber-100 text-xs sm:text-sm md:text-base animate-pulse
                    border-2 border-amber-300/70 bg-gradient-to-b from-rose-800 to-rose-900
                    rounded-md px-2 py-0.5 sm:px-3 sm:py-1 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                >
                  👑 Boss de région
                </div>
              {/if}

              {#if $battleStore.enemyMonster}
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
              {:else if phase !== 'relic' && phase !== 'regionClear'}
                <div class="w-full flex flex-col items-center justify-center gap-3 text-center py-6">
                  <span class="text-4xl">🗺️</span>
                  <p class="text-stone-400 font-mono text-xs">
                    Aucune rencontre en cours — choisissez votre prochaine destination.
                  </p>
                  <button
                    type="button"
                    on:click={() => (activeTab = 'map')}
                    class="px-3 py-1.5 rounded-lg border border-amber-500/60 bg-amber-950/40 text-amber-300 text-xs font-mono font-bold hover:bg-amber-900/50 transition-colors cursor-pointer"
                  >
                    Ouvrir la carte →
                  </button>
                </div>
              {/if}

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
                  <p class="text-2xl sm:text-3xl font-serif font-bold tracking-widest text-amber-300 uppercase drop-shadow">
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
          </div>

          <!-- Barre d'action : toujours visible, collée en bas (thumb reach). -->
          {#if !forcedTab}
            <div
              class="shrink-0 px-2 sm:px-3 pb-[env(safe-area-inset-bottom)] flex flex-col gap-2"
            >
              <div class={styles.actionBar.container}>
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
                {:else}
                  <p class="relative z-10 col-span-2 flex items-center justify-center text-center
                    font-mono text-xs text-stone-400 px-2 py-3">
                    {phase === "map" ? "Choisissez un nœud sur la carte pour entrer en combat." : "Aucun combat en cours."}
                  </p>
                {/if}
              </div>

              {#if phase === "encounter" && !$battleStore.winner && player}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    on:click={() => (isInventoryOpen = true)}
                    class="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-amber-500/50 bg-stone-900/90
                      hover:bg-amber-950/40 text-amber-200 text-[11px] sm:text-xs font-mono font-bold transition-all
                      flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                  >
                    <span>🎒</span>
                    <span class="truncate">Sacoche ({totalPotions})</span>
                  </button>

                  <button
                    type="button"
                    on:click={() => openCodex('elements')}
                    class="shrink-0 px-2.5 py-1.5 rounded-xl border border-stone-700 bg-stone-900/90
                      text-stone-300 text-[11px] sm:text-xs font-mono hover:bg-stone-800 transition-all cursor-pointer"
                    title="Faiblesses & Statuts"
                  >
                    📖 <span class="hidden sm:inline">Faiblesses</span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

      <!-- ================= ONGLET : CARTE ================= -->
      {:else if currentTab === 'map'}
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 pt-1 pb-2">
          <MapView
            map={run.map!}
            currentLayer={run.mapLayer}
            path={run.path}
            onNodeSelect={(col) => battleStore.chooseNode(col)}
          />
        </div>

      <!-- ================= ONGLET : BOUTIQUE ================= -->
      {:else if currentTab === 'shop'}
        <div class="flex-1 min-h-0 scroll-panel pt-1">
          <ShopView
            stock={run.shopStock}
            gold={run.gold}
            player={player}
            inventory={run.inventory}
            onBuy={(item) => battleStore.buyShopItem(item)}
            onLeave={() => battleStore.leaveShop()}
          />
        </div>

      <!-- ================= ONGLET : CHAMPION ================= -->
      {:else if currentTab === 'champion'}
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 py-2 flex flex-col gap-3">
          <button
            type="button"
            on:click={() => battleStore.openMoveModal(false)}
            class="w-full py-2.5 px-3 rounded-xl font-serif font-bold text-xs sm:text-sm uppercase tracking-wider
              border border-violet-500/60 bg-gradient-to-r from-violet-950/80 to-purple-900/70 hover:from-violet-900 hover:to-purple-800
              text-violet-200 hover:text-white shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Ouvrir le grimoire pour configurer vos attaques"
          >
            <span>📜</span>
            <span class="truncate">Grimoire des Attaques</span>
          </button>

          <ChampionCard monster={player} onOpenMoves={() => battleStore.openMoveModal(false)} />

          <button
            type="button"
            on:click={() => (isInventoryOpen = true)}
            class="w-full py-2.5 px-3 rounded-xl font-mono font-bold text-xs
              border border-amber-500/50 bg-stone-900/90 hover:bg-amber-950/40 text-amber-200
              transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>🎒</span>
            <span>Sacoche ({totalPotions})</span>
          </button>
        </div>

      <!-- ================= ONGLET : RELIQUES OBTENUES ================= -->
      {:else if currentTab === 'relics'}
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 py-2">
          <RelicList relics={run.relics} {player} />
        </div>

      <!-- ================= ONGLET : JOURNAL ================= -->
      {:else}
        <div class="flex-1 min-h-0 flex flex-col px-2 sm:px-3 pb-[env(safe-area-inset-bottom)] pt-1">
          <Logs logs={$battleStore.logs} fill={true} />
        </div>
      {/if}
    </main>
  {/if}

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
