import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  bestLoadout,
  equipmentScore,
  type Equipment,
} from '../src/core/entities/Equipment';
import {
  RELIC_CATALOG,
  RELIC_SLOT_COUNT,
  relicScore,
  type Relic,
} from '../src/core/entities/Relic';
import { CONSUMABLE_CATALOG } from '../src/core/entities/Consumable';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import type { BattleState, RunState } from '../src/core/entities/BattleState';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { BattleStore } from '../src/lib/stores/battleStore';
import { relicEffectTotals } from '../src/lib/styles/relicEffects';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * Conventions **Dragon Quest / RPG Maker** du portage (réglage 2026-10).
 *
 *  1. **Reliques = emplacements** (3) : une relique obtenue rejoint la réserve
 *     et n'agit qu'une fois portée, exactement comme une pièce d'équipement.
 *     Réserve inerte, portage hors combat, retrait exactement inversible.
 *  2. **Armes à deux mains** : le bouclier ne cohabite pas avec elles — la
 *     porter lâche le bouclier, porter un bouclier est refusé tant qu'elle est
 *     tenue.
 *  3. **Aperçu avant/après** : voir le gain chiffré avant de valider (DQ).
 *  4. **Meilleur équipement** (最強装備) : un geste habille au mieux.
 *  5. **L'objet est l'action du tour** : agir avec une potion en combat passe
 *     le tour, l'ennemi riposte (commande どうぐ / Item).
 */

const strike: any = {
  id: 't',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

const byId = (id: string): Equipment => EQUIPMENT_CATALOG.find(p => p.id === id)!;
const relicById = (id: string): Relic => RELIC_CATALOG.find(r => r.id === id)!;

function freshMonster(level = 5): Monster {
  return new Monster('m1', 'Sim', 'fire', level, 12, 12, 12, 10, 12, 12, [strike]);
}

function freshRun(overrides: Partial<RunState> = {}): RunState {
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
    equipOffers: null,
    inventory: [],
    equipmentBag: [],
    unlockedThisRegion: [],
    ...overrides,
  };
}

function freshController(): BattleController {
  return new BattleController({
    engine: new BattleEngine({ dice: { roll: () => 12 } }),
    moveProvider: new MoveRepository(),
    enemyFactory: {
      createRandomEnemy: () => new Monster('x', 'X', 'normal', 1, 10, 10, 10, 10, 10, 10, [strike]),
    } as never,
    random: () => 0.5,
  });
}

const controller = freshController();

