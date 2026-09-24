<script lang="ts">
  export let saveInfo: {
    regionIndex: number;
    playerName: string;
    playerLevel: number;
    score: number;
  } | null = null;
  export let onOpenCodex: (tab?: 'rules' | 'elements' | 'regions') => void = () => {};
  export let onChooseStarter: () => void = () => {};
</script>

<footer class="w-full border-t border-stone-800 bg-[#0d0c0b] text-stone-400 text-xs mt-auto">
  <div class="max-w-6xl mx-auto px-4 py-8 md:py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
    <!-- Col 1 : Brand & Tech -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xl">⚔️</span>
        <span class="font-serif font-bold text-amber-200 text-base uppercase tracking-wider">
          Battle Monster
        </span>
      </div>
      <p class="text-[11px] text-stone-400 leading-relaxed">
        Jeu de combat roguelike au tour par tour basé sur les mécaniques officielles D&D 5e (d20).
      </p>
      <div class="flex items-center gap-2 text-[10px] font-mono text-stone-400">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Système opérationnel (v1.2)</span>
      </div>
    </div>

    <!-- Col 2 : Navigation & Codex -->
    <div class="flex flex-col gap-2.5">
      <span class="font-serif font-bold text-stone-200 text-xs uppercase tracking-wider">Navigation & Codex</span>
      <ul class="space-y-1.5 text-[11px]">
        <li>
          <button
            type="button"
            on:click={onChooseStarter}
            class="hover:text-amber-300 transition-colors cursor-pointer text-left"
          >
            Choisir un Champion
          </button>
        </li>
        <li>
          <button
            type="button"
            on:click={() => onOpenCodex('rules')}
            class="hover:text-amber-300 transition-colors cursor-pointer text-left"
          >
            Règles du Combat (d20)
          </button>
        </li>
        <li>
          <button
            type="button"
            on:click={() => onOpenCodex('elements')}
            class="hover:text-amber-300 transition-colors cursor-pointer text-left"
          >
            Table des 6 Éléments
          </button>
        </li>
        <li>
          <button
            type="button"
            on:click={() => onOpenCodex('regions')}
            class="hover:text-amber-300 transition-colors cursor-pointer text-left"
          >
            Régions & Boss
          </button>
        </li>
      </ul>
    </div>

    <!-- Col 3 : Formules D&D -->
    <div class="flex flex-col gap-2.5">
      <span class="font-serif font-bold text-stone-200 text-xs uppercase tracking-wider">Formules D&D 5e</span>
      <ul class="space-y-1.5 text-[11px] text-stone-400 font-mono">
        <li>• Modificateur : floor((Stat - 10) / 2)</li>
        <li>• Armure : 10 + mod(Vitesse) + Reliques</li>
        <li>• Toucher : 1d20 + mod(Stat) ≥ CA</li>
        <li>• 20 Naturel : Coup critique doublé</li>
      </ul>
    </div>

    <!-- Col 4 : Données & Sauvegarde -->
    <div class="flex flex-col gap-2.5">
      <span class="font-serif font-bold text-stone-200 text-xs uppercase tracking-wider">Données & Session</span>
      <p class="text-[11px] leading-relaxed">
        Progression sauvegardée automatiquement dans le LocalStorage de votre navigateur.
      </p>
      {#if saveInfo}
        <div class="p-2 rounded bg-stone-900 border border-stone-800 text-[10px] font-mono text-amber-300">
          Partie active : {saveInfo.playerName} (Niv. {saveInfo.playerLevel})
        </div>
      {:else}
        <div class="p-2 rounded bg-stone-900 border border-stone-800 text-[10px] font-mono text-stone-500">
          Prêt pour une nouvelle partie
        </div>
      {/if}
    </div>
  </div>

  <!-- Bottom Bar -->
  <div class="border-t border-stone-900 py-4 px-4 text-center text-[11px] text-stone-400 flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto">
    <span>© 2026 Battle Monster — Tous droits réservés.</span>
    <span class="font-mono text-[10px] text-stone-400 mt-1 sm:mt-0">
      Architecture Propre · Svelte 5 · TypeScript · Tailwind CSS
    </span>
  </div>
</footer>