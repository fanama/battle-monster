import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { BattleController } from '../src/core/services/BattleController';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import {
  EQUIPMENT_CATALOG,
  dedupeEquipmentBag,
  rollEquipmentDrop,
  type Equipment,
} from '../src/core/entities/Equipment';
import type { BattleState, RunState } from '../src/core/entities/BattleState';
import { BattleStore } from '../src/lib/stores/battleStore';
import { BattleEngine } from '../src/core/services/BattleEngine';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * Régression `each_key_duplicate` : la sacoche d'équipement ne doit JAMAIS
 * contenir deux pièces de même `id` (clé du `each` de `EquipmentModal`). Les
 * tirages excluent le possédé, et des gardes de dernier recours couvrent les
 * reprises de sauvegardes anciennes / poly épuisé.
 */
const strike: any = {
  id: 't',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

const runWith = (bag: Equipment[] = []): RunState =>
  ({ inventory: [], regionIndex: 0, relics: [], equipmentBag: bag }) as unknown as RunState;

const newPlayer = () =>
  new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);

describe('Tirage d’équipement : exclusion du possédé', () => {
  test('un id déjà possédé n’est jamais retiré du poly', () => {
    // Poly complet exclu sauf une pièce : c'est donc forcément elle qui tombe.
    const target = EQUIPMENT_CATALOG[0]!;
    const excluded = EQUIPMENT_CATALOG.filter(p => p.id !== target.id).map(p => p.id);

    // `random = () => 0` prendrait d'ordinaire la première pièce du catalogue
    // (exclue) : le tirage doit donc renvoyer la seule pièce restante.
    const drops = new Set<string>();
    for (let i = 0; i < 20; i++) {
      drops.add(rollEquipmentDrop(3, () => 0, excluded).id);
    }
    expect([...drops]).toEqual([target.id]);
  });

  test('poly épuisé : le tirage retombe sur le budget régional sans planter', () => {
    const allIds = EQUIPMENT_CATALOG.map(p => p.id);
    const piece = rollEquipmentDrop(0, () => 0, allIds);

    expect(piece).toBeTruthy();
    expect(piece.slot).toBeTruthy();
    expect(piece.price).toBeLessThanOrEqual(65);
  });

  test('dedupeEquipmentBag ne garde qu’un exemplaire par id', () => {
    const piece = EQUIPMENT_CATALOG[0]!;
    const other = EQUIPMENT_CATALOG[1]!;

    const deduped = dedupeEquipmentBag([piece, other, piece, piece, other]);

    expect(deduped.map(p => p.id)).toEqual([piece.id, other.id]);
  });
});

describe('Victoire : aucune clé dupliquée dans la sacoche', () => {
  test('butin de boss : 2 pièces DISTINCTES même avec un tirage constant', () => {
    const ctrl = new BattleController({ random: () => 0 } as never);
    const run = ctrl.handlePlayerVictory({
      player: newPlayer(),
      enemy: new Monster('e', 'Boss', 'rock', 6, 14, 14, 14, 14, 14, 14, [strike]),
      run: runWith(),
      isBossFight: true,
    });

    const bag = run.run.equipmentBag!;
    expect(bag).toHaveLength(2);
    const ids = bag.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length); // clés d'affichage uniques

    // La 3ᵉ pièce (offre) ne double pas celles du butin.
    const offer = run.run.equipOffers![0]!;
    expect(ids).not.toContain(offer.id);
  });

  test('sauvage vaincu : drop garanti et offre sont deux pièces distinctes', () => {
    const ctrl = new BattleController({ random: () => 0.01 } as never);
    const run = ctrl.handlePlayerVictory({
      player: newPlayer(),
      enemy: new Monster('e', 'Sauvage', 'grass', 4, 12, 12, 12, 12, 12, 12, [strike]),
      run: runWith(),
      isBossFight: false,
    });

    const bag = run.run.equipmentBag!;
    expect(bag).toHaveLength(1);
    const offered = run.run.equipOffers![0]!;
    expect(offered.id).not.toBe(bag[0]!.id);
  });

  test('une pièce déjà portée n’est pas re-lâchée', () => {
    const ctrl = new BattleController({ random: () => 0 } as never);
    const player = newPlayer();
    const worn = EQUIPMENT_CATALOG.find(p => p.price <= 65)!;
    player.equip(worn);

    const run = ctrl.handlePlayerVictory({
      player,
      enemy: new Monster('e', 'Sauvage', 'grass', 4, 12, 12, 12, 12, 12, 12, [strike]),
      run: runWith(),
      isBossFight: false,
    });

    const ids = [
      ...run.run.equipmentBag!.map(p => p.id),
      ...(run.run.equipOffers ?? []).map(p => p.id),
    ];
    expect(ids).not.toContain(worn.id);
  });

  test('addEquipmentToBag est idempotent (garde d’unicité de dernier recours)', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const piece = EQUIPMENT_CATALOG[0]!;

    const once = ctrl.addEquipmentToBag(runWith(), piece);
    const twice = ctrl.addEquipmentToBag(once, piece);

    expect(twice.equipmentBag).toHaveLength(1);
  });
});