describe('Reliques portées — 3 emplacements façon accessoires DQ', () => {
  test('une relique en réserve est INERTE (aucun effet sur stats, CA ni passifs)', () => {
    const m = freshMonster();
    const before = { strength: m.strength, ac: m.getAC() };

    // « Possédée » = dans RunState.relics, mais rien n'est porté.
    const run = freshRun({ relics: [relicById('relic-gauntlet')] });
    expect(run.relics).toHaveLength(1);

    expect(m.wornRelics).toHaveLength(0);
    expect(m.strength).toBe(before.strength);
    expect(m.getAC()).toBe(before.ac);
    // Les passifs lisent les reliques PORTÉES : la réserve ne compte pas.
    expect(m.relicDamagePercent()).toBe(0);
    expect(m.relicLifestealPercent()).toBe(0);
    expect(m.relicCritRange()).toBe(0);
    expect(m.relicHealStartPercent()).toBe(0);
    expect(m.relicExperiencePercent()).toBe(0);
  });

  test('porter applique stats/CA, retirer inverse EXACTEMENT (tout le catalogue)', () => {
    const m = freshMonster();
    const before = {
      strength: m.strength,
      speed: m.speed,
      constitution: m.constitution,
      charisma: m.charisma,
      wisdom: m.wisdom,
      instinct: m.instinct,
      ac: m.getAC(),
      maxHp: m.maxHp,
    };

    // Cycle complet : on porte puis retire chaque relique du catalogue.
    for (const relic of RELIC_CATALOG) {
      expect(m.wearRelic(relic)).toBe(true);
      expect(m.wornRelics.map(r => r.id)).toEqual([relic.id]);
      expect(m.takeOffRelic(relic.id)?.id).toBe(relic.id);
      expect(m.wornRelics).toHaveLength(0);
    }

    expect(m.strength).toBe(before.strength);
    expect(m.speed).toBe(before.speed);
    expect(m.constitution).toBe(before.constitution);
    expect(m.charisma).toBe(before.charisma);
    expect(m.wisdom).toBe(before.wisdom);
    expect(m.instinct).toBe(before.instinct);
    expect(m.getAC()).toBe(before.ac);
    expect(m.maxHp).toBe(before.maxHp);
  });

  test(`la capacité est bornée à ${RELIC_SLOT_COUNT} : la 4ᵉ relique est refusée`, () => {
    const m = freshMonster();
    const some = RELIC_CATALOG.slice(0, RELIC_SLOT_COUNT + 1);
    for (let i = 0; i < RELIC_SLOT_COUNT; i++) {
      expect(m.wearRelic(some[i]!)).toBe(true);
    }
    expect(m.wornRelics).toHaveLength(RELIC_SLOT_COUNT);
    expect(m.relicSlotsFree).toBe(0);
    // Refus : aucun effet, aucune relique ajoutée.
    const strengthBefore = m.strength;
    expect(m.wearRelic(some[RELIC_SLOT_COUNT]!)).toBe(false);
    expect(m.wornRelics).toHaveLength(RELIC_SLOT_COUNT);
    expect(m.strength).toBe(strengthBefore);
    // Une relique déjà portée ne se double pas non plus.
    expect(m.wearRelic(some[0]!)).toBe(false);
    // Retirer libère la place, et seulement alors…
    m.takeOffRelic(some[0]!.id);
    expect(m.relicSlotsFree).toBe(1);
    expect(m.wearRelic(some[RELIC_SLOT_COUNT]!)).toBe(true);
  });

  test('les passifs cumulés lisent les PORTÉES, plafonds des reliques compris', () => {
    const m = freshMonster();
    m.wearRelic(relicById('relic-predator')); // vol de vie 6 %
    m.wearRelic(relicById('relic-crystal'));  // vol de vie 20 %
    expect(m.relicLifestealPercent()).toBe(10); // plafond RELIC_EFFECT_CAPS

    m.takeOffRelic('relic-crystal');
    expect(m.relicLifestealPercent()).toBe(6);

    m.wearRelic(relicById('relic-deadeye')); // critiques 18-20
    expect(m.relicCritRange()).toBe(3);
  });

  test('le panneau « Effets cumulés » annonce les valeurs PLAFONNÉES du moteur', () => {
    const m = freshMonster();
    // 20 % + 6 % de vol de vie : la somme brute serait 26 %, le plafond est 10.
    m.wearRelic(relicById('relic-crystal'));
    m.wearRelic(relicById('relic-predator'));

    const totals = relicEffectTotals(m.getWornRelics(), m);
    const lifesteal = totals.find(line => line.label === 'Vol de vie');
    expect(lifesteal?.value).toBe('10 %');
    expect(m.relicLifestealPercent()).toBe(10);

    // Les caractéristiques, elles, ne sont pas plafonnées : simple somme.
    // (+2 Force du Gantelet, +2 Force des Dents du Prédateur déjà portées.)
    m.wearRelic(relicById('relic-gauntlet'));
    const strength = relicEffectTotals(m.getWornRelics(), m).find(line => line.label === 'Force');
    expect(strength?.value).toBe('+4');
  });

  test('le snapshot conserve les reliques portées SANS re-compter leurs effets', () => {
    const m = freshMonster();
    m.wearRelic(relicById('relic-gauntlet')); // +2 Force
    const boosted = m.strength;
    const boostedAc = m.getAC();

    const restored = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(m));
    expect(restored.strength).toBe(boosted);
    expect(restored.getAC()).toBe(boostedAc);
    expect(restored.wornRelics.map(r => r.id)).toEqual(['relic-gauntlet']);
    // Et le retrait reste exact APRÈS un aller-retour de sauvegarde.
    restored.takeOffRelic('relic-gauntlet');
    expect(restored.strength).toBe(boosted - 2);
  });

  test('une sauvegarde incohérente (4 reliques portées) est ramenée au plafond', () => {
    const m = freshMonster();
    const snapshot = MonsterIO.toSnapshot(m);
    snapshot.wornRelics = RELIC_CATALOG.slice(0, RELIC_SLOT_COUNT + 2);

    const restored = MonsterIO.fromSnapshot(snapshot);
    expect(restored.wornRelics).toHaveLength(RELIC_SLOT_COUNT);
  });

  test('contrôleur : porter/retirer circule avec le run sans toucher à la réserve', () => {
    const m = freshMonster();
    const relic = relicById('relic-gauntlet');
    const run = freshRun({ relics: [relic] });

    expect(controller.wearRelic(m, run, 'relic-inconnue')).toBeNull();
    const worn = controller.wearRelic(m, run, relic.id)!;
    expect(worn.logs.join(' ')).toContain(relic.name);
    expect(m.wornRelics).toHaveLength(1);

    const off = controller.takeOffRelic(m, run, relic.id)!;
    expect(off.run.relics).toHaveLength(1); // la possession est intacte
    expect(m.wornRelics).toHaveLength(0);
    expect(controller.takeOffRelic(m, run, relic.id)).toBeNull();
  });
});

