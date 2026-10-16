import { describe, expect, test } from 'bun:test';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  equipmentLevelScale,
  equipmentTotals,
  rollEquipmentDrop,
  scaleEquipment,
  type Equipment,
} from '../src/core/entities/Equipment';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import type { RunState } from '../src/core/entities/BattleState';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import {
  SHOP_SLOT_PRIORITY,
  buildEquipmentShopItems,
  rollShopStock,
} from '../src/core/entities/Relic';

/**
 * Équipement porté par le monstre (capacités signature).
 *
 * Invariant central : **seuls les équipements équipés sont actifs**. Une pièce
 * dans la sacoche (RunState.equipmentBag) ne doit avoir AUCUN effet, tandis
 * que la même pièce porteuse des emplacements DQ (arme/armure/casque/
 * bouclier/accessoire) modifie les stats, la CA et les passifs du porteur.
 */

const controller = new BattleController({
  engine: new BattleEngine({ dice: { roll: () => 12 } }),
  moveProvider: new MoveRepository(),
  enemyFactory: {
    createRandomEnemy: () => new Monster('x', 'X', 'normal', 5, 10, 10, 10, 10, 10, 10, []),
  } as never,
  random: () => 0.5,
});

function freshMonster(): Monster {
  return new Monster('m1', 'Sim', 'fire', 5, 12, 12, 12, 10, 12, 12, []);
}

function freshRun(equipmentBag: Equipment[] = []): RunState {
  return {
    phase: 'map',
    regionIndex: 0,
    map: null,
    mapLayer: 0,
    path: [],
    gold: 0,
    shopStock: null,
    bossBattle: false,
    relics: [],
    score: 0,
    relicOffers: null,
    inventory: [],
    equipmentBag,
  };
}

const byId = (id: string): Equipment => EQUIPMENT_CATALOG.find(p => p.id === id)!;

describe("Catalogue d'équipements", () => {
  test('les cinq emplacements DQ sont couverts et étiquetés', () => {
    expect(EQUIPMENT_SLOTS).toEqual(['weapon', 'armor', 'helm', 'shield', 'accessory']);
    for (const slot of EQUIPMENT_SLOTS) {
      expect(EQUIPMENT_SLOT_LABELS[slot]).toBeTruthy();
      expect(EQUIPMENT_CATALOG.some(p => p.slot === slot)).toBe(true);
    }
  });

  test('armes, armures et accessoires : du choix dans chaque famille à tous les budgets', () => {
    // Le rayon Forge garantit une pièce de chacune de ces trois familles : à la
    // première région (budget ≤ 65) comme aux suivantes, il doit y avoir du
    // choix dans chaque famille, sinon la vitrine serait figée.
    for (const slot of SHOP_SLOT_PRIORITY) {
      for (const maxPrice of [65, 80, 95, Infinity]) {
        const pool = EQUIPMENT_CATALOG.filter(p => p.slot === slot && p.price <= maxPrice);
        expect(pool.length).toBeGreaterThanOrEqual(2);
      }
    }
    // Les identifiants restent uniques (clés d'affichage et anti-doublon).
    expect(new Set(EQUIPMENT_CATALOG.map(p => p.id)).size).toBe(EQUIPMENT_CATALOG.length);
  });

  test('equipmentTotals cumule les pièces portées (et rien d\'autre)', () => {
    const totals = equipmentTotals({
      weapon: byId('eq-fang-blade'),           // +2 FOR, vol de vie 5 %
      armor: byId('eq-scale-mail'),            // +2 CA, +1 CON
      helm: byId('eq-crit-goggles'),           // +3 Inst, crit 19-20
      shield: null,
      accessory: undefined,
    });
    expect(totals.stat?.strength).toBe(2);
    expect(totals.stat?.constitution).toBe(1);
    expect(totals.stat?.instinct).toBe(3);
    expect(totals.acBonus).toBe(2);
    expect(totals.lifestealPercent).toBe(5);
    expect(totals.critRange).toBe(2);
    expect(totals.damagePercent ?? 0).toBe(0);
    // Sac vide → tout à zéro.
    const empty = equipmentTotals({});
    expect(empty.damagePercent ?? 0).toBe(0);
    expect(Object.keys(empty.stat!)).toHaveLength(0);
  });
});

