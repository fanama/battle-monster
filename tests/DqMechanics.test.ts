import { describe, expect, test } from 'bun:test';
import {
  BattleEngine,
  CHARGE_DAMAGE_MULTIPLIER,
  DAMAGE_VARIANCE_PERCENT,
  constitutionDamageReduction,
  type Dice,
} from '../src/core/services/BattleEngine';
import { Monster, MonsterIO } from '../src/core/entities/Monster';
import type { Move, MonsterType } from '../src/core/entities/Move';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';

/** Variance neutralisée : ces tests vérifient des valeurs de dégâts précises. */
const NEUTRAL = () => 0.5;
/** Dés figés : le stub ignore le nombre de faces. */
const fixedDice = (value: number): Dice => ({ roll: () => value });

const mortalBlow: Move = {
  id: 'mortal',
  name: 'Coup Mortel',
  type: 'normal',
  power: 65,
  level: 3,
  isPhysical: true,
  guaranteedCrit: true,
};

/** Jumeau de `mortalBlow` sans la mécanique — sert de témoin. */
const plainBlow: Move = { ...mortalBlow, id: 'plain', name: 'Frappe', guaranteedCrit: undefined };

const chargeMove: Move = {
  id: 'charge',
  name: 'Charge',
  type: 'normal',
  power: 0,
  level: 3,
  isPhysical: false,
  statBoosts: { stat: 'strength', value: 2 },
  charge: true,
  maxCoolDown: 4,
};

describe('Coup mortel (Dragon Quest 会心の一撃)', () => {
  test('touche toujours : aucun jet contre la CA, même contre une armure énorme', () => {
    // Dé figé à 1 : un jet normal serait un fumble.
    const engine = new BattleEngine({ dice: fixedDice(1), variance: NEUTRAL });
    const attacker = new Monster('a', 'A', 'normal', 3, 18, 10, 10, 10, 10, 10, [mortalBlow, plainBlow]);
    const wall = new Monster('w', 'Mur', 'normal', 3, 10, 10, 10, 10, 10, 10, []);
    wall.armorBonus = 30;

    const mortal = engine.resolveAttack(attacker, wall, mortalBlow);
    expect(mortal.hit).toBe(true);
    expect(mortal.fumble).toBe(false);

    const plain = engine.resolveAttack(attacker, wall, plainBlow);
    expect(plain.fumble).toBe(true);
    expect(plain.hit).toBe(false);
  });

  test('ignore la défense : la réduction de Constitution ne s’applique pas', () => {
    const engine = new BattleEngine({ dice: fixedDice(15), variance: NEUTRAL });
    const attacker = new Monster('a', 'A', 'normal', 3, 18, 10, 10, 10, 10, 10, [mortalBlow, plainBlow]);
    const sturdy = new Monster('s', 'Coriace', 'normal', 3, 10, 10, 18, 10, 10, 10, []);

    const reduction = constitutionDamageReduction(sturdy);
    expect(reduction).toBeGreaterThan(0); // CON 18 → le témoin subit une absorption

    const mortalDamage = engine.calculateDamage(attacker, sturdy, mortalBlow);
    const plainDamage = engine.calculateDamage(attacker, sturdy, plainBlow);

    expect(mortalDamage - plainDamage).toBe(reduction);
    expect(mortalDamage).toBeGreaterThan(plainDamage);
  });

  test('les dégâts restent au minimum 1 (jamais de soin à l’adversaire)', () => {
    const engine = new BattleEngine({ dice: fixedDice(1), variance: NEUTRAL });
    const attacker = new Monster('a', 'A', 'normal', 1, 10, 10, 10, 10, 10, 10, [mortalBlow]);
    const wall = new Monster('w', 'Mur', 'normal', 1, 10, 10, 46, 10, 10, 10, []);

    const turn = engine.executeTurn(attacker, wall, mortalBlow);
    expect(turn.feedback.kind).toBe('damage');
    expect(turn.feedback.damage).toBeGreaterThanOrEqual(1);
    // La ligne de journal annonce explicitement la mécanique.
    expect(turn.logs.some(l => l.message.includes('touche toujours'))).toBe(true);
  });
});