describe('Recueillir une relique ne l’applique plus (elle attend en réserve)', () => {
  function buildStore() {
    const store = new BattleStore(
      freshController(),
      { load: () => null, save: () => {}, clear: () => {} } as never,
      { list: () => [], saveChampion: () => {} } as never,
    );
    let current!: BattleState;
    store.store.subscribe(s => {
      current = s;
    });
    return { store, read: () => current };
  }

  test('pickRelic → réserve ; wearRelic → effet ; takeOffRelic → retour à la réserve', () => {
    const { store, read } = buildStore();
    const player = freshMonster();
    const baseStrength = player.strength;
    const relic = relicById('relic-gauntlet'); // +2 Force

    store.store.set({
      playerMonster: player,
      enemyMonster: null,
      logs: [],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: freshRun({
        phase: 'relic',
        relicOffers: [relic],
        map: {
          layers: [
            [{ id: '0-0', site: 'combat', row: 0, col: 0 }],
            [{ id: '1-0', site: 'combat', row: 1, col: 0 }],
          ],
        } as never,
        mapLayer: 0,
        path: [0],
      }),
    } as BattleState);

    store.pickRelic(relic);

    // 1. La relique est POSSÉDÉE mais n'a rien changé au monstre.
    expect(read().run.relics.map(r => r.id)).toEqual([relic.id]);
    expect(player.strength).toBe(baseStrength);
    expect(player.wornRelics).toHaveLength(0);

    // 2. Le portage (hors combat : la décision a fait avancer la carte) applique.
    expect(read().run.phase).toBe('map');
    store.wearRelic(relic.id);
    expect(player.wornRelics.map(r => r.id)).toEqual([relic.id]);
    expect(player.strength).toBe(baseStrength + 2);

    // 3. Le retrait inverse, la relique reste en réserve.
    store.takeOffRelic(relic.id);
    expect(player.strength).toBe(baseStrength);
    expect(read().run.relics.map(r => r.id)).toEqual([relic.id]);

    // 4. Le portage est refusé en combat (même verrou que l'équipement).
    store.store.update(s => ({
      ...s,
      run: { ...s.run, phase: 'encounter' },
    }));
    store.wearRelic(relic.id);
    expect(player.wornRelics).toHaveLength(0);
  });

  test('une nouvelle run repart d’une réserve vide et d’un monstre déchargé', () => {
    const { store, read } = buildStore();
    const player = freshMonster();
    player.wearRelic(relicById('relic-gauntlet')); // +2 Force
    player.equip(byId('eq-bone-toothpick'));       // +1 Force
    const boosted = player.strength;

    store.startRun(player);

    // Parité avec l'équipement : le portage est inversé (rien n'est « gravé »
    // en double), et la réserve du nouveau run est vierge.
    expect(player.wornRelics).toHaveLength(0);
    expect(player.equipped).toEqual({});
    expect(player.strength).toBe(boosted - 3);
    expect(read().run.relics).toHaveLength(0);
    expect(read().run.equipmentBag).toHaveLength(0);
  });
});

