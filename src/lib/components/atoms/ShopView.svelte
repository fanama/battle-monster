<script lang="ts">
  import { styles } from "../../styles/style";
  import {
    buildConsumableShopItems,
    buildSellEntries,
    type SellEntry,
    type ShopItem,
  } from "../../../core/entities/Relic";
  import type { Monster, MonsterDelta } from "../../../core/entities/Monster";
  import type { InventorySlot } from "../../../core/entities/Consumable";
  import { STATUS_CONFIGS } from "../../../core/entities/StatusEffect";
  import {
    EQUIPMENT_SLOT_LABELS,
    type Equipment,
    type EquipmentSlot,
  } from "../../../core/entities/Equipment";
  import { STAT_LABELS, type MonsterStat } from "../../../core/entities/Move";
  // Filtres d'affichage (testables, cf. tests/ShopFilters.test.ts).
  import {
    matchesShopCategory as matchesCategory,
    matchesShopStatFilter as matchesStatFilter,
    type ShopCategoryTab as CategoryTab,
    type ShopStatFilter as StatFilter,
  } from "../../styles/shopFilters";

  export let stock: ShopItem[] | null;
  export let gold: number;
  export let player: Monster | null = null;
  export let inventory: InventorySlot[] = [];
  /** Pièces portées (copie fraîche du parent) : base de la comparaison DQ. */
  export let equipped: Partial<Record<EquipmentSlot, Equipment>> = {};
  /** Pièces NON portées : seules celles-là sont reprises au comptoir. */
  export let equipmentBag: Equipment[] = [];
  export let onBuy: (item: ShopItem) => void;
  export let onSell: (entry: SellEntry) => void;
  export let onLeave: () => void;

  // --- Comparaison en boutique (convention DQ : voir l'écart avant d'acheter) --

  const STAT_ORDER: MonsterStat[] = [
    "strength",
    "speed",
    "constitution",
    "charisma",
    "wisdom",
    "instinct",
  ];

  interface DeltaChip {
    label: string;
    value: string;
    positive: boolean;
  }

  /** Traduit un `MonsterDelta` d'aperçu en pastilles vertes (gain) / rouges (perte). */
  function deltaChips(delta: MonsterDelta | null | undefined): DeltaChip[] {
    if (!delta) return [];
    const chips: DeltaChip[] = [];
    for (const stat of STAT_ORDER) {
      const value = delta.stat[stat] ?? 0;
      if (value === 0) continue;
      chips.push({
        label: STAT_LABELS[stat],
        value: `${value > 0 ? "+" : ""}${value}`,
        positive: value > 0,
      });
    }
    if (delta.ac !== 0) {
      chips.push({ label: "CA", value: `${delta.ac > 0 ? "+" : ""}${delta.ac}`, positive: delta.ac > 0 });
    }
    if (delta.maxHp !== 0) {
      chips.push({ label: "PV max", value: `${delta.maxHp > 0 ? "+" : ""}${delta.maxHp}`, positive: delta.maxHp > 0 });
    }
    return chips;
  }

  /** Pièce portée dans l'emplacement de la pièce comparée (null si libre). */
  function wornIn(slot: EquipmentSlot): Equipment | null {
    return equipped[slot] ?? null;
  }

  /** Libellé de rayon d'une ligne de revente (potion ou emplacement de pièce). */
  function sellSlotLabel(entry: SellEntry): string {
    return entry.equipment ? EQUIPMENT_SLOT_LABELS[entry.equipment.slot] : "🎒 Potion";
  }

  /**
   * Aperçus par article de la Forge. `worn` est passé pour être une
   * **dépendance explicite** : porter une pièce depuis la boutique (la fenêtre
   * Équipement y est ouverte) doit faire bouger la comparaison affichée.
   */
  function buildEquipPreviews(
    items: ShopItem[],
    monster: Monster | null,
    worn: Partial<Record<EquipmentSlot, Equipment>>,
  ): Map<string, MonsterDelta | null> {
    const previews = new Map<string, MonsterDelta | null>();
    for (const item of items) {
      previews.set(item.id, monster && item.equipment ? monster.previewEquip(item.equipment) : null);
    }
    void worn;
    return previews;
  }

  type SortOption = "default"| "price-asc"| "price-desc"| "affordable"| "type";

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
  $: healCount = effectiveStock.filter((i) => i.kind === "heal").length;
  $: equipmentCount = effectiveStock.filter((i) => i.kind === "equipment").length;

  $: CATEGORY_TABS = [
    { id: "all" as CategoryTab, label: "Tout le Magasin", icon: "🌟", count: effectiveStock.length },
    { id: "consumable" as CategoryTab, label: "Potions & Sacoche", icon: "🎒", count: consumablesCount },
    { id: "equipment" as CategoryTab, label: "Forge & Équipements", icon: "🧰", count: equipmentCount },
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
    if (item.consumable.cureStatus === "all") return { label: "✨ Panacée Universelle", colorClass: "border-purple-400/60 bg-purple-950/60 text-sky-100" };
    if (item.consumable.cureStatus === "burn") return { label: "🔥 Anti-Brûlure", colorClass: "border-orange-500/60 bg-orange-950/60 text-orange-200" };
    if (item.consumable.cureStatus === "freeze") return { label: "❄️ Anti-Gel", colorClass: "border-cyan-400/60 bg-cyan-950/60 text-cyan-200" };
    if (item.consumable.cureStatus === "paralysis") return { label: "⚡ Anti-Paralysie", colorClass: "border-yellow-400/60 bg-yellow-950/60 text-yellow-200" };
    if (item.consumable.cureStatus === "poison") return { label: "🌿 Anti-Poison", colorClass: "border-emerald-400/60 bg-emerald-950/60 text-emerald-100" };
    if (item.consumable.healPercent) return { label: `💚 Soin +${item.consumable.healPercent}%`, colorClass: "border-emerald-500/60 bg-emerald-950/60 text-emerald-300" };
    if (item.consumable.resetCooldowns) return { label: "⚡ Reset Cooldowns", colorClass: "border-amber-400/60 bg-[#1b1a10]/60 text-amber-100" };
    if (item.consumable.acBonus) return { label: `🛡️ +${item.consumable.acBonus} CA`, colorClass: "border-blue-400/60 bg-blue-950/60 text-blue-200" };
    if (item.consumable.statBoost) return { label: `🥊 +${item.consumable.statBoost.value} Force`, colorClass: "border-rose-400/60 bg-rose-950/60 text-rose-200" };
    return { label: "🎒 Potion", colorClass: "border-cyan-500/40 bg-cyan-950/40 text-cyan-300" };
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
          const order = { consumable: 0, equipment: 1, heal: 2 };
          if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
          return a.label.localeCompare(b.label);
        });
      case "default":
      default:
        return list;
    }
  })();

  $: equipPreviews = buildEquipPreviews(equipmentItems, player, equipped);
  /** Possessions reprises au comptoir (potions + pièces de sacoche). */
  $: sellEntries = buildSellEntries(inventory, equipmentBag);
  $: sellTotal = sellEntries.reduce((sum, entry) => sum + entry.price, 0);

  $: consumableItems = filteredAndSortedStock.filter((i) => i.kind === "consumable");
  $: healItems = filteredAndSortedStock.filter((i) => i.kind === "heal");
  $: equipmentItems = filteredAndSortedStock.filter((i) => i.kind === "equipment");
