import { describe, expect, test } from 'bun:test';
import {
  buildConsumableShopItems,
  rollShopStock,
  type ShopItem,
} from '../src/core/entities/Relic';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import type { BattleState } from '../src/core/entities/BattleState';
import { BattleStore } from '../src/lib/stores/battleStore';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * Boutique : **l'or n'achète que des potions et des équipements**. Le rayon
 * reliques a été retiré (`ShopItemKind` ne connaît plus `'relic'`), et une
 * sauvegarde antérieure qui en contiendrait encore ne doit pas le ressusciter
 * au rechargement — le stock est alors régénéré conforme.
 */
const strike: any = {
  id: 't',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

const newPlayer = () =>
  new Monster('m', 'Chef', 'normal', 5, 12, 12, 12, 12, 12, 12, [strike]);

function buildStoreWithSave(shopStock: unknown[]) {
  const controller = new BattleController({
    engine: new BattleEngine(),
    moveProvider: { getMovesForMonster: () => [] } as unknown as MoveProvider,
    enemyFactory: {
      createRandomEnemy: () => {
        throw new Error('unused');
      },
      createBoss: () => {
        throw new Error('unused');
      },
    } as unknown as EnemyFactory,
  });

  const save = {
    version: 1,
    savedAt: Date.now(),
    playerMonster: MonsterIO.toSnapshot(newPlayer()),
    enemyMonster: undefined,
    run: {
      regionIndex: 0,
      relics: [],
      inventory: [],
      equipmentBag: [],
      phase: 'shop',
      map: null,
      mapLayer: 0,
      path: [],
      bossBattle: false,
      equipOffers: null,
      shopStock: shopStock as never,
      score: 0,
      gold: 200,
      unlockedThisRegion: [],
    },
  };

  const store = new BattleStore(
    controller,
    { load: () => save as never, save: () => {}, clear: () => {} } as never,
    { list: () => [], saveChampion: () => {} } as never,
  );
  let current!: BattleState;
  store.store.subscribe((s) => {
    current = s;
  });
  return { store, read: () => current };
}

describe('Boutique : potions et équipements seulement', () => {
  test('le stock généré ne contient aucune relique', () => {
    for (const regionIndex of [0, 1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        const stock = rollShopStock(undefined, regionIndex, 2);
        expect(stock.some((item) => (item as { kind: string }).kind === 'relic')).toBe(false);
        expect(stock.some((item) => item.kind === 'consumable')).toBe(true);
        expect(stock.some((item) => item.kind === 'equipment')).toBe(true);
        // Chaque article vendable est achetable et identifié.
        for (const item of stock) {
          expect(item.id.length).toBeGreaterThan(0);
          expect(item.price).toBeGreaterThanOrEqual(0);
          expect(item.label.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('une sauvegarde ancienne avec des reliques en rayon est régénérée sans relique', () => {
    // Sauvegarde de l'ANCIENNE boutique : une relique + un consommable (la
    // présence du consommable faisait justement garder le stock tel quel).
    const legacyRelic = {
      id: 'shop-relic-ancient-blade',
      kind: 'relic',
      price: 85,
      label: 'Lame Ancienne',
      icon: '💍',
      desc: '+10 % de dégâts',
      relic: { id: 'relic-ancient-blade', name: 'Lame Ancienne' },
      bought: false,
    };
    const [legacyPotion] = buildConsumableShopItems() as ShopItem[];
    expect(legacyPotion).toBeTruthy();

    const { store, read } = buildStoreWithSave([legacyRelic, legacyPotion]);
    expect(store.loadSaved()).toBe(true);

    const stock = read().run.shopStock ?? [];
    expect(stock.length).toBeGreaterThan(0);
    expect(stock.some((item) => (item as { kind: string }).kind === 'relic')).toBe(false);
    expect(stock.every((item) => (item as { relic?: unknown }).relic === undefined)).toBe(true);
    // Le stock régénéré reste vendable : potions + équipements.
    expect(stock.some((item) => item.kind === 'consumable')).toBe(true);
    expect(stock.some((item) => item.kind === 'equipment')).toBe(true);
  });
});
