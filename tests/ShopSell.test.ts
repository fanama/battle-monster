import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  SELL_PRICE_RATE,
  buildSellEntries,
  sellPrice,
} from '../src/core/entities/Relic';
import { EQUIPMENT_CATALOG, type Equipment } from '../src/core/entities/Equipment';
import { CONSUMABLE_CATALOG } from '../src/core/entities/Consumable';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import { BattleStore } from '../src/lib/stores/battleStore';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * Boutique — **rachat des possessions** (2026-10) : l'or ne servait qu'à
 * acheter, la sacoche ne se vidait jamais. On peut désormais **vendre** ses
 * potions (une unité par clic) et ses pièces d'équipement **non portées**, à
 * **75 %** du prix catalogue (`sellPrice`, arrondi au supérieur).
 *
 * Deux règles structurent le rayon :
 * 1. l'équipement **porté** est refusé (on ne vend pas ce qu'on tient : il faut
 *    le retirer d'abord) — refus **journalisé et sans perte** (or et sacoche
 *    intacts), pas un échec silencieux ;
 * 2. les **reliques** ne se vendent pas (pouvoir arraché aux monstres, et
 *    l'anti-doublon repose sur leur possession) — `SellEntry.kind` ne connaît
 *    que `'consumable' | 'equipment'`.
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

const PANACEA = CONSUMABLE_CATALOG.find((item) => item.id === 'potion-panacea')!;
const OINTMENT = CONSUMABLE_CATALOG.find((item) => item.id === 'potion-anti-burn')!;
const ARMOR = EQUIPMENT_CATALOG.find((piece) => piece.slot === 'armor')!;

function bagPiece(id: string): Equipment {
  const piece = EQUIPMENT_CATALOG.find((p) => p.id === id);
  if (!piece) throw new Error(`pièce absente du catalogue : ${id}`);
  return piece;
}

/** Run minimal en boutique, avec une sacoche et de l'or donnés. */
function shopRun(overrides: Record<string, unknown> = {}): any {
  return {
    phase: 'shop' as const,
    regionIndex: 0,
    map: null,
    mapLayer: 0,
    path: [],
    gold: 100,
    shopStock: [],
    bossBattle: false,
    relics: [],
    score: 0,
    relicOffers: null,
    equipOffers: null,
    inventory: [],
    equipmentBag: [],
    unlockedThisRegion: [],
    ...overrides,
  };
}

/** Store hydraté depuis une sauvegarde (mêmes conventions que ShopStock.test). */
function buildStore(save: {
  player: Monster;
  run: Record<string, unknown>;
}) {
  const payload = {
    version: 1,
    savedAt: Date.now(),
    playerMonster: MonsterIO.toSnapshot(save.player),
    enemyMonster: undefined,
    run: save.run,
  };

  const store = new BattleStore(
    controller,
    {
      load: () => payload as never,
      save: () => {},
      clear: () => {},
    } as never,
    { list: () => [], saveChampion: () => {} } as never,
  );
  let current!: any;
  store.store.subscribe((s) => {
    current = s;
  });
  expect(store.loadSaved()).toBe(true);
  return { store, read: () => current };
}

describe('Prix de rachat (75 % du catalogue)', () => {
  test('le taux est bien de 75 % et l’arrondi se fait au supérieur', () => {
    expect(SELL_PRICE_RATE).toBe(0.75);
    expect(sellPrice(100)).toBe(75);
    expect(sellPrice(30)).toBe(23); // 22.5 → 23
    expect(sellPrice(65)).toBe(49); // 48.75 → 49
  });

  test('un article sans valeur rapporte toujours au moins 1 pièce d’or', () => {
    // Sinon une pièce à 0 catalogue serait vendable « pour rien » : le joueur
    // la perdrait sans contrepartie, sur un bouton qui semble marcher.
    expect(sellPrice(0)).toBe(1);
    expect(sellPrice(1)).toBe(1);
  });

  test('aucun article du catalogue ne se revend plus cher qu’il ne s’achète', () => {
    for (const item of CONSUMABLE_CATALOG) {
      expect(sellPrice(item.price)).toBeLessThanOrEqual(item.price);
      expect(sellPrice(item.price)).toBeGreaterThan(0);
    }
    for (const piece of EQUIPMENT_CATALOG) {
      expect(sellPrice(piece.price)).toBeLessThanOrEqual(piece.price);
      expect(sellPrice(piece.price)).toBeGreaterThan(0);
    }
  });
});

describe('Liste de revente (buildSellEntries)', () => {
  test('les potions de la sacoche donnent une ligne par objet, avec sa quantité', () => {
    const entries = buildSellEntries(
      [
        { item: PANACEA, quantity: 2, origin: 'shop' },
        { item: OINTMENT, quantity: 1, origin: 'shop' },
      ],
      [],
    );

    expect(entries).toHaveLength(2);
    const panacea = entries.find((e) => e.consumable?.id === PANACEA.id)!;
    expect(panacea.kind).toBe('consumable');
    expect(panacea.quantity).toBe(2);
    expect(panacea.price).toBe(sellPrice(PANACEA.price));
    expect(panacea.catalogPrice).toBe(PANACEA.price);
    // Le prix affiché doit être celui du catalogue, pas celui du rachat.
    expect(panacea.catalogPrice).toBeGreaterThan(panacea.price);
  });

  test('les pièces de la sacoche d’équipement sont vendables une par une', () => {
    const entries = buildSellEntries([], [ARMOR, bagPiece('eq-titan-hammer')]);
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.kind).toBe('equipment');
      expect(entry.quantity).toBe(1);
      expect(entry.equipment).toBeTruthy();
      expect(entry.price).toBe(sellPrice(entry.equipment!.price));
    }
  });

  test('l’équipement PORTÉ n’apparaît jamais dans la liste', () => {
    // Il n'est pas dans la sacoche : la seule source de revente d'équipement
    // est `equipmentBag`, donc porter une pièce la retire de l'étal.
    const player = newPlayer();
    const displaced = player.equip(ARMOR);
    expect(displaced).toBeNull();
    expect(player.getEquippedList()).toHaveLength(1);

    const entries = buildSellEntries([], []);
    expect(entries).toHaveLength(0);
    expect(entries.some((e) => e.equipment?.id === ARMOR.id)).toBe(false);
  });

  test('une sacoche vide donne une liste vide (et l’écran affiche « Rien à vendre »)', () => {
    expect(buildSellEntries([], [])).toEqual([]);
    // Les emplacements à quantité nulle (sauvegarde abîmée) sont ignorés.
    expect(buildSellEntries([{ item: PANACEA, quantity: 0, origin: 'shop' }], [])).toEqual([]);
  });

  test('les clés d’affichage sont uniques (filet pour le `each` de ShopView)', () => {
    const entries = buildSellEntries(
      [
        { item: PANACEA, quantity: 1, origin: 'shop' },
        { item: PANACEA, quantity: 3, origin: 'boss' },
      ],
      [ARMOR, ARMOR],
    );
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Une seule ligne par potion : la seconde occurrence est fusionnée à l'id.
    expect(entries.filter((e) => e.kind === 'consumable')).toHaveLength(1);
  });
});

