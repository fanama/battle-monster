import { describe, expect, test } from 'bun:test';
import { BattleController } from '../src/core/services/BattleController';
import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { Monster } from '../src/core/entities/Monster';
import type { Move } from '../src/core/entities/Move';
import type { EnemyFactory, MoveProvider } from '../src/core/services/ports';

/**
 * Règle de résolution : **un soin passe toujours avant une attaque**, quel que
 * soit le jet d'initiative. L'initiative ne départage que les cas où les deux
 * camps se ressemblent (les deux soignent, ou aucun ne soigne).
 *
 * Ces tests ciblent `beginRound` (fonction pure d'ordre) et `hasUsableHeal`
 * (sonde sans aléa). L'exécution des tours elle-même est déjà couverte par
 * `RoundInitiative.test.ts`.
 */
/** `random` scripté : permet d'affirmer qu'une sonde ne consomme rien. */
const trackingRandom = () => {
  let calls = 0;
  return {
    fn: () => {
      calls++;
      return 0.5;
    },
    calls: () => calls,
  };
};

describe('Ordre de résolution : le soin passe avant l’attaque', () => {
  const tackle: Move = {
    id: 'tackle',
    name: 'Charge',
    type: 'normal',
    power: 40,
    level: 1,
    isPhysical: true,
  };
  const mend: Move = {
    id: 'mend',
    name: 'Souffle',
    type: 'normal',
    power: 0,
    healPower: 10,
    level: 1,
    isHeal: true,
  };

  /** Dés scriptés : chaque appel renvoie le tirage suivant. */
  const sequenceDice = (rolls: number[]): Dice => {
    let i = 0;
    return { roll: () => (i < rolls.length ? rolls[i++] : 1) };
  };

  const makeController = (
    dice: Dice,
    random?: () => number,
  ): BattleController =>
    new BattleController({
      engine: new BattleEngine({ dice }),
      moveProvider: { getMovesForMonster: () => [] as Move[] } as MoveProvider,
      enemyFactory: {
        createRandomEnemy: () => {
          throw new Error('unused in this test');
        },
        createBoss: () => {
          throw new Error('unused in this test');
        },
      } as EnemyFactory,
      dice,
      random,
    });

  // Vitesse 14 → mod +2 (joueur), 10 → mod +0 (ennemi) : à initiative égale,
  // c'est donc l'ennemi qui domine le jet si son tirage est supérieur.
  const player = (moves: Move[] = [tackle]) =>
    new Monster('p', 'Héro', 'normal', 1, 14, 14, 10, 10, 10, 10, moves);
  const enemy = (moves: Move[] = [tackle]) =>
    new Monster('e', 'Sloub', 'normal', 1, 30, 10, 10, 10, 10, 10, moves);

  test('le soin du joueur passe devant l’attaque, même avec une initiative adverse', () => {
    // Jets : joueur 3 (+2 = 5) contre ennemi 18 (+0) → l'ennemi est devant.
    const controller = makeController(sequenceDice([3, 18]));
    const plan = controller.beginRound({
      player: player([mend]),
      enemy: enemy(),
      playerCastsHeal: true,
      enemyCanHeal: false,
    });

    expect(plan.playerFirst).toBe(true);
    expect(plan.healFirst).toBe(true);
    expect(plan.enemyInitiative).toBeGreaterThan(plan.playerInitiative);
  });

  test("le soin de l'ennemi passe devant l'attaque du joueur", () => {
    // Jets : joueur 18 (+2 = 20) contre ennemi 3 → le joueur est devant.
    const controller = makeController(sequenceDice([18, 3]));
    const plan = controller.beginRound({
      player: player(),
      enemy: enemy([mend]),
      playerCastsHeal: false,
      enemyCanHeal: true,
    });

    expect(plan.playerFirst).toBe(false);
    expect(plan.healFirst).toBe(true);
    expect(plan.playerInitiative).toBeGreaterThan(plan.enemyInitiative);
  });

  test("l'initiative tranche quand aucun camp ne soigne (non-régression)", () => {
    const faster = makeController(sequenceDice([18, 3]));
    expect(
      faster.beginRound({ player: player(), enemy: enemy(), playerCastsHeal: false, enemyCanHeal: false })
        .playerFirst,
    ).toBe(true);

    const slower = makeController(sequenceDice([3, 18]));
    const plan = slower.beginRound({
      player: player(),
      enemy: enemy(),
      playerCastsHeal: false,
      enemyCanHeal: false,
    });
    expect(plan.playerFirst).toBe(false);
    expect(plan.healFirst).toBe(false);
  });

  test("quand les deux camps soignent, l'initiative tranche", () => {
    const controller = makeController(sequenceDice([3, 18]));
    const plan = controller.beginRound({
      player: player([mend]),
      enemy: enemy([mend]),
      playerCastsHeal: true,
      enemyCanHeal: true,
    });

    expect(plan.playerFirst).toBe(false); // l'initiative adverse l'emporte
    expect(plan.healFirst).toBe(false);
  });

  test('le journal signale que le soin prime sur linitiative', () => {
    const controller = makeController(sequenceDice([3, 18]));
    const plan = controller.beginRound({
      player: player([mend]),
      enemy: enemy(),
      playerCastsHeal: true,
      enemyCanHeal: false,
    });

    expect(plan.logs.join('\n')).toContain('soin passe avant');
    // L'initiative reste journalisée, et l'ordre effectif est explicite.
    expect(plan.logs.join('\n')).toContain('Sloub en tête à l');
    expect(plan.logs[plan.logs.length - 1]).toContain('Héro agit en premier');
  });

  test('aucun journal de priorité quand aucun soin n’est en jeu', () => {
    const controller = makeController(sequenceDice([18, 3]));
    const plan = controller.beginRound({
      player: player(),
      enemy: enemy(),
      playerCastsHeal: false,
      enemyCanHeal: false,
    });

    expect(plan.logs.join('\n')).not.toContain('soin passe avant');
  });
});

