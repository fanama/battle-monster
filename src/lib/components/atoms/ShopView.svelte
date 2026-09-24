<script lang="ts">
  import { styles } from "../../styles/style";
  import type { ShopItem } from "../../../core/entities/Relic";
  import type { Monster } from "../../../core/entities/Monster";

  export let stock: ShopItem[] | null;
  export let gold: number;
  export let player: Monster | null = null;
  export let onBuy: (item: ShopItem) => void;
  export let onLeave: () => void;

  type SortOption = "default" | "price-asc" | "price-desc" | "affordable" | "type";
  type StatFilter = "all" | "strength" | "speed" | "constitution" | "wisdom" | "instinct" | "charisma" | "ac" | "heal" | "combat";

  let sortBy: SortOption = "default";
  let filterStat: StatFilter = "all";

  const STAT_FILTER_OPTIONS: { id: StatFilter; label: string; icon: string }[] = [
    { id: "all", label: "Toutes", icon: "🌟" },
    { id: "strength", label: "Force", icon: "🥊" },
    { id: "speed", label: "Vitesse", icon: "💨" },
    { id: "constitution", label: "Constitution", icon: "❤️" },
    { id: "wisdom", label: "Savoir", icon: "🧠" },
    { id: "instinct", label: "Instinct", icon: "👁️" },
    { id: "charisma", label: "Charisme", icon: "✨" },
    { id: "ac", label: "Armure (CA)", icon: "🛡️" },
    { id: "heal", label: "Soins & PV", icon: "💚" },
    { id: "combat", label: "Combat Spécial", icon: "⚔️" },
  ];

  $: isFullHp = player ? player.currentHp >= player.maxHp : false;

  function matchesStatFilter(item: ShopItem, filter: StatFilter): boolean {
    if (filter === "all") return true;
    if (filter === "heal") {
      return item.kind === "heal" || Boolean(item.relic?.effect.healStartPercent);
    }
    if (!item.relic) return false;
    const effect = item.relic.effect;
    switch (filter) {
      case "strength":
        return Boolean(effect.stat?.strength);
      case "speed":
        return Boolean(effect.stat?.speed);
      case "constitution":
        return Boolean(effect.stat?.constitution);
      case "wisdom":
        return Boolean(effect.stat?.wisdom);
      case "instinct":
        return Boolean(effect.stat?.instinct);
      case "charisma":
        return Boolean(effect.stat?.charisma);
      case "ac":
        return Boolean(effect.acBonus);
      case "combat":
        return Boolean(
          effect.damagePercent || effect.lifestealPercent || effect.critRange || effect.experiencePercent
        );
      default:
        return true;
    }
  }

  $: filteredAndSortedStock = (() => {
    if (!stock) return [];
    let list = stock.filter((item) => matchesStatFilter(item, filterStat));

    switch (sortBy) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "affordable":
        return list.sort((a, b) => {
          const aAffordable = !a.bought && gold >= a.price && !(a.kind === "heal" && isFullHp);
          const bAffordable = !b.bought && gold >= b.price && !(b.kind === "heal" && isFullHp);
          if (aAffordable && !bAffordable) return -1;
          if (!aAffordable && bAffordable) return 1;
          if (a.bought && !b.bought) return 1;
          if (!a.bought && b.bought) return -1;
          return a.price - b.price;
        });
      case "type":
        return list.sort((a, b) => {
          if (a.kind === "heal" && b.kind !== "heal") return -1;
          if (a.kind !== "heal" && b.kind === "heal") return 1;
          return a.label.localeCompare(b.label);
        });
      case "default":
      default:
        return list;
    }
  })();
</script>

<div
  class="flex flex-col flex-grow rounded-xl border-4 border-stone-600
    bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950
    p-3 md:p-5 mb-3 md:mb-4 shadow-xl overflow-x-clip gap-3"
