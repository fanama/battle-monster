/**
 * Simulateur d'équilibrage — monte des duels avec le **vrai moteur** de
 * combat (`BattleEngine`) et les vraies fabriques (`MonsterForge`,
 * `RandomEnemyFactory`), puis rapporte taux de victoire et durée.
 *
 * Objectif : mesurer avant de retoucher le catalogue de moves, la table de
 * types et le scaling régional (TODO §2 — « rééquilibrage non outillé »).
 *
 * Usage :
 *   bun run scripts/balanceSim.ts            # tout
 *   bun run scripts/balanceSim.ts mirror     # seulement les miroirs de type
 *   bun run scripts/balanceSim.ts matrix     # matrice de matchups
 *   bun run scripts/balanceSim.ts regions    # difficulty par région
 *   bun run scripts/balanceSim.ts moves      # budget de puissance par type
 *   bun run scripts/balanceSim.ts table      # audit de la table de types
 */

import { BattleEngine, type Dice } from '../src/core/services/BattleEngine';
import { BattleController } from '../src/core/services/BattleController';
import { MoveRepository } from '../src/infra/repositories/MoveRepositories';
import { MonsterForge } from '../src/infra/repositories/MonsterForge';
import { RandomEnemyFactory } from '../src/infra/repositories/RandomEnemyFactory';
import { Monster } from '../src/core/entities/Monster';
import { REGIONS } from '../src/core/entities/Region';
import { autoAllocate, createDraft, type MonsterDraft } from '../src/core/entities/MonsterCreation';
import { TYPE_MULTIPLIER, MAGIC_TYPE_MULTIPLIER, typeEffectiveness } from '../src/core/services/effectiveness';
import type { Move, MonsterType } from '../src/core/entities/Move';

const TYPES: MonsterType[] = ['fire', 'water', 'grass', 'normal', 'electric', 'rock'];
const MAX_ROUNDS = 40;

const moveProvider = new MoveRepository();
const engine = new BattleEngine();

/** Générateur pseudo-aléatoire déterministe (mulberry32) : runs reproductibles. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function diceFrom(rng: () => number): Dice {
  return {
    roll(count: number, sides: number): number {
      let total = 0;
      for (let i = 0; i < count; i++) total += Math.floor(rng() * sides) + 1;
      return total;
    },
  };
}

/**
 * Score de valeur d'un move (miroir de `moveScore` dans `BattleController`).
 */
function moveScore(move: Move): number {
  return move.level * 100 + move.power + (move.healPower ?? 0);
}

/**
 * Apprentissage de move au level-up — **miroir de la logique de
 * `BattleController.playTurn`**. Sans cela le champion simulé garderait ses
 * 4 capacités de niveau 5 face à un ennemi créé directement au niveau 13
 * avec son panel complet : la mesure de la difficulté était fausse.
 */
function learnOnLevelUp(monster: Monster): void {
  const eligible = moveProvider.getMovesForMonster(monster);
  const known = new Set(monster.moves.map(m => m.id));
  for (const move of eligible) {
    if (known.has(move.id)) continue;
    if (monster.moves.length < 4) {
      monster.learnMove(move);
    } else {
      // Remplace le plus faible move **de même nature** (cf. BattleController).
      const wantOffensive = move.power > 0;
      const candidates = monster.moves
        .map((m, index) => ({ m, index }))
        .filter(entry => (entry.m.power > 0) === wantOffensive);
      if (candidates.length === 0) continue;
      let lowest = candidates[0]!;
      for (const entry of candidates) {
        if (moveScore(entry.m) < moveScore(lowest.m)) lowest = entry;
      }
      if (moveScore(move) > moveScore(lowest.m)) monster.learnMove(move, lowest.index);
    }
  }
}

/** Ennemi dont le panel est choisi au mieux (variante de diagnostic). */
function makeGreedyEnemy(level: number, type: MonsterType, rng: () => number, statScale?: number): Monster {
  const enemy = makeEnemy(level, type, rng, statScale);
  const eligible = moveProvider.getMovesForMonster(enemy).sort((a, b) => moveScore(b) - moveScore(a));
  enemy.setMoves(eligible.slice(0, 4).map(m => ({ ...m, coolDown: 0 })));
  return enemy;
}

