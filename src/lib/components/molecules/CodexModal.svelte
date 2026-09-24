<script lang="ts">
  import { REGIONS } from "../../../core/entities/Region";
  import { TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";

  export let isOpen = false;
  export let activeTab: 'rules' | 'elements' | 'regions' = 'rules';
  export let onClose: () => void;

  const ELEMENT_DETAILS = [
    { type: 'fire' as const, strongVs: 'Plante', weakVs: 'Eau, Roche', role: 'Frappeur physique & sorts ardents' },
    { type: 'water' as const, strongVs: 'Feu, Roche', weakVs: 'Plante, Électricité', role: 'Défenseur résistant avec réserve élevée de PV' },
    { type: 'grass' as const, strongVs: 'Eau, Roche', weakVs: 'Feu', role: 'Mage régénérant & contrôles' },
    { type: 'electric' as const, strongVs: 'Eau, Roche', weakVs: 'Plante', role: 'Attaquant véloce & magie explosive' },
    { type: 'rock' as const, strongVs: 'Feu', weakVs: 'Eau, Plante, Électricité', role: 'Colosse défensif à haute armure' },
    { type: 'normal' as const, strongVs: 'Équilibré', weakVs: 'Aucune faiblesse', role: 'Polyvalent adaptable à tout rôle' },
  ];

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
    <!-- Backdrop button -->
    <button
      type="button"
      class="fixed inset-0 w-full h-full bg-black/80 backdrop-blur-md cursor-default transition-opacity"
      on:click={onClose}
      aria-label="Fermer le codex"
    ></button>

    <!-- Modal Dialog -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-title"
      class="relative z-10 w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border-2 border-amber-500/50
        bg-[#171513] text-stone-200 shadow-[0_10px_35px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">📖</span>
          <div>
            <h2 id="codex-title" class="font-serif font-black text-lg md:text-xl uppercase tracking-wider text-amber-300">
              Codex & Guide de Jeu
            </h2>
            <p class="text-[11px] font-mono text-stone-400">
              Système de règles D&D 5e · Table des éléments · Régions
            </p>
          </div>
        </div>

        <button
          type="button"
          on:click={onClose}
          class="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white
            flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-stone-800 bg-stone-950/70 px-4 pt-2 gap-2 text-xs font-serif font-bold tracking-wider uppercase overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          on:click={() => activeTab = 'rules'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'rules' ? 'border-amber-400 text-amber-300 bg-amber-950/20' : 'border-transparent text-stone-400 hover:text-stone-200'}"
        >
          <span>🎲</span> <span>Règles D&D 5e</span>
        </button>
        <button
          type="button"
          on:click={() => activeTab = 'elements'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'elements' ? 'border-amber-400 text-amber-300 bg-amber-950/20' : 'border-transparent text-stone-400 hover:text-stone-200'}"
        >
          <span>🔥</span> <span>Types & Faiblesses</span>
        </button>
        <button
          type="button"
          on:click={() => activeTab = 'regions'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'regions' ? 'border-amber-400 text-amber-300 bg-amber-950/20' : 'border-transparent text-stone-400 hover:text-stone-200'}"
        >
          <span>🗺️</span> <span>Régions & Boss</span>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-5 overflow-y-auto space-y-4 text-xs">
        {#if activeTab === 'rules'}
          <!-- RULES CONTENT -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-amber-400 uppercase tracking-wider text-xs">🎯 Jet d'Attaque (d20)</span>
              <p class="text-stone-300 leading-relaxed">
                Le lanceur jette un dé à 20 faces. L'attaque réussit si le score atteint ou dépasse la Classe d'Armure (CA) de la cible.
              </p>
              <div class="p-2.5 rounded bg-black/50 border border-stone-800 font-mono text-[11px] text-stone-400">
                • Physique : <span class="text-amber-300">1d20 + mod(Force) + Précision ≥ CA</span><br/>
                • Magique : <span class="text-purple-300">1d20 + mod(Savoir) + Précision ≥ CA</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-sky-400 uppercase tracking-wider text-xs">🛡️ Classe d'Armure (CA)</span>
              <p class="text-stone-300 leading-relaxed">
                La défense de base est déterminée par la dextérité (vitesse) et augmentée par les reliques d'armure passives.
              </p>
              <div class="p-2.5 rounded bg-black/50 border border-stone-800 font-mono text-[11px] text-stone-400">
                • CA de base : <span class="text-sky-300">10 + mod(Vitesse) + Reliques</span><br/>
                • Exemple : Vitesse 16 (+3) = <span class="text-amber-200">CA 13</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-emerald-400 uppercase tracking-wider text-xs">⚡ Initiative & Ordre de Tour</span>
              <p class="text-stone-300 leading-relaxed">
                Au début de chaque tour, chaque combattant lance un jet d'initiative (<span class="font-mono text-emerald-300">1d20 + mod(Vitesse)</span>). Le plus rapide frappe en premier. Si le coup met K.O., la riposte est annulée.
              </p>
            </div>

            <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-rose-400 uppercase tracking-wider text-xs">💥 Critiques & Fumbles</span>
              <p class="text-stone-300 leading-relaxed">
                • <span class="text-amber-300 font-bold">20 Naturel</span> : Coup critique garanti ! Tous les dés de dégâts sont doublés.<br/>
                • <span class="text-rose-400 font-bold">1 Naturel</span> : Échec critique automatique (l'attaque rate).
              </p>
            </div>
          </div>

        {:else if activeTab === 'elements'}
          <!-- ELEMENTS CONTENT -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each ELEMENT_DETAILS as elem}
              {@const tc = TYPE_COLORS[elem.type]}
              <div class="p-3.5 rounded-xl border {tc.border} {tc.cardBg} flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{TYPE_ICONS[elem.type]}</span>
                  <span class="font-serif font-bold text-xs uppercase tracking-wider {tc.text}">
                    {TYPE_LABELS[elem.type]}
                  </span>
                </div>
                <p class="text-[11px] text-stone-300">{elem.role}</p>
                <div class="text-[10px] font-mono flex flex-col gap-1 border-t border-stone-800/80 pt-2 text-stone-400">
                  <div><span class="text-green-400 font-bold">Avantage vs :</span> {elem.strongVs} (×2)</div>
                  <div><span class="text-rose-400 font-bold">Faiblesse vs :</span> {elem.weakVs} (×0.5)</div>
                </div>
              </div>
            {/each}
          </div>

        {:else if activeTab === 'regions'}
          <!-- REGIONS CONTENT -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {#each REGIONS as reg, i}
              <div class="p-4 rounded-xl border border-stone-800 bg-stone-900/50 flex flex-col justify-between gap-2.5">
                <div>
                  <div class="flex items-center justify-between text-[10px] font-mono text-stone-400 mb-1">
                    <span>Région {i + 1}/4</span>
                    <span class="text-amber-300">Niveaux {reg.minLevel}–{reg.maxLevel}</span>
                  </div>
                  <h4 class="font-serif font-bold text-amber-200 text-sm">{reg.name}</h4>
                  <p class="text-[11px] text-stone-400 mt-1 leading-relaxed">{reg.description}</p>
                </div>
                <div class="pt-2 border-t border-stone-800 text-[11px] font-mono flex items-center justify-between">
                  <span class="text-rose-400 flex items-center gap-1 font-bold">
                    <span>👑</span> {reg.bossName}
                  </span>
                  <span class="text-stone-400">
                    {TYPE_ICONS[reg.bossType]} {TYPE_LABELS[reg.bossType]}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex justify-end">
        <button
          type="button"
          on:click={onClose}
          class="px-5 py-2 rounded-lg font-serif font-bold text-xs uppercase tracking-wider
            bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
{/if}