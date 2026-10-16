import { describe, expect, test } from 'bun:test';
import { BattleController } from '../src/core/services/BattleController';
import { Monster } from '../src/core/entities/Monster';
import { CONSUMABLE_CATALOG } from '../src/core/entities/Consumable';
import type { RunState } from '../src/core/entities/BattleState';

/**
 * Fin de région : les objets à effet durable sont fusionnés dans la fiche du
 * champion, sans toucher l'inventaire du run.
 */
const item = (id: string) => {
  const found = CONSUMABLE_CATALOG.find(i => i.id === id);
  if (!found) throw new Error(`objet inconnu : ${id}`);
  return found;
};

const strike: any = { id: 't', name: 'Charge', type: 'normal', power: 30, level: 1, isPhysical: true };

function runWith(slots: Array<{ item: any; quantity: number; origin?: any }>): RunState {
  return { inventory: slots, regionIndex: 0, relics: [] } as unknown as RunState;
}

describe('Fusion des objets durables dans la fiche du champion', () => {
  test('les bonus de CA deviennent permanents sur le champion', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);
    const acBefore = monster.armorBonus;

    const fused = ctrl.fuseDurableItemsIntoMonster(
      monster,
      runWith([{ item: item('potion-iron-skin'), quantity: 2, origin: 'boss' }]),
    );

    expect(fused.armorBonus).toBe(acBefore + 6); // +3 CA × 2
  });

  test('les bonus de caractéristiques deviennent permanents, quantité comprise', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);

    const fused = ctrl.fuseDurableItemsIntoMonster(
      monster,
      runWith([{ item: item('potion-fury-draught'), quantity: 3, origin: 'boss' }]),
    );

    expect(fused.strength).toBe(12 + 12); // +4 Force × 3
  });

  test('les potions à usage unique sont ignorées', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);
    const before = {
      strength: monster.strength,
      armor: monster.armorBonus,
      hp: monster.maxHp,
    };

    const fused = ctrl.fuseDurableItemsIntoMonster(
      monster,
      runWith([
        { item: item('potion-panacea'), quantity: 4, origin: 'boss' },
        { item: item('potion-pocket-heal'), quantity: 3, origin: 'boss' },
      ]),
    );

    expect(fused.strength).toBe(before.strength);
    expect(fused.armorBonus).toBe(before.armor);
    expect(fused.maxHp).toBe(before.hp);
  });

  test('le monstre du run n’est PAS modifié (pas de double cumul)', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);
    const strengthBefore = monster.strength;
    const acBefore = monster.armorBonus;

    ctrl.fuseDurableItemsIntoMonster(
      monster,
      runWith([{ item: item('potion-fury-draught'), quantity: 2, origin: 'boss' }]),
    );

    expect(monster.strength).toBe(strengthBefore);
    expect(monster.armorBonus).toBe(acBefore);
  });

  test('l’inventaire du run est conservé tel quel', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);
    const run = runWith([{ item: item('potion-iron-skin'), quantity: 2, origin: 'boss' }]);

    ctrl.fuseDurableItemsIntoMonster(monster, run);

    expect(run.inventory).toHaveLength(1);
    expect(run.inventory[0]!.quantity).toBe(2);
  });

  test('un inventaire sans objet durable renvoie le monstre inchangé', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);

    const fused = ctrl.fuseDurableItemsIntoMonster(monster, runWith([]));

    expect(fused).toBe(monster);
  });

  test('les objets de BOUTIQUE ne sont PAS persistants', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);
    const strengthBefore = monster.strength;

    const fused = ctrl.fuseDurableItemsIntoMonster(
      monster,
      runWith([{ item: item('potion-fury-draught'), quantity: 5, origin: 'shop' }]),
    );

    expect(fused).toBe(monster);
    expect(fused.strength).toBe(strengthBefore);
  });

  test('un même objet trouvé en boutique puis lâché par le boss devient persistant', () => {
    const ctrl = new BattleController({} as never, {} as never);
    const monster = new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]);

    // Le butin du boss l'emporte sur l'origine boutique du même objet.
    const run = ctrl.addConsumableToInventory(
      runWith([{ item: item('potion-iron-skin'), quantity: 1, origin: 'shop' }]),
      item('potion-iron-skin'),
      1,
      'boss',
    );

    expect(run.inventory[0]!.origin).toBe('boss');
    const fused = ctrl.fuseDurableItemsIntoMonster(monster, run);
    // 1 (boutique) + 1 (boss) = 2 Peaux de Fer → +6 CA
    expect(fused.armorBonus).toBe(6);
  });

  test("le boss lâche 2 pièces garanties + 1 consommable marqué boss (fusion remplacée)", () => {
    // Réglage 2026-10 (choix joueur) : chaque boss laisse **2 pièces garanties**
    // tombées DIRECTEMENT en sacoche, plus une 3ᵉ pièce à choisir dans les
    // offres mixées. La fusion consommables est remplacée.
    let seed = 0.42;
    const ctrl = new BattleController({ random: () => seed } as never);
    const run = ctrl.handlePlayerVictory({
      player: new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]),
      enemy: new Monster('e', 'Boss', 'rock', 6, 14, 14, 14, 14, 14, 14, [strike]),
      run: runWith([]),
      isBossFight: true,
    });

    // Les 2 pièces garanties passent dans la sacoche.
    expect(run.run.equipmentBag).toHaveLength(2);
    for (const piece of run.run.equipmentBag!) {
      expect(piece.id).toBeTruthy();
      expect(piece.slot).toBeTruthy();
      // Budget de la région 0.
      expect(piece.price).toBeLessThanOrEqual(65);
    }

    // Offre mixte : 2 reliques rares + 1 pièce au choix.
    expect(run.run.relicOffers).toHaveLength(2);
    expect(run.run.equipOffers).toHaveLength(1);

    // Le consommable restant est bien marqué 'boss'.
    expect(run.run.inventory).toHaveLength(1);
    for (const slot of run.run.inventory!) {
      expect(slot.origin).toBe('boss');
    }
  });

  test('un sauvage vaincu : 1 pièce garantie + offres mixtes (2 reliques, 1 pièce)', () => {
    const ctrl = new BattleController({ random: () => 0.1 } as never);
    const run = ctrl.handlePlayerVictory({
      player: new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]),
      enemy: new Monster('e', 'Sauvage', 'grass', 4, 12, 12, 12, 12, 12, 12, [strike]),
      run: runWith([]),
      isBossFight: false,
    });

    // L'inventaire de consommables reste vide (tué avant le drop).
    expect(run.run.inventory ?? []).toHaveLength(0);
    // Drop GARANTI : une pièce rejoint la sacoche au choix (Q1 = fin de combat).
    expect(run.run.equipmentBag).toHaveLength(1);
    expect(run.run.equipmentBag![0]!.price).toBeLessThanOrEqual(65);
    // Offres mixtes : 2 reliques + 1 pièce à choisir (Q2).
    expect(run.run.relicOffers).toHaveLength(2);
    expect(run.run.equipOffers).toHaveLength(1);
  });
});