<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import { abilityModifier } from "../../../core/entities/Monster";
  import { container } from "../../container";
  import type { MonsterType } from "../../../core/entities/Move";
  import { STAT_LABELS, TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_COLORS, TYPE_ICONS } from "../../styles/typeColors";
  import {
    ALLOCATABLE_STATS,
    CREATION_LEVEL,
    FATE_POINTS_TOTAL,
    NAME_MAX_LENGTH,
    NAME_MIN_LENGTH,
    STAT_CAP,
    TYPE_AFFINITIES,
    autoAllocate,
    baseStat,
    canDecrement,
    canIncrement,
    createDraft,
    decrementStat,
    draftStat,
    emptyAllocation,
    incrementStat,
    isDraftValid,
    remainingFatePoints,
    sanitizeName,
    setDraftType,
    suggestName,
    validateDraft,
    type AllocatableStat,
    type MonsterDraft,
  } from "../../../core/entities/MonsterCreation";

  export let onCreate: (monster: Monster) => void;

  const forge = container.forge;
  const TYPES = Object.keys(TYPE_AFFINITIES) as MonsterType[];

  type Step = 1 | 2 | 3;
  let step: Step = 1;
  let draft: MonsterDraft = createDraft("fire");

  $: remaining = remainingFatePoints(draft.allocation);
  $: errors = validateDraft(draft);
  $: valid = isDraftValid(draft);
  $: previewMoves = forge.previewMoves(draft.type);
  $: typeColors = TYPE_COLORS[draft.type];
  $: affinity = TYPE_AFFINITIES[draft.type];

  // Aperçu des PV : mêmes règles que Monster (dé de vie + mod(Constitution)).
  const HIT_DICE: Record<MonsterType, number> = {
    fire: 8, water: 10, grass: 10, normal: 8, electric: 8, rock: 10,
  };
  $: previewHp = Math.max(
    1,
    Math.floor(
      (HIT_DICE[draft.type] + abilityModifier(draftStat(draft, "constitution"))) *
        (1.8 + CREATION_LEVEL * 0.85)
    )
  );
  $: previewAc = 10 + abilityModifier(draftStat(draft, "speed"));

  const STAT_BAR: Record<AllocatableStat, { color: string; bar: string; hint: string }> = {
    strength: { color: "text-red-300", bar: "from-red-500 to-rose-400", hint: "Touche & dégâts physiques" },
    speed: { color: "text-sky-300", bar: "from-sky-500 to-cyan-400", hint: "Initiative & Classe d'Armure" },
    constitution: { color: "text-emerald-300", bar: "from-emerald-500 to-green-400", hint: "Points de vie maximum" },
    wisdom: { color: "text-violet-300", bar: "from-violet-500 to-purple-400", hint: "Touche & dégâts magiques" },
  };

  const STEP_TITLES: Record<Step, string> = {
    1: "Choisir l'élément",
    2: "Répartir le destin",
    3: "Nommer sa créature",
  };

  function pickType(type: MonsterType) {
    draft = setDraftType(draft, type);
  }

  function goToStep(target: Step) {
    if (target === 3 && remaining !== 0) return;
    step = target;
  }

  function increment(stat: AllocatableStat) {
    draft = incrementStat(draft, stat);
  }

  function decrement(stat: AllocatableStat) {
    draft = decrementStat(draft, stat);
  }

  function resetAllocation() {
    draft = { ...draft, allocation: emptyAllocation() };
  }

  function fillAllocation() {
    draft = autoAllocate(draft);
  }

  function rollName() {
    draft = { ...draft, name: suggestName(draft.type) };
  }

  function submit() {
    if (!valid) return;
    onCreate(forge.create({ ...draft, name: sanitizeName(draft.name) }));
  }

  const ui = {
    container: `
      flex flex-col w-full
      bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-600 rounded-xl
      shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]
      p-4 relative overflow-hidden
    `,
    primaryBtn: `
      py-2 px-5 rounded border border-amber-900/50
      font-serif font-bold tracking-[0.15em] uppercase
      text-stone-900 text-sm
      bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700
      shadow-[0_2px_5px_rgba(0,0,0,0.5)]
      active:scale-95 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed
      transition-all duration-200 cursor-pointer
    `,
    ghostBtn: `
      py-2 px-4 rounded border border-stone-700 bg-stone-900/70
      font-serif font-bold tracking-wider uppercase text-stone-300 text-xs
      hover:border-stone-500 hover:text-stone-100 active:scale-95
      disabled:opacity-40 disabled:cursor-not-allowed
      transition-all duration-200 cursor-pointer
    `,
  };