describe('Rachat au comptoir (BattleController.sellItem)', () => {
  test('vendre une potion empilée n’enlève qu’une unité et crédite 75 %', () => {
    const run = shopRun({
      inventory: [
        { item: PANACEA, quantity: 3, origin: 'shop' },
        { item: OINTMENT, quantity: 1, origin: 'shop' },
      ],
    });

    const result = controller.sellItem(newPlayer(), run, {
      kind: 'consumable',
      id: PANACEA.id,
    })!;

    expect(result.refused).toBe(false);
    expect(result.run.gold).toBe(100 + sellPrice(PANACEA.price));
    const slot = result.run.inventory.find((s) => s.item.id === PANACEA.id)!;
    expect(slot.quantity).toBe(2);
    // La seconde potion de la sacoche n'a pas bougé.
    expect(result.run.inventory.find((s) => s.item.id === OINTMENT.id)?.quantity).toBe(1);
    expect(result.logs.join(' ')).toContain(PANACEA.name);
  });

  test('vendre la dernière unité retire la ligne de la sacoche', () => {
    const run = shopRun({
      inventory: [{ item: OINTMENT, quantity: 1, origin: 'shop' }],
    });
    const result = controller.sellItem(newPlayer(), run, {
      kind: 'consumable',
      id: OINTMENT.id,
    })!;

    expect(result.run.inventory).toHaveLength(0);
    expect(result.run.gold).toBe(100 + sellPrice(OINTMENT.price));
  });

  test('vendre une potion absente de la sacoche ne fait rien (null)', () => {
    const run = shopRun({ inventory: [] });
    expect(
      controller.sellItem(newPlayer(), run, { kind: 'consumable', id: PANACEA.id }),
    ).toBeNull();
  });

  test('vendre une pièce de la sacoche la retire et crédite son rachat', () => {
    const hammer = bagPiece('eq-titan-hammer');
    const run = shopRun({ equipmentBag: [hammer, ARMOR] });

    const result = controller.sellItem(newPlayer(), run, {
      kind: 'equipment',
      id: hammer.id,
    })!;

    expect(result.refused).toBe(false);
    expect(result.run.gold).toBe(100 + sellPrice(hammer.price));
    expect(result.run.equipmentBag.map((p) => p.id)).toEqual([ARMOR.id]);
  });

  test('vendre une pièce PORTÉE est REFUSÉ : or et sacoche intacts, refus journalisé', () => {
    const player = newPlayer();
    const displaced = player.equip(ARMOR);
    expect(displaced).toBeNull(); // rien à déloger sur un champion nu
    expect(player.equipped.armor?.id).toBe(ARMOR.id);

    // La pièce est portée : elle n'est PAS dans la sacoche, mais on la désigne
    // par son id (comme le ferait une ligne d'étal).
    const run = shopRun({ equipmentBag: [bagPiece('eq-titan-hammer')], gold: 100 });
    const result = controller.sellItem(player, run, {
      kind: 'equipment',
      id: ARMOR.id,
    })!;

    expect(result.refused).toBe(true);
    expect(result.run.gold).toBe(100);
    expect(result.run.equipmentBag.map((p) => p.id)).toEqual(['eq-titan-hammer']);
    // Le message doit dire quoi faire, sinon le refus est un cul-de-sac.
    expect(result.logs.join(' ')).toContain('retirez');
    expect(player.equipped.armor?.id).toBe(ARMOR.id);
  });

  test('une pièce ni portée ni en sacoche est vendable nulle part (null)', () => {
    const run = shopRun({ equipmentBag: [ARMOR] });
    expect(
      controller.sellItem(newPlayer(), run, {
        kind: 'equipment',
        id: bagPiece('eq-titan-hammer').id,
      }),
    ).toBeNull();
  });

  test('vendre TOUTE la sacoche ne crédite que des rachats (jamais le prix plein)', () => {
    const bag = [bagPiece('eq-titan-hammer'), ARMOR];
    let run = shopRun({ equipmentBag: bag });
    let gold = 100;
    for (const entry of buildSellEntries([], bag)) {
      const result = controller.sellItem(newPlayer(), run, {
        kind: entry.kind,
        id: entry.equipment!.id,
      })!;
      run = result.run;
      gold += entry.price;
    }

    expect(run.equipmentBag).toHaveLength(0);
    expect(run.gold).toBe(gold);
    expect(gold).toBeLessThan(100 + bag.reduce((sum, p) => sum + p.price, 0));
  });
});

