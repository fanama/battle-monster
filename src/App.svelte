<script lang="ts">
  import { container } from "./lib/container";
  import MonsterDisplayer from "./lib/components/molecules/MonsterDisplayer.svelte";
  import Logs from "./lib/components/molecules/Logs.svelte";
  import MoveDisplayer from "./lib/components/atoms/MoveDisplayer.svelte";
  import FighterHud from "./lib/components/atoms/FighterHud.svelte";
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
  import EquipmentModal from "./lib/components/molecules/EquipmentModal.svelte";
  import { EQUIPMENT_SLOT_LABELS, type EquipmentSlot } from "./core/entities/Equipment";
  import InventoryModal from "./lib/components/molecules/InventoryModal.svelte";
  import Home from "./lib/components/molecules/Home.svelte";
  import { styles } from "./lib/styles/style";
  import { REGION_COLORS } from "./lib/styles/regionColors";
  import { tabForPhase, type RunTab, type RunTabId } from "./lib/runTabs";
  import { celebration } from "./lib/stores/juiceStore";
  import { playSound } from "./lib/audio/gameAudio";

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
  /** Fenêtre « Équipement » (capacités signature) : portage hors combat. */
  let isEquipmentOpen = false;
  // L'équipement se change hors combat uniquement : carte ou boutique.
  $: canManageEquipment =
    ($battleStore.run.phase === "map" || $battleStore.run.phase === "shop") &&
    !$battleStore.enemyMonster;

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

  // Juice « combat » : l'arène tremble sur un coup critique subi (feedback de
  // l'un ou de l'autre camp en cours d'affichage, nettoyé par le store).
  $: critArenaShake = !![$battleStore.playerFeedback, $battleStore.enemyFeedback].find(
    (fb) => fb && fb.kind === "damage" && fb.isCrit,
  );

  // `relicCount` est passé explicitement : Svelte ne suit pas les variables
  // lues dans le corps d'une fonction, le badge doit donc rester réactif.
  $: tabs = buildTabs(
    phase,
    isMyTurn,
    run.relics.length,
    $battleStore.run.equipmentBag?.length ?? 0,
  );

  function buildTabs(
    currentPhase: RunPhase,
    canAct: boolean,
    relicCount: number,
    bagCount: number = 0,
  ): RunTab[] {
    const list: RunTab[] = [
      { id: 'arena', label: 'Arène', icon: '⚔️', alert: canAct },
      { id: 'map', label: 'Carte', icon: '🗺️' },
    ];

    if (currentPhase === 'shop') {
      list.push({ id: 'shop', label: 'Boutique', icon: '🛒' });
    }

    // Pastille dorée sur l'onglet Champion : des pièces attendent d'être portées.
    list.push({ id: 'champion', label: 'Champion', icon: '🐉', alert: bagCount > 0 });
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

  /**
   * Issue du round pour un côté de l’arène : le vainqueur célèbre, le perdant
   * s’affaisse. Tant qu'aucun vainqueur n’est désigné, rien n’est joué.
   */
  function outcomeFor(isPlayer: boolean): 'victory' | 'defeat' | null {
    const winner = $battleStore.winner;
    if (!winner) return null;
    const didWin = (isPlayer && winner === 'player') || (!isPlayer && winner === 'enemy');
    return didWin ? 'victory' : 'defeat';
  }

  // Confettis de célébration : positions et retards pseudo-aléatoires, calculés
  // une fois par affichage de l'overlay ({#key} recrée les éléments).
  $: confetti = $celebration
    ? Array.from({ length: 16 }, (_, i) => ({
        i,
        left: Math.round(4 + Math.random() * 92),
        delay: (Math.random() * 0.5).toFixed(2),
        drift: (Math.random() * 40 - 20).toFixed(0),
        color: ['#fbbf24', '#f472b6', '#38bdf8', '#4ade80', '#f87171', '#c084fc'][i % 6],
      }))
    : [];
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
        <div class="flex-1 min-h-0 flex flex-col panel-enter">
          <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 pt-1 pb-2">
            <div
              class="{styles.layout.arena} {regionColors.border}"
              class:screen-shake={critArenaShake}
              style={arenaStyle}
            >
              <!-- SCÈNE (Dragon Quest) : ciel étoilé scintillant + lune, horizon
                   bleu nuit, sol en perspective assombri, vignette de cadre.
                   Tout est posé en couches semi-transparentes par-dessus la
                   teinte régionale (arenaBg), fade de 38 % pour le ciel. -->
              <div class="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
                <!-- Étoiles : deux couches à Cindy scintillement décalées -->
                <div class="dq-stars dq-stars-far absolute inset-x-0 top-0 h-[40%]"></div>
                <div class="dq-stars dq-stars-near absolute inset-x-0 top-0 h-[40%]"></div>

                <!-- Lune flottant dans le ciel (halo externe, sans relief) -->
                <div class="dq-moon absolute top-[7%] right-[12%] h-14 w-14 rounded-full"></div>

                <!-- Obscurcissement du ciel (la nuit pèse en haut, l'horizon repousse) -->
                <div
                  class="absolute inset-x-0 top-0 h-[40%]"
                  style="background: linear-gradient(180deg, rgba(2,6,23,0.5) 0%, rgba(2,6,23,0.15) 55%, rgba(0,0,0,0) 100%)"
                ></div>

                <!-- Ligne d'horizon : bleu nuit lumineux façon Dragon Quest -->
                <div
                  class="absolute inset-x-0"
                  style="bottom: 62%; height: 1px; background: linear-gradient(90deg, rgba(125,211,252,0) 0%, rgba(147,197,253,0.5) 40%, rgba(254,249,195,0.55) 50%, rgba(147,197,253,0.5) 60%, rgba(125,211,252,0) 100%); box-shadow: 0 0 12px rgba(125,211,252,0.35)"
                ></div>

                <!-- Sol en dégradé bleu nuit + geyseur lumineux au centre -->
                <div
                  class="absolute inset-x-0 bottom-0 h-[62%]"
                  style="background: linear-gradient(180deg, rgba(15,23,42,0.28) 0%, rgba(2,6,23,0.55) 45%, rgba(0,0,0,0.78) 100%)"
                ></div>
                <div
                  class="absolute inset-0"
                  style="background: radial-gradient(ellipse 58% 42% at 50% 76%, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0.05) 45%, transparent 72%)"
                ></div>

                <!-- Lignes de sol en perspective (bleutées DQ) -->
                <div
                  class="absolute inset-0"
                  style="background-image: repeating-linear-gradient(to bottom, rgba(147,197,253,0.09) 0 1px, transparent 1px 9%); background-size: 100% 38%"
                ></div>

                <!-- Vignette DQ : bords assombris façon encadré de combat -->
                <div class="dq-vignette absolute inset-0"></div>
              </div>

              <!-- HUD façon Street Fighter : barres de vie ancrées en haut -->
              <div class="absolute inset-x-0 top-0 z-30 flex justify-between gap-2 px-2 sm:px-4 pt-2 pointer-events-none">
                <FighterHud monster={$battleStore.playerMonster} isPlayer={true} />
                <FighterHud monster={$battleStore.enemyMonster} isPlayer={false} />
              </div>

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
                <!-- Combattants alignés sur la même ligne de sol, face à face -->
                <div class={styles.layout.arenaStage}>
                  <MonsterDisplayer
                    monster={$battleStore.playerMonster}
                    isPlayer={true}
                    variant="stage"
                    outcome={outcomeFor(true)}
                    isAttacking={$battleStore.isAttacking}
                    lastMove={$battleStore.playerLastMove}
                    feedback={$battleStore.playerFeedback}
                  />
                  <MonsterDisplayer
                    monster={$battleStore.enemyMonster}
                    isPlayer={false}
                    variant="stage"
                    outcome={outcomeFor(false)}
                    isAttacking={$battleStore.isEnemyAttacking}
                    lastMove={$battleStore.enemyLastMove}
                    feedback={$battleStore.enemyFeedback}
                  />

                  <!-- Bandeau de fin de round : reste affiché pendant
                       ROUND_END_DELAY, le temps que l'animation se joue. -->
                  {#if $battleStore.winner}
                    <div
                      class="absolute inset-0 z-40 flex items-center justify-center
                        bg-black/25 backdrop-blur-[1px] pointer-events-none"
                    >
                      <p
                        class="font-serif font-black uppercase tracking-[0.25em]
                          text-4xl sm:text-6xl animate-pulse drop-shadow-lg
                          {$battleStore.winner === 'player'
                            ? 'text-amber-300 [text-shadow:0_0_24px_rgba(251,191,36,0.7)]'
                            : 'text-rose-400 [text-shadow:0_0_24px_rgba(244,63,94,0.7)]'}"
                      >
                        {$battleStore.winner === 'player' ? 'Victoire' : 'Défaite'}
                      </p>
                    </div>
                  {/if}
                </div>
              {:else if phase !== 'relic' && phase !== 'regionClear'}
                <div class="w-full flex-1 flex flex-col items-center justify-center gap-3 text-center py-6">
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
                  equipmentOffers={run.equipOffers}
                  onPickRelic={(r) => battleStore.pickRelic(r)}
                  onPickEquip={(p) => battleStore.pickEquipOffer(p)}
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
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 pt-1 pb-2 panel-enter">
          <MapView
            map={run.map!}
            currentLayer={run.mapLayer}
            path={run.path}
            onNodeSelect={(col) => battleStore.chooseNode(col)}
          />
        </div>

      <!-- ================= ONGLET : BOUTIQUE ================= -->
      {:else if currentTab === 'shop'}
        <div class="flex-1 min-h-0 scroll-panel pt-1 panel-enter">
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
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 py-2 flex flex-col gap-3 panel-enter">
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

          <div class="relative">
            <button
              type="button"
              on:click={() => (isEquipmentOpen = true)}
              disabled={!canManageEquipment}
              class="w-full py-2.5 px-3 rounded-xl font-mono font-bold text-xs
                border border-emerald-500/50 bg-stone-900/90 hover:bg-emerald-950/40 text-emerald-200
                transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed"
              title="Porter ou retirer des pièces d'équipement (hors combat uniquement)"
            >
              <span>🧰</span>
              <span>Équipement ({$battleStore.run.equipmentBag?.length ?? 0} en sacoche)</span>
            </button>
            <!-- Pastille dorée : une pièce attend d'être portée (offres mixées,
                 drops garantis, butin de boss) -->
            {#if ($battleStore.run.equipmentBag?.length ?? 0) > 0}
              <span
                class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center
                  rounded-full border border-amber-200 bg-amber-400 px-1
                  font-mono text-[9px] font-black text-stone-950
                  shadow-[0_0_8px_rgba(251,191,36,0.7)] animate-pulse"
                title="Des pièces attendent dans la sacoche"
              >
                {$battleStore.run.equipmentBag!.length}
              </span>
            {/if}
          </div>
        </div>

      <!-- ================= ONGLET : RELIQUES OBTENUES ================= -->
      {:else if currentTab === 'relics'}
        <div class="flex-1 min-h-0 scroll-panel px-2 sm:px-3 py-2 panel-enter">
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

  <!-- MODAL ÉQUIPEMENT : 5 emplacements DQ, portage hors combat -->
  {#if isEquipmentOpen}
    <EquipmentModal
      isOpen={isEquipmentOpen}
      monster={player}
      bag={$battleStore.run.equipmentBag ?? []}
      canManage={canManageEquipment}
      on:equip={(e) => battleStore.equipPiece(e.detail)}
      on:unequip={(e) => battleStore.unequipPiece(e.detail)}
      on:close={() => (isEquipmentOpen = false)}
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

  <!--
    OVERLAY DE CÉLÉBRATION (juice volatil) : fanfare de montée de niveau et
    victoire de boss (confettis). Pointer-events none → jamais bloquant, il
    retombe tout seul quand le store réinitialise `celebration`.
  -->
  {#if $celebration}
    {#key $celebration}
      <div
        class="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {#each confetti as c (c.i)}
          <span
            class="ceu-confetti"
            style="left:{c.left}%; background:{c.color}; animation-delay:{c.delay}s; --ceu-drift:{c.drift}px"
          ></span>
        {/each}
        {#if $celebration === 'levelup'}
          <div class="ceu-rays-cele"></div>
          <div class="ceu-banner-cele ceu-banner-levelup">
            <span class="ceu-star">⭐</span>
            <span>NIVEAU SUPÉRIEUR !</span>
            <span class="ceu-sub">Fanfare en cours — configurez vos capacités</span>
          </div>
        {:else}
          <div class="ceu-rays-cele"></div>
          <div class="ceu-banner-cele ceu-banner-boss">
            <span class="ceu-star">🏆</span>
            <span>BOSS CONQUIS !</span>
            <span class="ceu-sub">Butin légendaire en approche…</span>
          </div>
        {/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  :global(body) {
    background-color: #141210;
    color: #e7e5e4;
    overscroll-behavior-y: none;
    font-family: var(--font-rounded);
  }

  /* --- Overlay de célébration (level-up / boss) --- */
  .ceu-banner-cele {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 1rem 1.75rem;
    border-radius: 1.25rem;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(1.35rem, 5vw, 2.4rem);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fffbeb;
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.45), 0 0 24px rgba(251, 191, 36, 0.7);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), inset 0 0 0 3px rgba(251, 191, 36, 0.65), inset 0 0 22px rgba(251, 191, 36, 0.25);
    animation: ceu-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .ceu-banner-levelup { background: linear-gradient(180deg, #92400e, #451a03 85%); }
  .ceu-banner-boss { background: linear-gradient(180deg, #9f1239, #4c0519 85%); }

  .ceu-sub {
    font-family: var(--font-rounded);
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: none;
    color: rgba(255, 251, 235, 0.85);
    text-shadow: none;
  }

  .ceu-star {
    font-size: 1.6em;
    animation: ceu-bounce 0.7s ease-in-out infinite alternate;
  }

  .ceu-rays-cele {
    position: absolute;
    width: 150vmax;
    height: 150vmax;
    border-radius: 9999px;
    background: conic-gradient(
      from 0deg,
      rgba(251, 191, 36, 0.16) 0deg 12deg,
      transparent 12deg 36deg,
      rgba(251, 191, 36, 0.16) 36deg 48deg,
      transparent 48deg 72deg,
      rgba(251, 191, 36, 0.16) 72deg 84deg,
      transparent 84deg 108deg,
      rgba(251, 191, 36, 0.16) 108deg 120deg,
      transparent 120deg 150deg,
      rgba(251, 191, 36, 0.16) 150deg 162deg,
      transparent 162deg 190deg,
      rgba(251, 191, 36, 0.16) 190deg 202deg,
      transparent 202deg 240deg,
      rgba(251, 191, 36, 0.16) 240deg 252deg,
      transparent 252deg 300deg,
      rgba(251, 191, 36, 0.16) 300deg 312deg,
      transparent 312deg 360deg
    );
    animation: ceu-spin 3.2s linear infinite, ceu-fade 1.6s ease-out both;
    mask-image: radial-gradient(circle, black 0%, transparent 45%);
    -webkit-mask-image: radial-gradient(circle, black 0%, transparent 45%);
  }

  .ceu-confetti {
    position: absolute;
    top: -14px;
    width: 9px;
    height: 15px;
    border-radius: 2.5px;
    opacity: 0;
    animation: ceu-fall 1.5s ease-in forwards;
  }

  @keyframes ceu-pop {
    0% { opacity: 0; transform: scale(0.55) rotate(-3deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  @keyframes ceu-bounce {
    0% { transform: translateY(0) scale(1); }
    100% { transform: translateY(-7px) scale(1.15); }
  }

  @keyframes ceu-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes ceu-fade {
    0% { opacity: 0; }
    30% { opacity: 1; }
    100% { opacity: 1; }
  }

  @keyframes ceu-fall {
    0% { opacity: 0; transform: translateY(-10px) rotate(0deg) translateX(0); }
    15% { opacity: 1; }
    100% { opacity: 0; transform: translateY(102vh) rotate(540deg) translateX(var(--ceu-drift, 0px)); }
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

  /* ==================== Décor Dragon Quest ==================== */
  /* Étoiles : deux couches de points (petite/grande densité), scintillement
     décalé. Posées en haut de scène, la teinte régionale reste lisible en-dessous. */
  :global(.dq-stars) {
    background-repeat: repeat;
    animation: dq-twinkle 4.2s ease-in-out infinite alternate;
  }
  :global(.dq-stars-far) {
    background-image: radial-gradient(rgba(238, 250, 255, 0.55) 1px, transparent 1.4px);
    background-size: 110px 90px;
  }
  :global(.dq-stars-near) {
    background-image: radial-gradient(rgba(191, 219, 254, 0.8) 1.5px, transparent 2px);
    background-size: 210px 160px;
    animation-delay: 1.4s;
  }
  @keyframes dq-twinkle {
    0% { opacity: 0.45; }
    100% { opacity: 1; }
  }

  :global(.dq-moon) {
    background: radial-gradient(circle, rgba(254, 240, 138, 0.95) 0%, rgba(254, 240, 138, 0.6) 40%, transparent 68%);
    box-shadow: 0 0 26px rgba(254, 240, 138, 0.5), 0 0 60px rgba(254, 240, 138, 0.25);
    animation: dq-twinkle 6.5s ease-in-out infinite alternate;
  }

  :global(.dq-vignette) {
    background: linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.55) 100%),
      linear-gradient(180deg, transparent 78%, rgba(0,0,0,0.65) 100%);
  }
</style>
