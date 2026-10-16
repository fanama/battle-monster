import { describe, expect, test } from 'bun:test';
import {
  matchesShopCategory,
  matchesShopStatFilter,
  type ShopCategoryTab,
  type ShopStatFilter,
} from '../src/lib/styles/shopFilters';
import {
  buildEquipmentShopItems,
  rollShopStock,
  type ShopItem,
} from '../src/core/entities/Relic';
import { EQUIPMENT_CATALOG } from '../src/core/entities/Equipment';

/**
 * Filtres d'affichage de la boutique (régression « aucune armure dans la
 * forge »).
 *
 * `ShopView` ne montre un rayon que si les articles survivent au filtre
 * d'affinité actif. Le filtre par défaut (« Toutes ») tombait dans la branche
 * équipement et se comparait à `effect.stat.all` — toujours absent : **tout le
 * rayon Forge disparaissait**, armures comprises. Ces tests passent le stock
 * réel par les mêmes prédicats que le composant.
 */
const REGIONS = [0, 1, 2, 3];
const VISITS = 20;

/** Vitrine effectivement rendue par `ShopView` pour un rayon et un filtre. */
const visible = (
  stock: ShopItem[],
  category: ShopCategoryTab,
  filter: ShopStatFilter,
): ShopItem[] =>
  stock.filter(
    (item) =>
      matchesShopCategory(item, category) && matchesShopStatFilter(item, filter),
  );

/** Article de boutique tel que `buildEquipmentShopItems` le fabrique. */
const fromCatalog = (id: string): ShopItem => {
  const piece = EQUIPMENT_CATALOG.find((p) => p.id === id);
  if (!piece) throw new Error(`équipement inconnu : ${id}`);
  return {
    id: `shop-${piece.id}`,
    kind: 'equipment',
    price: piece.price,
    label: piece.name,
    icon: piece.icon,
    desc: piece.description,
    equipment: piece,
    bought: false,
  };
};

describe('Boutique : filtre par défaut « Toutes » ne masque rien', () => {
  test('chaque article du stock (potions, auberge, équipements) passe le filtre « Toutes »', () => {
    for (const region of REGIONS) {
      for (let i = 0; i < VISITS; i++) {
        const stock = rollShopStock(undefined, region, 4);
        expect(stock.length).toBeGreaterThan(0);
        for (const item of stock) {
          expect(matchesShopStatFilter(item, 'all')).toBe(true);
          expect(matchesShopCategory(item, 'all')).toBe(true);
        }
      }
    }
  });

  test('les potions restent visibles avec le filtre par défaut', () => {
    const stock = rollShopStock(undefined, 0, 4);
    const potions = visible(stock, 'consumable', 'all');
    expect(potions.length).toBeGreaterThan(0);
    expect(potions.every((i) => i.kind === 'consumable')).toBe(true);
  });
});

describe('Boutique : le rayon Forge expose des armures (régression signalée)', () => {
  test('une armure est visible dans la forge à chaque visite, toutes régions', () => {
    for (const region of REGIONS) {
      for (let i = 0; i < VISITS; i++) {
        const shelf = visible(rollShopStock(undefined, region, 4), 'equipment', 'all');
        // Le rayon n'est pas vide…
        expect(shelf.length).toBeGreaterThan(0);
        // …et il contient bien une armure (l'arme et l'accessoire sont garantis
        // eux aussi : cf. tests/Equipment.test.ts).
        const slots = shelf.map((item) => item.equipment!.slot);
        expect(slots).toContain('armor');
        expect(slots).toContain('weapon');
        expect(slots).toContain('accessory');
      }
    }
  });

  test('toutes les pièces d’un rayon forge survivent au filtre « Toutes »', () => {
    for (const region of REGIONS) {
      for (const item of buildEquipmentShopItems(region, 4)) {
        expect(matchesShopStatFilter(item, 'all')).toBe(true);
        expect(matchesShopCategory(item, 'equipment')).toBe(true);
        expect(matchesShopCategory(item, 'consumable')).toBe(false);
      }
    }
  });
});

describe('Boutique : filtres d’affinité par famille d’effet', () => {
  test('« Armure (CA) » garde les pièces blindées et écarte les autres', () => {
    // Gilet Clouté : +1 CA · +1 Force. Hachette : aucun CA.
    expect(matchesShopStatFilter(fromCatalog('eq-studded-vest'), 'ac')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-leather-wrap'), 'ac')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-hatchet'), 'ac')).toBe(false);

    // Toutes les armures blindées du catalogue passent ce filtre.
    const blindees = EQUIPMENT_CATALOG.filter(
      (p) => p.slot === 'armor' && (p.effect.acBonus ?? 0) > 0,
    );
    expect(blindees.length).toBeGreaterThanOrEqual(4);
    for (const piece of blindees) {
      expect(matchesShopStatFilter(fromCatalog(piece.id), 'ac')).toBe(true);
    }
  });

  test('les filtres de caractéristiques gardent la pièce qui l’augmente', () => {
    expect(matchesShopStatFilter(fromCatalog('eq-hatchet'), 'strength')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-short-bow'), 'speed')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-chain-mail'), 'speed')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-colossus-cuirass'), 'constitution')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-arcane-staff'), 'wisdom')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-crit-goggles'), 'instinct')).toBe(true);
    // Une pièce qui n'augmente pas la caractéristique filtrée est écartée.
    expect(matchesShopStatFilter(fromCatalog('eq-wooden-buckler'), 'strength')).toBe(false);
    expect(matchesShopStatFilter(fromCatalog('eq-colossus-cuirass'), 'strength')).toBe(false);
  });

  test('« Combat » garde les passifs offensifs, « Soins & PV » l’auberge et les soins', () => {
    // Vol de vie / dégâts / critiques → combat.
    expect(matchesShopStatFilter(fromCatalog('eq-vamp-fang'), 'combat')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-thorn-guard'), 'combat')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-leather-wrap'), 'combat')).toBe(false);

    // Soin de début de combat → soins.
    expect(matchesShopStatFilter(fromCatalog('eq-golem-heart'), 'heal')).toBe(true);
    expect(matchesShopStatFilter(fromCatalog('eq-hatchet'), 'heal')).toBe(false);

    // Le repos de l'auberge (« kind: heal ») reste classé dans les soins.
    const auberge = rollShopStock(undefined, 0, 4).find((i) => i.kind === 'heal')!;
    expect(auberge).toBeTruthy();
    expect(matchesShopStatFilter(auberge, 'heal')).toBe(true);
    expect(matchesShopStatFilter(auberge, 'combat')).toBe(false);
  });
});