describe('Boutique : l’action du store (sellShopItem)', () => {
  test('vendre crédite l’or, journalise la vente et sauvegarde', () => {
    const player = newPlayer();
    const { store, read } = buildStore({
      player,
      run: shopRun({
        inventory: [{ item: PANACEA, quantity: 2, origin: 'shop' }],
        equipmentBag: [bagPiece('eq-titan-hammer')],
      }),
    });

    const [entry] = buildSellEntries(read().run.inventory, []);
    expect(entry).toBeTruthy();
    store.sellShopItem(entry!);

    const state = read();
    expect(state.run.gold).toBe(100 + sellPrice(PANACEA.price));
    expect(state.run.inventory[0].quantity).toBe(1);
    expect(state.logs.join(' ')).toContain(PANACEA.name);
  });

  test('après revente, l’étal ne propose plus la pièce vendue', () => {
    const player = newPlayer();
    const bag = [bagPiece('eq-titan-hammer'), ARMOR];
    const { store, read } = buildStore({
      player,
      run: shopRun({ equipmentBag: bag }),
    });

    const before = buildSellEntries([], read().run.equipmentBag ?? []);
    expect(before).toHaveLength(2);

    const hammer = before.find((e) => e.equipment?.id === 'eq-titan-hammer')!;
    store.sellShopItem(hammer);

    const after = buildSellEntries([], read().run.equipmentBag ?? []);
    expect(after).toHaveLength(1);
    expect(after.some((e) => e.equipment?.id === 'eq-titan-hammer')).toBe(false);
    expect(after[0]!.equipment!.id).toBe(ARMOR.id);
  });

  test('vendre une pièce portée depuis le store ne change RIEN à l’or', () => {
    const player = newPlayer();
    player.equip(ARMOR);
    const { store, read } = buildStore({
      player,
      run: shopRun({ equipmentBag: [bagPiece('eq-titan-hammer')] }),
    });

    // Cas réel : une sauvegarde où la pièce est portée mais où un ancien étal
    // proposait encore sa revente.
    store.sellShopItem({
      id: `sell-equipment-${ARMOR.id}`,
      kind: 'equipment',
      price: sellPrice(ARMOR.price),
      catalogPrice: ARMOR.price,
      label: ARMOR.name,
      icon: ARMOR.icon,
      desc: ARMOR.description,
      quantity: 1,
      equipment: ARMOR,
    });

    expect(read().run.gold).toBe(100);
    expect(read().run.equipmentBag).toHaveLength(1);
  });

  test('hors boutique (phase carte), la vente est ignorée', () => {
    const player = newPlayer();
    const { store, read } = buildStore({
      player,
      run: shopRun({
        phase: 'map',
        inventory: [{ item: PANACEA, quantity: 1, origin: 'shop' }],
      }),
    });

    const [entry] = buildSellEntries(read().run.inventory, []);
    store.sellShopItem(entry!);

    expect(read().run.gold).toBe(100);
    expect(read().run.inventory).toHaveLength(1);
  });
});