describe('Charge (« ちからため »)', () => {
  test('armer une charge puis frapper multiplie les dégâts du coup suivant', () => {
    const strike: Move = {
      id: 'strike',
      name: 'Frappe',
      type: 'normal',
      power: 65,
      level: 3,
      isPhysical: true,
    };
    // Charge **pure** (sans statBoosts) : on isole le multiplicateur de charge du
    // +2 Force que porte la charge du catalogue — sinon le témoin est comparé à
    // un monstre déjà boosté (cf. test de catalogue plus bas).
    const pureCharge: Move = { ...chargeMove, id: 'charge-pure', statBoosts: undefined };

    const charged = new Monster('c', 'C', 'normal', 5, 18, 10, 10, 10, 10, 10, [pureCharge, strike]);
    const plain = new Monster('p', 'P', 'normal', 5, 18, 10, 10, 10, 10, 10, [{ ...strike }]);
    const target = () => new Monster('t', 'T', 'normal', 5, 10, 10, 10, 10, 10, 10, []);

    const engine = new BattleEngine({ dice: fixedDice(12), variance: NEUTRAL });

    // La charge s'arme en consommant le tour…
    const priming = engine.executeTurn(charged, target(), pureCharge);
    expect(charged.isCharged).toBe(true);
    expect(priming.logs.some(l => l.message.includes('concentre son énergie'))).toBe(true);

    // …puis se dépense sur la première attaque qui touche.
    const boosted = engine.executeTurn(charged, target(), strike);
    const baseline = engine.executeTurn(plain, target(), strike);

    expect(charged.isCharged).toBe(false); // consommée
    expect(boosted.feedback.damage).toBe(
      Math.max(1, Math.floor(baseline.feedback.damage * CHARGE_DAMAGE_MULTIPLIER)),
    );
  });

  test('une attaque ratée ne dépense PAS la charge (elle est tenue)', () => {
    const strike: Move = {
      id: 'strike',
      name: 'Frappe',
      type: 'normal',
      power: 65,
      level: 3,
      isPhysical: true,
    };
    // Dé figé à 1 → fumble systématique.
    const engine = new BattleEngine({ dice: fixedDice(1), variance: NEUTRAL });
    const attacker = new Monster('c', 'C', 'normal', 5, 18, 10, 10, 10, 10, 10, [strike]);
    attacker.armCharge(CHARGE_DAMAGE_MULTIPLIER);

    engine.executeTurn(attacker, new Monster('t', 'T', 'normal', 5, 10, 10, 10, 10, 10, 10, []), strike);

    expect(attacker.isCharged).toBe(true);
  });

  test('clearCharge désarme sans appliquer, et la charge survit à un snapshot', () => {
    const m = new Monster('c', 'C', 'normal', 5, 18, 10, 10, 10, 10, 10, [chargeMove]);
    m.armCharge(CHARGE_DAMAGE_MULTIPLIER);

    const restored = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(m));
    expect(restored.chargedStrike).toBe(CHARGE_DAMAGE_MULTIPLIER);
    expect(restored.isCharged).toBe(true);

    expect(restored.consumeCharge()).toBe(CHARGE_DAMAGE_MULTIPLIER);
    expect(restored.consumeCharge()).toBe(0); // une seule fois
    expect(restored.isCharged).toBe(false);
  });
});

describe('Variance de dégâts (Dragon Quest ±%)', () => {
  test('le facteur vaut 1 au centre et reste borné', () => {
    expect(new BattleEngine({ variance: () => 0.5 }).varianceFactor()).toBeCloseTo(1, 10);
    expect(new BattleEngine({ variance: () => 0 }).varianceFactor()).toBeCloseTo(
      1 - DAMAGE_VARIANCE_PERCENT / 100,
      10,
    );
    expect(new BattleEngine({ variance: () => 1 }).varianceFactor()).toBeCloseTo(
      1 + DAMAGE_VARIANCE_PERCENT / 100,
      10,
    );
  });

  test('les dégâts encadrent la valeur neutre', () => {
    const strike: Move = {
      id: 'strike',
      name: 'Frappe',
      type: 'normal',
      power: 65,
      level: 3,
      isPhysical: true,
    };
    const attacker = () =>
      new Monster('a', 'A', 'normal', 3, 18, 10, 10, 10, 10, 10, [{ ...strike }]);
    const target = () => new Monster('t', 'T', 'normal', 3, 10, 10, 10, 10, 10, 10, []);

    const damageAt = (v: number) =>
      new BattleEngine({ dice: fixedDice(8), variance: () => v }).executeTurn(
        attacker(),
        target(),
        strike,
      ).feedback.damage;

    const low = damageAt(0);
    const mid = damageAt(0.5);
    const high = damageAt(1);

    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(mid).toBeLessThanOrEqual(Math.ceil(low / (1 - DAMAGE_VARIANCE_PERCENT / 100)));
  });
});

describe('Catalogue : les mécaniques respectent la grille d’équilibrage', () => {
  const ALL_TYPES: MonsterType[] = ['normal', 'fire', 'water', 'grass', 'electric', 'rock'];

  test('chaque type porte exactement un coup mortel et une charge', () => {
    const moves = new MoveRepository();
    for (const type of ALL_TYPES) {
      const own = moves.getMovesForType(type);
      expect(own.filter(m => m.guaranteedCrit).length).toBe(1);
      expect(own.filter(m => m.charge).length).toBe(1);
    }
  });

  test('le coup mortel occupe le créneau niv. 3 / puissance 65 physique', () => {
    const moves = new MoveRepository();
    for (const type of ALL_TYPES) {
      const mortal = moves.getMovesForType(type).find(m => m.guaranteedCrit)!;
      expect(mortal.level).toBe(3);
      expect(mortal.power).toBe(65);
      expect(mortal.isPhysical).toBe(true);
      // Un coup mortel ne porte pas de statut : les compteurs restent intacts.
      expect(mortal.statusEffect).toBeUndefined();
    }
  });

  test('la charge remplace l’amplification sans en changer la nature', () => {
    const moves = new MoveRepository();
    for (const type of ALL_TYPES) {
      const charge = moves.getMovesForType(type).find(m => m.charge)!;
      expect(charge.power).toBe(0);
      // L'invariant « une amplification par type » tient : la charge EST le boost
      // (elle garde son `statBoosts` en plus d'armer la prochaine attaque).
      expect(charge.statBoosts).toBeDefined();
      expect(charge.maxCoolDown).toBe(4);
    }
  });

  test('une charge du catalogue fait bien LES DEUX : +2 stat et charge armée', () => {
    const moves = new MoveRepository();
    const charge = moves.getMovesForType('fire').find(m => m.charge)!;
    const engine = new BattleEngine({ dice: fixedDice(12), variance: NEUTRAL });
    const attacker = new Monster('a', 'A', 'fire', 5, 18, 10, 10, 10, 10, 10, [{ ...charge }]);
    const strengthBefore = attacker.strength;

    engine.executeTurn(attacker, new Monster('t', 'T', 'normal', 5, 10, 10, 10, 10, 10, 10, []), charge);

    expect(attacker.strength).toBe(strengthBefore + (charge.statBoosts?.value ?? 0));
    expect(attacker.isCharged).toBe(true);
  });
});