function reportKitEffect(runs: number): void {
  console.log('\n=== Effet du panel : ennemi aléatoire vs ennemi à panel optimal (menace x1.0) ===');
  console.log('niveau  ' + TYPES.map(t => t.padEnd(22)).join(''));
  for (const level of [5, 7, 9, 11, 13]) {
    const cells = TYPES.map(type => {
      const rnd = simulate(
        rng => makePlayer(type, level, rng),
        rng => makeEnemy(level, type, rng),
        Math.floor(runs / 2),
      );
      const greedy = simulate(
        rng => makePlayer(type, level, rng),
        rng => makeGreedyEnemy(level, type, rng),
        Math.floor(runs / 2),
      );
      return `${pct(rnd.winRate)}→${pct(greedy.winRate)}`.padEnd(22);
    });
    console.log(String(level).padEnd(8) + cells.join(''));
  }
}

/** Champion du joueur : brouillon auto-réparti, forgé au niveau de création, puis nivelé. */
function makePlayer(type: MonsterType, level: number, rng: () => number): Monster {
  let draft: MonsterDraft = autoAllocate(createDraft(type, 'Sim'));
  if (!draft.name) draft = { ...draft, name: 'Sim' };
  const monster = new MonsterForge(moveProvider, rng).create(draft);
  while (monster.level < level) {
    monster.gainExperience(monster.experienceToNextLevel);
    learnOnLevelUp(monster);
  }
  monster.currentHp = monster.maxHp;
  return monster;
}

function makeEnemy(
  level: number,
  type: MonsterType,
  rng: () => number,
  statScale?: number,
): Monster {
  return new RandomEnemyFactory(moveProvider, rng).createRandomEnemy(level, { type, statScale });
}

/** Policy de choix de move : même heuristique que l'IA ennemie (types & soins). */
/**
 * Duel complet. Les deux camps sont pilotés par la même heuristique (choix
 * aléatoire parmi les moves super-efficaces) : c'est un miroir loyal, seul le
 * type et le niveau des statistiques diffèrent.
 */
function duel(player: Monster, enemy: Monster, rng: () => number): { playerWon: boolean; rounds: number } {
  const simEngine = new BattleEngine({ dice: diceFrom(rng) });
  const controller = new BattleController({
    engine: simEngine,
    moveProvider,
    enemyFactory: new RandomEnemyFactory(moveProvider, rng),
    random: rng,
  });

  let rounds = 0;
  while (!player.isFainted() && !enemy.isFainted() && rounds < MAX_ROUNDS) {
    rounds++;
    // Pas de reset des recharges ici : elles décrèment normalement à chaque
    // tour (`manageCooldowns`). Les remettre à zéro à chaque round
    // rendait le cooldown 2 du move ultime inexploitable et faussait toute la
    // mesure (le move le plus puissant devenait jouable tous les tours).

    const plan = controller.beginRound({
      player,
      enemy,
      playerCastsHeal: false,
      enemyCanHeal: false,
    });
    const order: Array<'player' | 'enemy'> = plan.playerFirst ? ['player', 'enemy'] : ['enemy', 'player'];

    for (const side of order) {
      const actor = side === 'player' ? player : enemy;
      const target = side === 'player' ? enemy : player;
      if (actor.isFainted() || target.isFainted()) break;

      // L'IA ne soigne que si ça vaut le coup (le joueur ferait de même).
      const healWhenLow = actor.currentHp < actor.maxHp * 0.4;
      let move = controller.selectEnemyMove(actor.moves, actor, target);
      if (healWhenLow) {
        const heal = actor.moves.find(m => m.isHeal && (m.coolDown ?? 0) === 0);
        if (heal) move = heal;
      }
      controller.playTurn({ attacker: actor, defender: target, move, attackerSide: side });
    }
  }

  return { playerWon: enemy.isFainted() && !player.isFainted(), rounds };
}

interface Aggregate {
  winRate: number;
  avgRounds: number;
  timeouts: number;
  samples: number;
}