describe('Règle des armes à deux mains (Dragon Quest)', () => {
  test('le catalogue marque des armes, et seulement des armes', () => {
    const twoHanded = EQUIPMENT_CATALOG.filter(p => p.twoHanded);
    expect(twoHanded.length).toBeGreaterThanOrEqual(3);
    for (const piece of twoHanded) {
      expect(piece.slot).toBe('weapon');
    }
  });

  test('porter une arme à deux mains LÂCHE le bouclier (retour en sacoche)', () => {
    const m = freshMonster();
    const shield = byId('eq-iron-kite');
    m.equip(shield);
    expect(m.equipped.shield?.id).toBe(shield.id);

    let run = freshRun({ equipmentBag: [byId('eq-titan-hammer')] });
    const result = controller.equipFromBag(m, run, 'eq-titan-hammer')!;
    run = result.run;

    expect(result.blocked).toBe(false);
    expect(m.equipped.weapon?.id).toBe('eq-titan-hammer');
    expect(m.equipped.shield).toBeUndefined();
    expect(run.equipmentBag.map(p => p.id)).toContain(shield.id);
    expect(result.logs.join(' ')).toContain('deux mains');
  });

  test('porter un bouclier sous une arme à deux mains est REFUSÉ (rien ne bouge)', () => {
    const m = freshMonster();
    m.equip(byId('eq-titan-hammer'));
    const acBefore = m.getAC();
    const run = freshRun({ equipmentBag: [byId('eq-iron-kite')] });

    const refused = controller.equipFromBag(m, run, 'eq-iron-kite')!;
    expect(refused.blocked).toBe(true);
    // Sacoche intacte, monstre intact, aucune exception.
    expect(refused.run.equipmentBag?.map(p => p.id)).toEqual(['eq-iron-kite']);
    expect(m.equipped.shield).toBeUndefined();
    expect(m.getAC()).toBe(acBefore);
    expect(refused.logs.join(' ')).toContain('deux mains');

    // Retirer l'arme rouvre l'emplacement : le bouclier se porte alors.
    m.unequip('weapon');
    expect(m.canEquip(byId('eq-iron-kite'))).toBe(true);
    const accepted = controller.equipFromBag(m, refused.run, 'eq-iron-kite')!;
    expect(accepted.blocked).toBe(false);
    expect(m.equipped.shield?.id).toBe('eq-iron-kite');
  });

  test('canEquip / conflictingSlots disent exactement la règle', () => {
    const m = freshMonster();
    const shield = byId('eq-wooden-buckler');
    const hammer = byId('eq-titan-hammer');
    const sword = byId('eq-bone-toothpick');

    expect(m.canEquip(shield)).toBe(true);
    m.equip(hammer);
    expect(m.canEquip(shield)).toBe(false);
    expect(m.canEquip(sword)).toBe(true);
    // Le bouclier est l'emplacement chassé par l'arme à deux mains ; une fois
    // lâché, plus rien à chasser.
    expect(m.conflictingSlots(hammer)).toEqual([]);
    // Une AUTRE arme reste portable : elle remplace l'arme en place (aucun
    // blocage de la règle, qui ne vise QUE le bouclier).
    const bow = byId('eq-short-bow');
    expect(bow.twoHanded).toBe(true);
    expect(m.canEquip(bow)).toBe(true);
    m.equip(bow);
    expect(m.equipped.weapon?.id).toBe(bow.id);
    expect(m.canEquip(shield)).toBe(false); // …et le bouclier reste fermé
  });
});

describe('Aperçu avant / après (convention DQ)', () => {
  test('previewEquip n’altère PAS le monstre et prédit le résultat exact', () => {
    const m = freshMonster();
    const strengthBefore = m.strength;
    const acBefore = m.getAC();

    const piece = byId('eq-fang-blade'); // +2 Force, vol de vie 5 %
    const delta = m.previewEquip(piece);

    // Rien n'a bougé.
    expect(m.strength).toBe(strengthBefore);
    expect(m.getAC()).toBe(acBefore);
    expect(m.equipped.weapon).toBeUndefined();

    // Ce que l'aperçu annonce est ce que le portage produit réellement.
    expect(delta.stat.strength).toBe(2);
    expect(delta.ac).toBe(0);
    m.equip(piece);
    expect(m.strength).toBe(strengthBefore + delta.stat.strength!);
    expect(m.getAC()).toBe(acBefore + delta.ac);
  });

  test('previewEquip tient compte de la pièce délogée (remplacement)', () => {
    const m = freshMonster();
    m.equip(byId('eq-titan-hammer')); // +4 Force, +2 CA
    const strength = m.strength;

    // Comparer une arme faible annonce une PERTE, pas un gain.
    const delta = m.previewEquip(byId('eq-bone-toothpick')); // +1 Force
    expect(delta.stat.strength).toBe(-3);
    expect(m.strength).toBe(strength); // aperçu = lecture seule
  });

  test('previewRelic : delta complet si un emplacement est libre, nul si c’est plein', () => {
    const m = freshMonster();
    const heart = relicById('relic-heart'); // +3 Constitution (PV max suivent)
    const delta = m.previewRelic(heart);
    expect(delta.stat.constitution).toBe(3);
    expect(delta.maxHp).toBeGreaterThan(0);
    expect(m.wornRelics).toHaveLength(0);

    for (const relic of RELIC_CATALOG.slice(0, RELIC_SLOT_COUNT)) m.wearRelic(relic);
    const full = m.previewRelic(relicById('relic-crown'));
    expect(full.stat).toEqual({});
    expect(full.ac).toBe(0);
  });
});