/**
 * Assertions **structurelles** sur l'écran (`ShopView`) et son câblage dans
 * `App` — même convention que `MoveButtonEffects.test.ts` : le rendu SSR n'est
 * pas exploitable ici (composants compilés par Vite, `svelte/compiler`
 * indisponible), la compilation réelle étant couverte par `bun run check` et
 * `bun run build`.
 */
const ROOT = path.join(import.meta.dir, '..');
const readSource = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Écran de boutique : le comptoir de rachat est présent et câblé', () => {
  const shopView = readSource('src/lib/components/atoms/ShopView.svelte');
  const app = readSource('src/App.svelte');

  test('la section « Rachat » vit hors des onglets (aucun onglet ne la masque)', () => {
    const marker = 'id="boutique-rachat"';
    expect(shopView).toContain(marker);
    const index = shopView.indexOf(marker);
    // Ce qui précède la section ne doit pas être un `{#if activeCategory …}` :
    // sinon vendre dépendrait de l'onglet d'achat sélectionné.
    expect(shopView.slice(Math.max(0, index - 240), index)).not.toContain('activeCategory');
  });

  test('chaque ligne annonce le prix de reprise ET le prix catalogue', () => {
    expect(shopView).toContain('{entry.price} 🪙');
    expect(shopView).toContain('catalogue {entry.catalogPrice} 🪙');
  });

  test('le bouton de vente passe la ligne entière au parent', () => {
    expect(shopView).toContain('export let onSell: (entry: SellEntry) => void;');
    expect(shopView).toContain('on:click={() => onSell(entry)}');
  });

  test('une potion empilée se vend unité par unité', () => {
    expect(shopView).toContain('{entry.kind === "consumable" ? "Vendre 1" : "Vendre"}');
  });

  test('App transmet la sacoche et délègue la vente au store', () => {
    expect(app).toContain('equipmentBag={$battleStore.run.equipmentBag ?? []}');
    expect(app).toContain('onSell={(entry) => battleStore.sellShopItem(entry)}');
  });
});
