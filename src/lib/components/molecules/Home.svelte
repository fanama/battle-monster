<script lang="ts">
  import { MonsterIO, type Monster } from "../../../core/entities/Monster";
  import { REGIONS } from "../../../core/entities/Region";
  import { TYPE_LABELS, STAT_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
  import { abilityModifier } from "../../../core/entities/Monster";
  import type { SavedChampion } from "../../../core/services/ports";
  import { downloadMonsterFile, importMonsterFromJson } from "../../../core/services/MonsterExporter";
  import MonsterCreator from "../atoms/MonsterCreator.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";

  export let saveInfo: {
    regionIndex: number;
    playerName: string;
    playerLevel: number;
    score: number;
  } | null = null;
  export let savedChampions: SavedChampion[] = [];
  export let onContinue: () => void;
  export let onNewGame: () => void;
  export let onDeleteChampion: (id: string) => void = () => {};
  export let onSaveImportedChampion: (monster: Monster, regionIndex?: number, regionName?: string) => void = () => {};
  export let onStartRun: (monster: Monster) => void;

  let activeStarterTab: 'forge' | 'veterans' = 'forge';
  let fileInputElement: HTMLInputElement;
  let importNotification: string | null = null;
  let importError: string | null = null;

  function startWithChampion(champion: SavedChampion) {
    const monster = MonsterIO.fromSnapshot(champion.snapshot);
    monster.currentHp = monster.maxHp;
    monster.armorBonus = 0;
    monster.moves.forEach(m => (m.coolDown = 0));
    onStartRun(monster);
  }

  function triggerFileInput() {
    importNotification = null;
    importError = null;
    fileInputElement?.click();
  }

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = importMonsterFromJson(text);
      if (result.success && result.monster) {
        onSaveImportedChampion(result.monster, result.regionIndex, result.regionName);
        importNotification = `✨ Le monstre ${result.monster.name} (Niv. ${result.monster.level}) a été importé avec succès !`;
        importError = null;
        activeStarterTab = 'veterans';
      } else {
        importError = result.error || "Impossible d'importer ce fichier.";
        importNotification = null;
      }
    } catch (err) {
      importError = `Erreur de lecture du fichier : ${err instanceof Error ? err.message : String(err)}`;
      importNotification = null;
    } finally {
      // Reset input to allow selecting the same file again if needed
      input.value = '';
    }
  }

  const FEATURES = [
    {
      icon: "🎲",
      title: "Moteur D&D 5e (d20)",
      desc: "Jets d'attaque vs Classe d'Armure (CA), modificateurs de caractéristiques, critiques naturels (20) et fumbles (1).",
      badge: "Règles Officielles",
      color: "border-amber-500/40 bg-amber-950/20",
    },
    {
      icon: "🗺️",
      title: "Cartes Roguelike",
      desc: "Progression par graphe façon Slay the Spire : combats sauvages, feux de camp (+50% PV), boutiques d'objets et boss.",
      badge: "Procédural",
      color: "border-emerald-500/40 bg-emerald-950/20",
    },
    {
      icon: "🔥",
      title: "6 Types Élémentaires",
      desc: "Feu, Eau, Plante, Électricité, Roche et Normal avec multiplicateurs physiques (×2 / ×0.5) et magiques équilibrés.",
      badge: "Stratégie",
      color: "border-red-500/40 bg-red-950/20",
    },
    {
      icon: "🃏",
      title: "30+ Reliques Passives",
      desc: "Objets cumulables découverts en combat et en boutique : bonus de stats permanents, armure, vol de vie et soins au départ.",
      badge: "Synergies",
      color: "border-purple-500/40 bg-purple-950/20",
    },
    {
      icon: "⚡",
      title: "Système d'Initiative",
      desc: "Jets d'initiative 1d20 + mod(Vitesse) à chaque tour : le plus rapide frappe en premier avec annulation de riposte au K.O.",
      badge: "Tour par tour",
      color: "border-cyan-500/40 bg-cyan-950/20",
    },
    {
      icon: "💾",
      title: "Sauvegarde & Permadeath",
      desc: "Sauvegarde automatique après chaque combat dans le stockage local. Une défaite met fin à la tentative.",
      badge: "Défi",
      color: "border-rose-500/40 bg-rose-950/20",
    },
  ];

  const ELEMENT_DETAILS = [
    { type: 'fire' as const, strongVs: 'Plante', weakVs: 'Eau, Roche', role: 'Frappeur physique & sorts ardents' },
    { type: 'water' as const, strongVs: 'Feu, Roche', weakVs: 'Plante, Électricité', role: 'Défenseur résistant avec réserve élevée de PV' },
    { type: 'grass' as const, strongVs: 'Eau, Roche', weakVs: 'Feu', role: 'Mage régénérant & contrôles' },
    { type: 'electric' as const, strongVs: 'Eau, Roche', weakVs: 'Plante', role: 'Attaquant véloce & magie explosive' },
    { type: 'rock' as const, strongVs: 'Feu', weakVs: 'Eau, Plante, Électricité', role: 'Colosse défensif à haute armure' },
    { type: 'normal' as const, strongVs: 'Équilibré', weakVs: 'Aucune faiblesse', role: 'Polyvalent adaptable à tout rôle' },
  ];

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<div id="top" class="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-12 md:gap-16">
  <!-- HERO SECTION -->
  <section class="relative text-center flex flex-col items-center gap-5 py-4 md:py-8 overflow-hidden">
    <!-- Glow effect -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 md:w-[600px] h-64 md:h-96
        bg-amber-500/10 blur-[90px] rounded-full pointer-events-none -z-10"
    ></div>

    <!-- Pill Badge -->
    <div
      class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] md:text-xs font-mono font-semibold
        bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-sm"
    >
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span>Version 1.2 · Système D&D d20 & Slay the Spire</span>
    </div>

    <!-- Main Headline -->
    <h1
      class="font-serif font-black text-4xl sm:text-5xl md:text-7xl uppercase tracking-widest
        text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600
        drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] max-w-4xl leading-tight"
    >
      Combattez. Progressez. Devenez Champion.
    </h1>

    <!-- Description -->
    <p class="text-stone-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
      Incarnez un monstre élémentaire et traversez <span class="text-emerald-300 font-semibold">4 régions périlleuses</span>.
      Chaque tour est régi par les dés <span class="text-amber-300 font-semibold">D&D 5e</span> (toucher vs Classe d'Armure, initiative, critiques et reliques).
    </p>

    <!-- Save card in hero if available -->
    {#if saveInfo}
      <div
        class="w-full max-w-md mt-2 rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-stone-900 to-stone-950
          p-5 shadow-[0_4px_20px_rgba(0,0,0,0.7)] text-left flex flex-col gap-3.5"
      >
        <div class="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <span class="font-serif font-bold text-amber-300 text-sm uppercase tracking-wider flex items-center gap-2">
            <span>💾</span> Partie en cours trouvée
          </span>
          <span class="text-[10px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
            Sauvegardé
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono text-stone-300">
          <p><span class="text-stone-500">Champion :</span> <span class="text-amber-200 font-bold">{saveInfo.playerName}</span></p>
          <p><span class="text-stone-500">Niveau :</span> <span class="text-amber-200 font-bold">{saveInfo.playerLevel}</span></p>
          <p><span class="text-stone-500">Région :</span> <span class="text-amber-200">{REGIONS[saveInfo.regionIndex].name}</span></p>
          <p><span class="text-stone-500">Score :</span> <span class="text-yellow-400 font-bold">★ {saveInfo.score}</span></p>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 mt-1">
          <button
            type="button"
            on:click={onContinue}
            class="flex-1 py-2.5 px-4 rounded-lg font-serif font-bold uppercase tracking-widest text-xs
              bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 border border-amber-300
              hover:brightness-110 active:scale-95 transition-all text-center shadow cursor-pointer"
          >
            ▶ Continuer la partie
          </button>
          <button
            type="button"
            on:click={onNewGame}
            class="py-2.5 px-3 rounded-lg font-serif font-bold uppercase tracking-wider text-xs
              border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50
              active:scale-95 transition-all text-center cursor-pointer"
          >
            ✖ Effacer
          </button>
        </div>
      </div>
    {:else}
      <!-- Hero CTAs -->
      <div class="flex flex-wrap items-center justify-center gap-3.5 mt-2">
        <button
          type="button"
          on:click={() => scrollToSection('starters')}
          class="py-3.5 px-8 rounded-xl font-serif font-bold uppercase tracking-widest text-sm md:text-base
            bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-stone-950 border-2 border-amber-200
            shadow-[0_4px_20px_rgba(251,191,36,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          ⚔ Invoquer son Champion
        </button>
        <button
          type="button"
          on:click={() => scrollToSection('mechanics')}
          class="py-3.5 px-6 rounded-xl font-serif font-bold uppercase tracking-widest text-sm md:text-base
            bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700
            active:scale-95 transition-all cursor-pointer"
        >
          📖 Découvrir les Règles
        </button>
      </div>
    {/if}

    <!-- Metric Pills -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-3xl mt-4">
      <div class="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex flex-col items-center">
        <span class="text-xl">🎲</span>
        <span class="font-bold text-amber-200 text-sm mt-1">D&D 5e d20</span>
        <span class="text-[10px] text-stone-400">Jets & Classe d'Armure</span>
      </div>
      <div class="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex flex-col items-center">
        <span class="text-xl">🔥</span>
        <span class="font-bold text-amber-200 text-sm mt-1">6 Éléments</span>
        <span class="text-[10px] text-stone-400">Forces & Faiblesses</span>
      </div>
      <div class="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex flex-col items-center">
        <span class="text-xl">🗺️</span>
        <span class="font-bold text-amber-200 text-sm mt-1">4 Régions</span>
        <span class="text-[10px] text-stone-400">Boss & Boutiques</span>
      </div>
      <div class="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex flex-col items-center">
        <span class="text-xl">✨</span>
        <span class="font-bold text-amber-200 text-sm mt-1">30+ Reliques</span>
        <span class="text-[10px] text-stone-400">Objets Passifs</span>
      </div>
    </div>
  </section>

  <!-- STARTER SELECTION SECTION -->
  <section id="starters" class="scroll-mt-20 flex flex-col gap-5">
    <!-- Hidden File Input for uploading monsters -->
    <input
      type="file"
      accept=".json,application/json"
      bind:this={fileInputElement}
      on:change={handleFileChange}
      class="hidden"
    />

    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Choisissez Votre Champion
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        Forgez une nouvelle créature personnalisée, chargez un monstre importé ou partez au combat avec un champion vétéran victorieux.
      </p>
    </div>

    <!-- NOTIFICATION DE SUCCÈS OU D'ERREUR D'IMPORTATION -->
    {#if importNotification}
      <div class="p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/60 text-emerald-200 text-xs text-center flex items-center justify-between gap-2 max-w-xl mx-auto shadow-lg">
        <span class="flex items-center gap-2">
          <span>✅</span>
          <span>{importNotification}</span>
        </span>
        <button
          type="button"
          on:click={() => (importNotification = null)}
          class="text-emerald-400 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    {/if}

    {#if importError}
      <div class="p-3 rounded-xl border border-rose-500/50 bg-rose-950/60 text-rose-200 text-xs text-center flex items-center justify-between gap-2 max-w-xl mx-auto shadow-lg">
        <span class="flex items-center gap-2">
          <span>❌</span>
          <span>{importError}</span>
        </span>
        <button
          type="button"
          on:click={() => (importError = null)}
          class="text-rose-400 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    {/if}

    <!-- TABS -->
    <div class="flex flex-wrap items-center justify-center gap-2.5 border-b border-stone-800 pb-3">
      <button
        type="button"
        on:click={() => (activeStarterTab = "forge")}
        class="px-5 py-2.5 rounded-xl font-serif font-bold uppercase tracking-wider text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2
          {activeStarterTab === 'forge'
            ? 'bg-amber-500 text-stone-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
            : 'bg-stone-900/80 text-stone-300 border border-stone-700 hover:border-stone-500'}"
      >
        <span>✨</span>
        <span>Forger un Champion</span>
      </button>

      <button
        type="button"
        on:click={() => (activeStarterTab = "veterans")}
        class="px-5 py-2.5 rounded-xl font-serif font-bold uppercase tracking-wider text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2
          {activeStarterTab === 'veterans'
            ? 'bg-amber-500 text-stone-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
            : 'bg-stone-900/80 text-stone-300 border border-stone-700 hover:border-stone-500'}"
      >
        <span>🏆</span>
        <span>Panthéon des Vétérans</span>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/40 text-amber-300 font-bold">
          {savedChampions.length}
        </span>
      </button>
    </div>

    <div class="w-full">
      {#if activeStarterTab === "forge"}
        <MonsterCreator onCreate={(monster) => onStartRun(monster)} />
      {:else}
        <!-- SECTION PANTHÉON -->
        <div class="flex flex-col gap-4">
          <!-- Barre d'outils du Panthéon avec bouton Importer -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-stone-800 bg-stone-900/60">
            <div class="text-left">
              <h3 class="font-serif font-bold text-amber-200 text-sm flex items-center gap-2">
                <span>🏆</span>
                <span>Registre des Champions Victorieux</span>
              </h3>
              <p class="text-xs text-stone-400">
                Champions immortalisés après avoir terrassé un Boss ou importés depuis vos fichiers.
              </p>
            </div>

            <button
              type="button"
              on:click={triggerFileInput}
              class="w-full sm:w-auto px-4 py-2 rounded-xl font-serif font-semibold uppercase tracking-wider text-xs border border-sky-500/50 bg-sky-950/60 hover:bg-sky-900/60 text-sky-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0"
              title="Importer un fichier JSON de monstre"
            >
              <span>📥</span>
              <span>Importer un Monstre (.json)</span>
            </button>
          </div>

          {#if savedChampions.length === 0}
            <!-- Empty state du Panthéon -->
            <div class="flex flex-col items-center justify-center gap-3 p-8 md:p-12 text-center rounded-2xl border border-dashed border-stone-700/80 bg-stone-900/30 max-w-xl mx-auto">
              <span class="text-5xl">🏆</span>
              <h4 class="font-serif font-bold text-lg text-amber-200">Le Panthéon est encore vierge</h4>
              <p class="text-xs text-stone-400 max-w-md leading-relaxed">
                Chaque fois que vous triomphez d'un Boss de région, votre créature est automatiquement gravée ici. Vous pouvez également importer un monstre dès maintenant :
              </p>
              <button
                type="button"
                on:click={triggerFileInput}
                class="mt-2 px-5 py-2.5 rounded-xl font-serif font-bold uppercase tracking-wider text-xs border border-sky-400/60 bg-gradient-to-r from-sky-600 to-sky-800 text-white hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>📥</span>
                <span>Importer un fichier .json</span>
              </button>
            </div>
          {:else}
            <!-- Liste des champions -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each savedChampions as champ}
                {@const monsterInstance = MonsterIO.fromSnapshot(champ.snapshot)}
                {@const tc = TYPE_COLORS[champ.type] ?? TYPE_COLORS.normal}
                <div
                  class="relative flex flex-col rounded-xl overflow-hidden border-2 bg-gradient-to-b from-stone-900 to-stone-950 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.8)] {tc.border}"
                >
                  <!-- Bandeau coloré -->
                  <div class="h-1.5 w-full {tc.gradient}"></div>

                  <!-- Header avec Sprite & Badge -->
                  <div class="relative h-44 w-full flex items-center justify-center overflow-hidden" style="background: {tc.ambient}">
                    <div class="w-36 h-36 scale-90">
                      <SpriteDisplayer monster={monsterInstance} isPlayer={true} />
                    </div>
                    <div class="absolute top-2 right-2 flex items-center gap-1.5">
                      <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border {tc.badge}">
                        {TYPE_ICONS[champ.type]} {TYPE_LABELS[champ.type]}
                      </span>
                    </div>
                    <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md border border-amber-400/50 bg-amber-950/80 text-[10px] font-serif font-bold text-amber-300">
                      👑 Vainqueur : {champ.defeatedRegionName}
                    </div>
                  </div>

                  <!-- Corps de la carte -->
                  <div class="p-4 flex flex-col gap-3 flex-1 justify-between">
                    <div>
                      <div class="flex items-baseline justify-between border-b border-stone-800 pb-2">
                        <h3 class="font-serif font-bold text-lg text-amber-100">{champ.name}</h3>
                        <span class="font-mono font-bold text-xs text-amber-400">Niv. {champ.level}</span>
                      </div>

                      <!-- Grille de stats -->
                      <div class="grid grid-cols-3 gap-1.5 mt-2.5 text-[11px] font-mono">
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">Force</span>
                          <span class="font-bold text-red-300">{champ.snapshot.strength} <span class="text-stone-500 font-normal">({abilityModifier(champ.snapshot.strength) >= 0 ? '+' : ''}{abilityModifier(champ.snapshot.strength)})</span></span>
                        </div>
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">Vitesse</span>
                          <span class="font-bold text-sky-300">{champ.snapshot.speed} <span class="text-stone-500 font-normal">({abilityModifier(champ.snapshot.speed) >= 0 ? '+' : ''}{abilityModifier(champ.snapshot.speed)})</span></span>
                        </div>
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">PV Max</span>
                          <span class="font-bold text-emerald-300">{monsterInstance.maxHp}</span>
                        </div>
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">Savoir</span>
                          <span class="font-bold text-violet-300">{champ.snapshot.wisdom} <span class="text-stone-500 font-normal">({abilityModifier(champ.snapshot.wisdom) >= 0 ? '+' : ''}{abilityModifier(champ.snapshot.wisdom)})</span></span>
                        </div>
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">Instinct</span>
                          <span class="font-bold text-amber-300">{champ.snapshot.instinct} <span class="text-stone-500 font-normal">({abilityModifier(champ.snapshot.instinct) >= 0 ? '+' : ''}{abilityModifier(champ.snapshot.instinct)})</span></span>
                        </div>
                        <div class="bg-black/30 p-1.5 rounded border border-stone-800/80 flex flex-col items-center">
                          <span class="text-stone-400 text-[10px]">Armure CA</span>
                          <span class="font-bold text-sky-200">{monsterInstance.getAC()}</span>
                        </div>
                      </div>

                      <!-- Attaques -->
                      <div class="mt-2.5 flex flex-wrap gap-1">
                        {#each champ.snapshot.moves as m}
                          <span class="text-[10px] font-medium px-2 py-0.5 rounded border border-stone-700 bg-stone-900/60 text-stone-300">
                            {m.name}
                          </span>
                        {/each}
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col gap-2 mt-3 pt-2 border-t border-stone-800/80">
                      <button
                        type="button"
                        on:click={() => startWithChampion(champ)}
                        class="w-full py-2.5 px-3 rounded-lg font-serif font-bold uppercase tracking-wider text-xs
                          bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer text-center"
                      >
                        ⚔ Partir avec {champ.name}
                      </button>

                      <div class="flex gap-2">
                        <button
                          type="button"
                          on:click={() => downloadMonsterFile(champ)}
                          class="flex-1 py-1.5 px-2 rounded-lg border border-stone-700 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-amber-200 text-xs font-serif transition-colors cursor-pointer flex items-center justify-center gap-1"
                          title="Télécharger ce champion en fichier JSON"
                        >
                          <span>💾</span>
                          <span>Télécharger</span>
                        </button>

                        <button
                          type="button"
                          title="Supprimer du Panthéon"
                          on:click={() => {
                            if (confirm(`Supprimer ${champ.name} du Panthéon ?`)) {
                              onDeleteChampion(champ.id);
                            }
                          }}
                          class="py-1.5 px-3 rounded-lg border border-stone-700 bg-stone-900/80 hover:bg-rose-950/60 hover:border-rose-500/50 text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- FEATURES SECTION -->
  <section class="flex flex-col gap-6">
    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Un Gameplay Profond & Équilibré
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        La rencontre entre l'esprit des RPG de monstres et la rigueur tactique du jeu de rôle.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each FEATURES as feat}
        <div
          class="p-4 rounded-xl border transition-all duration-200 hover:-translate-y-1
            flex flex-col gap-2.5 {feat.color}"
        >
          <div class="flex items-center justify-between">
            <span class="text-3xl">{feat.icon}</span>
            <span class="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-stone-700 bg-stone-900/80 text-stone-300">
              {feat.badge}
            </span>
          </div>
          <h3 class="font-serif font-bold text-amber-100 text-base">{feat.title}</h3>
          <p class="text-xs text-stone-400 leading-relaxed">{feat.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- RULES & MECHANICS SECTION -->
  <section id="mechanics" class="scroll-mt-20 flex flex-col gap-6">
    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Règles & Mécaniques D&D
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        Transposition fidèle des règles de la 5e édition pour chaque action de combat.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
        <span class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">🎯 Jet d'Attaque & Précision</span>
        <p class="text-xs text-stone-300 leading-relaxed">
          Pour toucher, l'attaquant lance un <span class="text-amber-200 font-bold">1d20</span> + son modificateur de caractéristique + le bonus de précision du sort. Le total doit être supérieur ou égal à la <span class="text-sky-300 font-bold">Classe d'Armure (CA)</span> de la cible.
        </p>
        <div class="p-2.5 rounded bg-black/40 border border-stone-800 text-[11px] font-mono text-stone-400">
          • Physique : <span class="text-amber-200">1d20 + mod(Force) + Précision ≥ CA</span><br />
          • Magique : <span class="text-violet-200">1d20 + mod(Savoir) + Précision ≥ CA</span>
        </div>
      </div>

      <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
        <span class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">🛡️ Classe d'Armure & Dégâts</span>
        <p class="text-xs text-stone-300 leading-relaxed">
          La défense passive est déterminée par la vitesse et les reliques d'armure. Les dégâts physiques utilisent des dés d'arme (1d6 à 1d20) selon la puissance du coup, tandis que la magie s'ajuste sur le Savoir.
        </p>
        <div class="p-2.5 rounded bg-black/40 border border-stone-800 text-[11px] font-mono text-stone-400">
          • CA : <span class="text-sky-200">10 + mod(Vitesse) + Bonus Armure</span><br />
          • 20 Naturel : <span class="text-amber-300">Critique garanti (dés dédoublés)</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ELEMENTS TABLE SECTION -->
  <section id="elements" class="scroll-mt-20 flex flex-col gap-6">
    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Table des 6 Types
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        Chaque type confère des affinités offensives et défensives stratégiques.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each ELEMENT_DETAILS as elem}
        {@const tc = TYPE_COLORS[elem.type]}
        <div class="p-3.5 rounded-xl border {tc.border} {tc.cardBg} flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">{TYPE_ICONS[elem.type]}</span>
            <span class="font-serif font-bold text-sm uppercase tracking-wider {tc.text}">
              {TYPE_LABELS[elem.type]}
            </span>
          </div>
          <p class="text-xs text-stone-300">{elem.role}</p>
          <div class="text-[10px] font-mono flex flex-col gap-1 border-t border-stone-800/80 pt-2 text-stone-400">
            <div><span class="text-green-400 font-bold">Avantage vs :</span> {elem.strongVs}</div>
            <div><span class="text-rose-400 font-bold">Faiblesse vs :</span> {elem.weakVs}</div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- REGIONS SHOWCASE SECTION -->
  <section id="regions" class="scroll-mt-20 flex flex-col gap-6">
    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Les 4 Régions du Monde
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        Parcourez les régions dans l'ordre, triomphez du boss gardien et obtenez le titre suprême.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {#each REGIONS as reg, i}
        <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/50 flex flex-col justify-between gap-3">
          <div>
            <div class="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-1">
              <span>Région {i + 1}/4</span>
              <span class="text-amber-300">Niv. {reg.minLevel}–{reg.maxLevel}</span>
            </div>
            <h3 class="font-serif font-bold text-amber-200 text-base">{reg.name}</h3>
            <p class="text-xs text-stone-400 mt-1 leading-relaxed">{reg.description}</p>
          </div>
          <div class="pt-2 border-t border-stone-800 text-[11px] font-mono flex items-center justify-between">
            <span class="text-rose-400 flex items-center gap-1">
              <span>👑</span> {reg.bossName}
            </span>
            <span class="text-stone-500">
              {TYPE_ICONS[reg.bossType]} {TYPE_LABELS[reg.bossType]}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>