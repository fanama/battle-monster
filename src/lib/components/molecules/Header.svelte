<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import type { RegionDef } from "../../../core/entities/Region";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  export let phase: string = "starter";
  export let player: Monster | null = null;
  export let region: RegionDef | null = null;
  export let gold: number = 0;
  export let score: number = 0;
  export let saveInfo: {
    regionIndex: number;
    playerName: string;
    playerLevel: number;
    score: number;
  } | null = null;

  export let onContinue: (() => void) | undefined = undefined;
  export let onStartClick: (() => void) | undefined = undefined;
  export let onOpenCodex: (tab?: 'rules' | 'elements' | 'regions') => void;
  export let onOpenMoves: (() => void) | undefined = undefined;
  export let onQuitToMenu: (() => void) | undefined = undefined;

  let showQuitConfirm = false;

  function handleLogoClick() {
    if (phase === "starter") {
      const el = document.getElementById("top");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      showQuitConfirm = true;
    }
  }

  function confirmQuit() {
    showQuitConfirm = false;
    if (onQuitToMenu) onQuitToMenu();
  }
</script>

<header
  class="sticky top-0 z-40 w-full border-b border-stone-800/90 bg-[#141210]/95 backdrop-blur-md transition-colors"
>
  <div class="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
    <!-- Brand / Logo -->
    <button
      type="button"
      on:click={handleLogoClick}
      class="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
      title={phase === 'starter' ? 'Haut de page' : 'Retour au Menu Principal'}
    >
      <div
        class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700
          flex items-center justify-center text-lg shadow-[0_0_12px_rgba(251,191,36,0.35)]
          border border-amber-300/40 group-hover:scale-105 transition-transform"
      >
        ⚔️
      </div>
      <div class="flex flex-col">
        <span
          class="font-serif font-black tracking-wider sm:tracking-widest text-sm sm:text-base uppercase
            text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600"
        >
          Battle Monster
        </span>
        <span class="text-[9px] font-mono tracking-wider text-stone-400 uppercase -mt-0.5 hidden xs:inline">
          D&D 5e Roguelike
        </span>
      </div>
    </button>

    <!-- Center Info or Nav depending on Phase -->
    {#if phase === "starter"}
      <nav class="hidden md:flex items-center gap-5 font-mono text-xs text-stone-300">
        <button
          type="button"
          on:click={() => {
            const el = document.getElementById("starters");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          class="hover:text-amber-300 transition-colors"
        >
          Champions
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('rules')}
          class="hover:text-amber-300 transition-colors"
        >
          Règles D&D
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('elements')}
          class="hover:text-amber-300 transition-colors"
        >
          Éléments
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('regions')}
          class="hover:text-amber-300 transition-colors"
        >
          Régions & Boss
        </button>
      </nav>
    {:else}
      <!-- RUN STATUS BAR (Visible during map, arena, shop, etc.) -->
      <div class="flex items-center gap-2 sm:gap-4 font-mono text-xs">
        {#if region}
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-stone-300 text-[11px]">
            <span>🗺️</span>
            <span class="text-amber-300 font-semibold">{region.name}</span>
          </div>
        {/if}

        {#if player}
          {@const pColor = TYPE_COLORS[player.type]}
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-stone-300 text-[11px]">
            <span>{TYPE_ICONS[player.type]}</span>
            <span class="font-bold {pColor.text}">{player.name}</span>
            <span class="text-stone-500 font-normal">Niv.{player.level}</span>
          </div>
        {/if}

        <div class="hidden md:flex items-center gap-3 text-[11px]">
          <span class="text-amber-400 font-bold">🪙 {gold}</span>
          <span class="text-yellow-400 font-bold">★ {score}</span>
        </div>
      </div>
    {/if}

    <!-- Right Quick Actions -->
    <div class="flex items-center gap-2">
      <!-- Attaques / Grimoire Button (During active run) -->
      {#if phase !== "starter" && player && onOpenMoves}
        <button
          type="button"
          on:click={onOpenMoves}
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold uppercase
            bg-stone-900 hover:bg-stone-800 border border-violet-500/60 text-violet-200 transition-colors shadow-sm cursor-pointer"
          title="Gérer les attaques et capacités équipées"
        >
          <span>📜</span>
          <span class="hidden sm:inline">Attaques</span>
        </button>
      {/if}

      <!-- Codex Button (Available everywhere!) -->
      <button
        type="button"
        on:click={() => onOpenCodex('rules')}
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold uppercase
          bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 transition-colors cursor-pointer"
        title="Ouvrir le Codex D&D & Table des types"
      >
        <span>📖</span>
        <span class="hidden sm:inline">Codex</span>
      </button>

      {#if phase === "starter"}
        {#if saveInfo && onContinue}
          <button
            type="button"
            on:click={onContinue}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-serif font-bold text-xs uppercase tracking-wider
              bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border border-amber-300/80
              shadow-[0_0_10px_rgba(251,191,36,0.3)] hover:brightness-110 active:scale-95 transition-all"
          >
            <span>▶ Reprendre</span>
            <span class="hidden sm:inline font-mono font-normal opacity-90 text-[10px] bg-black/20 px-1 py-0.5 rounded">
              Niv. {saveInfo.playerLevel}
            </span>
          </button>
        {:else if onStartClick}
          <button
            type="button"
            on:click={onStartClick}
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-serif font-bold text-xs uppercase tracking-wider
              bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 border border-amber-300
              shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-95 transition-all"
          >
            ⚔ Jouer
          </button>
        {/if}
      {:else}
        <!-- Quit / Menu button during active run -->
        <button
          type="button"
          on:click={() => showQuitConfirm = true}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold uppercase
            border border-stone-700 bg-stone-900/80 hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-300
            text-stone-300 transition-colors"
          title="Menu principal"
        >
          <span>🏠</span>
          <span class="hidden md:inline">Menu</span>
        </button>
      {/if}
    </div>
  </div>
</header>

<!-- Quit Confirmation Modal -->
{#if showQuitConfirm}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
  >
    <div
      class="w-full max-w-sm rounded-xl border-2 border-amber-500/60 bg-stone-900 p-5 shadow-2xl flex flex-col gap-4 text-stone-200"
    >
      <div class="flex items-center gap-2 text-amber-400 font-serif font-bold text-base uppercase">
        <span>🏠</span> Retour au Menu Principal
      </div>
      <p class="text-xs text-stone-300 leading-relaxed font-mono">
        Votre progression actuelle est automatiquement sauvegardée dans votre navigateur. Vous pourrez la reprendre à tout moment.
      </p>
      <div class="flex gap-2 justify-end pt-2">
        <button
          type="button"
          on:click={() => showQuitConfirm = false}
          class="px-3.5 py-2 rounded-lg text-xs font-serif font-bold uppercase bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          on:click={confirmQuit}
          class="px-4 py-2 rounded-lg text-xs font-serif font-bold uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:brightness-110 transition-all shadow"
        >
          Confirmer
        </button>
      </div>
    </div>
  </div>
{/if}