describe('« Meilleur équipement » (最強装備 de RPG Maker)', () => {
  test('equipmentScore classe par poids de jeu (CA et critiques comptent double)', () => {
    // +4 CA (Pavois de Fer) l'emporte sur +4 Force (Gantelet) et sur +15 % EXP.
    expect(equipmentScore(byId('eq-colossus-cuirass'))).toBeGreaterThan(
      equipmentScore(byId('eq-titan-hammer')),
    );
    expect(equipmentScore(byId('eq-crit-goggles'))).toBeGreaterThan(
      equipmentScore(byId('eq-lucky-clover')),
    );
    // Une pièce sans effet vaudrait 0 : le barème est strictement additif.
    expect(equipmentScore({ ...byId('eq-bone-toothpick'), effect: {} })).toBe(0);
  });

  test('bestLoadout choisit le meilleur par emplacement et chasse le bouclier', () => {
    const bag = [
      byId('eq-bone-toothpick'), // arme faible
      byId('eq-fang-blade'),     // arme moyenne
      byId('eq-titan-hammer'),   // arme forte (deux mains)
      byId('eq-wooden-buckler'),
    ];
    const chosen = bestLoadout(bag, {});
    expect(chosen.weapon?.id).toBe('eq-titan-hammer');
    // Arme à deux mains → pas de bouclier retenu.
    expect(chosen.shield).toBeUndefined();
  });

  test('à score égal, la pièce déjà portée reste en place (pas de rotation gratuite)', () => {
    const worn = byId('eq-bone-toothpick');
    const same = { ...byId('eq-bone-toothpick'), id: 'eq-copy' };
    const chosen = bestLoadout([same], { weapon: worn });
    expect(chosen.weapon?.id).toBe(worn.id);
  });

  test('optimizeEquipment habille au mieux et ne PERD rien (sacoche ∪ porté stable)', () => {
    const m = freshMonster();
    const bag = [
      byId('eq-bone-toothpick'),
      byId('eq-titan-hammer'),
      byId('eq-plate-armor'),
      byId('eq-leather-wrap'),
      byId('eq-iron-kite'),
      byId('eq-speed-ring'),
    ];
    const relics = RELIC_CATALOG.slice(0, 6);
    const run = freshRun({ equipmentBag: bag, relics });

    const result = controller.optimizeEquipment(m, run);
    const owned = [
      ...(result.run.equipmentBag ?? []).map(p => p.id),
      ...m.getEquippedList().map(p => p.id),
    ].sort();
    expect(owned).toEqual(bag.map(p => p.id).sort()); // rien de perdu ni de créé

    // Le meilleur de chaque famille est bien porté (arme à deux mains → bouclier lâché).
    expect(m.equipped.weapon?.id).toBe('eq-titan-hammer');
    expect(m.equipped.armor?.id).toBe('eq-plate-armor');
    expect(m.equipped.accessory?.id).toBe('eq-speed-ring');
    expect(m.equipped.shield).toBeUndefined();

    // Les 3 meilleures reliques de la réserve sont portées, score oblige.
    const best = [...relics].sort((a, b) => relicScore(b) - relicScore(a)).slice(0, RELIC_SLOT_COUNT);
    expect(m.wornRelics.map(r => r.id)).toEqual(best.map(r => r.id));
    expect(result.logs[0]).toContain('Meilleur équipement');

    // Idempotent : relancer ne change plus rien.
    const again = controller.optimizeEquipment(m, result.run);
    expect(m.wornRelics.map(r => r.id)).toEqual(best.map(r => r.id));
    expect(again.logs[0]).toContain('0 pièce(s) et 0 relique(s)');
  });
});

