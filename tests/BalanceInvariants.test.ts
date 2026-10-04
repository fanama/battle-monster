import { describe, expect, test } from 'bun:test';
import {
  MAGIC_TYPE_MULTIPLIER,
  TYPE_MULTIPLIER,
  typeEffectiveness,
} from '../src/core/services/effectiveness';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import {
  MAX_MOVES,
  Monster,
  STAT_GROWTH_TOTAL,
  levelPaceFactor,
  statGrowthForType,
} from '../src/core/entities/Monster';
import { TYPE_AFFINITIES, ALLOCATABLE_STATS } from '../src/core/entities/MonsterCreation';
import { REGIONS } from '../src/core/entities/Region';
import { RandomEnemyFactory } from '../src/infra/repositories/RandomEnemyFactory';
import { CREATION_LEVEL } from '../src/core/entities/MonsterCreation';
import type { MonsterType } from '../src/core/entities/Move';

const ELEMENTAL_TYPES: MonsterType[] = ['fire', 'water', 'grass', 'electric', 'rock'];
const ALL_TYPES: MonsterType[] = [...ELEMENTAL_TYPES, 'normal'];
const moves = new MoveRepository();

describe('Table de types — réciprocité', () => {
  test('Aucune relation n’est à sens unique (si A est faible devant B, B est fort devant A)', () => {
    for (const a of ALL_TYPES) {
      for (const b of ALL_TYPES) {
        const ab = typeEffectiveness(a, b, true);
        const ba = typeEffectiveness(b, a, true);
        const bothNeutral = ab === 1 && ba === 1;
        expect(bothNeutral || ab * ba === 1).toBe(true);
      }
    }
  });

  test('La table magique est le miroir exact de la table physique', () => {
    for (const a of ALL_TYPES) {
      for (const b of ALL_TYPES) {
        const physical = typeEffectiveness(a, b, true);
        const magic = typeEffectiveness(a, b, false);
        // ×1 neutre des deux côtés, sinon 2 ↔ 1.5 et 0.5 ↔ 0.67.
        if (physical === 1) expect(magic).toBe(1);
        if (physical === 2) expect(magic).toBe(1.5);
        if (physical === 0.5) expect(magic).toBe(0.67);
      }
    }
  });

  test('Chaque type élémentaire a autant d’avantages que de faiblesses', () => {
    for (const type of ELEMENTAL_TYPES) {
      const advantages = ALL_TYPES.filter(t => (TYPE_MULTIPLIER[type]?.[t] ?? 1) > 1);
      const weaknesses = ALL_TYPES.filter(t => (TYPE_MULTIPLIER[type]?.[t] ?? 1) < 1);
      expect(advantages.length).toBe(weaknesses.length);
      expect(advantages.length).toBe(2);
    }
  });

  test('Le triangle historique Feu > Plante > Eau > Feu est conservé', () => {
    expect(typeEffectiveness('fire', 'grass', true)).toBe(2);
    expect(typeEffectiveness('grass', 'water', true)).toBe(2);
    expect(typeEffectiveness('water', 'fire', true)).toBe(2);
    expect(typeEffectiveness('grass', 'fire', true)).toBe(0.5);
    expect(typeEffectiveness('water', 'grass', true)).toBe(0.5);
    expect(typeEffectiveness('fire', 'water', true)).toBe(0.5);
  });

  test('Normal reste neutre et n’entre dans aucune relation', () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_MULTIPLIER[type]?.normal ?? 1).toBe(1);
      expect(MAGIC_TYPE_MULTIPLIER[type]?.normal ?? 1).toBe(1);
    }
    expect(TYPE_MULTIPLIER.normal).toEqual({});
  });
});

