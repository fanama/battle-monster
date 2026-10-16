<script lang="ts">
  import { dq } from "../../styles/style";
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
      class="fixed inset-0 w-full h-full bg-[#050a14]/85 backdrop-blur-[2px] cursor-default transition-opacity"
      on:click={onClose}
      aria-label="Fermer le codex"></button>

    <!-- Modal Dialog -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-title"
      class={`relative z-10 w-full max-w-3xl max-h-[88dvh] flex flex-col pop-in overflow-hidden ${dq.window} text-sky-100/90`}>
      <!-- Modal Header -->
      <div class="px-4 sm:px-5 py-4 border-b border-sky-100/15 flex items-center justify-between gap-2 bg-sky-100/[0.06]">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-2xl shrink-0">📖</span>
          <div class="min-w-0">
            <h2
              id="codex-title"
              class="font-display font-extrabold text-base sm:text-lg md:text-xl uppercase tracking-wider text-amber-100 truncate">
              Codex & Guide de Jeu
            </h2>
            <p class="text-[11px] font-mono text-sky-200/60 truncate">
              D&D 5e · Éléments · Régions
            </p>
          </div>
        </div>

        <button
          type="button"
          on:click={onClose}
          class="w-8 h-8 shrink-0 rounded-md border border-sky-100/25 bg-[#16233a] hover:bg-[#1d2d49] text-sky-100/70 hover:text-white
            flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            aria-label="Fermer">
          ✕
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex border-b border-sky-100/15 bg-[#070d18]/70 px-4 pt-2 gap-2 text-xs font-display font-bold tracking-wider uppercase overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          on:click={() => activeTab = 'rules'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'rules' ? 'border-amber-200 text-amber-100 bg-sky-50/5' : 'border-transparent text-sky-100/60 hover:text-sky-50'}">
          <span>🎲</span> <span>Règles D&D 5e</span>
        </button>
        <button
          type="button"
          on:click={() => activeTab = 'elements'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'elements' ? 'border-amber-200 text-amber-100 bg-sky-50/5' : 'border-transparent text-sky-100/60 hover:text-sky-50'}">
          <span>🔥</span> <span>Types & Faiblesses</span>
        </button>
        <button
          type="button"
          on:click={() => activeTab = 'regions'}
          class="px-3 sm:px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 {activeTab === 'regions' ? 'border-amber-200 text-amber-100 bg-sky-50/5' : 'border-transparent text-sky-100/60 hover:text-sky-50'}">
          <span>🗺️</span> <span>Régions & Boss</span>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-5 overflow-y-auto space-y-4 text-xs">
        {#if activeTab === 'rules'}
          <!-- RULES CONTENT -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-amber-100 uppercase tracking-wider text-xs">🎯 Jet d'Attaque (d20)</span>
              <p class="text-sky-100/80 leading-relaxed">
                Le lanceur jette un dé à 20 faces. L'attaque réussit si le score atteint ou dépasse la Classe d'Armure (CA) de la cible.
              </p>
              <div class="p-2.5 rounded bg-black/50 border border-sky-100/15 font-mono text-[11px] text-sky-200/65">
                • Physique : <span class="text-amber-100">1d20 + mod(Force) + Précision ≥ CA</span><br/>
                • Magique : <span class="text-purple-300">1d20 + mod(Savoir) + Précision ≥ CA</span><br/>
                • Défense : <span class="text-emerald-300">dégâts − mod(Constitution) positif de la victime (min. 1)</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-sky-400 uppercase tracking-wider text-xs">🛡️ Classe d'Armure (CA)</span>
              <p class="text-sky-100/80 leading-relaxed">
                La défense de base est déterminée par la vitesse et augmentée par les reliques et pièces d'armure <span class="text-amber-100">portées</span> (plafonnée à 24 pour éviter l'intouchabilité).
              </p>
              <div class="p-2.5 rounded bg-black/50 border border-sky-100/15 font-mono text-[11px] text-sky-200/65">
                • CA : <span class="text-sky-300">10 + mod(Vitesse ≤ +5) + Armure</span><br/>
                • Plafond effectif : <span class="text-amber-100">Max 24 CA</span>
              </div>
            </div>

            <!-- ÉQUIPEMENT & RELIQUES (conventions Dragon Quest / RPG Maker) -->
            <div class="md:col-span-2 p-4 rounded-xl border border-amber-200/20 bg-[#0d1526]/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-amber-100 uppercase tracking-wider text-xs">🧰 Équipement & Reliques (Dragon Quest / RPG Maker)</span>
              <p class="text-sky-100/80 leading-relaxed">
                Seul ce que le monstre <span class="text-amber-100">porte</span> agit : une pièce restée en
                sacoche et une relique restée en <span class="text-amber-100">réserve</span> sont inertes.
                Le portage se fait <span class="text-amber-100">hors combat</span>, dans la fenêtre
                « Équipement », avec l'<span class="text-amber-100">aperçu</span> des statistiques
                avant/après et le bouton <span class="text-amber-100">« Meilleur équipement »</span> (最強装備).
              </p>
              <div class="p-2.5 rounded bg-black/50 border border-sky-100/15 font-mono text-[11px] text-sky-200/65">
                • 5 emplacements : <span class="text-sky-300">Arme · Armure · Casque · Bouclier · Accessoire</span><br/>
                • Reliques : <span class="text-amber-100">3 emplacements portés</span> — la réserve n'agit pas<br/>
                • Arme à deux mains : <span class="text-violet-200">le bouclier est lâché</span> (et refusé tant qu'elle est tenue)<br/>
                • En combat, agir avec un <span class="text-amber-100">objet</span> passe votre tour (どうぐ) — l'ennemi riposte
              </div>
            </div>

            <!-- TABLEAU DES 6 CARACTÉRISTIQUES -->
            <div class="md:col-span-2 p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/80 flex flex-col gap-2.5">
              <span class="font-mono font-bold text-amber-100 uppercase tracking-wider text-xs flex items-center gap-2">
                <span>📊</span>
                <span>Rôle des 6 Caractéristiques (D&D 5e)</span>
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                <div class="p-2.5 rounded-lg border border-red-500/30 bg-red-950/20">
                  <div class="font-bold text-red-300 flex items-center gap-1.5 mb-1">
                    <span>🥊</span> <span>Force</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Touche physique (<span class="text-red-200 font-mono">1d20 + mod(FOR)</span>) et bonus direct aux dégâts d'arme physiques.
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-sky-500/30 bg-sky-950/20">
                  <div class="font-bold text-sky-300 flex items-center gap-1.5 mb-1">
                    <span>💨</span> <span>Vitesse</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Initiative de round (<span class="text-sky-200 font-mono">1d20 + mod(VIT)</span>) et esquive ajoutée à la Classe d'Armure (max +5).
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                  <div class="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                    <span>❤️</span> <span>Constitution</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Pool de PV max, <span class="text-emerald-100 font-semibold">jets de sauvegarde</span> face aux statuts (Brûlure, Gel, Paralysie, Poison) et <span class="text-emerald-100 font-semibold">absorption des dégâts</span> : un modificateur positif est retiré aux attaques reçues.
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-sky-100/20 bg-[#16233a]">
                  <div class="font-bold text-sky-100 flex items-center gap-1.5 mb-1">
                    <span>🧠</span> <span>Savoir</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Touche magique (<span class="text-sky-50 font-mono">1d20 + mod(SAV)</span>), puissance des sorts et bonus de soins.
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-amber-500/30 bg-[#1b1a10]/20">
                  <div class="font-bold text-amber-100 flex items-center gap-1.5 mb-1">
                    <span>👁️</span> <span>Instinct</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Perception martiale étendant la <span class="text-amber-100 font-semibold">plage de coups critiques</span> (19-20 dès mod(INS) ≥ +2).
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-pink-500/30 bg-pink-950/20">
                  <div class="font-bold text-pink-300 flex items-center gap-1.5 mb-1">
                    <span>✨</span> <span>Charisme</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Canalisation arcanique (<span class="text-pink-200 font-semibold">+2 % dégâts magiques / pt &gt; 10</span>) et bonus brut aux sorts de soin.
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-emerald-400 uppercase tracking-wider text-xs">⚡ Initiative & Ordre de Tour</span>
              <p class="text-sky-100/80 leading-relaxed">
                Au début de chaque tour, chaque combattant lance un jet d'initiative (<span class="font-mono text-emerald-300">1d20 + mod(Vitesse)</span>). Le plus rapide frappe en premier, puis le second n'agit qu'après la frappe précédente : les attaques, les logs et les PV défilent donc toujours dans l'ordre des jets. Si le premier coup met K.O., la riposte est annulée.
              </p>
            </div>

            <div class="p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/60 flex flex-col gap-2">
              <span class="font-mono font-bold text-rose-400 uppercase tracking-wider text-xs">💥 Critiques & Fumbles</span>
              <p class="text-sky-100/80 leading-relaxed">
                • <span class="text-amber-100 font-bold">20 Naturel</span> : Coup critique garanti ! Tous les dés de dégâts sont doublés.<br/>
                • <span class="text-rose-400 font-bold">1 Naturel</span> : Échec critique automatique (l'attaque rate).
              </p>
            </div>

            <!-- EFFETS DE STATUT ÉLÉMENTAIRES (D20) -->
            <div class="md:col-span-2 p-4 rounded-xl border border-amber-500/40 bg-[#0d1526]/90 flex flex-col gap-2.5">
              <span class="font-mono font-bold text-amber-100 uppercase tracking-wider text-xs flex items-center gap-2">
                <span>✨</span>
                <span>Effets de Statut Élémentaires & Jets de Sauvegarde (d20)</span>
              </span>
              <p class="text-sky-100/80 leading-relaxed text-[11px]">
                Certaines capacités élémentaires infligent des altérations d'état. La cible effectue un <span class="text-amber-100 font-bold">jet de sauvegarde d20 + mod(Constitution) vs le Degré de Difficulté (DD)</span> pour y résister ou s'en libérer :
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div class="p-2.5 rounded-lg border border-orange-500/40 bg-orange-950/30">
                  <div class="font-bold text-orange-300 flex items-center gap-1.5 mb-1">
                    <span>🔥</span> <span>Brûlure (Feu)</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    Inflige <span class="text-orange-200 font-semibold">8 % des PV max</span> à chaque fin de tour. Jet de sauvegarde CON (DD 12) pour éteindre les flammes.
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-cyan-400/40 bg-cyan-950/30">
                  <div class="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                    <span>❄️</span> <span>Gel (Eau)</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    <span class="text-cyan-200 font-semibold">Tour sauté</span> ! Jet de sauvegarde CON (DD 12) au début de chaque tour pour briser la glace et agir.
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-yellow-400/40 bg-yellow-950/30">
                  <div class="font-bold text-yellow-300 flex items-center gap-1.5 mb-1">
                    <span>⚡</span> <span>Paralysie (Électricité)</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    <span class="text-yellow-200 font-semibold">Initiative réduite (-4)</span> et jet de sauvegarde CON (DD 11) à chaque action : en cas d'échec, l'attaque est interrompue !
                  </p>
                </div>

                <div class="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30">
                  <div class="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                    <span>🌿</span> <span>Poison (Plante)</span>
                  </div>
                  <p class="text-[11px] text-sky-100/80">
                    <span class="text-emerald-100 font-semibold">Dégâts croissants</span> (+5 % PV max par rang cumulé). Jet de sauvegarde CON (DD 13) pour purger la toxine.
                  </p>
                </div>
              </div>
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
                  <span class="font-display font-bold text-xs uppercase tracking-wider {tc.text}">
                    {TYPE_LABELS[elem.type]}
                  </span>
                </div>
                <p class="text-[11px] text-sky-100/80">{elem.role}</p>
                <div class="text-[10px] font-mono flex flex-col gap-1 border-t border-sky-100/15/80 pt-2 text-sky-200/65">
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
              <div class="p-4 rounded-xl border border-sky-100/15 bg-[#0d1526]/50 flex flex-col justify-between gap-2.5">
                <div>
                  <div class="flex items-center justify-between text-[10px] font-mono text-sky-200/65 mb-1">
                    <span>Région {i + 1}/4</span>
                    <span class="text-amber-100">Niveaux {reg.minLevel}–{reg.maxLevel}</span>
                  </div>
                  <h4 class="font-display font-bold text-amber-100 text-sm">{reg.name}</h4>
                  <p class="text-[11px] text-sky-200/65 mt-1 leading-relaxed">{reg.description}</p>
                </div>
                <div class="pt-2 border-t border-sky-100/15 text-[11px] font-mono flex items-center justify-between">
                  <span class="text-rose-400 flex items-center gap-1 font-bold">
                    <span>👑</span> {reg.bossName}
                  </span>
                  <span class="text-sky-200/65">
                    {TYPE_ICONS[reg.bossType]} {TYPE_LABELS[reg.bossType]}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-sky-100/15 bg-[#0d1526]/80 flex justify-end">
        <button
          type="button"
          on:click={onClose}
          class="px-5 py-2 rounded-lg font-display font-bold text-xs uppercase tracking-wider
            bg-[#16233a] hover:bg-[#1d2d49] text-sky-50 transition-colors cursor-pointer">
          Fermer
        </button>
      </div>
    </div>
  </div>
{/if}
