import type { ShopItem } from '../../core/entities/Relic';

/**
 * Filtres d'affichage de la Boutique d'Aventurier (`ShopView.svelte`).
 *
 * Extraits du composant pour être **testables** : un filtre trop strict masque
 * un rayon entier — la section disparaît alors sans message, ce qui est un bug
 * invisible à l'écran. Ils sont donc couverts par `tests/ShopFilters.test.ts`.
 */

/** Rayons de la boutique (onglets). */
export type ShopCategoryTab = 'all' | 'consumable' | 'heal' | 'equipment';

/** Filtres d'affinité : statistique, CA, soins, combat. */
export type ShopStatFilter =
  | 'all'
  | 'strength'
  | 'speed'
  | 'constitution'
  | 'wisdom'
  | 'instinct'
  | 'charisma'
  | 'ac'
  | 'heal'
  | 'combat';

/** L'article appartient-il au rayon sélectionné ? */
export function matchesShopCategory(
  item: ShopItem,
  category: ShopCategoryTab,
): boolean {
  if (category === 'all') return true;
  return item.kind === category;
}

/**
 * L'article correspond-il au filtre d'affinité ?
 *
 * `'all'` (« Toutes ») est **traité en tout premier** : c'est le filtre par
 * défaut, et un article qui échouerait à `'all'` resterait invisible dans une
 * boutique pourtant pleine. C'était le bug du rayon Forge : `'all'` tombait
 * dans la branche équipement et se comparait à `effect.stat.all` (toujours
 * absent) — aucune pièce d'équipement ne s'affichait, armures comprises.
 */
export function matchesShopStatFilter(
  item: ShopItem,
  filter: ShopStatFilter,
): boolean {
  if (filter === 'all') return true;

  // Les pièces d'équipement sont filtrées par leurs propres effets.
  if (item.kind === 'equipment' && item.equipment) {
    const effect = item.equipment.effect;
    if (filter === 'heal') return Boolean(effect.healStartPercent);
    if (filter === 'ac') return Boolean(effect.acBonus);
    if (filter === 'combat') {
      return Boolean(
        effect.damagePercent || effect.lifestealPercent || effect.critRange,
      );
    }
    // Ici `filter` ne peut plus être que l'une des six caractéristiques.
    return Boolean(effect.stat?.[filter]);
  }

  // Le repos de l'auberge soigne immédiatement (classe « soins »).
  if (filter === 'heal') {
    return (
      item.kind === 'heal' ||
      Boolean(item.consumable?.healPercent || item.consumable?.healFlat)
    );
  }

  if (item.consumable) {
    if (filter === 'combat') {
      return Boolean(
        item.consumable.cureStatus ||
          item.consumable.resetCooldowns ||
          item.consumable.statBoost,
      );
    }
    if (filter === 'ac') return Boolean(item.consumable.acBonus);
    return item.consumable.statBoost?.stat === filter;
  }

  // Seuls l'équipement, les potions et l'auberge sont vendus.
  return false;
}