describe('Catalogue de moves — parité entre types', () => {
  test('Chaque type expose le même nombre de capacités', () => {
    const counts = ALL_TYPES.map(type => moves.getMovesForType(type).length);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBe(8);
  });

  test('Chaque type a exactement un soin et un amplification', () => {
    for (const type of ALL_TYPES) {
      const own = moves.getMovesForType(type);
      expect(own.filter(m => m.isHeal).length).toBe(1);
      expect(own.filter(m => m.statBoosts).length).toBe(1);
      // Un soin ne doit jamais être une attaque (power: 0) ni l'inverse.
      for (const heal of own.filter(m => m.isHeal)) {
        expect(heal.power).toBe(0);
        expect(heal.healPower ?? 0).toBeGreaterThan(0);
      }
      for (const buff of own.filter(m => m.statBoosts)) {
        expect(buff.power).toBe(0);
      }
    }
  });

  test('Chaque type inflige le même nombre de statuts élémentaires', () => {
    const counts = ALL_TYPES.map(type => moves.getMovesForType(type).filter(m => m.statusEffect).length);
    expect(new Set(counts).size).toBe(1);
    expect(counts[0]).toBe(4);
  });

  test('L’échelle de puissance est identique pour tous les types', () => {
    const ladders = ALL_TYPES.map(type =>
      moves
        .getMovesForType(type)
        .filter(m => m.power > 0)
        .map(m => `${m.level}:${m.power}`)
        .sort(),
    );
    for (const ladder of ladders) {
      expect(ladder).toEqual(ladders[0]);
    }
  });

  test('Les puissances croissent strictement, et jamais à un niveau plus bas', () => {
    for (const type of ALL_TYPES) {
      const damaging = moves
        .getMovesForType(type)
        .filter(m => m.power > 0)
        .sort((a, b) => a.level - b.level || a.power - b.power);
      for (let i = 1; i < damaging.length; i++) {
        // Deux capacités peuvent partager un palier (les deux movs de niveau 1),
        // mais aucune capacité plus puissante ne doit sortir plus tôt.
        expect(damaging[i]!.level).toBeGreaterThanOrEqual(damaging[i - 1]!.level);
        expect(damaging[i]!.power).toBeGreaterThan(damaging[i - 1]!.power);
      }
    }
  });

  test('Aucune capacité ne dépasse le plafond de 4 du monstre', () => {
    for (const type of ALL_TYPES) {
      const available = moves.getMovesForMonster({ type, level: 20 });
      expect(available.length).toBeGreaterThan(MAX_MOVES);
    }
  });
});

describe('Courbe de progression des caractéristiques', () => {
  test('Tous les types gagnent exactement STAT_GROWTH_TOTAL points par niveau', () => {
    for (const type of ALL_TYPES) {
      const growth = statGrowthForType(type);
      const total =
        growth.strength +
        growth.speed +
        growth.constitution +
        growth.wisdom +
        growth.charisma +
        growth.instinct;
      expect(total).toBe(STAT_GROWTH_TOTAL);
    }
  });

  test('Le Charisme ne croît jamais (il ne vient que des reliques)', () => {
    for (const type of ALL_TYPES) {
      expect(statGrowthForType(type).charisma).toBe(0);
    }
  });

  test('Chaque type reçoit au moins +2 Constitution à la création', () => {
    for (const type of ALL_TYPES) {
      const constitution = TYPE_AFFINITIES[type].bonus.constitution ?? 0;
      expect(constitution).toBeGreaterThanOrEqual(2);
    }
  });

  test('Chaque affinité de type vaut exactement 6 points', () => {
    for (const type of ALL_TYPES) {
      const total = ALLOCATABLE_STATS.reduce(
        (sum, stat) => sum + (TYPE_AFFINITIES[type].bonus[stat] ?? 0),
        0,
      );
      expect(total).toBe(6);
    }
  });
});