</script>

<div class={ui.container}>
  <div class="absolute inset-0 pointer-events-none opacity-15 sel-pattern"></div>

  <div class="relative z-10 flex flex-col gap-4">
    <!-- STEPPER -->
    <div class="flex items-center justify-center gap-2 md:gap-3">
      {#each [1, 2, 3] as n}
        {@const s = n as Step}
        {@const done = step > s}
        {@const active = step === s}
        <button
          type="button"
          on:click={() => goToStep(s)}
          disabled={s === 3 && remaining !== 0}
          class="flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] md:text-xs
            font-mono uppercase tracking-wider transition-all disabled:opacity-40
            disabled:cursor-not-allowed cursor-pointer
            {active
              ? 'border-amber-400 bg-amber-950/60 text-amber-200'
              : done
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-stone-700 bg-stone-900/60 text-stone-500'}"
        >
          <span
            class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
              {active ? 'bg-amber-400 text-stone-900' : done ? 'bg-emerald-500 text-stone-900' : 'bg-stone-700 text-stone-300'}"
          >
            {done ? "✓" : n}
          </span>
          <span class="hidden sm:inline">{STEP_TITLES[s]}</span>
        </button>
        {#if n < 3}
          <span class="h-px w-3 md:w-6 bg-stone-700"></span>
        {/if}
      {/each}
    </div>

    <!-- ÉTAPE 1 — TYPE -->
    {#if step === 1}
      <div class="flex flex-col gap-3">
        <div class="text-center">
          <p class="font-serif font-bold uppercase tracking-widest text-amber-400 text-sm">
            Quel élément coule dans ses veines ?
          </p>
          <p class="text-[11px] text-stone-400 mt-0.5">
            Le type fixe les affinités innées (+6 points) et les attaques accessibles.
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {#each TYPES as type}
            {@const tc = TYPE_COLORS[type]}
            {@const aff = TYPE_AFFINITIES[type]}
            {@const selected = draft.type === type}
            <button
              type="button"
              aria-pressed={selected}
              on:click={() => pickType(type)}
              class="card-btn rounded-xl border-2 p-3 text-left transition-all duration-200
                {selected
                  ? tc.border + ' bg-black/50 scale-[1.03]'
                  : 'border-stone-700 bg-black/30 hover:border-stone-500 hover:bg-black/45'}"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <span class="text-2xl">{TYPE_ICONS[type]}</span>
                <div class="leading-tight min-w-0">
                  <p class="font-serif font-bold text-amber-100 text-sm truncate">{TYPE_LABELS[type]}</p>
                  <p class="text-[10px] uppercase tracking-wider {tc.text} truncate">{aff.title}</p>
                </div>
                {#if selected}
                  <span class="ml-auto text-emerald-400 font-bold">✓</span>
                {/if}
              </div>
              <p class="text-[10px] text-stone-400 leading-snug">{aff.blurb}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                {#each ALLOCATABLE_STATS as stat}
                  {#if aff.bonus[stat]}
                    <span class="text-[9px] px-1.5 py-0.5 rounded-full border {tc.badge} font-mono">
                      +{aff.bonus[stat]} {STAT_LABELS[stat]}
                    </span>
                  {/if}
                {/each}
              </div>
            </button>
          {/each}
        </div>

        <div class="flex justify-end">
          <button class={ui.primaryBtn} on:click={() => goToStep(2)}>
            Répartir le destin →
          </button>
        </div>
      </div>

    <!-- ÉTAPE 2 — POINTS DE DESTIN -->
    {:else if step === 2}
      <div class="flex flex-col gap-3">
        <div class="text-center">
          <p class="font-serif font-bold uppercase tracking-widest text-amber-400 text-sm">
            Points de destin
          </p>
          <p class="text-[11px] text-stone-400 mt-0.5">
            Répartissez {FATE_POINTS_TOTAL} points sur les caractéristiques (plafond {STAT_CAP}).
          </p>
        </div>

        <div
          class="self-center px-4 py-1.5 rounded-full border font-mono text-xs tracking-wider
            {remaining === 0
              ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
              : 'border-amber-500/60 bg-amber-950/50 text-amber-300 animate-pulse'}"
        >
          ✨ {remaining} / {FATE_POINTS_TOTAL} points restants
        </div>

        <div class="flex flex-col gap-2">
          {#each ALLOCATABLE_STATS as stat}
            {@const meta = STAT_BAR[stat]}
            {@const total = draftStat(draft, stat)}
            {@const innate = baseStat(draft.type, stat)}
            {@const mod = abilityModifier(total)}
            <div class="rounded-lg border border-stone-700 bg-black/35 p-2.5">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="min-w-0">
                  <span class="font-serif font-bold text-xs md:text-sm {meta.color}">
                    {STAT_LABELS[stat]}
                  </span>
                  <span class="text-[10px] text-stone-500 ml-1.5 hidden sm:inline">{meta.hint}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Retirer un point de {STAT_LABELS[stat]}"
                    on:click={() => decrement(stat)}
                    disabled={!canDecrement(draft, stat)}
                    class="w-7 h-7 rounded border border-stone-600 bg-stone-800 text-stone-200
                      font-bold leading-none hover:border-rose-400 hover:text-rose-300
                      disabled:opacity-30 disabled:cursor-not-allowed active:scale-90
                      transition-all cursor-pointer"
                  >−</button>
                  <span class="w-8 text-center font-mono font-bold text-amber-200 text-sm">{total}</span>
                  <button
                    type="button"
                    aria-label="Ajouter un point de {STAT_LABELS[stat]}"
                    on:click={() => increment(stat)}
                    disabled={!canIncrement(draft, stat)}
                    class="w-7 h-7 rounded border border-stone-600 bg-stone-800 text-stone-200
                      font-bold leading-none hover:border-emerald-400 hover:text-emerald-300
                      disabled:opacity-30 disabled:cursor-not-allowed active:scale-90
                      transition-all cursor-pointer"
                  >+</button>
                </div>
              </div>

              <div class="h-2 bg-stone-800 rounded-full overflow-hidden flex">
                <div
                  class="h-full bg-gradient-to-r {meta.bar} opacity-50"
                  style="width: {(innate / STAT_CAP) * 100}%"
                ></div>
                <div
                  class="h-full bg-gradient-to-r {meta.bar}"
                  style="width: {(draft.allocation[stat] / STAT_CAP) * 100}%"
                ></div>
              </div>

              <div class="flex justify-between text-[9px] font-mono text-stone-500 mt-1">
                <span>inné {innate} · destin +{draft.allocation[stat]}</span>
                <span class={mod >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  mod {mod >= 0 ? "+" : ""}{mod}
                </span>
              </div>
            </div>
          {/each}
        </div>

        <div class="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
          <div class="rounded border border-stone-700 bg-black/35 py-1.5">
            <div class="text-stone-500">PV</div>
            <div class="text-emerald-300 font-bold text-sm">{previewHp}</div>
          </div>
          <div class="rounded border border-stone-700 bg-black/35 py-1.5">
            <div class="text-stone-500">CA</div>
            <div class="text-sky-300 font-bold text-sm">{previewAc}</div>
          </div>
          <div class="rounded border border-stone-700 bg-black/35 py-1.5">
            <div class="text-stone-500">Niveau</div>
            <div class="text-amber-300 font-bold text-sm">{CREATION_LEVEL}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <button class={ui.ghostBtn} on:click={() => goToStep(1)}>← Élément</button>
          <div class="flex gap-2">
            <button class={ui.ghostBtn} on:click={resetAllocation} disabled={remaining === FATE_POINTS_TOTAL}>
              Réinitialiser
            </button>
            <button class={ui.ghostBtn} on:click={fillAllocation} disabled={remaining === 0}>
              Auto ✨
            </button>
            <button class={ui.primaryBtn} disabled={remaining !== 0} on:click={() => goToStep(3)}>
              Nommer →
            </button>
          </div>
        </div>
      </div>

    <!-- ÉTAPE 3 — NOM & RÉCAPITULATIF -->
    {:else}
      <div class="flex flex-col gap-3">
        <div class="text-center">
          <p class="font-serif font-bold uppercase tracking-widest text-amber-400 text-sm">
            Le nom de votre champion
          </p>
          <p class="text-[11px] text-stone-400 mt-0.5">
            De {NAME_MIN_LENGTH} à {NAME_MAX_LENGTH} caractères.
          </p>
        </div>

        <div class="flex gap-2">
          <input
            type="text"
            bind:value={draft.name}
            maxlength={NAME_MAX_LENGTH}
            placeholder="Ex. Pyrax, Ondir, Cairnok…"
            aria-label="Nom du champion"
            class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/50 border-2 border-stone-700
              font-serif font-bold text-amber-100 text-center tracking-wider
              placeholder:text-stone-600 placeholder:font-normal placeholder:tracking-normal
              focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button class={ui.ghostBtn} on:click={rollName} title="Proposer un nom">🎲</button>
        </div>

        <!-- RÉCAPITULATIF -->
        <div class="rounded-xl border-2 {typeColors.border} {typeColors.cardBg} p-3 flex flex-col gap-2.5">
          <div class="flex items-center gap-2.5">
            <span class="text-3xl">{TYPE_ICONS[draft.type]}</span>
            <div class="leading-tight min-w-0">
              <p class="font-serif font-bold text-amber-100 text-base truncate">
                {sanitizeName(draft.name) || "Sans nom"}
              </p>
              <p class="text-[10px] uppercase tracking-wider {typeColors.text}">
                Niv. {CREATION_LEVEL} · {TYPE_LABELS[draft.type]} · {affinity.title}
              </p>
            </div>
            <div class="ml-auto text-right font-mono text-[10px] shrink-0">
              <div class="text-emerald-300">{previewHp} PV</div>
              <div class="text-sky-300">CA {previewAc}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            {#each ALLOCATABLE_STATS as stat}
              {@const meta = STAT_BAR[stat]}
              {@const total = draftStat(draft, stat)}
              <div class="flex items-center gap-1.5">
                <span class="w-14 text-[9px] font-bold {meta.color} truncate">{STAT_LABELS[stat]}</span>
                <div class="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r {meta.bar}"
                    style="width: {(total / STAT_CAP) * 100}%"
                  ></div>
                </div>
                <span class="w-5 text-right text-[9px] font-mono text-stone-400">{total}</span>
              </div>
            {/each}
          </div>

          <div class="border-t border-stone-800/80 pt-2">
            <p class="text-[9px] uppercase tracking-wider text-stone-500 mb-1">
              Attaques accessibles ({previewMoves.length}) · 4 tirées au lancement
            </p>
            <div class="flex flex-wrap gap-1">
              {#each previewMoves.slice(0, 8) as move}
                <span class="text-[9px] px-1.5 py-0.5 rounded-full border font-medium {TYPE_COLORS[move.type].badge}">
                  {TYPE_ICONS[move.type]} {move.name}
                </span>
              {/each}
            </div>
          </div>
        </div>

        {#if errors.length > 0}
          <ul class="text-[11px] text-rose-300 font-mono flex flex-col gap-0.5" aria-live="polite">
            {#each errors as error}
              <li>⚠ {error}</li>
            {/each}
          </ul>
        {/if}

        <div class="flex items-center justify-between gap-2">
          <button class={ui.ghostBtn} on:click={() => goToStep(2)}>← Destin</button>
          <button class={ui.primaryBtn} disabled={!valid} on:click={submit}>
            ⚔ Invoquer & Lancer la partie
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .sel-pattern {
    background-image: radial-gradient(rgba(251, 191, 36, 0.45) 1px, transparent 1px);
    background-size: 14px 14px;
  }
  .card-btn {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }
</style>
