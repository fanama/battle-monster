import { describe, expect, test } from 'bun:test';
import {
  RELIC_CATALOG,
  RELIC_EFFECT_CAPS,
  relicDamagePercent,
  relicLifestealPercent,
  relicHealStartPercent,
  relicMaxCritRange,
  relicExperiencePercent,
  rollRelicOffers,
  rollRareRelicOffers,
  rollShopStock,
  type Relic,
} from '../src/core/entities/Relic';
import { Monster } from '../src/core/entities/Monster';
import type { RunState } from '../src/core/entities/BattleState';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine } from '../src/core/services/BattleEngine';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { EQUIPMENT_CATALOG } from '../src/core/entities/Equipment';

/**
 * Limites des effets de reliques (équiblée 2026-10, choix joueur) :
 *  - **plafonds sévères** sur les effets cumulables ;
 *  - portée **reliques seules** — l'équipement porté n'est PAS plafonné ;
 *  - unicité : crit-range déjà « unique » (max, pas de somme) — les reliques
 *    déjà possédées ne sont plus offertes ni vendues (anti-doublon par pièce).
 */

const byId = (id: string): Relic => {
  const found = RELIC_CATALOG.find(r => r.id === id);
  if (!found) throw new Error(`relique inconnue : ${id}`);
  return found;
};

const rel = (...ids: string[]): Relic[] => ids.map(byId);

describe('Plafonds des effets cumulables des reliques', () => {
  test('vol de vie : la somme est bornée à 10 % (quelle que soit la pile)', () => {
    // Avant plafonds : 6+3+20+12+5+10+8 = 64 % possible.
    expect(relicLifestealPercent(rel(
      'relic-predator', 'relic-ancient-ring', 'relic-crystal', 'relic-claws', 'relic-bloodrunes',
    ))).toBe(RELIC_EFFECT_CAPS.lifestealPercent);
    // Une pile modérée reste sous le plafond — rien ne se perd.
    expect(relicLifestealPercent(rel('relic-predator'))).toBe(6);
  });

  test('% de dégâts : plafonné à +10 %', () => {
    expect(relicDamagePercent(rel('relic-martial-flame'))).toBe(10);
    expect(relicDamagePercent(rel('relic-martial-flame', 'relic-rune'))).toBe(10);
    expect(relicDamagePercent(rel('relic-rune'))).toBe(10);
  });

  test('soin de début de combat : plafonné à +20 %', () => {
    expect(relicHealStartPercent(rel(
      'relic-sea-tears', 'relic-second-wind', 'relic-dew-flower',
    ))).toBe(RELIC_EFFECT_CAPS.healStartPercent);
  });

  test('% d\u2019EXP : plafonné à +25 %', () => {
    expect(relicExperiencePercent(rel('relic-apprentice', 'relic-war-standard', 'relic-professor'))).toBe(25);
  });

  test('plage de critiques : UNIQUE par construction (max, jamais une somme)', () => {
    // 2+3+3 = 8 serait absurde (crit sur 12-20) : le max 3 l\u2019emporte.
    expect(relicMaxCritRange(rel('relic-crit', 'relic-deadeye', 'relic-hunter-vest'))).toBe(3);
  });
});

describe('Portée : l\u2019équipement porté n\u2019est PAS plafonné (échelle indépendante)', () => {
  test('les getters Monster rendent le total équipement sans cap', () => {
    const m = new Monster('m', 'Sim', 'fire', 5, 12, 12, 12, 10, 12, 12, []);
    // Deux pièces de la Forge portées : 5 % + 10 % = 15 % de vol de vie,
    // bien au-delà du plafond des reliques (10 %) — échelle indépendante voulue.
    m.equip(EQUIPMENT_CATALOG.find(p => p.id === 'eq-fang-blade')!);
    m.equip(EQUIPMENT_CATALOG.find(p => p.id === 'eq-vamp-fang')!);
    expect(m.equipmentLifestealPercent()).toBe(15);

    // Le total moteur combine les deux échelles : reliques CAPÉES à 10 %
    // + équipement porté non capé.
    const relicPart = relicLifestealPercent(rel('relic-predator', 'relic-crystal'));
    expect(relicPart).toBe(10);
    expect(relicPart + m.equipmentLifestealPercent()).toBe(25);
  });
});

describe('Anti-doublon : une même relique ne se remporte jamais deux fois', () => {
  const controller = new BattleController({
    engine: new BattleEngine({ dice: { roll: () => 12 } }),
    moveProvider: new MoveRepository(),
    enemyFactory: {
      createRandomEnemy: () => new Monster('x', 'X', 'normal', 5, 10, 10, 10, 10, 10, 10, []),
    } as never,
    random: () => 0.5,
  });

  function freshRun(relics: Relic[] = []): RunState {
    return {
      phase: 'map',
      regionIndex: 0,
      map: null,
      mapLayer: 0,
      path: [],
      gold: 0,
      shopStock: null,
      bossBattle: false,
      relics,
      score: 0,
      relicOffers: null,
      inventory: [],
      equipmentBag: [],
    } as unknown as RunState;
  }

  test('ownsRelic / grantRelic : la possession est unique par pièce', () => {
    const run0 = freshRun();
    expect(controller.ownsRelic(run0, 'relic-crit')).toBe(false);
    const run1 = controller.grantRelic(run0, byId('relic-crit'));
    expect(controller.ownsRelic(run1, 'relic-crit')).toBe(true);
    // La garde couvre toute pièce de même id, pas une équivalente plafonnée.
    expect(controller.ownsRelic(run1, 'relic-deadeye')).toBe(false);
  });

  test('les tirages post-combat excluent les reliques déjà possédées', () => {
    const owned = ['relic-predator', 'relic-crystal'];
    for (let i = 0; i < 30; i++) {
      const offers = rollRelicOffers(3, undefined, owned);
      // Rien de possédé ne revient dans les offres, et les offres restent distinctes.
      for (const o of offers) {
        expect(owned).not.toContain(o.id);
      }
      expect(new Set(offers.map(o => o.id)).size).toBe(offers.length);
    }
  });

  test('les reliques rares de fin de région excluent aussi le possédé', () => {
    const owned = ['relic-deadeye', 'relic-ancient-sword'];
    for (let i = 0; i < 30; i++) {
      const offers = rollRareRelicOffers(3, undefined, owned);
      for (const o of offers) {
        expect(owned).not.toContain(o.id);
      }
    }
  });

  test('le rayon reliques de la boutique ne propose plus le possédé', () => {
    const stock = rollShopStock(6, undefined, 0, 2, ['relic-crystal']);
    const relicOffers = stock.filter(i => i.kind === 'relic');
    for (const item of relicOffers) {
      expect(item.relic?.id).not.toBe('relic-crystal');
    }
    // Avec exclusions vides : poly intact (les 6 offres rentrent).
    const stock2 = rollShopStock(6, undefined, 0, 2);
    expect(stock2.filter(i => i.kind === 'relic').length).toBe(6);
  });
});