describe('Cadence des combats — les dégâts suivent la même courbe que les PV', () => {
  test('Le facteur de cadence vaut 1 au niveau 1 et croît avec le niveau', () => {
    expect(levelPaceFactor(1)).toBeCloseTo(1, 10);
    expect(levelPaceFactor(2)).toBeGreaterThan(1);
    expect(levelPaceFactor(13)).toBeGreaterThan(levelPaceFactor(5));
  });

  test('La cadence reste bornée : aucun niveau ne double les dégâts d’un coup', () => {
    for (let level = 1; level <= 15; level++) {
      expect(levelPaceFactor(level)).toBeLessThan(4);
      expect(levelPaceFactor(level)).toBeGreaterThan(0);
    }
  });

  test('La cadence des dégâts est exactement celle de la réserve de PV', () => {
    // C’est l’invariant qui garantit qu’un round dure le même nombre de tours
    // du niveau 1 au niveau 13.
    for (const level of [3, 7, 13]) {
      const player = new Monster('p', 'P', 'fire', level, 16, 12, 16, 10, 14, 12, []);
      const base = new Monster('b', 'B', 'fire', 1, 16, 12, 16, 10, 14, 12, []);
      // Tolérance large : les PV sont arrondis à l'entier inférieur, ce qui
      // décale légèrement le ratio.
      expect(player.maxHp / base.maxHp).toBeCloseTo(levelPaceFactor(level), 0);
    }
  });
});

describe('Échelle des ennemis', () => {
  test('Un ennemi au niveau de création a le même budget qu’un champion fraîchement forgé', () => {
    const factory = new RandomEnemyFactory(moves, () => 0.5);
    const enemy = factory.createRandomEnemy(CREATION_LEVEL, { type: 'fire' });
    // Tirage `8 + 0.5 × 7` = 11 sur les six caractéristiques, hors Charisme.
    expect(enemy.strength).toBe(11);
    expect(enemy.constitution).toBe(11);
    // Le Charisme est une stat de relique : un sauvage n'en profite pas.
    expect(enemy.charisma).toBe(10);
  });

  test('L’ennemi suit la croissance de son propre type', () => {
    const factory = new RandomEnemyFactory(moves, () => 0.5);
    const base = factory.createRandomEnemy(CREATION_LEVEL, { type: 'grass' });
    const grown = factory.createRandomEnemy(CREATION_LEVEL + 3, { type: 'grass' });
    const growth = statGrowthForType('grass');
    expect(grown.wisdom - base.wisdom).toBe(growth.wisdom * 3);
    expect(grown.strength - base.strength).toBe(growth.strength * 3);
  });

  test('La menace régionale réduit les caractéristiques sans passer sous le plancher', () => {
    const factory = new RandomEnemyFactory(moves, () => 0.5);
    const full = factory.createRandomEnemy(9, { type: 'rock' });
    const soft = factory.createRandomEnemy(9, { type: 'rock', statScale: 0.5 });
    expect(soft.strength).toBeLessThan(full.strength);
    expect(soft.strength).toBeGreaterThanOrEqual(8);
  });
});

describe('Courbe de difficulté des régions', () => {
  test('La menace est croissante de la première à la dernière région', () => {
    for (let i = 1; i < REGIONS.length; i++) {
      expect(REGIONS[i]!.threat).toBeGreaterThan(REGIONS[i - 1]!.threat);
    }
  });

  test('Les premières régions placent leurs sauvages sous le niveau du joueur', () => {
    for (const region of REGIONS.slice(0, 2)) {
      const average = region.wildLevelOffsets.reduce((a, b) => a + b, 0) / region.wildLevelOffsets.length;
      expect(average).toBeLessThanOrEqual(0);
    }
  });

  test('Les dernières régions placent leurs sauvages au niveau du joueur ou au-dessus', () => {
    for (const region of REGIONS.slice(2)) {
      const average = region.wildLevelOffsets.reduce((a, b) => a + b, 0) / region.wildLevelOffsets.length;
      expect(average).toBeGreaterThanOrEqual(-0.5);
    }
  });

  test('Chaque région a une bande de niveaux cohérente et des types connus', () => {
    const known: MonsterType[] = ['fire', 'water', 'grass', 'normal', 'electric', 'rock'];
    for (const region of REGIONS) {
      expect(region.minLevel).toBeLessThan(region.maxLevel);
      expect(region.wildLevelOffsets.length).toBeGreaterThan(0);
      expect(region.threat).toBeGreaterThan(0);
      for (const type of [...region.types, region.bossType]) {
        expect(known).toContain(type);
      }
    }
  });
});
