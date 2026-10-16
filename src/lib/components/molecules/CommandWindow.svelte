<script lang="ts">
  import type { Move, MonsterType } from "../../../core/entities/Move";
  import { STAT_LABELS, TYPE_LABELS, moveAccuracyBonus } from "../../../core/entities/Move";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import { typeEffectiveness } from "../../../core/services/effectiveness";
  import { CHARGE_DAMAGE_MULTIPLIER } from "../../../core/services/BattleEngine";
  import { TYPE_ICONS } from "../../styles/typeColors";
  import { dq } from "../../styles/style";
  import { playSound } from "../../audio/gameAudio";

  /**
   * Fenêtre de commande du combat, en **deux temps** comme Dragon Quest :
   *  ① un menu racine (Attaquer / Sacoche / Grimoire / Faiblesses) ;
   *  ② la liste des capacités, avec une **fenêtre de détail** qui affiche les
   *     chiffres de la capacité survolée ou sélectionnée.
   *
   * Avant, les quatre capacités étaient quatre grandes cartes posées dans la
   * barre d'action, chacune portant jusqu'à six pastilles (`P.N`, `🎯 +N`,
   * `💚 +N`, `⬆ +N`, `⚔ Super eff.`, statut %). L'écran empilait donc une
   * vingtaine de pastilles concurrentes au-dessus d'une arène déjà chargée.
   * Ici la liste reste nue — nom, type, état — et les chiffres vivent dans
   * leur propre cadre.
   *
   * Navigation : souris, tactile et **clavier** (↑ ↓, Entrée, Échap) — un menu
   * à curseur doit répondre au clavier. Une capacité en recharge reste
   * focusable (`aria-disabled`) pour qu'on puisse lire son détail, mais son
   * activation est inerte.
   */

  export let moves: Move[] = [];
  export let targetType: MonsterType | null = null;
  /** Tour adverse ou animation en cours : la fenêtre est éteinte. */
  export let disabled = false;
  export let potions = 0;
  export let onAttack: (index: number) => void = () => {};
  export let onOpenInventory: () => void = () => {};
  export let onOpenMoves: () => void = () => {};
  export let onOpenCodex: () => void = () => {};

  type Step = "root" | "moves";
  let step: Step = "root";
  let cursor = 0;

  interface RootCommand {
    id: "attack" | "bag" | "grimoire" | "weak";
    icon: string;
    label: string;
    help: string;
  }

  $: rootCommands = [
    {
      id: "attack",
      icon: "⚔️",
      label: "Attaquer",
      help: "Ouvrir la liste des capacités et frapper.",
    },
    {
      id: "bag",
      icon: "🎒",
      label: `Sacoche (${potions})`,
      help: "Utiliser un objet — potion, panacée, pierre de recharge.",
    },
    {
      id: "grimoire",
      icon: "📜",
      label: "Grimoire",
      help: "Réordonner les capacités équipées. Hors combat, l'effet est immédiat.",
    },
    {
      id: "weak",
      icon: "📖",
      label: "Faiblesses",
      help: "Consulter la table des éléments et les statuts infligés.",
    },
  ] as RootCommand[];

  $: rows = step === "root" ? rootCommands.length : moves.length;
  /** Capacité inspectée : celle sous le curseur, sinon la première. */
  $: inspected = step === "moves" ? (moves[cursor] ?? null) : null;

  // Chaque nouveau tour repart du menu racine, curseur sur la première ligne.
  let prevDisabled = disabled;
  $: if (disabled !== prevDisabled) {
    prevDisabled = disabled;
    if (!disabled) {
      step = "root";
      cursor = 0;
    }
  }

  /** Le curseur doit suivre le focus clavier : on déplace le focus avec lui. */
  let listEl: HTMLUListElement | null = null;

  function focusRow(index: number): void {
    const rows = listEl?.querySelectorAll<HTMLButtonElement>("button");
    rows?.[index]?.focus({ preventScroll: true });
  }

  function moveCursor(delta: number): void {
    if (rows === 0) return;
    cursor = (cursor + delta + rows) % rows;
    focusRow(cursor);
  }

  function activate(index: number): void {
    if (disabled) return;
    if (step === "root") {
      const command = rootCommands[index];
      if (!command) return;
      playSound("select");
      if (command.id === "attack") {
        step = "moves";
        cursor = 0;
      } else if (command.id === "bag") {
        onOpenInventory();
      } else if (command.id === "grimoire") {
        onOpenMoves();
      } else {
        onOpenCodex();
      }
      return;
    }

    const move = moves[index];
    if (!move || (move.coolDown ?? 0) > 0) return;
    playSound("select");
    onAttack(index);
  }

  function back(): void {
    step = "root";
    cursor = 0;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveCursor(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveCursor(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(cursor);
    } else if (event.key === "Escape" && step === "moves") {
      event.preventDefault();
      back();
    }
  }

  // --- Détail affiché dans le second cadre --------------------------------

  $: nature = inspected
    ? inspected.power > 0
      ? inspected.isPhysical
        ? "physique"
        : "magie"
      : inspected.isHeal
        ? "soin"
        : "buff"
    : null;

  $: natureLabel = { physique: "⚔ Physique", magie: "✨ Magie", soin: "💚 Soin", buff: "⬆ Buff" }[
    nature ?? "physique"
  ];

  $: effectiveness =
    inspected && targetType && inspected.power > 0
      ? typeEffectiveness(inspected.type, targetType, inspected.isPhysical)
      : 1;
</script>

<div class="grid gap-2 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
  <!-- ① Fenêtre de commande : menu racine ou liste des capacités -->
  <div class={dq.window}>
    <div class={dq.title}>
      <span>{step === "root" ? "Commandes" : "Capacités"}</span>
      {#if step === "moves"}
        <button
          type="button"
          on:click={() => {
            playSound("select");
            back();
          }}
          class="cursor-pointer rounded border border-sky-100/25 px-1.5 py-0.5 font-mono text-[10px] text-sky-100/80 hover:bg-sky-50/10"
        >
          ← Retour
        </button>
      {:else}
        <span class={dq.hint}>↑↓ · Entrée</span>
      {/if}
    </div>

    <ul
      bind:this={listEl}
      role="menu"
      class={`flex flex-col gap-0.5 ${dq.body}`}
      aria-label={step === "root" ? "Commandes de combat" : "Capacités"}
      on:keydown={onKeydown}
    >
      {#if step === "root"}
        {#each rootCommands as command, i (command.id)}
          {@const selected = cursor === i}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              aria-disabled={disabled}
              on:focus={() => (cursor = i)}
              on:mouseenter={() => (cursor = i)}
              on:click={() => activate(i)}
              class={`${dq.row} ${selected ? dq.rowActive : dq.rowIdle} ${disabled ? dq.rowOff : "cursor-pointer"}`}
            >
              <span class={selected ? dq.cursor : dq.cursorSlot} aria-hidden="true">{selected ? "▸" : ""}</span>
              <span class="shrink-0" aria-hidden="true">{command.icon}</span>
              <span class="min-w-0 flex-1 truncate font-display font-bold tracking-wide">{command.label}</span>
            </button>
          </li>
        {/each}
      {:else}
        {#each moves as move, i (move.id)}
          {@const ready = (move.coolDown ?? 0) === 0}
          {@const selected = cursor === i}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              aria-disabled={disabled || !ready}
              on:focus={() => (cursor = i)}
              on:mouseenter={() => (cursor = i)}
              on:click={() => activate(i)}
              class={`${dq.row} ${selected ? dq.rowActive : dq.rowIdle} ${disabled || !ready ? dq.rowOff : "cursor-pointer"}`}
            >
              <span class={selected ? dq.cursor : dq.cursorSlot} aria-hidden="true">{selected ? "▸" : ""}</span>
              <span class="shrink-0" aria-hidden="true">{TYPE_ICONS[move.type]}</span>
              <span class="min-w-0 flex-1 truncate font-bold">{move.name}</span>
              <span class={`shrink-0 ${ready ? dq.hint : "font-mono text-[10px] text-rose-300/80"}`}>
                {ready ? "prêt" : `⏳ ${move.coolDown} tour${(move.coolDown ?? 0) > 1 ? "s" : ""}`}
              </span>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  </div>

  <!-- ② Fenêtre de détail : les chiffres sortis des pastilles -->
  <div class={dq.window}>
    <div class={dq.title}>
      <span>Détail</span>
      {#if inspected}
        <span class={dq.hint}>{TYPE_LABELS[inspected.type]}</span>
      {/if}
    </div>

    <div class={`flex flex-col gap-2 ${dq.body}`}>
      {#if step === "root"}
        <!-- Au menu racine, le cadre explique la commande survolée. -->
        <div class={`${dq.inset} flex items-start gap-2 p-2.5`}>
          <span class="shrink-0 text-base" aria-hidden="true">{rootCommands[cursor]?.icon ?? "❔"}</span>
          <p class="text-[11px] leading-relaxed text-sky-100/80">
            {rootCommands[cursor]?.help ?? ""}
          </p>
        </div>
        <p class={`${dq.hint} px-0.5`}>
          {moves.length} capacité{moves.length > 1 ? "s" : ""} équipée{moves.length > 1 ? "s" : ""}
        </p>
      {:else if inspected}
        <!-- Nom + nature de la capacité sélectionnée -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-display text-sm font-extrabold text-white">{inspected.name}</span>
          <span class={dq.badge}>{TYPE_ICONS[inspected.type]} {TYPE_LABELS[inspected.type]}</span>
          <span class={dq.badge}>{natureLabel}</span>
        </div>

        <div class={`${dq.inset} flex flex-wrap gap-1.5 p-2`}>
          {#if inspected.power > 0}
            <span class={dq.badge} title="Puissance de base : taille du dé et bonus de dégâts">
              P.{inspected.power}
            </span>
            <span class={dq.badge} title="Bonus de toucher, inversé à la puissance">
              🎯 +{moveAccuracyBonus(inspected)}
            </span>
          {/if}

          {#if inspected.isHeal && inspected.healPower}
            <span class={dq.badgeGood} title="Bonus de soin ajouté au jet (niveau + 1)d4 + modificateurs">
              💚 +{inspected.healPower} PV
            </span>
          {/if}

          {#if inspected.statBoosts}
            <span class={dq.badgeGood} title="Amélioration permanente de {STAT_LABELS[inspected.statBoosts.stat]}, cumulable">
              ⬆ +{inspected.statBoosts.value} {STAT_LABELS[inspected.statBoosts.stat]}
            </span>
          {/if}

          {#if inspected.guaranteedCrit}
            <span class={dq.badgeGood} title="Coup mortel (Dragon Quest) : aucun jet de toucher — touche toujours et ignore la défense de la victime">
              🎯 Toujours touché
            </span>
          {/if}

          {#if inspected.charge}
            <span class={dq.badgeGood} title="Charge (« ちからため ») : arme la prochaine attaque, qui infligera ×{CHARGE_DAMAGE_MULTIPLIER} dégâts (consommée au premier coup qui touche)">
              ⚡ Charge ×{CHARGE_DAMAGE_MULTIPLIER}
            </span>
          {/if}

          {#if targetType && inspected.power > 0 && effectiveness !== 1}
            <span class={effectiveness > 1 ? dq.badgeGood : dq.badgeBad}>
              {effectiveness > 1 ? "⚔ Super efficace" : "🛡 Peu efficace"}
            </span>
          {/if}

          {#if inspected.statusEffect}
            {@const st = STATUS_CONFIGS[inspected.statusEffect.type]}
            <span
              class={dq.badge}
              title="{st.name} ({inspected.statusEffect.chance}% de chance, DD {inspected.statusEffect.dc ?? 12}) : {st.description}"
            >
              {st.icon} {st.name} {inspected.statusEffect.chance}%
            </span>
          {/if}
        </div>

        {#if inspected.statusEffect}
          {@const st = STATUS_CONFIGS[inspected.statusEffect.type]}
          <p class="text-[10px] leading-relaxed text-sky-100/60">
            <span class={dq.value}>DD {inspected.statusEffect.dc ?? 12}</span> — {st.description}
          </p>
        {/if}

        {#if (inspected.coolDown ?? 0) > 0}
          <p class="text-[10px] text-rose-300/80">
            En recharge : encore {inspected.coolDown} tour{(inspected.coolDown ?? 0) > 1 ? "s" : ""}.
          </p>
        {/if}
      {:else}
        <p class={`${dq.inset} p-2.5 text-[11px] text-sky-100/60`}>Aucune capacité équipée.</p>
      {/if}
    </div>
  </div>
</div>