describe('Utiliser un objet consomme le tour (どうぐ / Item)', () => {
  const potion = CONSUMABLE_CATALOG.find(c => c.id === 'potion-pocket-heal')!;

  function battleStore() {
    const store = new BattleStore(
      freshController(),
      { load: () => null, save: () => {}, clear: () => {} } as never,
      { list: () => [], saveChampion: () => {} } as never,
    );
    let current!: BattleState;
    store.store.subscribe(s => {
      current = s;
    });
    return { store, read: () => current };
  }

  /** Combat joué : le joueur est blessé, l'ennemi frappe faiblement. */
  function enterBattle(store: BattleStore, player: Monster, enemy: Monster) {
    player.currentHp = Math.max(1, Math.floor(player.maxHp / 2));
    store.store.set({
      playerMonster: player,
      enemyMonster: enemy,
      logs: [],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: freshRun({
        phase: 'encounter',
        inventory: [{ item: potion, quantity: 1 }],
      }),
    } as BattleState);
  }

  test('en combat : le soin passe, mais le tour est CÉDÉ (puis l’ennemi agit)', async () => {
    const { store, read } = battleStore();
    const player = freshMonster(20);
    const enemy = new Monster('e', 'Gobelin', 'normal', 1, 8, 8, 8, 8, 8, 8, [strike]);
    enterBattle(store, player, enemy);

    const hpBefore = player.currentHp;
    expect(store.useConsumable(potion.id)).toBe(true);

    // L'action du tour est consommée immédiatement — plus d'attaque gratuite.
    expect(read().isPlayerTurn).toBe(false);
    expect(read().isAttacking).toBe(true);
    expect(player.currentHp).toBeGreaterThan(hpBefore); // le soin a bien agi
    expect(read().run.inventory).toHaveLength(0);        // et la potion est bue

    // L'ennemi riposte réellement (le tour revient ensuite au joueur).
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(read().enemyLastMove).not.toBeNull();
    expect(read().isPlayerTurn).toBe(true);
    expect(player.currentHp).toBeLessThan(read().playerMonster?.maxHp ?? 0);
  });

  test('hors combat : l’objet reste immédiat et ne donne aucun tour à l’ennemi', () => {
    const { store, read } = battleStore();
    const player = freshMonster(20);
    player.currentHp = 5;

    store.store.set({
      playerMonster: player,
      enemyMonster: null,
      logs: [],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: freshRun({ phase: 'map', inventory: [{ item: potion, quantity: 1 }] }),
    } as BattleState);

    const hpBefore = player.currentHp;
    expect(store.useConsumable(potion.id)).toBe(true);
    expect(player.currentHp).toBeGreaterThan(hpBefore);
    expect(read().isPlayerTurn).toBe(true);
    expect(read().isAttacking).toBe(false);
    expect(read().enemyLastMove).toBeNull();
  });
});

