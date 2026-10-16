import { describe, expect, test } from 'bun:test';
import {
  RELIC_CATALOG,
  rollMonsterPowerOffers,
  rollRareMonsterPowerOffers,
  themeRelicAsMonsterPower,
  type Relic,
} from '../src/core/entities/Relic';
import { Monster } from '../src/core/entities/Monster';
import type { RunState } from '../src/core/entities/BattleState';
import { BattleController } from '../src/core/services/BattleController';

/**
 * Les reliques gagnées en combat sont **le pouvoir du monstre vaincu** :
 * même catalogue d'effets (équilibrage inchangé), même `id` (anti-doublon),
 * mais une provenance `powerOf` qui rattache chaque relique à la créature
 * terrassée — et une génération qui part du monstre vaincu.
 */

const byId = (id: string): Relic => {
  const found = RELIC_CATALOG.find((r) => r.id === id);
  if (!found) throw new Error(`relique inconnue : ${id}`);
  return found;
};

const strike: any = {
  id: 't',
  name: 'Charge',
  type: 'normal',
  power: 30,
  level: 1,
  isPhysical: true,
};

function freshRun(): RunState {
  return {
    phase: 'encounter',
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
  } as unknown as RunState;
}

describe('Rethème d’une relique en pouvoir de monstre', () => {
  test('conservation stricte de l’id, de l’effet et du prix', () => {
    const base = byId('relic-gauntlet');
    const themed = themeRelicAsMonsterPower(base, { name: 'Pyroax', type: 'fire' });

    expect(themed.id).toBe(base.id);
    expect(themed.effect).toEqual(base.effect);
    expect(themed.price).toBe(base.price);
    expect(themed.icon).toBe(base.icon);
    // Effet strictement inchangé : le rééquilibrage n’est pas touché.
    expect(themed.effect).toBe(base.effect);
  });

  test('la provenance nomme le monstre et son type', () => {
    const themed = themeRelicAsMonsterPower(byId('relic-heart'), {
      name: 'Maréïs',
      type: 'water',
    });
    expect(themed.powerOf).toEqual({ name: 'Maréïs', type: 'water' });
    expect(themed.description).toContain('Maréïs');
  });
});

describe('Offres de pouvoir tirées d’un monstre vaincu', () => {
  test('chaque offre est rattachée au monstre source, effects inchangés', () => {
    const source = { name: 'Sauvage', type: 'grass' as const };
    const offers = rollMonsterPowerOffers(source, 2, () => 0.37);

    expect(offers).toHaveLength(2);
    expect(new Set(offers.map((o) => o.id)).size).toBe(2);
    for (const offer of offers) {
      expect(offer.powerOf).toEqual(source);
      // L’effet vient du catalogue tel quel (aucune réécriture d’équilibrage).
      expect(offer.effect).toEqual(byId(offer.id).effect);
    }
  });

  test('anti-doublon : les reliques possédées sont exclues du tirage', () => {
    const owned = ['relic-gauntlet', 'relic-heart'];
    for (let i = 0; i < 30; i++) {
      const offers = rollMonsterPowerOffers({ name: 'X', type: 'fire' }, 3, undefined, owned);
      for (const offer of offers) {
        expect(owned).not.toContain(offer.id);
      }
    }
  });

  test('les offres rares de boss sont aussi des pouvoirs du boss', () => {
    const source = { name: 'Colosse', type: 'rock' as const };
    const offers = rollRareMonsterPowerOffers(source, 2, () => 0.6, []);
    expect(offers).toHaveLength(2);
    for (const offer of offers) {
      expect(offer.powerOf).toEqual(source);
    }
  });

  test('tirage déterministe avec un aléa injecté', () => {
    const a = rollMonsterPowerOffers({ name: 'X', type: 'fire' }, 2, () => 0.42);
    const b = rollMonsterPowerOffers({ name: 'X', type: 'fire' }, 2, () => 0.42);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });
});

describe('Intégration : les offres de victoire portent le pouvoir de l’ennemi', () => {
  const makeController = (seed: number) =>
    new BattleController({ random: () => seed } as never);

  test('victoire sauvage → offres = pouvoir du sauvage vaincu', () => {
    const ctrl = makeController(0.25);
    const enemy = new Monster('e', 'Sylvax', 'grass', 4, 12, 12, 12, 12, 12, 12, [strike]);
    const result = ctrl.handlePlayerVictory({
      player: new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]),
      enemy,
      run: freshRun(),
      isBossFight: false,
    });

    expect(result.run.relicOffers).toHaveLength(2);
    for (const offer of result.run.relicOffers!) {
      expect(offer.powerOf).toEqual({ name: 'Sylvax', type: 'grass' });
    }
  });

  test('victoire de boss → offres = pouvoir du boss vaincu', () => {
    const ctrl = makeController(0.55);
    const boss = new Monster('b', 'Granit', 'rock', 6, 14, 14, 14, 14, 14, 14, [strike]);
    boss.rank = 'boss';
    const result = ctrl.handlePlayerVictory({
      player: new Monster('m', 'Chef', 'fire', 5, 12, 12, 12, 12, 12, 12, [strike]),
      enemy: boss,
      run: freshRun(),
      isBossFight: true,
    });

    expect(result.run.relicOffers).toHaveLength(2);
    for (const offer of result.run.relicOffers!) {
      expect(offer.powerOf).toEqual({ name: 'Granit', type: 'rock' });
    }
  });
});
