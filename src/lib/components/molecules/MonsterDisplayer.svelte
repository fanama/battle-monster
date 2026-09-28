<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";
  import type { Move } from "../../../core/entities/Move";
  import { TYPE_LABELS, STAT_LABELS } from "../../../core/entities/Move";
  import { abilityModifier } from "../../../core/entities/Monster";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
  import type { CombatFeedback } from "../../../core/services/BattleEngine";

  export let monster: Monster | null | undefined;
  export let isPlayer: boolean;
  export let isAttacking: boolean = false;
  export let lastMove: Move | null = null;
  export let feedback: CombatFeedback | null = null;

  // Panneau de stats complet (joueur) — repliable.
  let showStats = false;

  $: stats = monster
    ? (Object.keys(STAT_LABELS) as Array<keyof typeof STAT_LABELS>)
    : [];

  $: tc = TYPE_COLORS[(monster?.type ?? 'normal')];

  // Text shown by the floating feedback on mobile & desktop
  $: floatLabel = feedback
    ? feedback.kind === 'damage'
      ? `-${feedback.damage}`
      : feedback.kind === 'heal'
        ? `+${feedback.damage} PV`
        : feedback.kind === 'buff'
          ? `+${feedback.damage} ⬆`
          : feedback.kind === 'fumble'
            ? 'FUMBLE !'
            : 'RATÉ !'
    : '';

  $: isHit = feedback && (feedback.kind === 'damage' || feedback.kind === 'fumble' || feedback.kind === 'miss');
  $: isDamageTaken = feedback && feedback.kind === 'damage';
  $: isUtilityMove = lastMove && lastMove.power === 0;
  $: moveType = lastMove?.type ?? monster?.type ?? 'normal';
</script>

<div
  class:attack-player={isAttacking && isPlayer && !isUtilityMove}
  class:attack-enemy={isAttacking && !isPlayer && !isUtilityMove}
  class:jump-animation={isAttacking && isUtilityMove}
  class:shake={!!isDamageTaken}
  class:shake-crit={!!(isHit && feedback?.isCrit)}
  class="
    {monsterStyles.container.base}
    {isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy}
    relative
  "
