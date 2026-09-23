<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { REGIONS } from "../../../core/entities/Region";
  import { TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
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
    { type: 'water' as const, strongVs: 'Feu, Roche', weakVs: 'Plante, Électricité', role: 'Tank résistant à gros pool de PV' },
    { type: 'grass' as const, strongVs: 'Eau, Roche', weakVs: 'Feu', role: 'Mage régénérant & contrôles' },
    { type: 'electric' as const, strongVs: 'Eau, Roche', weakVs: 'Plante', role: 'Attaquant véloce & burst magique' },
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
  <section id="starters" class="scroll-mt-20 flex flex-col gap-4">
    <div class="text-center flex flex-col items-center gap-1">
      <h2 class="font-serif font-extrabold text-2xl md:text-3xl uppercase tracking-widest text-amber-300">
        Choisissez Votre Champion
      </h2>
      <p class="text-xs md:text-sm text-stone-400 max-w-lg">
        Chaque créature dispose d'un type élémentaire, d'un profil de caractéristiques et d'attaques exclusives.
      </p>
    </div>

    <div class="w-full">
      <MonsterSelector onclick={(monster) => onStartRun(monster)} />
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
          La défense passive est déterminée par la vitesse et les reliques d'armure. Les dégâts physiques utilisent des dés d'arme (1d6 à 1d20) selon la puissance du coup, tandis que la magie scale sur le Savoir.
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