function simulate(
  playerFactory: (rng: () => number) => Monster,
  enemyFactory: (rng: () => number) => Monster,
  runs: number,
): Aggregate {
  let wins = 0;
  let rounds = 0;
  let timeout = 0;
  for (let i = 0; i < runs; i++) {
    // Chaque run a ses propres jets : champion varié, ennemi varié, dés variés.
    const result = duel(
      playerFactory(makeRng(i * 7919 + 13)),
      enemyFactory(makeRng(i * 7919 + 104729)),
      makeRng(i * 7919 + 99991),
    );
    if (result.playerWon) wins++;
    if (result.rounds >= MAX_ROUNDS) timeout++;
    rounds += result.rounds;
  }
  return { winRate: wins / runs, avgRounds: rounds / runs, timeouts: timeout, samples: runs };
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

// --- 1. Miroirs de type : chaque type contre lui-même, par palier ---

function reportMirror(runs = 400): void {
  console.log('\n=== Miroirs de type (même type des deux côtés) ===');
  console.log('niveau  ' + TYPES.map(t => t.padEnd(10)).join(''));
  for (const level of [3, 5, 7, 9, 11, 13]) {
    const cells = TYPES.map(type => {
      const agg = simulate(
        rng => makePlayer(type, level, rng),
        rng => makeEnemy(level, type, rng),
        runs,
      );
      return `${pct(agg.winRate)}/${agg.avgRounds.toFixed(1)}r`.padEnd(10);
    });
    console.log(String(level).padEnd(8) + cells.join(''));
  }
}

// --- 2. Matrice de matchups : détecte les asymétries de la table de types ---

function reportMatrix(runs = 200): void {
  console.log('\n=== Matrice de matchups (type joueur × type ennemi), niveau 9 ===');
  console.log('        ' + TYPES.map(t => t.padEnd(10)).join(''));
  for (const attacker of TYPES) {
    const cells = TYPES.map(defender => {
      const agg = simulate(
        rng => makePlayer(attacker, 9, rng),
        rng => makeEnemy(9, defender, rng),
        runs,
      );
      return pct(agg.winRate).padEnd(10);
    });
    console.log(attacker.padEnd(8) + cells.join(''));
  }
}

// --- 3. Tension par région : champion forgé vs sauvage / boss de la région ---

/** Niveau attendu du joueur à l'entrée d'une région (progression de run). */
const REGION_ENTRY_LEVEL = [5, 7, 9, 11];

function reportRegions(runs: number): void {
  console.log("\n=== Tension par région (niveau d'entrée, stats réelles) ===");
  for (let i = 0; i < REGIONS.length; i++) {
    const region = REGIONS[i]!;
    const level = REGION_ENTRY_LEVEL[i] ?? region.maxLevel;

    // Même arithmétique que `BattleController.wildLevelFor`.
    const offsets = region.wildLevelOffsets;
    const wildLevel = Math.min(
      region.maxLevel,
      Math.max(region.minLevel, level + (offsets[Math.floor(offsets.length / 2)] ?? 0)),
    );
    const wilds = region.types.map((type) => {
      const agg = simulate(
        rng => makePlayer('fire', level, rng),
        rng => makeEnemy(wildLevel, type, rng, region.threat),
        Math.floor(runs / region.types.length),
      );
      return `${type} ${pct(agg.winRate)}`;
    });
    const boss = simulate(
      rng => makePlayer('fire', level, rng),
      rng => {
        const rng2 = rng;
        const b = makeEnemy(Math.min(region.maxLevel + 1, level + 1), region.bossType, rng2, region.threat);
        b.maxHp = Math.floor(b.maxHp * 1.4);
        b.currentHp = b.maxHp;
        b.rank = 'boss';
        return b;
      },
      runs,
    );
    console.log(
      `${region.name.padEnd(22)} niv.${level} sauvage niv.${wildLevel} menace x${region.threat}  [${wilds.join(', ')}]  boss: ${pct(boss.winRate)} / ${boss.avgRounds.toFixed(1)}r`,
    );
  }
}

// --- 7. Balayage de la menace : calibre `RegionDef.threat` ---

function reportSweep(runs: number): void {
  console.log('\n=== Balayage de la menace (statScale ennemi) ===');
  const threats = [0.9, 1, 1.1, 1.2, 1.3, 1.4];
  console.log('niveau  ' + threats.map(t => `x${t.toFixed(1)}`.padEnd(14)).join(''));
  for (const level of [5, 7, 9, 11, 13]) {
    const cells = threats.map(threat => {
      const agg = simulate(
        rng => makePlayer('fire', level, rng),
        rng => makeEnemy(level, 'fire', rng, threat),
        runs,
      );
      return `${pct(agg.winRate)}/${agg.avgRounds.toFixed(1)}r`.padEnd(14);
    });
    console.log(String(level).padEnd(8) + cells.join(''));
  }
}

// --- 6. Budget de combat par type : stats, PV et dégâts moyens ---

/** Dégâts moyens d'un move (horskrit et hors multiplicateur de type). */
function averageDamage(attacker: Monster, move: Move): number {
  if (move.power <= 0) return 0;
  const base = move.power < 40 ? 6 : move.power < 60 ? 8 : move.power < 80 ? 10 : move.power < 110 ? 12 : 20;
  // Miroir de `BattleEngine.rollDamage` (moyenne d'un dé), hors critique.
  if (move.isPhysical) {
    return (base + 1) / 2 + Math.floor(move.power / 10) + Math.floor(move.power / 20)
      + Math.floor((attacker.strength - 10) / 2);
  }
  return ((base + 4 + 1) / 2 + Math.floor(move.power / 10) + Math.floor((attacker.wisdom - 10) / 2))
    * attacker.charismaMagicFactor();
}

function reportStats(level: number): void {
  console.log(`\n=== Budget de combat au niveau ${level} (moyennes sur 200 tirages) ===`);
  console.log('type      FOR/ VIT/ CON/ SAV  PVmax  .best move moy.  moves (P/nature)');
  for (const type of TYPES) {
    const samples = 200;
    let str = 0, spd = 0, con = 0, wis = 0, hp = 0, dmg = 0, nMoves = 0, phys = 0, mag = 0;
    for (let i = 0; i < samples; i++) {
      const rng = makeRng(i * 31 + 5);
      const player = makePlayer(type, level, rng);
      const enemy = makeEnemy(level, type, rng);
      str += player.strength; spd += player.speed; con += player.constitution; wis += player.wisdom;
      hp += player.maxHp;
      const best = Math.max(...player.moves.map(m => averageDamage(player, m)));
      dmg += best;
      nMoves += player.moves.filter(m => m.power > 0).length;
      phys += player.moves.filter(m => m.power > 0 && m.isPhysical).length;
      mag += player.moves.filter(m => m.power > 0 && !m.isPhysical).length;
    }
    const eSamples = 200;
    let eStr = 0, eCon = 0, eHp = 0;
    for (let i = 0; i < eSamples; i++) {
      const rng = makeRng(i * 37 + 11);
      const enemy = makeEnemy(level, type, rng);
      eStr += enemy.strength; eCon += enemy.constitution; eHp += enemy.maxHp;
    }
    console.log(
      `${type.padEnd(9)} ${(str / samples).toFixed(1).padStart(4)} ${(spd / samples).toFixed(1).padStart(4)} ${(con / samples).toFixed(1).padStart(4)} ${(wis / samples).toFixed(1).padStart(4)}  ` +
      `${(hp / samples).toFixed(0).padStart(4)} (enn ${(eHp / eSamples).toFixed(0).padStart(4)})  ` +
      `${(dmg / samples).toFixed(0).padStart(4)}  ${(nMoves / samples).toFixed(1)} (${(phys / samples).toFixed(1)}P/${(mag / samples).toFixed(1)}M)` +
      `   [FOR ${(str / samples).toFixed(0)} vs ${(eStr / eSamples).toFixed(0)}, CON ${(con / samples).toFixed(0)} vs ${(eCon / eSamples).toFixed(0)}]`,
    );
  }
}

// --- 8. Calibration de `threat` sur les vraies bandes de région ---

function reportCalibrate(runs: number): void {
  console.log('\n=== Calibration : taux de victoire selon la menace (niveau d\'entr\u00e9e réel) ===');
  const threats = [0.7, 0.8, 0.9, 1, 1.1, 1.2];
  for (let i = 0; i < REGIONS.length; i++) {
    const region = REGIONS[i]!;
    const level = REGION_ENTRY_LEVEL[i] ?? region.maxLevel;
    const offsets = region.wildLevelOffsets;
    const cells = threats.map(threat => {
      // Moyenne sur tous les types de la région ET tous ses écarts de niveau,
      // comme en run réel (chaque nœud tire son propre écart).
      const perType = region.types.flatMap(type =>
        offsets.flatMap(offset =>
          TYPES.map(playerType => {
            const wildLevel = Math.min(
              region.maxLevel,
              Math.max(region.minLevel, level + offset),
            );
            return simulate(
              rng => makePlayer(playerType, level, rng),
              rng => makeEnemy(wildLevel, type, rng, threat),
              Math.max(
                12,
                Math.floor(runs / region.types.length / offsets.length / TYPES.length / 2),
              ),
            ).winRate;
          }),
        ),
      );
      // Le champion est moyenné sur **tous** ses types : la mesure doit
      // isoler la difficulté de la région, or le boss de Rivages d'Abysse est
      // Eau et contre les types Feu/Eau le champion Fire se fait détruire
      // (×0.5). Fixer `fire` ici transformait une mesure de difficulté en
      // mesure de matchup.
      const bossRates = TYPES.map(playerType =>
        simulate(
          rng => makePlayer(playerType, level, rng),
          rng => {
            const b = makeEnemy(Math.min(region.maxLevel + 1, level + 1), region.bossType, rng, threat);
            b.maxHp = Math.floor(b.maxHp * 1.2);
            b.currentHp = b.maxHp;
            b.rank = 'boss';
            return b;
          },
          Math.floor(runs / TYPES.length / 2),
        ).winRate,
      );
      const boss = bossRates.reduce((a, b) => a + b, 0) / bossRates.length;
      const wild = perType.reduce((a, b) => a + b, 0) / Math.max(1, perType.length);
      return `${pct(wild)}/${pct(boss)}`.padEnd(13);
    });
    console.log(
      `${region.name.padEnd(20)} n${level} (offsets ${offsets.join('/')}) ` + cells.join(''),
    );
  }
  console.log('            (sauvage / boss)');
}

// --- 3. Budget de puissance par type : le catalogue est-il équilibré ? ---

function reportMoves(): void {
  console.log('\n=== Catalogue de moves par type ===');
  for (const type of TYPES) {
    const own = moveProvider.getMovesForType(type);
    const dmg = own.filter(m => m.power > 0);
    const avgPower = dmg.length ? dmg.reduce((s, m) => s + m.power, 0) / dmg.length : 0;
    const heals = own.filter(m => m.isHeal);
    const buffs = own.filter(m => m.statBoosts);
    const statuses = own.filter(m => m.statusEffect);
    const levels = dmg.map(m => `${m.power}@L${m.level}`).join(' ');
    console.log(
      `${type.padEnd(10)} ${String(own.length).padStart(2)} moves | moy ${avgPower.toFixed(0).padStart(3)} | ` +
      `soins ${heals.length} (${heals.map(m => m.healPower ?? 0).join('/') || '-'}) | ` +
      `buffs ${buffs.length} | statuts ${statuses.length} | ${levels}`,
    );
  }
}

// --- 4. Audit de la table de types : réciprocité et équilibre ---

function reportTypeTable(): void {
  console.log('\n=== Table de types — audit de réciprocité ===');
  let issues = 0;
  for (let i = 0; i < TYPES.length; i++) {
    for (let j = i + 1; j < TYPES.length; j++) {
      const a = TYPES[i]!;
      const b = TYPES[j]!;
      const ab = typeEffectiveness(a, b, true);
      const ba = typeEffectiveness(b, a, true);
      const magicAb = typeEffectiveness(a, b, false);
      const magicBa = typeEffectiveness(b, a, false);
      // Réciproque : soit les deux sont neutres, soit le produit vaut 1.
      const reciprocal = (ab === 1 && ba === 1) || Math.abs(ab * ba - 1) < 1e-9;
      const magicMirrors =
        (magicAb === 1 && magicBa === 1) || Math.abs(magicAb * magicBa - 1) < 1e-2;
      if (!reciprocal || !magicMirrors) {
        issues++;
        console.log(`  ⚠️  ${a} ↔ ${b} : phys ${ab} / ${ba} | mag ${magicAb} / ${magicBa}`);
      }
    }
  }
  if (issues === 0) console.log('  ✅ Table réciproque.');

  console.log('\n=== Équilibre avantages / faiblesses par type ===');
  let degreeIssues = 0;
  for (const type of TYPES) {
    if (type === 'normal') continue;
    const strong = TYPES.filter(t => t !== type && (TYPE_MULTIPLIER[type]?.[t] ?? 1) > 1);
    const weak = TYPES.filter(t => t !== type && (TYPE_MULTIPLIER[type]?.[t] ?? 1) < 1);
    const neutral = TYPES.filter(t => t !== type && (TYPE_MULTIPLIER[type]?.[t] ?? 1) === 1);
    if (strong.length !== weak.length) {
      degreeIssues++;
      console.log(`  ⚠️  ${type} : ${strong.length} avantage(s) vs ${weak.length} faiblesse(s)`);
    }
    console.log(`  ${type.padEnd(10)} +${strong.length} / -${weak.length} /=${neutral.length}  (${strong.join(', ') || '—'} | ${weak.join(', ') || '—'})`);
  }
  if (degreeIssues === 0) console.log('  ✅ Chaque type élémentaire a autant de forces que de faiblesses.');

  void MAGIC_TYPE_MULTIPLIER;
}

const which = process.argv[2] ?? 'all';
const quick = process.argv.includes('--quick');
const runs = quick ? 120 : 400;

if (which === 'all' || which === 'table') reportTypeTable();
if (which === 'all' || which === 'table') reportTypeTable();
if (which === 'all' || which === 'moves') reportMoves();
if (which === 'stats') reportStats(7);
if (which === 'sweep') reportSweep(runs);
if (which === 'kit') reportKitEffect(runs);
if (which === 'calibrate') reportCalibrate(runs);
if (which === 'all' || which === 'mirror') reportMirror(runs);
if (which === 'all' || which === 'matrix') reportMatrix(Math.floor(runs / 2));
if (which === 'all' || which === 'regions') reportRegions(runs);