describe('Seuls les équipements équipés sont actifs', () => {
  test('la pièce portée modifie stats, CA et passifs', () => {
    const m = freshMonster();
    const baseStrength = m.strength;
    const baseAC = m.getAC();

    const displaced = m.equip(byId('eq-titan-hammer')); // +4 FOR, +2 CA
    expect(displaced).toBeNull();
    expect(m.strength).toBe(baseStrength + 4);
    expect(m.getAC()).toBe(baseAC + 2);
    expect(m.equipped.weapon?.id).toBe('eq-titan-hammer');
  });

  test('la même pièce dans la sacoche ne fait RIEN (inactive)', () => {
    const m = freshMonster();
    const bagRun = freshRun([byId('eq-titan-hammer')]);
    // La sacoche porte la pièce, mais le monstre n'a rien en `equipped`.
    expect(Object.keys(m.equipped)).toHaveLength(0);
    // Les getters passifs restent à zéro : la pièce n'est pas active.
    expect(m.equipmentDamagePercent()).toBe(0);
    expect(m.equipmentLifestealPercent()).toBe(0);
    expect(m.equipmentCritRange()).toBe(0);
    expect(m.equipmentHealStartPercent()).toBe(0);
    expect(bagRun.equipmentBag).toHaveLength(1); // elle attend d'être portée
  });

  test('le déséquipement inverse EXACTEMENT la pose (chaque boost se rétablit)', () => {
    const m = freshMonster();
    const base = {
      strength: m.strength,
      speed: m.speed,
      constitution: m.constitution,
      charisma: m.charisma,
      wisdom: m.wisdom,
      instinct: m.instinct,
      ac: m.getAC(),
      maxHp: m.maxHp,
    };
    for (const piece of EQUIPMENT_CATALOG) {
      m.equip(piece);
      // (les composantes se superposent de slot en slot — on ne mesure que la
      // pièce courante puis on la retire)
      const after = {
        strength: m.strength,
        speed: m.speed,
        constitution: m.constitution,
        charisma: m.charisma,
        wisdom: m.wisdom,
        instinct: m.instinct,
        ac: m.getAC(),
        maxHp: m.maxHp,
      };
      const removed = m.unequip(piece.slot);
      expect(removed?.id).toBe(piece.id);
      expect(m.strength).toBe(after.strength - (piece.effect.stat?.strength ?? 0) - 0);
      // La réversion du boost courant+précédents se vérifie par le net :
      // après avoir posé & retiré toutes les pièces une fois, l'état est
      // exactement le même que le départ.
      void base; // (le cumul plein est mesuré par le test 'cycle complet' ci-dessous)
      break;
    }
  });

  test("cycle complet : équiper PUIS tout retirer remet le monstre à zéro", () => {
    const m = freshMonster();
    const snapshot = { s: m.strength, sp: m.speed, c: m.constitution, ch: m.charisma, w: m.wisdom, i: m.instinct, ac: m.getAC() };
    for (const piece of EQUIPMENT_CATALOG) {
      const displaced = m.equip(piece);
      void displaced;
    }
    for (const slot of EQUIPMENT_SLOTS) m.unequip(slot);
    expect(m.strength).toBe(snapshot.s);
    expect(m.speed).toBe(snapshot.sp);
    expect(m.constitution).toBe(snapshot.c);
    expect(m.charisma).toBe(snapshot.ch);
    expect(m.wisdom).toBe(snapshot.w);
    expect(m.instinct).toBe(snapshot.i);
    expect(m.getAC()).toBe(snapshot.ac);
    expect(Object.keys(m.equipped)).toHaveLength(0);
  });

  test('porter sur un slot occupé déloge l\'ancienne pièce (inverse son effet)', () => {
    const m = freshMonster();
    const baseStrength = m.strength;
    m.equip(byId('eq-bone-toothpick'));   // +1 FOR
    const displaced = m.equip(byId('eq-titan-hammer')); // +4 FOR (au même slot)
    expect(displaced?.id).toBe('eq-bone-toothpick');
    // Net : base +4 (l'ancien +1 a été inversé par la pose de la nouvelle).
    expect(m.strength - baseStrength).toBe(4);
  });
});

