<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";
  import type { Move } from "../../../core/entities/Move";
  import { TYPE_LABELS, STAT_LABELS } from "../../../core/entities/Move";
  import { abilityModifier } from "../../../core/entities/Monster";
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

  // Text shown by the floating number
  $: floatLabel = feedback
    ? feedback.kind === 'damage'
      ? `-${feedback.damage}`
      : feedback.kind === 'heal'
        ? `+${feedback.damage}`
        : feedback.kind === 'buff'
          ? `+${feedback.damage} ⬆`
          : feedback.kind === 'fumble'
            ? 'FUMBLE !'
            : 'RATÉ !'
    : '';

  $: isHit = feedback && (feedback.kind === 'damage' || feedback.kind === 'fumble' || feedback.kind === 'miss');
  $: isDamageTaken = feedback && feedback.kind === 'damage';

  $: isUtilityMove = lastMove && lastMove.power === 0;
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
    {#if feedback && feedback.kind !== 'none'}
      <div class="feedback-fx absolute inset-0 z-30 pointer-events-none">
        <!-- Red flash on the monster that got struck -->
        {#if isDamageTaken}
          <div class="absolute inset-0 hit-flash {feedback.isCrit ? 'hit-flash-crit' : ''}"></div>
        {/if}

        <!-- Floating number: damage / heal / buff / fumble / miss -->
        <div
          class="float-num
            {feedback.kind === 'damage' ? 'num-damage' : ''}
            {feedback.kind === 'heal' ? 'num-heal' : ''}
            {feedback.kind === 'buff' ? 'num-buff' : ''}
            {feedback.kind === 'fumble' ? 'num-fumble' : ''}
            {feedback.kind === 'miss' ? 'num-miss' : ''}
            {feedback.isCrit ? 'num-crit' : ''}"
        >
          {floatLabel}
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
          Lvl {monster.level}
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
  /* --- Attacks (Slide/Lunge) --- */
  .attack-player {
    animation: attack-lunge-left 0.35s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  .attack-enemy {
    animation: attack-lunge-right 0.35s cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  /* --- Utility (Heal/Boost Jump) --- */
  .jump-animation {
    animation: hop-up 0.4s ease-in-out;
  }

  @keyframes attack-lunge-left {
    0% {
      transform: translateX(0);
    }
    30% {
      transform: translateX(-62%) scale(1.06);
    }
    70% {
      transform: translateX(8%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes attack-lunge-right {
    0% {
      transform: translateX(0);
    }
    30% {
      transform: translateX(62%) scale(1.06);
    }
    70% {
      transform: translateX(-8%);
    }
    100% {
      transform: translateX(0);
    }
  }

  /* Vertical jump for healing or buffs */
  @keyframes hop-up {
    0% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-40px) scale(1.1);
    }
    100% {
      transform: translateY(0) scale(1);
    }
  }

  /* --- Receiver hit reaction: shake --- */
  .shake {
    animation: shake-hit 0.4s ease both;
    will-change: transform;
  }

  .shake-crit {
    animation: shake-hit-crit 0.5s ease both;
  }

  @keyframes shake-hit {
    0%, 100% { transform: translate(0, 0); }
    15% { transform: translate(-7px, 3px); }
    35% { transform: translate(6px, -4px); }
    55% { transform: translate(-5px, 2px); }
    75% { transform: translate(3px, -2px); }
  }

  @keyframes shake-hit-crit {
    0%, 100% { transform: translate(0, 0) scale(1); }
    20% { transform: translate(-10px, 5px) scale(1.08); }
    45% { transform: translate(9px, -6px) scale(1.05); }
    70% { transform: translate(-6px, 3px) scale(1.02); }
  }

  /* --- Red flash on the struck monster --- */
  .hit-flash {
    background: radial-gradient(circle, rgba(255, 60, 60, 0.7), rgba(255, 60, 60, 0.2) 70%);
    animation: hit-flash-out 0.55s ease-out forwards;
  }

  .hit-flash-crit {
    background: radial-gradient(circle, rgba(255, 255, 255, 0.95), rgba(255, 90, 90, 0.3) 65%);
    animation: hit-flash-out 0.7s ease-out forwards;
  }

  @keyframes hit-flash-out {
    0% { opacity: 0.95; }
    100% { opacity: 0; }
  }

  /* --- Floating number --- */
  .float-num {
    position: absolute;
    left: 50%;
    top: 22%;
    z-index: 40;
    font-weight: 800;
    font-size: 1.5rem;
    line-height: 1;
    white-space: nowrap;
    transform: translate(-50%, 0);
    animation: float-up 1.1s ease-out forwards;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.75);
  }

  .num-damage { color: #ff5252; }
  .num-heal { color: #4ade80; }
  .num-buff { color: #fbbf24; }
  .num-fumble { color: #ff7043; }
  .num-miss { color: #a8a29e; }
  .num-crit {
    font-size: 2.1rem;
    font-weight: 900;
    color: #ffd54f;
  }

  @keyframes float-up {
    0% { opacity: 0; transform: translate(-50%, 14px) scale(0.5); }
    12% { opacity: 1; transform: translate(-50%, 0) scale(1.2); }
    30% { transform: translate(-50%, -8px) scale(1); }
    75% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, -56px) scale(0.85); }
  }
</style>