>
  {#if monster}
    <!-- BANNIÈRE D'ANNONCE D'ATTAQUE (Très visible sur mobile) -->
    {#if isAttacking && lastMove}
      <div
        class="absolute -top-3 z-40 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-2
          border-amber-300 bg-stone-950/95 font-serif font-black text-[10px] sm:text-xs text-amber-200
          shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-attack-pulse flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
      >
        <span>{TYPE_ICONS[lastMove.type]}</span>
        <span class="tracking-wide">{lastMove.name} !</span>
      </div>
    {/if}

    <!-- FEEDBACK VISUEL & CHIFFRES FLOTTANTS (Optimisé mobile) -->
    {#if feedback && feedback.kind !== 'none'}
      <div class="feedback-fx absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center">
        <!-- Flash d'impact élémentaire sur la créature frappée -->
        {#if isDamageTaken}
          <div class="absolute inset-0 hit-flash {feedback.isCrit ? 'hit-flash-crit' : ''}"></div>
          
          <!-- Effet de coupure / onde élémentaire selon le type d'attaque -->
          <div class="impact-elemental-vfx impact-{moveType} {feedback.isCrit ? 'impact-crit-scale' : ''}">
            <div class="impact-slash"></div>
          </div>
        {/if}

        <!-- Badge & Nombre flottant de combat -->
        <div
          class="float-num
            {feedback.kind === 'damage' ? 'num-damage' : ''}
            {feedback.kind === 'heal' ? 'num-heal' : ''}
            {feedback.kind === 'buff' ? 'num-buff' : ''}
            {feedback.kind === 'fumble' ? 'num-fumble' : ''}
            {feedback.kind === 'miss' ? 'num-miss' : ''}
            {feedback.isCrit ? 'num-crit' : ''}"
        >
          {#if feedback.isCrit}
            <span class="crit-tag">💥 CRITIQUE !</span>
          {/if}
          <span class="num-text">{floatLabel}</span>
        </div>
      </div>
    {/if}

    <!-- Bandeau dégradé coloré selon le type -->
    <div class="h-1 md:h-1.5 w-full {tc.gradient}"></div>

    <div class={monsterStyles.spriteSection.wrapper} style="background: {tc.ambient}">
      <div class={monsterStyles.spriteSection.overlay}></div>
      <SpriteDisplayer {monster} {isPlayer} />
    </div>

    <div
      class="{monsterStyles.nameTag.wrapper_base} {isPlayer
        ? monsterStyles.nameTag.wrapper_player
        : monsterStyles.nameTag.wrapper_enemy}"
    >
      <div class="flex justify-between items-baseline pr-2">
        <h2 class={monsterStyles.nameTag.text}>
          {monster.name}
        </h2>
        <div
          class={isPlayer
            ? monsterStyles.nameTag.level_player
            : monsterStyles.nameTag.level_enemy}
        >
          Niv. {monster.level}
        </div>
      </div>
    </div>

    <div class={monsterStyles.info.container}>
      <div class="flex items-center gap-1.5">
        <span
          class="text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-0.5
            rounded-full border font-bold {tc.badge}"
        >
          {TYPE_ICONS[monster.type]} {TYPE_LABELS[monster.type]}
        </span>
        <span
          class="ml-auto text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-0.5
            rounded-full border font-bold border-sky-400/50 bg-sky-950/50 text-sky-100"
        >
          🛡 CA {monster.getAC()}
        </span>
      </div>

      {#if monster.statuses && monster.statuses.length > 0}
        <div class="flex flex-wrap gap-1 mt-1">
          {#each monster.statuses as st}
            {@const cfg = STATUS_CONFIGS[st.type]}
            <span
              class="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full border {cfg.badgeClass} animate-pulse"
              title="{cfg.name} : {cfg.description} ({st.duration} tour{st.duration > 1 ? 's' : ''} restant{st.duration > 1 ? 's' : ''})"
            >
              <span>{cfg.icon}</span>
              <span>{cfg.name}</span>
              <span class="opacity-80">({st.duration}t{st.potency && st.potency > 1 ? ` · rg ${st.potency}` : ''})</span>
            </span>
          {/each}
        </div>
      {/if}

      <div class={monsterStyles.info.healthWrapper}>
        <HealthBar current={monster.currentHp} max={monster.maxHp} />
        {#if monster.rank === 'boss'}
          <span class="absolute top-0.5 right-1 text-xs md:text-base" title="Boss">👑</span>
        {/if}
      </div>

      {#if isPlayer}
        <div class="px-1 mt-0.5">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-bold text-sky-300">EXP</span>
            <span class="text-xs text-stone-400">
              {monster.experience} / {monster.experienceToNextLevel}
            </span>
          </div>
          <div class="w-full bg-stone-700 rounded-full h-1.5 shadow-inner overflow-hidden">
            <div
              class="h-1.5 rounded-full bg-gradient-to-r from-sky-600 to-cyan-400"
              style="width: {Math.min(
                100,
                (monster.experience / monster.experienceToNextLevel) * 100,
              )}%"
            ></div>
          </div>
        </div>
      {/if}

      <div class="mt-0.5 flex items-center gap-1 uppercase tracking-widest text-[9px] md:text-[10px] font-bold text-stone-500">
        <span class="w-1.5 h-1.5 rounded-full {tc.dot}"></span> Attaques
      </div>

      <div class={monsterStyles.info.moveGrid}>
        {#each monster.moves as move}
          <div class="flex items-center gap-1.5 truncate">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 {TYPE_COLORS[move.type].dot}"></span>
            <span class="truncate font-medium">{move.name}</span>
            {#if move.coolDown && move.coolDown > 0}
              <span class="ml-auto shrink-0 text-amber-400 font-bold" title="En recharge">
                ⏳{move.coolDown}
              </span>
            {/if}
          </div>
        {/each}
      </div>

      {#if isPlayer}
        <button
          class="mt-0.5 w-full text-[10px] uppercase tracking-wider text-sky-300
            border border-sky-500/40 bg-sky-950/40 rounded-md px-2 py-1
            hover:bg-sky-900/50 transition-colors"
          on:click={() => (showStats = !showStats)}
        >
          {showStats ? '▲ Masquer les stats' : '▼ Voir les stats'}
        </button>

        {#if showStats}
          <div class="mt-1 px-2 py-1.5 bg-black/30 rounded-md border border-stone-700/60">
            {#each stats as stat}
              <div class="flex justify-between items-center text-xs py-0.5">
                <span class="text-stone-400">{STAT_LABELS[stat]}</span>
                <span class="font-mono">
                  {monster[stat]}
                  <span class="text-stone-500">
                    ({abilityModifier(monster[stat]) >= 0 ? '+' : ''}{abilityModifier(monster[stat])})
                  </span>
                </span>
              </div>
            {/each}
            <div class="flex justify-between items-center text-xs py-0.5 border-t border-stone-700/60 mt-1 pt-1">
              <span class="text-stone-400">CA</span>
              <span class="font-mono">{monster.getAC()}</span>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div
      class="flex h-full items-center justify-center text-stone-500 opacity-50"
    >
      <span class="text-sm">En attente d'un combattant...</span>
    </div>
  {/if}
</div>

<style>
  /* --- Attaques physiques & magiques (Lunge vers l'adversaire) --- */
  /* Le joueur (à gauche) se projette vers la droite */
  .attack-player {
    animation: attack-lunge-player 0.38s cubic-bezier(0.34, 1.3, 0.64, 1);
    z-index: 25;
  }

  /* L'ennemi (à droite) se projette vers la gauche */
  .attack-enemy {
    animation: attack-lunge-enemy 0.38s cubic-bezier(0.34, 1.3, 0.64, 1);
    z-index: 25;
  }

  /* --- Capacité de soutien / soin / buff (Saut vertical) --- */
  .jump-animation {
    animation: hop-up 0.42s ease-in-out;
  }

  @keyframes attack-lunge-player {
    0% {
      transform: translateX(0);
    }
    35% {
      transform: translateX(clamp(24px, 36%, 65px)) scale(1.08);
    }
    70% {
      transform: translateX(-4%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes attack-lunge-enemy {
    0% {
      transform: translateX(0);
    }
    35% {
      transform: translateX(clamp(-65px, -36%, -24px)) scale(1.08);
    }
    70% {
      transform: translateX(4%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes hop-up {
    0% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-28px) scale(1.08);
    }
    100% {
      transform: translateY(0);
    }
  }

  @keyframes attack-pulse {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-4px) scale(1.05); }
  }

  .animate-attack-pulse {
    animation: attack-pulse 0.6s ease-in-out infinite;
  }

  /* --- Réaction aux coups subis : Shake --- */
  .shake {
    animation: shake-hit 0.38s ease both;
    will-change: transform;
  }

  .shake-crit {
    animation: shake-hit-crit 0.48s ease both;
  }

  @keyframes shake-hit {
    0%, 100% { transform: translate(0, 0); }
    15% { transform: translate(-6px, 3px); }
    35% { transform: translate(6px, -3px); }
    55% { transform: translate(-4px, 2px); }
    75% { transform: translate(3px, -1px); }
  }

  @keyframes shake-hit-crit {
    0%, 100% { transform: translate(0, 0) scale(1); }
    20% { transform: translate(-10px, 5px) scale(1.08); }
    45% { transform: translate(9px, -5px) scale(1.05); }
    70% { transform: translate(-5px, 2px) scale(1.02); }
  }

  /* --- Flash lumineux sur la cible frappée --- */
  .hit-flash {
    background: radial-gradient(circle, rgba(255, 60, 60, 0.75), rgba(255, 60, 60, 0.2) 70%);
    animation: hit-flash-out 0.5s ease-out forwards;
  }

  .hit-flash-crit {
    background: radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(255, 90, 90, 0.4) 65%);
    animation: hit-flash-out 0.65s ease-out forwards;
  }

  @keyframes hit-flash-out {
    0% { opacity: 0.95; }
    100% { opacity: 0; }
  }

  /* --- VFX élémentaires lors de l'impact --- */
  .impact-elemental-vfx {
    position: absolute;
    inset: 10% 5%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 35;
    animation: impact-fade 0.45s ease-out forwards;
  }

  .impact-crit-scale {
    transform: scale(1.25);
  }

  .impact-slash {
    width: 90%;
    height: 4px;
    border-radius: 9999px;
    transform: rotate(-35deg);
    animation: slash-anim 0.35s ease-out forwards;
  }

  .impact-fire .impact-slash {
    background: linear-gradient(90deg, transparent, #ff4500, #ffd700, #ff4500, transparent);
    box-shadow: 0 0 15px #ff4500, 0 0 25px #ffa500;
  }

  .impact-water .impact-slash {
    background: linear-gradient(90deg, transparent, #00bfff, #ffffff, #1e90ff, transparent);
    box-shadow: 0 0 15px #00bfff, 0 0 25px #00ffff;
  }

  .impact-electric .impact-slash {
    background: linear-gradient(90deg, transparent, #ffff00, #ffffff, #ffd700, transparent);
    box-shadow: 0 0 15px #ffff00, 0 0 30px #ffffff;
  }

  .impact-grass .impact-slash {
    background: linear-gradient(90deg, transparent, #32cd32, #adff2f, #228b22, transparent);
    box-shadow: 0 0 15px #32cd32, 0 0 25px #7fff00;
  }

  .impact-rock .impact-slash {
    background: linear-gradient(90deg, transparent, #d2b48c, #f5deb3, #8b4513, transparent);
    box-shadow: 0 0 15px #d2b48c, 0 0 25px #a0522d;
  }

  .impact-normal .impact-slash {
    background: linear-gradient(90deg, transparent, #ffffff, #dcdcdc, #ffffff, transparent);
    box-shadow: 0 0 15px #ffffff, 0 0 25px #e0e0e0;
  }

  @keyframes slash-anim {
    0% { transform: rotate(-35deg) scaleX(0.2); opacity: 0.2; }
    50% { transform: rotate(-35deg) scaleX(1.1); opacity: 1; }
    100% { transform: rotate(-35deg) scaleX(1.3); opacity: 0; }
  }

  @keyframes impact-fade {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  /* --- Nombres et labels flottants de combat (Optimisé Mobile) --- */
  .float-num {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    z-index: 50;
    line-height: 1;
    white-space: nowrap;
    animation: float-pop 1.05s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.9));
  }

  .crit-tag {
    font-size: 0.75rem;
    font-weight: 900;
    color: #fef08a;
    background: rgba(180, 83, 9, 0.85);
    border: 1px solid #facc15;
    border-radius: 9999px;
    padding: 1px 8px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.6);
  }

  .num-text {
    font-size: 1.6rem;
    font-weight: 900;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: -0.02em;
  }

  @media (min-width: 640px) {
    .num-text {
      font-size: 2.1rem;
    }
  }

  .num-damage .num-text {
    color: #ef4444;
    text-shadow: 0 0 12px rgba(239, 68, 68, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  .num-heal .num-text {
    color: #4ade80;
    text-shadow: 0 0 12px rgba(74, 222, 128, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  .num-buff .num-text {
    color: #fbbf24;
    text-shadow: 0 0 12px rgba(251, 191, 36, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  .num-fumble .num-text {
    color: #fb923c;
    text-shadow: 0 0 12px rgba(251, 146, 60, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  .num-miss .num-text {
    color: #cbd5e1;
    text-shadow: 0 0 10px rgba(203, 213, 225, 0.5), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  .num-crit .num-text {
    font-size: 2rem;
    color: #fde047;
    text-shadow: 0 0 15px rgba(250, 204, 21, 0.9), 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  @media (min-width: 640px) {
    .num-crit .num-text {
      font-size: 2.6rem;
    }
  }

  @keyframes float-pop {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.6);
    }
    18% {
      opacity: 1;
      transform: translateY(-8px) scale(1.15);
    }
    35% {
      transform: translateY(-12px) scale(1);
    }
    75% {
      opacity: 1;
      transform: translateY(-24px) scale(0.95);
    }
    100% {
      opacity: 0;
      transform: translateY(-38px) scale(0.85);
    }
  }
</style>