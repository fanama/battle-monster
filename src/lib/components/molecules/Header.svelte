<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import type { RegionDef } from "../../../core/entities/Region";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
  import { dq } from "../../styles/style";

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
  class="sticky top-0 z-40 w-full max-w-full shrink-0 border-b border-sky-100/15 bg-[#0b1020]/96 backdrop-blur-md transition-colors">
  <div class="max-w-6xl mx-auto px-2 sm:px-3 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
    <!-- Brand / Logo -->
    <button
      type="button"
      on:click={handleLogoClick}
      class="flex items-center gap-2 sm:gap-2.5 group text-left cursor-pointer focus:outline-none shrink-0"
      title={phase === 'starter' ? 'Haut de page' : 'Retour au Menu Principal'}
    >
      <div
        class="w-9 h-9 shrink-0 rounded-lg border border-sky-100/25 bg-[#16233a]
          flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
        ⚔️
      </div>
      <div class="hidden sm:flex flex-col">
        <span
          class="font-display font-extrabold tracking-wider sm:tracking-[0.18em] text-sm sm:text-base uppercase
            text-sky-50">
          Battle Monster
        </span>
        <span class="text-[9px] font-mono tracking-wider text-sky-200/60 uppercase -mt-0.5 hidden xs:inline">
          D&D 5e Roguelike
        </span>
      </div>
    </button>

    <!-- Center Info or Nav depending on Phase -->
    {#if phase === "starter"}
      <nav class="hidden md:flex items-center gap-5 font-mono text-xs text-sky-100/75">
        <button
          type="button"
          on:click={() => {
            const el = document.getElementById("starters");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          class="hover:text-amber-100 transition-colors">
          Champions
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('rules')}
          class="hover:text-amber-100 transition-colors">
          Règles D&D
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('elements')}
          class="hover:text-amber-100 transition-colors">
          Éléments
        </button>
        <button
          type="button"
          on:click={() => onOpenCodex('regions')}
          class="hover:text-amber-100 transition-colors">
          Régions & Boss
        </button>
      </nav>
    {:else}
      <!-- RUN STATUS BAR (Visible during map, arena, shop, etc.) -->
      <div class="flex items-center gap-2 sm:gap-4 font-mono text-xs min-w-0 flex-1 justify-end lg:justify-center">
        {#if region}
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0d1526] border border-sky-100/20 text-sky-100/80 text-[11px] shrink-0">
            <span>🗺️</span>
            <span class="text-amber-100 font-semibold">{region.name}</span>
          </div>
        {/if}

        {#if player}
          {@const pColor = TYPE_COLORS[player.type]}
          <div class="flex items-center gap-1.5 min-w-0 px-2 py-1 rounded-md bg-[#0d1526] border border-sky-100/20 text-sky-100/80 text-[11px]">
            <span class="shrink-0">{TYPE_ICONS[player.type]}</span>
            <span class="font-bold truncate {pColor.text} hidden xs:inline">{player.name}</span>
            <span class="shrink-0 text-sky-200/50 font-normal">Niv.{player.level}</span>
          </div>
        {/if}

        <div class="hidden md:flex items-center gap-3 text-[11px]">
          <span class="text-amber-100 font-bold">🪙 {gold}</span>
          <span class="text-amber-100 font-bold">★ {score}</span>
        </div>
      </div>
    {/if}

    <!-- Right Quick Actions -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <!-- Attaques / Grimoire Button (During active run) -->
      {#if phase !== "starter" && player && onOpenMoves}
        <button
          type="button"
          on:click={onOpenMoves}
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-display font-bold uppercase tracking-wider
            bg-[#16233a] hover:bg-[#1d2d49] border border-sky-100/25 text-sky-50 transition-colors cursor-pointer"
          title="Gérer les attaques et capacités équipées">
          <span>📜</span>
          <span class="hidden sm:inline">Attaques</span>
        </button>
      {/if}

      <!-- Codex Button (Available everywhere!) -->
      <button
        type="button"
        on:click={() => onOpenCodex('rules')}
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-display font-bold uppercase tracking-wider
          bg-[#16233a] hover:bg-[#1d2d49] border border-sky-100/25 text-sky-50 transition-colors cursor-pointer"
        title="Ouvrir le Codex D&D & Table des types">
        <span>📖</span>
        <span class="hidden sm:inline">Codex</span>
      </button>

      {#if phase === "starter"}
        {#if saveInfo && onContinue}
          <button
            type="button"
            on:click={onContinue}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-display font-bold text-xs uppercase tracking-[0.15em]
              border border-amber-200/50 bg-[#16233a] text-amber-100 hover:bg-[#1d2d49] active:scale-95 transition-colors">
            <span>▶ Reprendre</span>
            <span class="hidden sm:inline font-mono font-normal text-amber-100/70 text-[10px] border border-amber-200/25 px-1 py-0.5 rounded">
              Niv. {saveInfo.playerLevel}
            </span>
          </button>
        {:else if onStartClick}
          <button
            type="button"
            on:click={onStartClick}
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-display font-bold text-xs uppercase tracking-[0.15em]
              border border-amber-200/60 bg-[#1b2440] text-amber-100 hover:bg-[#24304f] active:scale-95 transition-colors">
            ⚔ Jouer
          </button>
        {/if}
      {:else}
        <!-- Quit / Menu button during active run -->
        <button
          type="button"
          on:click={() => showQuitConfirm = true}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-display font-bold uppercase tracking-wider
            border border-sky-100/25 bg-[#16233a] hover:border-rose-300/50 hover:text-rose-200
            text-sky-50 transition-colors"
          title="Menu principal">
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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050a14]/85 backdrop-blur-[2px]">
    <div
      class={`${dq.window} w-full max-w-sm max-h-[85dvh] overflow-y-auto p-5 flex flex-col gap-4 text-sky-100/85`}>
      <div class="flex items-center gap-2 text-amber-100 font-display font-bold text-base uppercase tracking-wider">
        <span>🏠</span> Retour au Menu Principal
      </div>
      <p class="text-xs text-sky-100/75 leading-relaxed font-mono">
        Votre progression actuelle est automatiquement sauvegardée dans votre navigateur. Vous pourrez la reprendre à tout moment.
      </p>
      <div class="flex gap-2 justify-end pt-2">
        <button
          type="button"
          on:click={() => showQuitConfirm = false}
          class="px-3.5 py-2 rounded-md text-xs font-display font-bold uppercase tracking-wider border border-sky-100/25 bg-[#16233a] hover:bg-[#1d2d49] text-sky-50 transition-colors">
          Annuler
        </button>
        <button
          type="button"
          on:click={confirmQuit}
          class="px-4 py-2 rounded-md text-xs font-display font-bold uppercase tracking-wider border border-amber-200/60 bg-[#1b2440] text-amber-100 hover:bg-[#24304f] transition-colors">
          Confirmer
        </button>
      </div>
    </div>
  </div>
{/if}