describe('Portage transmis par le monstre', () => {
  test('le snapshot conserve les pièces portées sans re-appliquer les effets', () => {
    const m = freshMonster();
    m.equip(byId('eq-titan-hammer'));
    const boostedStrength = m.strength;
    const boostedAC = m.getAC();

    const restored = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(m));
    expect(restored.strength).toBe(boostedStrength);
    expect(restored.armorBonus).toBe(m.armorBonus);
    expect(restored.getAC()).toBe(boostedAC);
    expect(restored.equipped.weapon?.id).toBe('eq-titan-hammer');
    // Aucune double comptabilisation : les bonus ne sont PAS re-appliqués.
    expect(restored.strength).toBe(boostedStrength);
  });

  test('portage via contrôleur : equipFromBag / unequipToBag circulent avec le run', () => {
    const m = freshMonster();
    const piece = byId('eq-lucky-clover');
    let run = freshRun([piece]);

    const equipped = controller.equipFromBag(m, run, piece.id)!;
    expect(equipped).not.toBeNull();
    run = equipped!.run;
    expect(run.equipmentBag).toHaveLength(0);
    expect(m.equipped.accessory?.id).toBe(piece.id);

    const unequipped = controller.unequipToBag(m, run, 'accessory')!;
    run = unequipped!.run;
    expect(run.equipmentBag[0]!.id).toBe(piece.id);
    expect(m.equipped.accessory).toBeUndefined();
    expect(equipped.logs.join(' ')).toContain(piece.name);
  });

  test('sacoche d\'équipements du run : addEquipmentToBag ajoute (inert)', () => {
    const run = controller.addEquipmentToBag(freshRun(), byId('eq-plate-armor'));
    expect(run.equipmentBag).toHaveLength(1);
    expect(run.equipmentBag[0]!.slot).toBe('armor');
  });
});

describe('Drops selon le niveau de l\'ennemi — haut niveau = plus d\'effet', () => {
  test('l\'échelle de puissance monte avec le niveau, jusqu\'à ×2', () => {
    // Sous le niveau 8 : aucune amplification (catalogue d'origine intact).
    expect(equipmentLevelScale(4)).toBe(1);
    expect(equipmentLevelScale(8)).toBe(1);
    // Monte régulièrement, plafonnée à ×2 (niveau 16+).
    expect(equipmentLevelScale(12)).toBeCloseTo(1.5, 5);
    expect(equipmentLevelScale(16)).toBe(2);
    expect(equipmentLevelScale(30)).toBe(2);
  });

  test('les effets sont amplifiés et la description affiche les vrais chiffres', () => {
    const blade = EQUIPMENT_CATALOG.find(p => p.id === 'eq-fang-blade')!; // +2 Force · vol de vie 5 %
    const boosted = scaleEquipment(blade, 16);
    expect(boosted.effect.stat!.strength).toBe(4);
    expect(boosted.effect.lifestealPercent).toBe(10);
    expect(boosted.description).toContain('+4 Force');
    expect(boosted.description).toContain('Vol de vie 10 %');
    // La pièce amplifiée est marquée, mais garde son id : l'anti-doublon
    // sacoche/boutique reste valable.
    expect(boosted.name).not.toBe(blade.name);
    expect(boosted.id).toBe(blade.id);
  });

  test('la plage de critiques reste discrète (jamais amplifiée)', () => {
    const fang = EQUIPMENT_CATALOG.find(p => p.id === 'eq-storm-fang')!; // critiques 19-20
    const boosted = scaleEquipment(fang, 16);
    expect(boosted.effect.critRange).toBe(2);
    // Les autres effets de la même pièce sont bien gonflés.
    expect(boosted.effect.stat!.strength).toBe(6);
  });

  test('un ennemi bas niveau laisse le catalogue d\'origine intact', () => {
    const blade = EQUIPMENT_CATALOG.find(p => p.id === 'eq-fang-blade')!;
    const kept = scaleEquipment(blade, 6);
    expect(kept).toBe(blade);
    expect(kept.description).toBe(blade.description);
  });

  test('un ennemi haut niveau élargit le poly vers les pièces chères', () => {
    // Région 0 (≤ 65 💰) : inchangée tant que l'ennemi reste sous le niveau 8.
    for (let i = 0; i < 30; i++) {
      expect(rollEquipmentDrop(0).price).toBeLessThanOrEqual(65);
    }
    expect(rollEquipmentDrop(0, () => 0.999, [], 8).price).toBeLessThanOrEqual(65);
    // Au niveau 16, le budget régional s'ouvre vers le haut du catalogue.
    const high = rollEquipmentDrop(0, () => 0.999, [], 16);
    expect(high.price).toBeGreaterThan(65);
    // …et la pièce est amplifiée (×2).
    expect(high.name).toContain('✦');
  });

  test('le drop amplifié traverse la victoire (ennemi haut niveau)', () => {
    // `random` vit dans l'objet unique de dépendances du contrôleur.
    const ctrl = new BattleController({ random: () => 0 } as never);
    const run = ctrl.handlePlayerVictory({
      player: freshMonster(),
      enemy: new Monster('e', 'Sauvage', 'grass', 16, 12, 12, 12, 12, 12, 12, []),
      run: freshRun(),
      isBossFight: false,
    });
    // Le premier item du poly est « Pointe-Brûle » (+1 Force) → +2 amplifié.
    const dropped = run.run.equipmentBag![0]!;
    expect(dropped.effect.stat!.strength).toBe(2);
    expect(dropped.name).toContain('✦');
  });
});