</script>

<div
  class="flex flex-col flex-grow rounded-xl border-2 sm:border-4 border-sky-100/20
    bg-[#0d1526]
    p-3 md:p-5 mb-2 shadow-xl overflow-x-clip gap-3">
  <!-- En-tête de la Boutique -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-sky-100/20">
    <div>
      <h2 class="font-display font-bold tracking-widest text-amber-100 uppercase text-base sm:text-lg flex items-center gap-2">
        <span>🛒</span>
        <span>Boutique d'Aventurier</span>
      </h2>
      <p class="text-xs text-sky-200/65">
        Préparez votre périple : potions pour votre sacoche et équipements à porter.
        Les reliques ne s'achètent pas — elles sont le pouvoir des monstres vaincus.
      </p>
    </div>

    <div class="flex items-center gap-2 self-end sm:self-auto">
      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg
          bg-gradient-to-b from-cyan-900/80 to-stone-900 border border-cyan-400/70
          font-mono font-bold text-cyan-200 text-xs shadow-sm"
          title="Potions en votre possession dans la sacoche">
        <span>🎒</span>
        <span>Sacoche : <strong>{totalPotionsInBag}</strong></span>
      </span>

      <span
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg
          bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-300/80
          font-mono font-bold text-amber-100 text-sm shadow-[0_0_10px_rgba(251,191,36,0.3)]">
        <span>🪙</span>
        <span>{gold} Or</span>
      </span>

      <!-- Raccourci vers le comptoir de rachat (le rayon d'achat peut être long) -->
      {#if sellEntries.length > 0}
        <a
          href="#boutique-rachat"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
            border border-emerald-400/70 bg-emerald-950/60
            font-mono font-bold text-[11px] text-emerald-200
            transition-colors hover:bg-emerald-900/60 cursor-pointer"
          title="Descendre au comptoir de rachat">
          <span>💰</span>
          <span>Vendre ({sellEntries.length})</span>
        </a>
      {/if}
    </div>
  </div>

  <!-- Alerte Statut Actuel du Monstre (si souffrant) -->
  {#if player && player.statuses.length > 0}
    <div class="p-2.5 rounded-xl border border-rose-500/50 bg-gradient-to-r from-rose-950/60 via-stone-900 to-amber-950/40 flex flex-wrap items-center justify-between gap-2 text-xs shadow-md">
      <div class="flex items-center gap-2 min-w-0 flex-wrap">
        <span class="text-lg animate-pulse">⚠️</span>
        <span class="text-rose-200 font-display min-w-0">
          <strong>{player.name}</strong> subit des statuts :
          {#each player.statuses as s}
            {@const cfg = STATUS_CONFIGS[s.type]}
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded border {cfg.borderClass} {cfg.badgeClass} font-mono font-bold">
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
        class="shrink-0 px-2.5 py-1 rounded-lg border border-cyan-400 bg-cyan-950 text-cyan-200 font-mono font-bold hover:bg-cyan-900 transition-colors cursor-pointer text-[11px]">
        Voir les Remèdes →
      </button>
    </div>
  {/if}

  <!-- Onglets de Catégories de Rayon -->
  <div class="flex flex-wrap items-center gap-1.5 border-b border-sky-100/15 pb-2">
    {#each CATEGORY_TABS as tab}
      <button
        type="button"
        on:click={() => (activeCategory = tab.id)}
        class="px-3 py-1.5 rounded-xl font-display text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 border
          {activeCategory === tab.id
            ? tab.id === 'consumable'
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-500/30 to-cyan-950/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-102'
              : 'border-amber-400 bg-gradient-to-b from-amber-500/30 to-amber-900/40 text-amber-100 shadow-md scale-102'
            : tab.id === 'consumable'
              ? 'border-cyan-900/60 bg-cyan-950/30 text-cyan-300 hover:text-cyan-100 hover:border-cyan-500/60'
              : 'border-sky-100/15 bg-[#070d18]/80 text-sky-200/65 hover:text-sky-50 hover:border-sky-100/20'}">
        <span>{tab.icon}</span>
        <span>{tab.label}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono {activeCategory === tab.id ? 'bg-black/40 text-white' : 'bg-[#0d1526] text-sky-200/65'}">
          {tab.count}
        </span>
      </button>
    {/each}
  </div>

  <!-- Barre de Filtres par Statistique & Tri -->
  <div class="flex flex-col gap-2 p-2.5 rounded-xl border border-sky-100/15 bg-[#0d1526]/60">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-xs font-mono text-sky-200/65">
        <span>🔍</span>
        <span>Affinité :</span>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        {#each STAT_FILTER_OPTIONS as opt}
          <button
            type="button"
            on:click={() => (filterStat = opt.id)}
            class="px-2 py-0.5 rounded-lg text-[11px] font-display transition-all cursor-pointer flex items-center gap-1 border
              {filterStat === opt.id
                ? 'border-amber-400 bg-amber-500/25 text-amber-100 font-bold shadow-sm'
                : 'border-sky-100/15 bg-black/30 text-sky-200/65 hover:text-sky-50 hover:border-sky-100/20'}">
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        {/each}
        {#if filterStat !== "all"}
          <button
            type="button"
            on:click={() => (filterStat = "all")}
            class="text-[10px] font-mono text-amber-100 hover:text-amber-100 cursor-pointer ml-1">
            ✕ Tous
          </button>
        {/if}
      </div>
    </div>

    <!-- Outils de Tri -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-sky-100/15/80">
      <div class="flex items-center gap-1.5 text-xs font-mono text-sky-200/65">
        <span>🔽</span>
        <span>Trier :</span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          on:click={() => (sortBy = "default")}
          class="px-2 py-0.5 rounded font-display text-xs transition-all cursor-pointer border
            {sortBy === 'default'
              ? 'border-amber-400 bg-amber-500/20 text-amber-100 font-bold'
              : 'border-sky-100/20 bg-[#0d1526]/60 text-sky-200/65 hover:text-sky-50'}">
          Rayon
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "affordable")}
          class="px-2 py-0.5 rounded font-display text-xs transition-all cursor-pointer border
            {sortBy === 'affordable'
              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 font-bold'
              : 'border-sky-100/20 bg-[#0d1526]/60 text-sky-200/65 hover:text-sky-50'}">
          ✨ Achetables
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "price-asc")}
          class="px-2 py-0.5 rounded font-display text-xs transition-all cursor-pointer border
            {sortBy === 'price-asc'
              ? 'border-amber-400 bg-amber-500/20 text-amber-100 font-bold'
              : 'border-sky-100/20 bg-[#0d1526]/60 text-sky-200/65 hover:text-sky-50'}">
          Prix ↗
        </button>

        <button
          type="button"
          on:click={() => (sortBy = "price-desc")}
          class="px-2 py-0.5 rounded font-display text-xs transition-all cursor-pointer border
            {sortBy === 'price-desc'
              ? 'border-amber-400 bg-amber-500/20 text-amber-100 font-bold'
              : 'border-sky-100/20 bg-[#0d1526]/60 text-sky-200/65 hover:text-sky-50'}">
          Prix ↘
        </button>
      </div>
    </div>
  </div>

  <!-- Contenu de la boutique (le panneau parent gère le défilement) -->
  <div class="flex-grow space-y-5 p-1 pr-1.5">
    {#if filteredAndSortedStock.length === 0}
      <div class="flex flex-col items-center justify-center py-10 gap-2 text-sky-200/65 text-sm">
        <span class="text-3xl">🔍</span>
        <p class="italic">Aucun article ne correspond aux filtres sélectionnés dans ce rayon.</p>
        <button
          type="button"
          on:click={() => {
            activeCategory = "all";
            filterStat = "all";
          }}
          class="mt-1 px-3 py-1 rounded-lg border border-amber-200/40 bg-[#1b1a10]/60 text-amber-100 text-xs font-display cursor-pointer hover:bg-amber-900/60">
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
                <h3 class="font-display font-bold text-sm sm:text-base text-cyan-200 tracking-wider uppercase flex items-center gap-2">
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
                      : 'border-sky-100/15 bg-[#0d1526]/80 text-sky-200/65'}">
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
                      <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-200/35 bg-emerald-950/60 text-emerald-300">
                        En sacoche: x{inBag}
                      </span>
                    {/if}
                  </div>

                  <h4 class="font-display font-bold text-sm tracking-wide text-cyan-100">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-sky-100/80/80 leading-relaxed min-h-[36px]">
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
                        ? 'border-cyan-300 bg-[#16233a] text-emerald-100 hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                        : 'border-sky-100/15 bg-[#0d1526]/80 text-sky-200/50 cursor-not-allowed'}">
                    {affordable ? `Acheter (+1) · ${item.price} 🪙` : `Manque ${item.price - gold} 🪙`}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- RAYON FORGE & ÉQUIPEMENTS (capacités signature) -->
      {#if equipmentItems.length > 0 && (activeCategory === "all" || activeCategory === "equipment")}
        <section class="rounded-2xl border-2 border-sky-600/40 bg-gradient-to-b from-sky-950/20 via-stone-900/90 to-stone-950 p-3 sm:p-4 shadow-md">
          <div class="flex items-center gap-2 pb-2.5 mb-3 border-b border-sky-800/40">
            <span class="text-2xl p-1 rounded-lg bg-sky-500/20 border border-sky-400/40">🧰</span>
            <div>
              <h3 class="font-display font-bold text-sm sm:text-base text-sky-200 tracking-wider uppercase">
                Forge & Équipements
              </h3>
              <p class="text-xs text-sky-200/65">
                Pièces portées sur le monstre (Arme / Armure / Casque / Bouclier / Accessoire) —
                chaque visite présente au moins une <span class="text-sky-200 font-bold">arme</span>,
                une <span class="text-sky-200 font-bold">armure</span> et un
                <span class="text-sky-200 font-bold">accessoire</span>.
                Une pièce achetée rejoint la <span class="text-sky-300 font-bold">sacoche — inactive tant qu'elle n'est pas portée</span>.
                L'écart affiché compare la pièce à
                <span class="text-sky-200 font-bold">celle que vous portez déjà</span> dans cet emplacement.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {#each equipmentItems as item}
              {@const affordable = !item.bought && gold >= item.price}
              {@const piece = item.equipment}
              {@const worn = piece ? wornIn(piece.slot) : null}
              {@const chips = deltaChips(equipPreviews.get(item.id))}
              <div
                class="flex flex-col justify-between rounded-xl border-2 p-3 text-center transition-all shadow-md
                  {item.bought
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100/70'
                    : affordable
                      ? 'border-sky-500/50 bg-gradient-to-b from-sky-950/25 to-stone-900/80 hover:border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                      : 'border-sky-100/15 bg-[#0d1526]/60 text-sky-200/65'}">
                <div>
                  <div class="w-12 h-12 mx-auto rounded-xl bg-black/50 border border-sky-600/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                    {item.icon}
                  </div>

                  <div class="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                    <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-sky-500/40 bg-sky-950/40 text-sky-300">
                      {EQUIPMENT_SLOT_LABELS[piece!.slot]}
                    </span>
                    {#if piece!.twoHanded}
                      <span
                        class="text-[10px] font-mono uppercase font-black px-1.5 py-0.5 rounded border border-violet-300/40 bg-violet-500/10 text-violet-200"
                        title="Arme à deux mains : elle prend les deux mains, le bouclier est interdit tant qu'elle est portée">
                        ⚔️ Deux mains
                      </span>
                    {/if}
                  </div>

                  <h4 class="font-display font-bold text-sm tracking-wide text-sky-50">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-sky-100/80/80 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>

                  <!-- Comparaison DQ : ce que la pièce change face à celle portée -->
                  <div class="mt-2 rounded-lg border border-sky-100/15 bg-[#070d18]/70 px-2 py-1.5 text-left">
                    <p class="font-mono text-[9px] uppercase tracking-wider text-sky-200/50 truncate">
                      {worn ? `Porté : ${worn.icon} ${worn.name}` : 'Emplacement libre'}
                    </p>
                    <div class="mt-1 flex flex-wrap items-center gap-1">
                      {#if chips.length === 0}
                        <span class="font-mono text-[9px] text-sky-200/45 italic">Aucun écart chiffré</span>
                      {:else}
                        {#each chips as chip (chip.label)}
                          <span class="rounded border px-1 font-mono text-[9px] font-bold leading-[14px]
                            {chip.positive
                              ? 'border-emerald-400/40 bg-emerald-950/50 text-emerald-300'
                              : 'border-rose-400/40 bg-rose-950/50 text-rose-300'}">
                            {chip.label} {chip.value}
                          </span>
                        {/each}
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="mt-3 pt-2.5 border-t border-sky-100/15">
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
                          ? 'border-sky-300 bg-[#16233a] text-sky-100 hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                          : 'border-sky-100/20 bg-[#0d1526]/80 text-sky-200/50 cursor-not-allowed'}">
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
              <h3 class="font-display font-bold text-sm sm:text-base text-emerald-100 tracking-wider uppercase">
                Auberge & Soins Immédiats
              </h3>
              <p class="text-xs text-sky-200/65">
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
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100/70'
                    : affordable
                      ? 'border-emerald-200/35 bg-gradient-to-b from-emerald-950/25 to-stone-900/80 hover:border-emerald-400'
                      : 'border-sky-100/15 bg-[#0d1526]/60 text-sky-200/65'}">
                <div>
                  <div class="w-12 h-12 mx-auto rounded-xl bg-black/50 border border-emerald-600/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                    {item.icon}
                  </div>

                  <div class="flex items-center justify-center gap-1.5 mb-1.5">
                    <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300">
                      🏨 Repos Immédiat
                    </span>
                  </div>

                  <h4 class="font-display font-bold text-sm tracking-wide text-sky-50">
                    {item.label}
                  </h4>

                  <p class="text-xs mt-1 text-sky-100/80/80 leading-relaxed min-h-[36px]">
                    {item.desc}
                  </p>
                </div>

                <div class="mt-3 pt-2.5 border-t border-sky-100/15">
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
                          ? 'border-emerald-300 bg-[#16233a] text-emerald-100 hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'border-sky-100/20 bg-[#0d1526]/80 text-sky-200/50 cursor-not-allowed'}">
                      {isHealBlocked
                        ? "PV déjà au max" : affordable
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

  <!-- RAYON RACHAT : les possessions reprises au comptoir (75 % du catalogue).
       Toujours visible (l'onglet choisi ne filtre que le rayon d'ACHAT) : le
       joueur doit pouvoir vendre sans deviner quel onglet ouvre l'étal. -->
  <section
    id="boutique-rachat"
    class="scroll-mt-2 rounded-2xl border-2 border-amber-600/40 bg-gradient-to-b from-amber-950/20 via-stone-900/90 to-stone-950 p-3 sm:p-4 shadow-md">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 mb-3 border-b border-amber-800/40">
      <div class="flex items-center gap-2">
        <span class="text-2xl p-1 rounded-lg bg-amber-500/20 border border-amber-400/40">💰</span>
        <div>
          <h3 class="font-display font-bold text-sm sm:text-base text-amber-100 tracking-wider uppercase">
            Rachat — Vendez vos possessions
          </h3>
          <p class="text-xs text-sky-200/65">
            Potions de la sacoche et pièces d'équipement
            <span class="text-amber-100 font-bold">non portées</span>, reprises à
            <span class="text-amber-100 font-bold">75 %</span> du prix catalogue.
            Une pièce <span class="text-amber-100 font-bold">portée</span> n'est jamais reprise :
            retirez-la d'abord depuis la fenêtre « Équipement ».
          </p>
        </div>
      </div>

      <span class="text-[11px] font-mono text-amber-200/80 self-end sm:self-auto bg-black/40 px-2 py-0.5 rounded border border-amber-800/40">
        {sellEntries.length} lot(s) · {sellTotal} 🪙 au total
      </span>
    </div>

    {#if sellEntries.length === 0}
      <p class="rounded-lg border border-sky-100/15 bg-[#070d18]/60 px-3 py-4 text-center font-mono text-[11px] text-sky-200/60">
        Rien à vendre — votre sacoche d'objets et votre sacoche d'équipement sont vides.
      </p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {#each sellEntries as entry (entry.id)}
          <div class="flex flex-col justify-between rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/25 to-stone-900/80 p-3 text-center transition-all shadow-md hover:border-amber-400">
            <div>
              <div class="w-12 h-12 mx-auto rounded-xl bg-black/50 border border-amber-500/40 flex items-center justify-center text-3xl mb-2 shadow-inner">
                {entry.icon}
              </div>

              <div class="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                <span class="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-200">
                  {sellSlotLabel(entry)}
                </span>
                {#if entry.quantity > 1}
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-200/35 bg-emerald-950/60 text-emerald-300">
                    En sacoche : x{entry.quantity}
                  </span>
                {/if}
              </div>

              <h4 class="font-display font-bold text-sm tracking-wide text-amber-50">
                {entry.label}
              </h4>

              <p class="text-xs mt-1 text-sky-100/80/80 leading-relaxed min-h-[36px]">
                {entry.desc}
              </p>
            </div>

            <div class="mt-3 pt-2.5 border-t border-amber-900/60">
              <p class="mb-1.5 font-mono text-[10px] text-sky-200/70">
                Repris <span class="text-amber-100 font-bold">{entry.price} 🪙</span>
                <span class="text-sky-200/50">(catalogue {entry.catalogPrice} 🪙)</span>
              </p>
              <button
                type="button"
                on:click={() => onSell(entry)}
                class="w-full py-2 rounded-lg border border-amber-300 bg-[#16233a] text-amber-100 font-mono font-bold text-xs uppercase tracking-widest
                  transition-all active:scale-95 shadow-sm hover:brightness-110 cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                {entry.kind === "consumable" ? "Vendre 1" : "Vendre"}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Bouton de sortie (collé en bas : toujours accessible au pouce) -->
  <div
    class="sticky bottom-0 z-10 pt-2 flex justify-center
      bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent">
    <button
      type="button"
      on:click={onLeave}
      class="{styles.buttons.base} {styles.buttons.primary} !px-8 !py-2.5 text-xs sm:text-sm font-display uppercase tracking-wider">
      Poursuivre la Route →
    </button>
  </div>
</div>