describe('Store : une offre déjà possédée s’évapore sans dupliquer la sacoche', () => {  function buildStore() {
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
    const store = new BattleStore(
      controller,
      { load: () => null, save: () => {}, clear: () => {} } as never,
      { list: () => [], saveChampion: () => {} } as never,
    );
    let current!: BattleState;
    store.store.subscribe(s => {
      current = s;
    });
    return { store, read: () => current, initial: () => current };
  }

  test('pickEquipOffer refuse un doublon et retire l’offre', () => {
    const piece = EQUIPMENT_CATALOG[0]!;
    const player = newPlayer();

    const { store, read, initial } = buildStore();
    const run = {
      ...runWith([piece]),
      // Carte courte : la décision retombe sur la couche suivante.
      map: { layers: [[{ id: '0-0', site: 'combat', row: 0, col: 0 }], [{ id: '1-0', site: 'combat', row: 1, col: 0 }]] },
      mapLayer: 0,
      path: [0],
      phase: 'relic',
      equipOffers: [piece],
    } as unknown as RunState;

    store.store.set({
      ...initial(),
      playerMonster: player,
      run,
      enemyMonster: null,
      isBossFight: false,
      logs: [],
    } as BattleState);

    store.pickEquipOffer(piece);

    expect(read().run.equipmentBag ?? []).toHaveLength(1);
    expect(read().run.equipOffers ?? null).toBeNull();
    expect(read().logs.some(l => l.includes('déjà en votre possession'))).toBe(true);
  });
});

describe('Affichage : aucun `each` keyé sur une liste potentiellement dupliquée', () => {
  // Garde de source (compilation réelle couverte par `svelte-check` / build) :
  // les deux listes de pièces sont dé-dupliquées AVANT l'itération keyée par id.
  const read = (rel: string) =>
    fs.readFileSync(path.join(import.meta.dir, '..', rel), 'utf8');

  test('EquipmentModal itère une sacoche dé-dupliquée, keyée par id', () => {
    const src = read('src/lib/components/molecules/EquipmentModal.svelte');
    expect(src).toContain('$: bagList = uniqueById(bag);');
    expect(src).toMatch(/\{#each bagList as piece \(piece\.id\)\}/);
    // Plus aucune itération directement sur `bag` (non filtré).
    expect(src).not.toMatch(/\{#each bag as/);
  });

  test('RelicChooser itère des offres d’équipement dé-dupliquées', () => {
    const src = read('src/lib/components/atoms/RelicChooser.svelte');
    expect(src).toContain('$: equipList = uniqueEquipment(equipmentOffers);');
    expect(src).toMatch(/\{#each equipList as piece \(piece\.id\)\}/);
    expect(src).not.toMatch(/\{#each equipmentOffers/);
  });
});

describe('Reprise d’une sauvegarde corrompue (cause du crash signalé)', () => {
  test('une sacoche sauvegardée avec des ids dupliqués est dé-dupliquée au chargement', () => {
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
    const player = newPlayer();

    // Sauvegarde de l'ANCIEN code : la même pièce tombée 3 fois (drop garanti +
    // offre + butin de boss pouvaient viser le même id) → clés `each` dupliquées.
    const duplicated = EQUIPMENT_CATALOG[0]!;
    const save = {
      version: 1,
      savedAt: Date.now(),
      playerMonster: MonsterIO.toSnapshot(player),
      enemyMonster: undefined,
      run: {
        ...runWith([duplicated, duplicated, duplicated]),
        phase: 'map',
        map: null,
        mapLayer: 0,
        path: [],
        bossBattle: false,
        equipOffers: null,
        shopStock: null,
        score: 0,
        gold: 0,
      },
    };

    const store = new BattleStore(
      controller,
      { load: () => save as never, save: () => {}, clear: () => {} } as never,
      { list: () => [], saveChampion: () => {} } as never,
    );
    let current!: BattleState;
    store.store.subscribe(s => {
      current = s;
    });

    expect(store.loadSaved()).toBe(true);

    const bag = current.run.equipmentBag ?? [];
    expect(bag).toHaveLength(1);
    expect(new Set(bag.map(p => p.id)).size).toBe(bag.length);
  });
});
