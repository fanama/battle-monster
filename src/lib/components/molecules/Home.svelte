<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { REGIONS } from "../../../core/entities/Region";
  import MonsterSelector from "../atoms/MonsterSelector.svelte";

  export let saveInfo: {
    regionIndex: number;
    playerName: string;
    playerLevel: number;
    score: number;
  } | null = null;
  export let onContinue: () => void;
  export let onNewGame: () => void;
  export let onStartRun: (monster: Monster) => void;

  let showingForm = false;

  const FEATURES = [
    { icon: '🌍', title: '4 régions', desc: 'Verdure, Abysse, Braise, Céleste', color: 'border-sky-500/50 hover:border-sky-400' },
    { icon: '👑', title: 'Boss gardiens', desc: 'Vainquez le boss pour clore une région', color: 'border-rose-500/50 hover:border-rose-400' },
    { icon: '🃏', title: 'Reliques', desc: 'Bonus passifs permanents pour le run', color: 'border-amber-500/50 hover:border-amber-300' },
    { icon: '🎲', title: 'Combats d20', desc: 'Jets contre la CA, critiques & fumbles', color: 'border-stone-400/50 hover:border-stone-200' },
    { icon: '⚔️', title: 'Éléments', desc: 'Feu, Eau, Plante : exploitez les faiblesses', color: 'border-orange-500/50 hover:border-orange-400' },
    { icon: '🛡️', title: 'Progression', desc: 'EXP, niveaux, stats et PV améliorables', color: 'border-green-500/50 hover:border-green-400' },
    { icon: '💾', title: 'Sauvegarde auto', desc: 'Votre run est conservé en local', color: 'border-teal-500/50 hover:border-teal-300' },
    { icon: '💀', title: 'Permadeath', desc: 'Une défaite met fin à la partie', color: 'border-rose-700/50 hover:border-rose-500' },
  ];

  const STEPS = [
    { n: '1', title: 'Choisissez votre champion', desc: 'Trois créatures de départ aux profils différents.' },
    { n: '2', title: 'Combattez au tour par tour', desc: 'Sélectionnez vos attaques, gérez les recharges, jouez l\'initiative.' },
    { n: '3', title: 'Conquérez les régions', desc: 'Enchaînez les combats sauvages, prenez des reliques, abattez le boss.' },
  ];
</script>

<div class="flex-1 overflow-y-auto">
  <div class="mx-auto max-w-2xl flex flex-col items-center gap-6 py-6 px-3 text-center">
    <!-- Héros -->
    <header class="flex flex-col items-center gap-2">
      <span
        class="text-[10px] md:text-xs uppercase tracking-[0.25em] text-amber-300/90
          border border-amber-500/40 bg-amber-950/40 rounded-full px-3 py-1"
      >
        Roguelike · combat au tour par tour
      </span>
      <h1
        class="font-serif font-extrabold text-4xl md:text-6xl uppercase tracking-widest
          text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700
          drop-shadow-[0_3px_3px_rgba(0,0,0,1)]"
      >
        Battle Monster
      </h1>
      <p class="text-sm md:text-base text-stone-300 max-w-lg leading-relaxed">
        Incarnez un champion et menez-le à travers <span class="text-emerald-300">quatre régions</span>,
        enchaînez les combats <span class="text-amber-200">au tour par tour</span>, collectez des
        <span class="text-violet-300">reliques</span> et terrassiez le <span class="text-rose-300">boss</span>
        de chaque zone. Chaque défaite est définitive.
      </p>
    </header>

    {#if saveInfo}
      <!-- Partie en cours -->
      <section
        class="w-full max-w-sm rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-800 to-stone-900
          p-4 shadow-lg text-left"
      >
        <p class="text-xl font-serif font-bold text-amber-200 text-center uppercase tracking-widest">
          ▶ Une partie en cours
        </p>
        <div class="mt-3 space-y-2 text-sm text-stone-300 font-mono">
          <p class="flex items-center gap-2">
            <span class="text-base">🗺️</span> {REGIONS[saveInfo.regionIndex].name}
          </p>
          <p class="flex items-center gap-2">
            <span class="text-base">⚔️</span> {saveInfo.playerName} · Niveau {saveInfo.playerLevel}
          </p>
          <p class="flex items-center gap-2">
            <span class="text-base">⭐</span> Score : <span class="text-yellow-300 font-bold">{saveInfo.score}</span>
          </p>
        </div>
        <p class="mt-3 text-xs text-stone-500 text-center">
          Progression sauvegardée automatiquement après chaque combat.
        </p>
        <div class="mt-4 flex flex-col gap-2">
          <button
            class="py-2.5 px-4 rounded-lg font-serif font-bold uppercase tracking-widest
              border-2 border-amber-300 text-stone-900 bg-gradient-to-b from-amber-400 to-amber-600
              hover:from-amber-300 hover:to-amber-500 transition-all active:scale-95"
            on:click={onContinue}
          >
            ▶ Continuer la partie
          </button>
          <button
            class="py-2 px-4 rounded-lg font-serif font-bold uppercase tracking-widest
              border-2 border-rose-500/60 text-rose-300 bg-rose-950/30
              hover:bg-rose-900/50 hover:border-rose-400 transition-all active:scale-95"
            on:click={onNewGame}
          >
            ✖ Nouvelle partie
          </button>
        </div>
      </section>
    {:else}
      <!-- Caractéristiques -->
      <section class="w-full">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {#each FEATURES as f}
            <div
              class="rounded-xl border-2 bg-stone-800/80 p-2.5 transition-all duration-200 hover:-translate-y-0.5 {f.color}"
            >
              <div class="text-2xl">{f.icon}</div>
              <p class="mt-1 font-serif font-bold text-amber-100 text-xs md:text-sm uppercase tracking-widest truncate">
                {f.title}
              </p>
              <p class="mt-0.5 text-[10px] md:text-xs text-stone-400 leading-tight">
                {f.desc}
              </p>
            </div>
          {/each}
        </div>
      </section>

      <!-- Comment jouer -->
      <section class="w-full max-w-lg">
        <p class="font-serif font-bold uppercase tracking-widest text-amber-400 text-sm mb-2">
          Comment jouer
        </p>
        <ol class="flex flex-col gap-2 text-left">
          {#each STEPS as step}
            <li class="flex items-start gap-3 rounded-lg bg-black/30 border border-stone-700/60 p-2.5">
              <span
                class="w-6 h-6 shrink-0 rounded-md bg-gradient-to-b from-amber-400 to-amber-600
                  text-stone-900 font-serif font-bold text-sm flex items-center justify-center"
              >
                {step.n}
              </span>
              <div>
                <p class="text-sm font-bold text-stone-100">{step.title}</p>
                <p class="text-xs text-stone-400">{step.desc}</p>
              </div>
            </li>
          {/each}
        </ol>
      </section>

      <!-- CTA -->
      {#if !showingForm}
        <button
          class="py-3 px-6 md:px-10 rounded-lg font-serif font-bold uppercase tracking-widest text-lg
            border-2 border-amber-300 text-stone-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700
            shadow-[0_4px_14px_rgba(251,191,36,0.35)] hover:from-amber-300 hover:to-amber-600
            transition-all active:scale-95"
          on:click={() => (showingForm = true)}
        >
          ⚔ Commencer l'aventure
        </button>
      {:else}
        <MonsterSelector
          onclick={(monster: Monster) => {
            onStartRun(monster);
          }}
        />
      {/if}
    {/if}

    <footer class="text-[10px] text-stone-600 pt-2">
      Battle Monster — un prototype roguelike au tour par tour · résolution D&D d20
    </footer>
  </div>
</div>