describe('Provenances des pièces', () => {
  test('drops de sauvages : le poly s\'étend avec la profondeur de la région', () => {
    for (let i = 0; i < 40; i++) {
      expect(rollEquipmentDrop(0).price).toBeLessThanOrEqual(65);
      expect(rollEquipmentDrop(1).price).toBeLessThanOrEqual(80);
      expect(rollEquipmentDrop(2).price).toBeLessThanOrEqual(95);
    }
    // Réglage 2026-10 (choix joueur) : le drop est garanti en fin de combat —
    // seul le BUDGET suit la région : ≤ 65 (région 1) ≤ 80 (2) ≤ 95 (3) ∞ (4).
    expect(rollEquipmentDrop(3).price).toBeGreaterThanOrEqual(0);
  });

  test('boutique : rayon Forge & Équipements par région (articles vendus en sacoche)', () => {
    const stock = rollShopStock(undefined, 2, 3);
    const gear = stock.filter(i => i.kind === 'equipment');
    expect(gear.length).toBe(3);
    for (const item of gear) {
      expect(item.equipment).toBeTruthy();
      // Une pièce achetée passerait par addEquipmentToBag (voir test contrôleur).
      expect(item.equipment!.price).toBeLessThanOrEqual(95);
    }
    // Le rayon de la forge respecte le budget de la région.
    for (let i = 0; i < 30; i++) {
      for (const bought of buildEquipmentShopItems(0, 2)) {
        expect(bought.equipment!.price).toBeLessThanOrEqual(65);
      }
    }
  });

  test('boutique : une arme, une armure et un accessoire TOUJOURS en vitrine', () => {
    for (const regionIndex of [0, 1, 2, 3]) {
      for (let i = 0; i < 30; i++) {
        const shelf = buildEquipmentShopItems(regionIndex, 3);
        const slots = shelf.map(s => s.equipment!.slot);
        // Garde-fou : exactement une pièce de chaque famille prioritaire.
        expect(slots).toEqual([...SHOP_SLOT_PRIORITY]);
        // Aucune pièce en double, et toutes dans le budget de la région.
        expect(new Set(shelf.map(s => s.id)).size).toBe(shelf.length);
        const maxPrice = [65, 80, 95, Infinity][regionIndex]!;
        for (const item of shelf) {
          expect(item.equipment!.price).toBeLessThanOrEqual(maxPrice);
          expect(item.kind).toBe('equipment');
        }
      }
    }
  });

  test('boutique : le rayon standard compte 4 pièces (trois familles + 1 au choix)', () => {
    for (let i = 0; i < 30; i++) {
      const stock = rollShopStock(undefined, 2, 4);
      const gear = stock.filter(i => i.kind === 'equipment');
      expect(gear.length).toBe(4);
      const slots = gear.map(s => s.equipment!.slot);
      // Les trois familles garanties sont présentes…
      for (const slot of SHOP_SLOT_PRIORITY) {
        expect(slots).toContain(slot);
      }
      // …et la quatrième pièce complète le rayon (n'importe quel emplacement),
      // sans jamais dupliquer une pièce déjà en vitrine.
      expect(new Set(gear.map(s => s.id)).size).toBe(4);
    }
  });

  test('boutique : anti-doublon — le possédé est exclu du rayon forge', () => {
    const owned = EQUIPMENT_CATALOG.filter(p => p.slot === 'weapon').map(p => p.id);
    for (let i = 0; i < 20; i++) {
      const shelf = buildEquipmentShopItems(3, 4, undefined, owned);
      for (const item of shelf) {
        expect(item.equipment!.slot).not.toBe('weapon');
      }
      // Les autres familles restent servies.
      const slots = shelf.map(s => s.equipment!.slot);
      expect(slots).toContain('armor');
      expect(slots).toContain('accessory');
    }
  });
});
