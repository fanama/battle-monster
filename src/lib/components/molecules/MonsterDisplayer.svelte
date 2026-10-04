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
  // `card` : panneau encadré (fiche de monstre). `stage` : combattant posé sur
  // la scène de combat, sans cadre — les barres de vie sont dans le HUD.
  export let variant: "card" | "stage" = "card";
  // Issue du round : déclenche la célébration ou le malaise du monstre.
  // Pendant ce temps, l'écran suivant n'est pas encore affiché (voir
  // `ROUND_END_DELAY` dans battleStore).
  export let outcome: "victory" | "defeat" | null = null;

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
  /**
   * Famille d'animation du coup en cours : détermine lequel des trois jeux
   * d'animations est joué :
   *  - `melee`   : attaque physique — charge au corps à corps vers l'adversaire
   *  - `ranged`  : attaque magique à distance — recul de préparation puis
   *                 projection du bras (le coup part sans contact)
   *  - `utility` : soin ou buff — canalisation sur place, sans déplacement
   */
  $: attackKind = !isAttacking || !lastMove
    ? null
    : lastMove.power === 0
      ? 'utility'
      : lastMove.isPhysical
        ? 'melee'
        : 'ranged';
  $: moveType = lastMove?.type ?? monster?.type ?? 'normal';
</script>

