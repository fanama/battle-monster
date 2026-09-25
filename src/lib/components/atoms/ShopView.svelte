<script lang="ts">
  import { styles } from "../../styles/style";
  import { buildConsumableShopItems, type ShopItem } from "../../../core/entities/Relic";
  import type { Monster } from "../../../core/entities/Monster";
  import type { InventorySlot } from "../../../core/entities/Consumable";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";

  export let stock: ShopItem[] | null;
  export let gold: number;
  export let player: Monster | null = null;
  export let inventory: InventorySlot[] = [];
  export let onBuy: (item: ShopItem) => void;
  export let onLeave: () => void;

  type CategoryTab = "all" | "consumable" | "relic" | "heal";
  type SortOption = "default" | "price-asc" | "price-desc" | "affordable" | "type";
  type StatFilter = "all" | "strength" | "speed" | "constitution" | "wisdom" | "instinct" | "charisma" | "ac" | "heal" | "combat";

  let activeCategory: CategoryTab = "all";
  let sortBy: SortOption = "default";
  let filterStat: StatFilter = "all";

  $: totalPotionsInBag = (inventory ?? []).reduce((acc, slot) => acc + slot.quantity, 0);

  /**
   * Stock effectif affiché : garantit la présence du rayon de consommables même
   * si le `shopStock` provient d'une sauvegarde antérieure (rétrocompatibilité).
   */
  $: effectiveStock = (() => {
    const base = stock ?? [];
    if (base.some((i) => i.kind === "consumable")) return base;
    return [...buildConsumableShopItems(), ...base];
  })();

  $: consumablesCount = effectiveStock.filter((i) => i.kind === "consumable").length;
  $: relicsCount = effectiveStock.filter((i) => i.kind === "relic").length;
  $: healCount = effectiveStock.filter((i) => i.kind === "heal").length;

  $: CATEGORY_TABS = [
    { id: "all" as CategoryTab, label: "Tout le Magasin", icon: "🌟", count: effectiveStock.length },
    { id: "consumable" as CategoryTab, label: "Potions & Sacoche", icon: "🎒", count: consumablesCount },
    { id: "relic" as CategoryTab, label: "Reliques Passives", icon: "💍", count: relicsCount },
    { id: "heal" as CategoryTab, label: "Auberge", icon: "🏨", count: healCount },
  ];

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
    { id: "combat", label: "Combat & Anti-Statut", icon: "⚔️" },
  ];

  $: isFullHp = player ? player.currentHp >= player.maxHp : false;

  function getItemBagQuantity(item: ShopItem): number {
    if (item.kind !== "consumable" || !item.consumable) return 0;
    const slot = inventory.find((s) => s.item.id === item.consumable!.id);
    return slot ? slot.quantity : 0;
  }

  function curesActivePlayerStatus(item: ShopItem): boolean {
    if (item.kind !== "consumable" || !item.consumable || !player) return false;
    if (item.consumable.cureStatus === "all") return player.statuses.length > 0;
    if (item.consumable.cureStatus) return player.hasStatus(item.consumable.cureStatus);
    return false;
  }

  function getConsumableBadge(item: ShopItem): { label: string; colorClass: string } {
    if (!item.consumable) return { label: "Potion", colorClass: "border-cyan-500/40 bg-cyan-950/40 text-cyan-300" };
    if (item.consumable.cureStatus === "all") return { label: "✨ Panacée Universelle", colorClass: "border-purple-400/60 bg-purple-950/60 text-purple-200" };
    if (item.consumable.cureStatus === "burn") return { label: "🔥 Anti-Brûlure", colorClass: "border-orange-500/60 bg-orange-950/60 text-orange-200" };
    if (item.consumable.cureStatus === "freeze") return { label: "❄️ Anti-Gel", colorClass: "border-cyan-400/60 bg-cyan-950/60 text-cyan-200" };
    if (item.consumable.cureStatus === "paralysis") return { label: "⚡ Anti-Paralysie", colorClass: "border-yellow-400/60 bg-yellow-950/60 text-yellow-200" };
    if (item.consumable.cureStatus === "poison") return { label: "🌿 Anti-Poison", colorClass: "border-emerald-400/60 bg-emerald-950/60 text-emerald-200" };
    if (item.consumable.healPercent) return { label: `💚 Soin +${item.consumable.healPercent}%`, colorClass: "border-emerald-500/60 bg-emerald-950/60 text-emerald-300" };
    if (item.consumable.resetCooldowns) return { label: "⚡ Reset Cooldowns", colorClass: "border-amber-400/60 bg-amber-950/60 text-amber-200" };
    if (item.consumable.acBonus) return { label: `🛡️ +${item.consumable.acBonus} CA`, colorClass: "border-blue-400/60 bg-blue-950/60 text-blue-200" };
    if (item.consumable.statBoost) return { label: `🥊 +${item.consumable.statBoost.value} Force`, colorClass: "border-rose-400/60 bg-rose-950/60 text-rose-200" };
    return { label: "🎒 Potion", colorClass: "border-cyan-500/40 bg-cyan-950/40 text-cyan-300" };
  }

  function matchesCategory(item: ShopItem, cat: CategoryTab): boolean {
    if (cat === "all") return true;
    return item.kind === cat;
  }

  function matchesStatFilter(item: ShopItem, filter: StatFilter): boolean {
    if (filter === "all") return true;
    if (filter === "heal") {
      return (
        item.kind === "heal" ||
        Boolean(item.consumable?.healPercent || item.consumable?.healFlat) ||
        Boolean(item.relic?.effect.healStartPercent)
      );
    }
    if (item.consumable) {
      if (filter === "combat") return Boolean(item.consumable.cureStatus || item.consumable.resetCooldowns || item.consumable.statBoost);
      if (filter === "ac") return Boolean(item.consumable.acBonus);
      if (filter === "strength" && item.consumable.statBoost?.stat === "strength") return true;
      if (filter === "speed" && item.consumable.statBoost?.stat === "speed") return true;
      if (filter === "constitution" && item.consumable.statBoost?.stat === "constitution") return true;
      if (filter === "wisdom" && item.consumable.statBoost?.stat === "wisdom") return true;
      if (filter === "instinct" && item.consumable.statBoost?.stat === "instinct") return true;
      if (filter === "charisma" && item.consumable.statBoost?.stat === "charisma") return true;
      return false;
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
    let list = effectiveStock.filter(
      (item) => matchesCategory(item, activeCategory) && matchesStatFilter(item, filterStat)
    );

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
          const order = { consumable: 0, relic: 1, heal: 2 };
          if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
          return a.label.localeCompare(b.label);
        });
      case "default":
      default:
        return list;
    }
  })();

  $: consumableItems = filteredAndSortedStock.filter((i) => i.kind === "consumable");
  $: relicItems = filteredAndSortedStock.filter((i) => i.kind === "relic");
  $: healItems = filteredAndSortedStock.filter((i) => i.kind === "heal");
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
        Préparez votre périple : achetez des potions anti-statut pour votre sacoche ou des reliques passives.
      </p>
    </div>

    <div class="flex items-center gap-2 self-end sm:self-auto">
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg
          bg-gradient-to-b from-cyan-900/80 to-stone-900 border border-cyan-400/70
          font-mono font-bold text-cyan-200 text-xs shadow-sm"
        title="Potions en votre possession dans la sacoche"
      >
        <span>🎒</span>
        <span>Sacoche : <strong>{totalPotionsInBag}</strong></span>
      </span>

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

  <!-- Alerte Statut Actuel du Monstre (si souffrant) -->
  {#if player && player.statuses.length > 0}
    <div class="p-2.5 rounded-xl border border-rose-500/50 bg-gradient-to-r from-rose-950/60 via-stone-900 to-amber-950/40 flex items-center justify-between gap-2 text-xs shadow-md animate-in fade-in">
      <div class="flex items-center gap-2">
        <span class="text-lg animate-pulse">⚠️</span>
        <span class="text-rose-200 font-serif">
          <strong>{player.name}</strong> subit des statuts :
          {#each player.statuses as s}
            {@const cfg = STATUS_CONFIGS[s.type]}
            <span class="inline-flex items-center gap-1 px-1.5 py-0.2 mx-1 rounded border {cfg.borderClass} {cfg.badgeClass} font-mono font-bold">
              {cfg.icon} {cfg.name}
            </span>
          {/each}
        </span>
      </div>
      <button
        type="button"
        on:click={() => {
          activeCategory = "consumable";
          filterStat = "combat";
        }}
        class="shrink-0 px-2.5 py-1 rounded-lg border border-cyan-400 bg-cyan-950 text-cyan-200 font-mono font-bold hover:bg-cyan-900 transition-colors cursor-pointer text-[11px]"
      >
        Voir les Remèdes →
      </button>
    </div>
  {/if}

  <!-- Onglets de Catégories de Rayon -->
  <div class="flex flex-wrap items-center gap-1.5 border-b border-stone-800 pb-2">
    {#each CATEGORY_TABS as tab}
      <button
        type="button"
        on:click={() => (activeCategory = tab.id)}
        class="px-3 py-1.5 rounded-xl font-serif text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 border
          {activeCategory === tab.id
            ? tab.id === 'consumable'
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-500/30 to-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-102'
              : 'border-amber-400 bg-gradient-to-b from-amber-500/30 to-amber-900/40 text-amber-200 shadow-md scale-102'
            : tab.id === 'consumable'
              ? 'border-cyan-900/60 bg-cyan-950/30 text-cyan-300 hover:text-cyan-100 hover:border-cyan-500/60'
              : 'border-stone-800 bg-stone-950/60 text-stone-400 hover:text-stone-200 hover:border-stone-700'}"
      >
        <span>{tab.icon}</span>
        <span>{tab.label}</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full font-mono {activeCategory === tab.id ? 'bg-black/40 text-white' : 'bg-stone-900 text-stone-400'}">
          {tab.count}
        </span>
      </button>
    {/each}
  </div>

  <!-- Barre de Filtres par Statistique & Tri -->
  <div class="flex flex-col gap-2 p-2.5 rounded-xl border border-stone-800 bg-stone-900/60">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-xs font-mono text-stone-400">
        <span>🔍</span>
        <span>Affinité :</span>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        {#each STAT_FILTER_OPTIONS as opt}
          <button
            type="button"
            on:click={() => (filterStat = opt.id)}
            class="px-2 py-0.5 rounded-lg text-[11px] font-serif transition-all cursor-pointer flex items-center gap-1 border
              {filterStat === opt.id
                ? 'border-amber-400 bg-amber-500/25 text-amber-200 font-bold shadow-sm'
                : 'border-stone-800 bg-black/30 text-stone-400 hover:text-stone-200 hover:border-stone-700'}"
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        {/each}
        {#if filterStat !== "all"}
          <button
            type="button"
            on:click={() => (filterStat = "all")}
            class="text-[10px] font-mono text-amber-400 hover:text-amber-200 cursor-pointer ml-1"
          >
            ✕ Tous
          </button>
        {/if}
      </div>
    </div>

    <!-- Outils de Tri -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-800/80">
      <div class="flex items-center gap-1.5 text-xs font-mono text-stone-400">
        <span>🔽</span>
        <span>Trier :</span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          on:click={() => (sortBy = "default")}
          class="px-2 py-0.5 rounded font-serif text-xs transition-all cursor-pointer border
            {sortBy === 'default'
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold'
              : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200'}"
        >
          Rayon
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "affordable")}
          class="px-2 py-0.5 rounded font-serif text-xs transition-all cursor-pointer border
            {sortBy === 'affordable'
              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-bold'
              : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200'}"
        >
          ✨ Achetables
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "price-asc")}
          class="px-2 py-0.5 rounded font-serif text-xs transition-all cursor-pointer border
            {sortBy === 'price-asc'
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold'
              : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200'}"
        >
          Prix ↗
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "price-desc")}
          class="px-2 py-0.5 rounded font-serif text-xs transition-all cursor-pointer border
            {sortBy === 'price-desc'
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold'
              : 'border-stone-700 bg-stone-900/60 text-stone-400 hover:text-stone-200'}"
        >
          Prix ↘
        </button>
      </div>
    </div>
  </div>

  <!-- Contenu de la boutique -->
  <div class="flex-grow overflow-y-auto max-h-[60vh] space-y-5 p-1 pr-1.5">
    {#if filteredAndSortedStock.length === 0}
      <div class="flex flex-col items-center justify-center py-10 gap-2 text-stone-400 text-sm">
        <span class="text-3xl">🔍</span>
        <p class="italic">Aucun article ne correspond aux filtres sélectionnés dans ce rayon.</p>
        <button
          type="button"
          on:click={() => {
            activeCategory = "all";
            filterStat = "all";
          }}
          class="mt-1 px-3 py-1 rounded-lg border border-amber-500/50 bg-amber-950/40 text-amber-300 text-xs font-serif cursor-pointer hover:bg-amber-900/60"
        >
          Réinitialiser les filtres
        </button>
      </div>
    {:else}
      <!-- SECTION MISE EN ÉVIDENCE : ÉTAL DE L'ALCHIMISTE (CONSOMMABLES & POTIONS) -->
      {#if consumableItems.length > 0 && (activeCategory === "all" || activeCategory === "consumable")}
        <section class="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 via-stone-900/90 to-stone-950 p-3 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 mb-3 border-b border-cyan-800/50">
            <div class="flex items-center gap-2">
              <span class="text-2xl p-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40">🧪</span>
              <div>
                <h3 class="font-serif font-bold text-sm sm:text-base text-cyan-200 tracking-wider uppercase flex items-center gap-2">
                  <span>Étal de l'Alchimiste</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/80 border border-cyan-400/60 text-cyan-100 font-bold">
                    Consommables de Sacoche
                  </span>
                </h3>
                <p class="text-xs text-cyan-300/70">
                  Potions anti-statut, soins rapides et élixirs utilisables instantanément en plein combat.
                </p>
              </div>
            </div>

            <span class="text-[11px] font-mono text-cyan-300/80 self-end sm:self-auto bg-black/40 px-2 py-0.5 rounded border border-cyan-800/40">
              ⚡ Action instantanée
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {#each consumableItems as item}
              {@const affordable = !item.bought && gold >= item.price}
              {@const inBag = getItemBagQuantity(item)}
              {@const isRecommended = curesActivePlayerStatus(item)}
              {@const badge = getConsumableBadge(item)}

              <div
                class="flex flex-col justify-between rounded-xl border-2 p-3 text-center transition-all shadow-md relative
                  {isRecommended
                    ? 'border-emerald-400 bg-gradient-to-b from-emerald-950/60 to-cyan-950/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                    : affordable
                      ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 via-stone-900/90 to-stone-950 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'border-stone-800 bg-stone-900/70 text-stone-400'}"
              >
                {#if isRecommended}
                  <div class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 border border-emerald-200 text-stone-950 font-mono font-extrabold text-[9px] uppercase tracking-wider shadow-md animate-pulse">
                    ✨ Purge Recommandée !
                  </div>
                {/if}

                <div>
                  <div class="w-12 h-12 mx-auto rounded-xl bg-black/60 border border-cyan-500/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                    {item.icon}
                  </div>

                  <div class="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border {badge.colorClass}">
                      {badge.label}
                    </span>

                    {#if inBag > 0}
                      <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/50 bg-emerald-950/60 text-emerald-300">
                        En sacoche: x{inBag}
                      </span>
                    {/if}
                  </div>

                  <h4 class="font-serif font-bold text-sm tracking-wide text-cyan-100">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-stone-300/80 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>
                </div>

                <div class="mt-3 pt-2.5 border-t border-cyan-950/80">
                  <button
                    type="button"
                    on:click={() => onBuy(item)}
                    disabled={!affordable}
                    class="w-full py-2 rounded-lg border font-mono font-bold text-xs uppercase tracking-wider
                      transition-all active:scale-95 shadow-sm
                      {affordable
                        ? 'border-cyan-300 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-500 text-stone-950 hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                        : 'border-stone-800 bg-stone-950/80 text-stone-500 cursor-not-allowed'}"
                  >
                    {affordable ? `Acheter (+1) · ${item.price} 🪙` : `Manque ${item.price - gold} 🪙`}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- SECTION RELIQUES PASSIFS -->
      {#if relicItems.length > 0 && (activeCategory === "all" || activeCategory === "relic")}
        <section class="rounded-2xl border-2 border-amber-600/40 bg-gradient-to-b from-amber-950/20 via-stone-900/90 to-stone-950 p-3 sm:p-4 shadow-md">
          <div class="flex items-center gap-2 pb-2.5 mb-3 border-b border-amber-800/40">
            <span class="text-2xl p-1 rounded-lg bg-amber-500/20 border border-amber-400/40">💍</span>
            <div>
              <h3 class="font-serif font-bold text-sm sm:text-base text-amber-200 tracking-wider uppercase">
                Reliques & Artefacts Anciens
              </h3>
              <p class="text-xs text-stone-400">
                Objets rares offrant des bonus statistiques et passifs permanents tout au long de la run.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {#each relicItems as item}
              {@const affordable = !item.bought && gold >= item.price}

              <div
                class="flex flex-col justify-between rounded-xl border-2 p-3 text-center transition-all shadow-md
                  {item.bought
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200/70'
                    : affordable
                      ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/25 to-stone-900/80 hover:border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                      : 'border-stone-800 bg-stone-900/60 text-stone-400'}"
              >
                <div>
                  <div class="w-12 h-12 mx-auto rounded-xl bg-black/50 border border-amber-600/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                    {item.icon}
                  </div>

                  <div class="flex items-center justify-center gap-1.5 mb-1.5">
                    <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300">
                      💍 Relique Passive
                    </span>
                  </div>

                  <h4 class="font-serif font-bold text-sm tracking-wide text-stone-100">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-stone-300/80 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>
                </div>

                <div class="mt-3 pt-2.5 border-t border-stone-800">
                  {#if item.bought}
                    <span class="block py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-950/60 font-mono font-bold text-emerald-300 text-xs uppercase tracking-widest shadow-inner">
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
                      {affordable ? `Acheter · ${item.price} 🪙` : gold < item.price ? `Manque ${item.price - gold} 🪙` : "Épuisé"}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- SECTION AUBERGE & REPOS -->
      {#if healItems.length > 0 && (activeCategory === "all" || activeCategory === "heal")}
        <section class="rounded-2xl border-2 border-emerald-600/40 bg-gradient-to-b from-emerald-950/20 via-stone-900/90 to-stone-950 p-3 sm:p-4 shadow-md">
          <div class="flex items-center gap-2 pb-2.5 mb-3 border-b border-emerald-800/40">
            <span class="text-2xl p-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40">🏨</span>
            <div>
              <h3 class="font-serif font-bold text-sm sm:text-base text-emerald-200 tracking-wider uppercase">
                Auberge & Soins Immédiats
              </h3>
              <p class="text-xs text-stone-400">
                Restaurez l'intégralité des points de vie de votre champion sur place.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each healItems as item}
              {@const isHealBlocked = isFullHp}
              {@const affordable = !item.bought && gold >= item.price && !isHealBlocked}

              <div
                class="flex flex-col justify-between rounded-xl border-2 p-3 text-center transition-all shadow-md
                  {item.bought
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200/70'
                    : affordable
                      ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/25 to-stone-900/80 hover:border-emerald-400'
                      : 'border-stone-800 bg-stone-900/60 text-stone-400'}"
              >
                <div>
                  <div class="w-12 h-12 mx-auto rounded-xl bg-black/50 border border-emerald-600/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                    {item.icon}
                  </div>

                  <div class="flex items-center justify-center gap-1.5 mb-1.5">
                    <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300">
                      🏨 Repos Immédiat
                    </span>
                  </div>

                  <h4 class="font-serif font-bold text-sm tracking-wide text-stone-100">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-stone-300/80 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>
                </div>

                <div class="mt-3 pt-2.5 border-t border-stone-800">
                  {#if item.bought}
                    <span class="block py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-950/60 font-mono font-bold text-emerald-300 text-xs uppercase tracking-widest shadow-inner">
                      Soin Reçu ✓
                    </span>
                  {:else}
                    <button
                      type="button"
                      on:click={() => onBuy(item)}
                      disabled={!affordable}
                      class="w-full py-2 rounded-lg border font-mono font-bold text-xs uppercase tracking-widest
                        transition-all active:scale-95 shadow-sm
                        {affordable
                          ? 'border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-600 text-stone-950 hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'border-stone-700 bg-stone-950/80 text-stone-500 cursor-not-allowed'}"
                    >
                      {isHealBlocked
                        ? "PV déjà au max"
                        : affordable
                          ? `Se Reposer · ${item.price} 🪙`
                          : `Manque ${item.price - gold} 🪙`}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </div>

  <!-- Bouton de sortie -->
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