describe('Sonde de soin utilisable (hasUsableHeal)', () => {
  const mend: Move = {
    id: 'mend',
    name: 'Souffle',
    type: 'normal',
    power: 0,
    healPower: 10,
    level: 1,
    isHeal: true,
  };
  const tackle: Move = {
    id: 'tackle',
    name: 'Charge',
    type: 'normal',
    power: 40,
    level: 1,
    isPhysical: true,
  };

  const makeController = (random?: () => number): BattleController =>
    new BattleController({
      engine: new BattleEngine({ dice: { roll: () => 10 } }),
      moveProvider: { getMovesForMonster: () => [] as Move[] } as MoveProvider,
      enemyFactory: {
        createRandomEnemy: () => {
          throw new Error('unused in this test');
        },
        createBoss: () => {
          throw new Error('unused in this test');
        },
      } as EnemyFactory,
      dice: { roll: () => 10 },
      random,
    });

  const wounded = (moves: Move[]) => {
    const m = new Monster('m', 'Sloub', 'normal', 1, 30, 10, 10, 10, 10, 10, moves);
    m.takeDamage(m.maxHp); // PV à 0 : tout soin est utile
    return m;
  };

  test('vrai si un soin est disponible et les PV ne sont pas pleins', () => {
    expect(makeController().hasUsableHeal(wounded([tackle, mend]))).toBe(true);
  });

  test('faux à PV pleins : un soin serait inutile', () => {
    const full = new Monster('m', 'Sloub', 'normal', 1, 30, 10, 10, 10, 10, 10, [mend]);
    expect(makeController().hasUsableHeal(full)).toBe(false);
  });

  test('faux si le seul soin est en recharge', () => {
    const m = wounded([mend]);
    m.moves[0].coolDown = 2;
    expect(makeController().hasUsableHeal(m)).toBe(false);
  });

  test('faux si le monstre n’a aucun soin', () => {
    expect(makeController().hasUsableHeal(wounded([tackle]))).toBe(false);
  });

  test('la sonde ne consomme aucun hasard (l’IA garde son initiative)', () => {
    // `selectEnemyMove` est le seul appelant de `random()` côté choix de move :
    // si la sonde en consommait, le premier tirage de l'IA changerait.
    const random = trackingRandom();
    const controller = makeController(random.fn);

    const before = random.calls();
    controller.hasUsableHeal(wounded([tackle, mend]));
    controller.hasUsableHeal(wounded([tackle]));
    expect(random.calls()).toBe(before);
  });
});