<div
  class:attack-melee-player={attackKind === 'melee' && isPlayer}
  class:attack-melee-enemy={attackKind === 'melee' && !isPlayer}
  class:attack-ranged-player={attackKind === 'ranged' && isPlayer}
  class:attack-ranged-enemy={attackKind === 'ranged' && !isPlayer}
  class:attack-utility={attackKind === 'utility'}
  class:outcome-victory={outcome === 'victory'}
  class:outcome-defeat={outcome === 'defeat'}
  class:shake={!!isDamageTaken}
  class:shake-crit={!!(isHit && feedback?.isCrit)}
  class="
    {variant === 'stage' ? monsterStyles.container.stage : monsterStyles.container.base}
    {variant === 'card' ? (isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy) : ''}
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
    {#if variant === 'card'}
      <div class="h-1 md:h-1.5 w-full {tc.gradient}"></div>
    {/if}

    <!-- Scène : sprite transparent (le décor est fourni par l'arène) -->
    <div
      class={variant === 'stage'
        ? 'relative w-full h-40 xs:h-52 sm:h-60 md:h-72 flex items-end justify-center overflow-visible'
        : monsterStyles.spriteSection.wrapper}
      style={variant === 'card' ? `background: ${tc.ambient}` : ''}
    >
      {#if variant === 'card'}
        <div class={monsterStyles.spriteSection.overlay}></div>
      {/if}
      <SpriteDisplayer {monster} {isPlayer} />
    </div>

    <!-- Ombre portée : ancre le combattant sur le sol de la scène -->
    {#if variant === 'stage'}
      <div class="{monsterStyles.stageShadow.base} mt-0.5"></div>
      <div
        class="mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider
          {isPlayer
            ? 'border-sky-500/50 bg-sky-950/80 text-sky-200'
            : 'border-rose-500/50 bg-rose-950/80 text-rose-200'}"
      >
        {monster.name}
        <span class="opacity-70">· Niv. {monster.level}</span>
      </div>
    {/if}

    {#if variant === 'card'}
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
    {/if}
  {:else}
    <div
      class="flex h-full items-center justify-center text-stone-500 opacity-50"
    >
      <span class="text-sm">En attente d'un combattant...</span>
    </div>
  {/if}
</div>

<style>
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
  /* Les animations d’attaque sont déclarées APRÈS `.shake` : à spécificité
     égale, la dernière règle CSS gagne. Un monstre qui frappe reçoit aussi un
     feedback « damage » (donc la classe .shake) : sans cet ordre, la réaction
     aux dégâts masquerait l’animation d’attaque sur tous les coups réussis. */
  /* =========================================================================
     TROIS ANIMATIONS D'ATTAQUE
     1. Physique  — charge au corps à corps, on fonce sur l'adversaire
     2. À distance — recul de préparation puis projection (le bras part)
     3. Soin/Buff  — canalisation sur place, sans déplacement
     Chaque famille est déclinée en version « joueur » et « ennemi » (miroir).
     ========================================================================= */

  /* --- 1. ATTAQUE PHYSIQUE (corps à corps) --- */
  .attack-melee-player {
    animation: melee-player 0.36s cubic-bezier(0.3, 1.2, 0.5, 1);
    z-index: 25;
  }

  .attack-melee-enemy {
    animation: melee-enemy 0.36s cubic-bezier(0.3, 1.2, 0.5, 1);
    z-index: 25;
  }

  /* Petit-armement en arrière, puis charge franche vers l'avant. */
  @keyframes melee-player {
    0% { transform: translateX(0) scale(1); }
    18% { transform: translateX(-7px) scale(0.97); }
    46% { transform: translateX(clamp(26px, 38%, 70px)) scale(1.1); }
    72% { transform: translateX(-3px) scale(1); }
    100% { transform: translateX(0) scale(1); }
  }

  @keyframes melee-enemy {
    0% { transform: translateX(0) scale(1); }
    18% { transform: translateX(7px) scale(0.97); }
    46% { transform: translateX(clamp(-70px, -38%, -26px)) scale(1.1); }
    72% { transform: translateX(3px) scale(1); }
    100% { transform: translateX(0) scale(1); }
  }

  /* --- 2. ATTAQUE À DISTANCE (magique) --- */
  .attack-ranged-player {
    animation: ranged-player 0.46s ease-out;
    z-index: 24;
  }

  .attack-ranged-enemy {
    animation: ranged-enemy 0.46s ease-out;
    z-index: 24;
  }

  /* On recule pour armer, puis on se redresse vers l'avant : le coup part sans contact. */
  @keyframes ranged-player {
    0% { transform: translateX(0) scale(1); }
    26% { transform: translateX(-15px) scale(0.93); }
    55% { transform: translateX(clamp(9px, 15%, 26px)) scale(1.05); }
    78% { transform: translateX(-2px) scale(1); }
    100% { transform: translateX(0) scale(1); }
  }

  @keyframes ranged-enemy {
    0% { transform: translateX(0) scale(1); }
    26% { transform: translateX(15px) scale(0.93); }
    55% { transform: translateX(clamp(-26px, -15%, -9px)) scale(1.05); }
    78% { transform: translateX(2px) scale(1); }
    100% { transform: translateX(0) scale(1); }
  }

  /* --- 3. SOIN / BUFF (canalisation) --- */
  /* Pas de déplacement : le monstre reste ancré et « charge » l'effet. */
  .attack-utility {
    animation: channel-utility 0.6s ease-in-out;
    z-index: 23;
  }

  @keyframes channel-utility {
    0% { transform: translateY(0) scale(1); filter: brightness(1); }
    38% { transform: translateY(-11px) scale(1.05); filter: brightness(1.22); }
    68% { transform: translateY(-4px) scale(1.01); filter: brightness(1.08); }
    100% { transform: translateY(0) scale(1); filter: brightness(1); }
  }


  /* =========================================================================
     FIN DE ROUND : VICTOIRE / DÉFAITE
     Déclarées après les animations d’attaque et après `.shake` : un monstre
     qui frappe le coup fatal reçoit encore la classe `.shake`, et cette
     dernière ne doit pas masquer la célébration.
     ========================================================================= */
  /* Le vainqueur rebondit et s’illumine. */
  .outcome-victory {
    animation: celebrate-victory 1.5s cubic-bezier(0.25, 0.9, 0.3, 1) both;
    z-index: 26;
  }

  @keyframes celebrate-victory {
    0% { transform: translateY(0) scale(1); filter: brightness(1); }
    18% { transform: translateY(4px) scale(0.94); }
    40% { transform: translateY(-26px) scale(1.1); filter: brightness(1.35); }
    58% { transform: translateY(0) scale(0.98); filter: brightness(1.05); }
    72% { transform: translateY(-10px) scale(1.04); filter: brightness(1.18); }
    100% { transform: translateY(0) scale(1); filter: brightness(1); }
  }

  /* Le perdant s’affaisse, bascule et s’efface. */
  .outcome-defeat {
    animation: slump-defeat 1.8s ease-out both;
    z-index: 22;
  }

  @keyframes slump-defeat {
    0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: grayscale(0); }
    22% { transform: translateY(6px) rotate(0deg) scale(0.97); opacity: 1; }
    55% { transform: translateY(10px) rotate(-7deg) scale(0.92); opacity: 0.75; filter: grayscale(0.7); }
    100% { transform: translateY(14px) rotate(-11deg) scale(0.88); opacity: 0.4; filter: grayscale(1); }
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