>
  <!-- En-tête de la Boutique -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-700/80">
    <div>
      <h2 class="font-serif font-bold tracking-widest text-amber-200 uppercase text-base sm:text-lg flex items-center gap-2">
        <span>🛒</span>
        <span>Boutique d'Aventurier</span>
      </h2>
      <p class="text-xs text-stone-400">
        Investissez votre butin dans de précieuses reliques ou des potions de soin.
      </p>
    </div>

    <div class="flex items-center gap-2 self-end sm:self-auto">
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg
          bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-300/80
          font-mono font-bold text-amber-100 text-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]"
      >
        <span>🪙</span>
        <span>{gold} Or</span>
      </span>
    </div>
  </div>

  <!-- Barre de Filtres par Statistique -->
  <div class="flex flex-col gap-1.5 p-2.5 rounded-xl border border-stone-800 bg-stone-900/60">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
        <span>🔍</span>
        <span>Filtrer par statistique :</span>
      </span>
      {#if filterStat !== "all"}
        <button
          type="button"
          on:click={() => (filterStat = "all")}
          class="text-[10px] font-mono text-amber-400 hover:text-amber-200 cursor-pointer"
        >
          ✕ Réinitialiser
        </button>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      {#each STAT_FILTER_OPTIONS as opt}
        <button
          type="button"
          on:click={() => (filterStat = opt.id)}
          class="px-2.5 py-1 rounded-lg text-xs font-serif transition-all cursor-pointer flex items-center gap-1 border
            {filterStat === opt.id
              ? 'border-amber-400 bg-amber-500/25 text-amber-200 font-bold shadow-sm'
              : 'border-stone-800 bg-black/30 text-stone-400 hover:text-stone-200 hover:border-stone-700'}"
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Barre d'outils de Tri -->
  <div class="flex flex-wrap items-center justify-between gap-2 py-0.5">
    <div class="flex items-center gap-1.5 text-xs font-mono text-stone-400">
      <span>🔽</span>
      <span>Trier par :</span>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        on:click={() => (sortBy = "default")}
        class="px-2.5 py-1 rounded-lg font-serif text-xs transition-all cursor-pointer border
          {sortBy === 'default'
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
            : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-600'}"
      >
        Rayon
      </button>

      <button
        type="button"
        on:click={() => (sortBy = "affordable")}
        class="px-2.5 py-1 rounded-lg font-serif text-xs transition-all cursor-pointer border
          {sortBy === 'affordable'
            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-bold shadow-sm'
            : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-600'}"
        title="Afficher en premier les objets que vous pouvez acheter"
      >
        ✨ Achetables
      </button>

      <button
        type="button"
        on:click={() => (sortBy = "price-asc")}
        class="px-2.5 py-1 rounded-lg font-serif text-xs transition-all cursor-pointer border
          {sortBy === 'price-asc'
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
            : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-600'}"
        title="Du moins cher au plus cher"
      >
        Prix ↗
      </button>

      <button
        type="button"
        on:click={() => (sortBy = "price-desc")}
        class="px-2.5 py-1 rounded-lg font-serif text-xs transition-all cursor-pointer border
          {sortBy === 'price-desc'
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
            : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-600'}"
        title="Du plus cher au moins cher"
      >
        Prix ↘
      </button>

      <button
        type="button"
        on:click={() => (sortBy = "type")}
        class="px-2.5 py-1 rounded-lg font-serif text-xs transition-all cursor-pointer border
          {sortBy === 'type'
            ? 'border-violet-400 bg-violet-500/20 text-violet-200 font-bold shadow-sm'
            : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-600'}"
        title="Grouper par type d'objet (Soins et Reliques)"
      >
        🧪 Type
      </button>
    </div>
  </div>

  <!-- Grille des Objets en vente -->
  {#if !filteredAndSortedStock || filteredAndSortedStock.length === 0}
    <div class="flex flex-col items-center justify-center py-10 gap-2 text-stone-400 text-sm">
      <span class="text-3xl">🔍</span>
      <p class="italic">Aucun article ne correspond à cette statistique dans ce rayon.</p>
      {#if filterStat !== "all"}
        <button
          type="button"
          on:click={() => (filterStat = "all")}
          class="mt-1 px-3 py-1 rounded-lg border border-amber-500/50 bg-amber-950/40 text-amber-300 text-xs font-serif cursor-pointer hover:bg-amber-900/60"
        >
          Afficher tous les articles
        </button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-grow content-center my-auto">
      {#each filteredAndSortedStock as item}
        {@const isHealItem = item.kind === "heal"}
        {@const isHealBlocked = isHealItem && isFullHp}
        {@const affordable = !item.bought && gold >= item.price && !isHealBlocked}
        <div
          class="flex flex-col justify-between rounded-xl border-2 p-3.5 text-center transition-all shadow-md
            {item.bought
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200/70'
              : affordable
                ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                : 'border-stone-700 bg-stone-900/60 text-stone-400'}"
        >
          <div>
            <div class="w-12 h-12 mx-auto rounded-xl bg-black/40 border border-stone-700/80 flex items-center justify-center text-3xl mb-2 shadow-inner">
              {item.icon}
            </div>

            <div class="flex items-center justify-center gap-1.5 mb-1">
              <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border {isHealItem ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' : 'border-amber-500/40 bg-amber-950/40 text-amber-300'}">
                {isHealItem ? '🧪 Potion' : '💍 Relique'}
              </span>
            </div>

            <h3 class="font-serif font-bold text-sm md:text-base tracking-wide text-stone-100">
              {item.label}
            </h3>

            <p class="text-xs mt-1 text-stone-300/80 leading-relaxed min-h-[36px]">
              {item.desc}
            </p>
          </div>

          <div class="mt-4 pt-2.5 border-t border-stone-800">
            {#if item.bought}
              <span
                class="block py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-950/60
                  font-mono font-bold text-emerald-300 text-xs uppercase tracking-widest shadow-inner"
              >
                Acheté ✓
              </span>
            {:else}
              <button
                type="button"
                on:click={() => onBuy(item)}
                disabled={!affordable}
                class="w-full py-2 rounded-lg border font-mono font-bold text-xs uppercase tracking-widest
                  transition-all active:scale-95 shadow-sm
                  {affordable
                    ? 'border-amber-300 bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    : 'border-stone-700 bg-stone-950/80 text-stone-500 cursor-not-allowed'}"
              >
                {isHealBlocked
                  ? "PV pleins"
                  : affordable
                    ? `Acheter · ${item.price} 🪙`
                    : gold < item.price
                      ? `Manque ${item.price - gold} 🪙`
                      : "Épuisé"}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="pt-2 flex justify-center border-t border-stone-800">
    <button
      type="button"
      on:click={onLeave}
      class="{styles.buttons.base} {styles.buttons.primary} !px-8 !py-2.5 text-xs sm:text-sm font-serif uppercase tracking-wider"
    >
      Poursuivre la Route →
    </button>
  </div>
</div>