describe('Chaîne réelle : la relique portée alimente vraiment le moteur', () => {
  /**
   * Un combat joué par le store (dé figé à 15, variance neutre) : renvoie les
   * dégâts infligés par le joueur à l'ennemi.
   *
   * Le dé est injecté **des deux côtés** — le moteur *et* le contrôleur (qui
   * tire l'initiative avec ses propres dés) : sans ça, l'ordre du round est
   * aléatoire et le tour du joueur peut n'arriver qu'après `ENEMY_TURN_DELAY`.
   * Et par sécurité l'attente se fait sur le feedback, jamais sur une lecture
   * immédiate qui renverrait un 0 trompeur.
   */
  async function playerDamage(relics: Relic[], worn: Relic[]): Promise<number> {
    const dice = { roll: () => 15 };
    const engine = new BattleEngine({ dice, variance: () => 0.5 });
    const store = new BattleStore(
      new BattleController({
        engine,
        dice,
        moveProvider: new MoveRepository(),
        enemyFactory: {
          createRandomEnemy: () => new Monster('x', 'X', 'normal', 1, 10, 10, 10, 10, 10, 10, [strike]),
        } as never,
        random: () => 0.5,
      }),
      { load: () => null, save: () => {}, clear: () => {} } as never,
      { list: () => [], saveChampion: () => {} } as never,
    );
    let current!: BattleState;
    store.store.subscribe(s => {
      current = s;
    });

    const player = new Monster('m', 'Chef', 'fire', 10, 16, 20, 14, 10, 12, 12, [strike]);
    const enemy = new Monster('e', 'Cible', 'normal', 5, 10, 8, 10, 10, 10, 10, [strike]);
    for (const relic of worn) player.wearRelic(relic);

    store.store.set({
      playerMonster: player,
      enemyMonster: enemy,
      logs: [],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: freshRun({ phase: 'encounter', relics }),
    } as BattleState);

    store.attack(0);
    for (let i = 0; i < 40 && !current.enemyFeedback?.damage; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return current.enemyFeedback?.damage ?? 0;
  }

  test('le soin de début de combat suit les reliques PORTÉES, pas la réserve', () => {
    const bandage = relicById('relic-bandage'); // soigne 15 % des PV max en début de combat

    /** PV regagnés à l'entrée en combat sauvage (c'est `prepareCombat` qui soigne). */
    function healed(relics: Relic[], worn: Relic[]): number {
      const player = new Monster('m', 'Chef', 'fire', 10, 12, 12, 14, 10, 12, 12, [strike]);
      for (const relic of worn) player.wearRelic(relic);
      player.currentHp = Math.max(1, Math.floor(player.maxHp / 4));
      const before = player.currentHp;
      controller.enterWildCombat(player, freshRun({ phase: 'map', relics }));
      return player.currentHp - before;
    }

    expect(healed([], [])).toBe(0);
    expect(healed([bandage], [])).toBe(0); // en réserve : inerte
    expect(healed([bandage], [bandage])).toBeGreaterThan(0);
  });

  test('réserve inerte, portage effectif : +10 % de dégâts exactement', async () => {
    const rune = relicById('relic-rune'); // +10 % de dégâts, aucun autre effet
    const none = await playerDamage([], []);
    const reserve = await playerDamage([rune], []);
    const worn = await playerDamage([rune], [rune]);

    expect(none).toBeGreaterThan(0);
    // La réserve ne change RIEN : les chiffres de combat sont identiques.
    expect(reserve).toBe(none);
    // Portée, la relique traverse bien les options de tour jusqu'au moteur.
    expect(worn).toBeGreaterThan(none);
    expect(Math.abs(worn - Math.round(none * 1.1))).toBeLessThanOrEqual(1);
  });
});

describe('Affichage : les conventions sont bien dans les écrans', () => {
  const readSource = (rel: string) =>
    fs.readFileSync(path.join(import.meta.dir, '..', rel), 'utf8');

  test('EquipmentModal : emplacements de reliques, aperçu et « Meilleur équipement »', () => {
    const src = readSource('src/lib/components/molecules/EquipmentModal.svelte');
    expect(src).toContain('Meilleur équipement');
    expect(src).toContain('Aperçu');
    expect(src).toMatch(/RELIC_SLOT_COUNT/);
    expect(src).toMatch(/dispatch\("wearRelic", relic\.id\)/);
    expect(src).toMatch(/dispatch\("takeoffRelic", relic\.id\)/);
    expect(src).toMatch(/dispatch\("optimize"\)/);
    // Aucune nouvelle itération non dé-dupliquée de la sacoche.
    expect(src).not.toMatch(/\{#each bag as/);
  });

  test('ShopView : comparaison avec la pièce portée + armes à deux mains signalées', () => {
    const src = readSource('src/lib/components/atoms/ShopView.svelte');
    expect(src).toContain('Porté :');
    expect(src).toContain('Emplacement libre');
    expect(src).toMatch(/previewEquip/);
    expect(src).toMatch(/twoHanded/);
  });

  test('InventoryModal annonce que l’objet passe le tour en combat', () => {
    const src = readSource('src/lib/components/molecules/InventoryModal.svelte');
    expect(src).toMatch(/passe votre tour/);
    expect(src).toContain('inBattle');
  });

  test('RelicList et RunHud distinguent portée (active) et réserve (inerte)', () => {
    expect(readSource('src/lib/components/atoms/RelicList.svelte')).toMatch(/wornRelicIds/);
    expect(readSource('src/lib/components/atoms/RunHud.svelte')).toMatch(/wornRelicIds/);
  });

  test('les 5 emplacements d’équipement restent la base (parité conservée)', () => {
    expect(EQUIPMENT_SLOTS).toEqual(['weapon', 'armor', 'helm', 'shield', 'accessory']);
  });
});
