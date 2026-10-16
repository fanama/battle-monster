import type { Monster } from '../entities/Monster';
import { abilityModifier, MAX_MOVES, MonsterIO } from '../entities/Monster';
import type { RunState } from '../entities/BattleState';
import type { Move, MonsterType } from '../entities/Move';
import { STATUS_CONFIGS } from '../entities/StatusEffect';
import type { ConsumableItem, ItemOrigin } from '../entities/Consumable';
import { CONSUMABLE_CATALOG } from '../entities/Consumable';
import { REGIONS, type RegionDef } from '../entities/Region';
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  bestLoadout,
  rollEquipmentDrop,
  type Equipment,
  type EquipmentSlot,
} from '../entities/Equipment';
import {
  RELIC_SLOT_COUNT,
  rollMonsterPowerOffers,
  rollRareMonsterPowerOffers,
  relicScore,
  sellPrice,
  type Relic,
} from '../entities/Relic';
import { BattleEngine, defaultDice, type BattleModifiers, type CombatFeedback, type Dice, type LevelUpSummary } from './BattleEngine';
import { type EnemyArchetype } from '../../infra/repositories/monsterFactory';
import type { EnemyFactory, MoveProvider } from './ports';

// Réglages roguelike (orchestration, pas d'UI)
const WILD_WIN_HEAL_PCT = 30; // % de PV max soignés après un combat sauvage
const WILD_SCORE_MULTIPLIER = 15;
const BOSS_SCORE_BONUS = 150;
const RELIC_SCORE_BONUS = 15;
const WILD_GOLD_BASE = 8; // or gagné par combat sauvage : base + niveau ennemi
/** Nombre d'objets laissés par le boss à sa défaite (capacités signature). */
const BOSS_LOOT_COUNT = 1;
const BOSS_GOLD = 60; // or gagné en battant le boss de région

/**
 * Score de valeur d'un move pour l'arbitrage « quel move remplacer ? » lors
 * d'un level-up (4 emplacements max). Le niveau de déblocage pèse ×100 pour
 * qu'un move plus récent remplace toujours un move plus ancien, puis la
 * puissance départage à niveau égal.
 *
 * Les soins doivent compter via `healPower` : avec `power: 0`, ils avaient le
 * score le plus bas de l'arsenal et étaient donc **toujours** le premier move
 * écrasé au level-up — le soin était appris puis perdu à chaque montée.
 *
 * **Le score sert d'abord à classer des moves de même nature** : un move
 * utilitaire (soin / amplification) ne remplace un move d'attaque que si le
 * panneau n'en contient aucun (cf. `isOffensive`).
 */
function moveScore(move: Move): number {
  const effectivePower = move.power + (move.healPower ?? 0);
  return move.level * 100 + effectivePower;
}

/** Un move qui fait des dégâts (par opposition à un soin ou un buff). */
function isOffensive(move: Move): boolean {
  return move.power > 0;
}

// --- Scaling des ennemis sur le joueur (rebalance P0) ---

/**
 * Écarts de niveau tirés pour un sauvage, autour du niveau du joueur.
 * Avant, le niveau venait **uniquement** de la région : un joueur sous-élevé
 * entrait en région 3 et se prenait 4 niveaux d'écart (mur), un joueur
 * sur-élevé massacrait la région 1 sans risque. L'ennemi suit maintenant le
 * joueur, borné par la bande régionale — la région reste le palier de
 * difficulté, mais elle ne peut plus être ni un mur ni un parcours sans
 * aucune résistance.
 *
 * Les écarts sont desormais definis par region (`RegionDef.wildLevelOffsets`) :
 * les premieres regions tirent majoritairement en dessous du niveau du joueur,
 * les dernieres au-dessus.
 */

/** Le boss se cale un niveau au-dessus du joueur, dans la bande de la région. */
const BOSS_LEVEL_OFFSET = 1;

/**
 * Seuil de « haut de panier » de l'IA : un move est retenu s'il vaut au moins
 * `80 %` du meilleur move disponible (et super-efficace s'il en existe un).
 * En dessous, l'ennemi gaspille son tour.
 */
const STRONGEST_MOVE_RATIO = 0.8;

export interface BattleControllerDeps {
  engine: BattleEngine;
  moveProvider: MoveProvider;
  enemyFactory: EnemyFactory;
  /** Dés injectés (initiative, jets) — mêmes que ceux de l'engine (tests déterministes). */
  dice?: Dice;
  /** Source d'aléatoire injectable (tests déterministes). Défaut : Math.random. */
  random?: () => number;
}

export interface PlayTurnOptions {
  attacker: Monster;
  defender: Monster;
  move: Move;
  /** Côté de l'attaquant — sert à déterminer le vainqueur et les reliques joueur. */
  attackerSide: 'player' | 'enemy';
  /** % de dégâts supplémentaires (reliques joueur uniquement). */
  damagePercent?: number;
  /** % de vol de vie (reliques joueur uniquement). */
  lifestealPercent?: number;
  /** Range de critiques élargi (reliques joueur, 2 → 19-20). */
  critRange?: number;
  /** Bonus d'EXP en % (reliques joueur). */
  experiencePercent?: number;
}

export interface PlayTurnResult {
  /** Lignes à ajouter au journal de combat. */
  logs: string[];
  feedback: CombatFeedback;
  /** Move utilisé (pour l'animation : lunge vs saut). */
  move: Move;
  /** Monstre sur lequel afficher le feedback (self-effect → attaquant, sinon défenseur). */
  feedbackTarget: Monster;
  winner: 'player' | 'enemy' | null;
  /** L'attaquant (joueur) a monté de niveau. */
  leveledUp: boolean;
  /** L'attaquant (joueur) a monté de niveau et appris de nouveaux moves. */
  learnedNewMoves: boolean;
  /** Détail de la montée de niveau (gains de stats + capacités apprises), sinon `null`. */
  levelUp: LevelUpSummary | null;
  /** PV volés (relique vol de vie), 0 si aucun. */
  lifesteal: number;
}

/** Entrée d'un round : seuls les jets d'initiative y sont roulés. */
export interface BeginRoundOptions {
  player: Monster;
  enemy: Monster;
  /**
   * Le joueur a-t-il choisi un sort de soin pour ce tour ? Si oui, son tour
   * est résolu **avant** toute attaque, même si l'initiative est adverse.
   */
  playerCastsHeal?: boolean;
  /**
   * L'ennemi dispose-t-il d'un soin utilisable (hors recharge et pas à PV
   * pleins) ? Onde : l'IA choisit son move au moment d'agir, on ne peut donc
   * pas connaître son intention à l'avance — mais son **capacité** à soigner,
   * si. Utilisé via {@link BattleController.hasUsableHeal}, qui ne consomme
   * aucun hasard.
   */
  enemyCanHeal?: boolean;
}

/**
 * Plan d'ordre d'action d'un round.
 *
 * Règle de résolution : **un soin passe toujours avant une attaque.**
 * L'initiative `d20 + mod(Vitesse)` départage tous les autres cas.
 *
 * - un seul camp soigne → il passe en premier ;
 * - les deux camps soignent, ou aucun → l'initiative tranche ;
 * - un camp est neutralisé (gel, paralysie) → l'autre joue en premier.
 *
 * NOTE — le soin passe avant l'initiative même si le soin du round suivant
 * vient d'un gimmick de tank (sélection spontanée, 0.55 PV max) : la règle
 * d'ordre reste interfacée par `enemyCanHeal`/`hasUsableHeal` — les sons de
 * sondes évitent de gaspiller du hasard injecté.
 */
export interface RoundPlan {
  /** Le joueur agit en premier. */
  playerFirst: boolean;
  playerInitiative: number;
  enemyInitiative: number;
  /** Le soin a primé sur l'initiative (informatif, pour le journal). */
  healFirst: boolean;
  /** Log d'initiative (affiché en tête du round dans le journal). */
  logs: string[];
}

export interface VictoryInput {
  player: Monster;
  enemy: Monster;
  run: RunState;
  isBossFight: boolean;
}

export interface VictoryResult {
  run: RunState;
  logs: string[];
}

/**
 * Orchestrateur de combat et de run, **indépendant de Svelte**.
 *
 * Regroupe ce que faisait le store : IA ennemie, exécution d'un tour, spawn des
 * ennemis, progression du run (score, soins, reliques, boss). Toutes ses
 * dépendances (moteur, repository/persistance) sont injectées.
 */
export class BattleController {
  // --- IA ennemie : archétypes (capacités signature) ---

  /**
   * Déduit l'archétype d'un monstre **de son panel** (aucun champ sérialisé) :
   * le panel est l'identité que le joueur peut lire sur l'écran — un
   * Gluttor affichant trois statuts est un statuteur, peu importe comment il
   * a été spawné. Fiable aussi après une restauration de sauvegarde.
   */
  private archetypeOf(moves: Move[]): EnemyArchetype {
    const withStatus = moves.filter(m => m.statusEffect).length;
    const heavyPhysical = moves.filter(m => m.isPhysical && m.power >= 85).length;
    const heals = moves.filter(m => m.isHeal).length;
    const buffs = moves.filter(m => m.statBoosts).length;
    if (withStatus >= 3) return 'statuteur';
    if (heavyPhysical >= 2 && heals + buffs <= 1) return 'brute';
    if (heals >= 1 && buffs >= 1) return 'tank';
    return 'signature';
  }

  private readonly engine: BattleEngine;
  private readonly moveProvider: MoveProvider;
  private readonly enemyFactory: EnemyFactory;
  private readonly dice: Dice;
  private readonly random: () => number;

  constructor(deps: BattleControllerDeps) {
    this.engine = deps.engine;
    this.moveProvider = deps.moveProvider;
    this.enemyFactory = deps.enemyFactory;
    this.dice = deps.dice ?? defaultDice;
    this.random = deps.random ?? Math.random;
  }

  // --- IA ennemie ---

  /**
   * Choisit un move ennemi :
   *  - toujours hors recharge (fallback sur tout si tout est en recharge) ;
   *  - n'utilise pas de soin quand les PV sont pleins ;
   *  - privilégie les moves **super-efficaces** contre la cible (table de types).
   *
   * @param preferHeal force un soin lorsqu'il est utilisable. Réservé à la
   * règle d'ordre « le soin passe avant l'attaque » : si l'ennemi a été placé
   * en premier **parce qu'il pouvait soigner**, il doit effectivement soigner,
   * sinon la règle n'aurait donné que le bonus d'initiative. Hors de ce cas,
   * l'IA reste libre (et choisit en connaissance des dégâts reçus).
   */
  selectEnemyMove(
    moves: Move[],
    actor: Monster,
    target: Monster,
    preferHeal = false,
  ): Move {
    let pool = moves.filter(m => (m.coolDown ?? 0) === 0);
    if (pool.length === 0) {
      // Si tout est en recharge, on prend celui avec le cooldown minimal
      const sorted = [...moves].sort((a, b) => (a.coolDown ?? 0) - (b.coolDown ?? 0));
      return sorted[0] ?? moves[0];
    }

    // Évite de soigner à PV pleins
    const atFullHp = actor.currentHp >= actor.maxHp;
    const usable = pool.filter(m => !(atFullHp && m.isHeal));
    const candidates = usable.length > 0 ? usable : pool;

    // La règle d'ordre impose ici le soin (cf. docblock).
    if (preferHeal) {
      const heals = candidates.filter(m => m.isHeal);
      if (heals.length > 0) return heals[Math.floor(this.random() * heals.length)];
    }

    // --- Gimmicks archétype (capacités signature) ---
    // Déduite du panel COMPLET : la personnalité du monstre ne dépend pas des
    // cooldowns du tour courant.
    const archetype = this.archetypeOf(actor.moves);
    if (archetype === 'statuteur') {
      // Gimmick : injecter un statut tant que la cible n'est pas encore
      // contaminée — le reste du panel (dégâts sous statut) fait le travail
      // des tours suivants.
      if (target.statuses.length === 0) {
        const statuses = candidates.filter(
          m => m.statusEffect && !target.hasStatus(m.statusEffect.type),
        );
        if (statuses.length > 0 && this.random() < 0.6) {
          return statuses[Math.floor(this.random() * statuses.length)];
        }
      }
    }
    if (archetype === 'tank') {
      // Gimmick : le soigneur garde sa réserve de soin pour la troisième
      // passe, pas pour étaler un avantage déjà net.
      const lowHp = actor.currentHp < actor.maxHp * 0.55;
      const heals = candidates.filter(m => m.isHeal);
      if (lowHp && heals.length > 0 && this.random() < 0.85) {
        return heals[Math.floor(this.random() * heals.length)];
      }
    }
    // 'brute' : le tri « tapent fort » ci-dessous EST son gimmick.

    // Préfère les moves qui tapent fort sur la cible (multiplicateur > 1)
    const attacking = candidates.filter(m => m.power > 0);
    const effective = attacking.filter(m => this.engine.typeMultiplier(m.type, target.type, m.isPhysical) > 1);
    const damaging = effective.length > 0 ? effective : attacking;

    // Puis, à pouvoir égal, le **meilleur** du lot. Tirer uniformément parmi
    // tous les moves sudois faire dépenser un ennemi de puissance 125 à
    // « attaquer » avec un move de 35 : le tour était perdu et le combat
    // s'étirait en 13 rounds au lieu de 6. On garde un tirage aléatoire
    // dans le haut de panier pour ne pas rendre l'IA parfaitement déterministe.
    const ranked = damaging.length > 0 ? damaging : candidates;
    const bestPower = Math.max(...ranked.map(m => m.power));
    const strongest = ranked.filter(m => m.power >= bestPower * STRONGEST_MOVE_RATIO);

    return strongest[Math.floor(this.random() * strongest.length)];
  }

  /**
   * Le monstre dispose-t-il d'un soin **utilisable maintenant** ?
   *
   * Sonde **sans consommer de hasard** : l'appelant peut donc l'interroger
   * avant que l'IA ne choisisse son move, et l'IA continue de choisir en
   * connaissance de cause (après avoir subi les dégâts) — c'est ce choix
   * qui est conservé, seul l'ordre de résolution change.
   *
   * Un soin en recharge, ou inutile à PV pleins, ne compte pas.
   */
  hasUsableHeal(actor: Monster): boolean {
    if (actor.currentHp >= actor.maxHp) return false;
    return actor.moves.some(m => m.isHeal && (m.coolDown ?? 0) === 0);
  }

  // --- Tour & round de combat ---

  /**
   * Résout **l'ordre d'action** d'un round.
   *
   * Priorité de résolution :
   *  1. **le soin passe avant toute attaque** (règle du jeu) ;
   *  2. sinon l'initiative `1d20 + mod(Vitesse)` (règle D&D, −4 si
   *     paralysie) départage.
   *
   * L'état de gel/paralysie n'est **pas** évalué ici : le jet de sauvegarde
   * de `checkCanAct` consomme des dés et mute les statuts, il appartient donc
   * au tour lui-même (`playTurn`). Un camp neutralisé perd simplement son tour
   * quand il vient, et l'autre enchaîne — comportement antérieur conservé.
   *
   * Les tours sont ensuite exécutés un à un dans cet ordre via `playTurn` —
   * le second n'a lieu que si la cible du premier est toujours debout
   * (riposte annulée en cas de K.O.).
   */
  beginRound(opts: BeginRoundOptions): RoundPlan {
    const { player, enemy, playerCastsHeal = false, enemyCanHeal = false } = opts;

    const playerPara = player.hasStatus('paralysis') ? -4 : 0;
    const enemyPara = enemy.hasStatus('paralysis') ? -4 : 0;
    const playerInitiative = this.dice.roll(1, 20) + abilityModifier(player.speed) + playerPara;
    const enemyInitiative = this.dice.roll(1, 20) + abilityModifier(enemy.speed) + enemyPara;
    const byInitiative = playerInitiative >= enemyInitiative;
    const playerTag = playerPara ? ' (⚡ -4)' : '';
    const enemyTag = enemyPara ? ' (⚡ -4)' : '';

    let playerFirst: boolean;
    let healFirst = false;
    if (playerCastsHeal !== enemyCanHeal) {
      // Exactement un des deux camps soigne : le soin passe en premier.
      playerFirst = playerCastsHeal;
      healFirst = true;
    } else {
      // Les deux soignent, ou aucun : l'initiative tranche.
      playerFirst = byInitiative;
    }

    const leader = playerFirst ? player.name : enemy.name;
    const initiativeLeader = byInitiative ? player.name : enemy.name;
    const logs = [
      `⚡ ${player.name} ${playerInitiative}${playerTag} vs ${enemy.name} ${enemyInitiative}${enemyTag} → ${initiativeLeader} en tête à l'initiative.`,
    ];
    if (healFirst) {
      logs.push(`💚 Un soin passe avant l'attaque : ${leader} soigne en premier, malgré l'initiative.`);
    }
    logs.push(`➜ ${leader} agit en premier.`);

    return { playerFirst, playerInitiative, enemyInitiative, healFirst, logs };
  }

  /**
   * Exécute le tour d'un attaquant et renvoie le résultat observable
   * (logs, feedback, vainqueur, moves appris, vol de vie). Ne gère ni timers
   * ni animations : c'est la responsabilité du store.
   */
  playTurn(opts: PlayTurnOptions): PlayTurnResult {
    const { attacker, defender, move, attackerSide } = opts;

    // 1. Vérification des altérations de statut empêchant l'action (Gel, Paralysie)
    const actCheck = this.engine.checkCanAct(attacker);
    const preLogs = actCheck.logs.map(log => log.message);

    if (!actCheck.canAct) {
      // Cooldowns décrémentés même en cas de tour sauté
      this.engine.manageCooldowns(attacker, move);

      // Traitement des statuts de fin de tour sur l'attaquant (Brûlure, Poison)
      const endStatus = this.engine.processEndOfTurnStatus(attacker);
      const allLogs = [...preLogs, ...endStatus.logs.map(log => log.message)];

      let winner: PlayTurnResult['winner'] = null;
      if (attacker.isFainted()) {
        winner = attackerSide === 'player' ? 'enemy' : 'player';
        allLogs.push(winner === 'player' ? 'Victoire !' : 'Défaite...');
      }

      return {
        logs: allLogs,
        feedback: { kind: 'miss', damage: 0, isCrit: false },
        move,
        feedbackTarget: attacker,
        winner,
        leveledUp: false,
        learnedNewMoves: false,
        levelUp: null,
        lifesteal: 0,
      };
    }

    const hasModifiers = (opts.damagePercent ?? 0) > 0
      || (opts.critRange ?? 1) > 1
      || (opts.experiencePercent ?? 0) > 0;
    const engineModifiers: BattleModifiers | undefined = hasModifiers
      ? {
          damagePercent: opts.damagePercent,
          critRange: opts.critRange,
          experiencePercent: opts.experiencePercent,
        }
      : undefined;
    const turn = this.engine.executeTurn(attacker, defender, move, engineModifiers);
    const logs = [...preLogs, ...turn.logs.map(log => log.message)];

    // Traitement des statuts de fin de tour sur l'attaquant
    const endStatus = this.engine.processEndOfTurnStatus(attacker);
    endStatus.logs.forEach(log => logs.push(log.message));

    let winner: PlayTurnResult['winner'] = null;
    if (defender.isFainted()) {
      winner = attackerSide === 'player' ? 'player' : 'enemy';
      logs.push(winner === 'player' ? 'Victoire !' : 'Défaite...');
    } else if (attacker.isFainted()) {
      winner = attackerSide === 'player' ? 'enemy' : 'player';
      logs.push(winner === 'player' ? 'Victoire !' : 'Défaite...');
    }

    // Level-up → le joueur (seul) apprend de nouveaux moves (capé à 4 moves max).
    const leveledUp = turn.logs.some(log => log.payload?.leveledUp);
    let learnedNewMoves = false;
    const learnedMoves: string[] = [];
    if (leveledUp && attackerSide === 'player') {
      const eligible = this.moveProvider.getMovesForMonster(attacker);
      const existingIds = new Set(attacker.moves.map(m => m.id));
      const newlyUnlocked = eligible.filter(m => !existingIds.has(m.id));

      if (newlyUnlocked.length > 0) {
        for (const newMove of newlyUnlocked) {
          if (attacker.moves.length < MAX_MOVES) {
            attacker.learnMove(newMove);
            learnedMoves.push(newMove.name);
            logs.push(`✨ ${attacker.name} a appris « ${newMove.name} » !`);
            learnedNewMoves = true;
          } else {
            // Panneau plein : le move nouveau remplace le plus faible **de sa
            // propre nature**. Un soin n'écrase jamais une attaque, et
            // réciproquement : sinon le panneau se remplissait de deux soins et
            // deux attaques faibles entre les niveaux 5 et 9 (les deux plus
            // fortes attaques disponibles n'y dépassaient pas le score d'un
            // soin), et les combats s'étiraient sur 20 rounds.
            const wantOffensive = isOffensive(newMove);
            const candidates = attacker.moves
              .map((move, index) => ({ move, index }))
              .filter(entry => isOffensive(entry.move) === wantOffensive);

            if (candidates.length === 0) continue;

            let lowest = candidates[0]!;
            for (const entry of candidates) {
              if (moveScore(entry.move) < moveScore(lowest.move)) lowest = entry;
            }
            if (moveScore(newMove) > moveScore(lowest.move)) {
              const { replacedMove, success } = attacker.learnMove(newMove, lowest.index);
              if (success && replacedMove) {
                learnedMoves.push(newMove.name);
                logs.push(`✨ ${attacker.name} a appris « ${newMove.name} » en remplacement de « ${replacedMove.name} » !`);
                learnedNewMoves = true;
              }
            }
          }
        }
      }
    }

    // Vol de vie (relique) : restitue un % des dégâts infligés par le joueur.
    let lifesteal = 0;
    if (attackerSide === 'player' && opts.lifestealPercent && turn.feedback.kind === 'damage') {
      lifesteal = Math.max(1, Math.floor(turn.feedback.damage * opts.lifestealPercent / 100));
      attacker.heal(lifesteal);
      logs.push(`💫 ${attacker.name} vole ${lifesteal} PV !`);
    }

    // Les effets sur soi-même (soin/buff) s'affichent sur l'attaquant,
    // les dégâts/ratés/fumbles sur le défenseur (celui qui est frappé).
    const isSelfEffect = move.power === 0;
    const feedbackTarget = isSelfEffect ? attacker : defender;

    const levelUpPayload = turn.logs.find(log => log.payload?.levelUp)?.payload?.levelUp;
    const levelUp: LevelUpSummary | null = levelUpPayload
      ? { ...levelUpPayload, learnedMoves }
      : null;

    return { logs, feedback: turn.feedback, move, feedbackTarget, winner, leveledUp, learnedNewMoves, levelUp, lifesteal };
  }

  /** Retourne toutes les capacités actuellement débloquées pour ce monstre (selon type & niveau). */
  public getAvailableMovesForMonster(monster: Monster): Move[] {
    return this.moveProvider.getMovesForMonster(monster);
  }

  // --- Spawn & progression de run ---

  /** Prépare un combat : reset des cooldowns & statuts + soin de début
   * (reliques **portées** + équipement **porté** — tout ce qui traîne en
   * réserve ou en sacoche est inerte). */
  private prepareCombat(player: Monster): void {
    player.resetCooldowns();
    player.clearStatuses();
    // Une charge armée ne survit pas d'un combat à l'autre.
    player.clearCharge();
    const healPercent =
      player.relicHealStartPercent() + player.equipmentHealStartPercent();
    if (healPercent > 0 && player.currentHp < player.maxHp) {
      player.heal(Math.floor(player.maxHp * healPercent / 100));
    }
  }

  /**
   * Niveau d'un sauvage : niveau du joueur + écart tiré dans
   * `RegionDef.wildLevelOffsets`, borné par la bande `[minLevel, maxLevel]` de la
   * région. Un joueur dans les clous de la région croise des adversaires de son
   * niveau ; un joueur sous-élevé n'est plus facing-checké, un joueur sur-élevé
   * ne rencontre plus des proies.
   */
  private wildLevelFor(player: Monster, region: RegionDef): number {
    const offsets = region.wildLevelOffsets;
    const offset = offsets[Math.floor(this.random() * offsets.length)] ?? 0;
    return Math.min(region.maxLevel, Math.max(region.minLevel, player.level + offset));
  }

  /**
   * Niveau du boss : un cran au-dessus du joueur, borné comme les sauvages.
   * Le plafond `maxLevel + 1` est inchangé, donc un joueur dans les clous
   * affronte **exactement** le même boss qu'avant ; un joueur sous-élevé (ou
   * qui grimpe vite) voit le boss s'adapter au lieu d'être un mur.
   */
  private bossLevelFor(player: Monster, region: RegionDef): number {
    return Math.min(
      region.maxLevel + 1,
      Math.max(region.minLevel + 1, player.level + BOSS_LEVEL_OFFSET),
    );
  }

  /** Lance un combat sauvage (niveau & type tirés dans la région ; `opts.type` force le type — nœud de la carte). */
  enterWildCombat(
    player: Monster,
    run: RunState,
    opts: { type?: MonsterType } = {}
  ): { enemyMonster: Monster; logs: string[] } {
    this.prepareCombat(player);
    const region = REGIONS[run.regionIndex];
    const level = this.wildLevelFor(player, region);
    const type = opts.type ?? region.types[Math.floor(this.random() * region.types.length)];
    const enemy = this.enemyFactory.createRandomEnemy(level, { type, statScale: region.threat });
    return { enemyMonster: enemy, logs: [`Un ${enemy.name} sauvage (niv. ${enemy.level}) apparaît !`] };
  }

  /** Lance le combat contre le boss de région. */
  enterBossCombat(player: Monster, run: RunState): { enemyMonster: Monster; logs: string[] } {
    this.prepareCombat(player);
    const region = REGIONS[run.regionIndex];
    const bossLevel = this.bossLevelFor(player, region);
    const enemy = this.enemyFactory.createBoss(
      bossLevel,
      region.bossType,
      region.bossName,
      region.threat,
    );
    return { enemyMonster: enemy, logs: [`👑 BOSS ! ${enemy.name} (niv. ${enemy.level}) bloque la route !`] };
  }

  /** Ajoute un objet consommable à la sacoche du joueur. */
  addConsumableToInventory(
    run: RunState,
    item: ConsumableItem,
    quantity = 1,
    origin: ItemOrigin = 'shop',
  ): RunState {
    const inventory = [...(run.inventory ?? [])];
    const existingIndex = inventory.findIndex(slot => slot.item.id === item.id);
    if (existingIndex !== -1) {
      inventory[existingIndex] = {
        ...inventory[existingIndex],
        quantity: inventory[existingIndex].quantity + quantity,
        // Le butin de boss l'emporte sur l'origine boutique du même objet.
        origin: inventory[existingIndex].origin === 'boss' ? 'boss' : origin,
      };
    } else {
      inventory.push({ item, quantity, origin });
    }
    return { ...run, inventory };
  }

  /**
   * Utilise un objet consommable depuis la sacoche (en combat ou hors combat).
   * Applique instantanément la purge de statut, soin, remise à zéro des recharges ou buff.
   */
  useConsumable(
    player: Monster,
    run: RunState,
    itemId: string
  ): { run: RunState; logs: string[]; feedback: CombatFeedback } | null {
    const inventory = [...(run.inventory ?? [])];
    const slotIndex = inventory.findIndex(slot => slot.item.id === itemId);
    if (slotIndex === -1 || inventory[slotIndex].quantity <= 0) return null;

    const item = inventory[slotIndex].item;
    const logs: string[] = [];
    let feedback: CombatFeedback = { kind: 'none', damage: 0, isCrit: false };

    // 1. Purge de statut (anti-statut ou panacée)
    if (item.cureStatus === 'all') {
      const count = player.statuses.length;
      player.clearStatuses();
      logs.push(`✨ ${player.name} boit ${item.name} et purifie tous ses effets de statut ! (${count} dissipé${count > 1 ? 's' : ''})`);
      feedback = { kind: 'buff', damage: 0, isCrit: false };
    } else if (item.cureStatus) {
      const cfg = STATUS_CONFIGS[item.cureStatus];
      const had = player.hasStatus(item.cureStatus);
      player.removeStatus(item.cureStatus);
      if (had) {
        logs.push(`✨ ${player.name} applique ${item.name} : l'effet ${cfg.name} est complètement dissipé !`);
      } else {
        logs.push(`✨ ${player.name} applique ${item.name} en prévention.`);
      }
      feedback = { kind: 'buff', damage: 0, isCrit: false };
    }

    // 2. Soin partiel ou fixe
    if (item.healPercent) {
      const healAmt = Math.max(1, Math.floor(player.maxHp * (item.healPercent / 100)));
      const restored = player.heal(healAmt);
      logs.push(`🧪 ${player.name} récupère +${restored} PV (${item.name}).`);
      feedback = { kind: 'heal', damage: restored, isCrit: false };
    } else if (item.healFlat) {
      const restored = player.heal(item.healFlat);
      logs.push(`🧪 ${player.name} récupère +${restored} PV (${item.name}).`);
      feedback = { kind: 'heal', damage: restored, isCrit: false };
    }

    // 3. Réinitialisation des cooldowns
    if (item.resetCooldowns) {
      player.resetCooldowns();
      logs.push(`⚡ ${player.name} absorbe ${item.name} : tous les temps de recharge sont remis à zéro !`);
      feedback = { kind: 'buff', damage: 0, isCrit: false };
    }

    // 4. Boost de stat
    if (item.statBoost) {
      player.boostStat(item.statBoost.stat, item.statBoost.value);
      logs.push(`🥊 ${player.name} ressent une poussée d'énergie : +${item.statBoost.value} ${item.statBoost.stat} !`);
      feedback = { kind: 'buff', damage: item.statBoost.value, isCrit: false };
    }

    // 5. Bonus d'armure temporaire
    if (item.acBonus) {
      player.armorBonus += item.acBonus;
      logs.push(`🛡️ ${player.name} renforce sa posture : +${item.acBonus} CA !`);
      feedback = { kind: 'buff', damage: item.acBonus, isCrit: false };
    }

    // Décrémentation de la quantité dans l'inventaire
    if (inventory[slotIndex].quantity > 1) {
      inventory[slotIndex] = {
        ...inventory[slotIndex],
        quantity: inventory[slotIndex].quantity - 1,
      };
    } else {
      inventory.splice(slotIndex, 1);
    }

    const nextRun = { ...run, inventory };
    return { run: nextRun, logs, feedback };
  }

  /**
   * (Obsolète) Figeait dans le monstre les objets à effet **durable** de
   * l'inventaire. Replacé par l'équipement : les objets à effet durable sont
   * désormais des **pièces d'équipement** portées via `equipFromBag`, et le
   * butin de boss tombe directement en pièces (cf. `handlePlayerVictory`).
   * Utilisé à la fin d'une région pour la fiche du champion : les bonus de CA
   * et de caractéristiques deviennent des traits permanents du monstre
   * enregistré. **Seuls les objets laissés par le boss** (`origin === 'boss'`)
   * sont concernés : ce sont les seuls à persister d'une partie à l'autre.
   * L'inventaire du run n'est **pas** touché — le monstre fusionné est une
   * copie, ce qui évite de cumuler deux fois le même objet (une fois dans la
   * fiche du champion, une fois si l'objet est utilisé ensuite).
   *
   * Les potions de soin, d'énergie et anti-statut n'ont pas d'effet durable :
   * elles sont ignorées et restent dans l'inventaire.
   *
   * @returns un nouveau monstre, ou le même si rien n'est à fusionner.
   */
  fuseDurableItemsIntoMonster(monster: Monster, run: RunState): Monster {
    const slots = run.inventory ?? [];
    // Seuls les lots laissés par le boss survivent d'une partie à l'autre.
    const durable = slots.filter(
      slot => (slot.origin ?? 'shop') === 'boss' && (slot.item.statBoost || slot.item.acBonus),
    );
    if (durable.length === 0) return monster;

    // Copie indépendante : le monstre du run n'est pas modifié.
    const fused = MonsterIO.fromSnapshot(MonsterIO.toSnapshot(monster));

    for (const slot of durable) {
      const times = Math.max(0, slot.quantity);
      for (let i = 0; i < times; i++) {
        if (slot.item.statBoost) {
          fused.boostStat(slot.item.statBoost.stat, slot.item.statBoost.value);
        }
        if (slot.item.acBonus) {
          fused.armorBonus += slot.item.acBonus;
        }
      }
    }
    return fused;
  }

  /**
   * Ids de tous les équipements déjà détenus — sacoche **et** pièces portées.
   * Alimente l'anti-doublon des tirages (drop garanti, butin de boss, offre
   * mixte, rayon Forge) : un même id ne peut jamais apparaître deux fois.
   */
  private _ownedEquipmentIds(player: Monster, run: RunState): string[] {
    return [
      ...(run.equipmentBag ?? []).map(piece => piece.id),
      ...player.getEquippedList().map(piece => piece.id),
    ];
  }

  /**
   * La relique est-elle déjà possédée par ce run ? **Anti-doublon** : une
   * même relique ne peut être possédée qu'une fois (les offres post-combat
   * et la boutique tirent dans le poly COMPLET, donc une relique déjà en
   * portée peut reparvenir — elle est filtrée là, et gardé de défense ici).
   */
  ownsRelic(run: RunState, relicId: string): boolean {
    return (run.relics ?? []).some(r => r.id === relicId);
  }

  /**
   * Ajoute la relique à la **réserve** du run (score + possession) ; enchaîne
   * hors phase relic. Aucun effet immédiat : la relique n'agit qu'une fois
   * **portée** depuis la fenêtre « Équipement » (réglage DQ, 2026-10).
   */
  grantRelic(run: RunState, relic: Relic): RunState {
    return {
      ...run,
      relics: [...run.relics, relic],
      score: run.score + RELIC_SCORE_BONUS,
      phase: run.phase === 'relic' ? 'encounter' : run.phase,
      relicOffers: null,
    };
  }

  /**
   * Reforge le champion dans un **nouvel élément** — adoption en fin de région,
   * après qu'un boss a révélé un type. Les statistiques, l'expérience, les PV
   * courants, l'armure, les statuts et l'**équipement** sont conservés ; le
   * **panel** est reconstruit depuis le catalogue du nouveau type (les 4
   * capacités éligibles les mieux notées, barème `moveScore` du level-up).
   * Un même type renvoie le monstre inchangé.
   *
   * La reforge passe par un snapshot (`MonsterIO`) — exactement le chemin de
   * sérialisation d'une sauvegarde : rien n'est perdu, et l'équipement reste
   * des données (ses effets sont déjà inclus dans les stats copiées, donc
   * jamais comptés deux fois).
   */
  retypeChampion(player: Monster, newType: MonsterType): Monster {
    if (player.type === newType) return player;
    const snapshot = MonsterIO.toSnapshot(player);
    snapshot.type = newType;
    const eligible = this.moveProvider.getMovesForMonster({ type: newType, level: player.level });
    const picks = [...eligible]
      .sort((a, b) => moveScore(b) - moveScore(a))
      .slice(0, MAX_MOVES)
      .map((move) => ({ ...move, coolDown: 0 }));
    if (picks.length > 0) snapshot.moves = picks;
    return MonsterIO.fromSnapshot(snapshot);
  }

  // --- Sacoche d'équipements & portage (capacités signature) ---

  /**
   * Ajoute une pièce à la sacoche du run (inactive tant qu'elle n'est pas
   * portée). **Idempotent** : une pièce déjà présente (même id) n'est pas
   * ajoutée une seconde fois — garde d'unicité de dernier recours, en plus des
   * exclusions de tirage, contre le crash `each_key_duplicate` à l'affichage.
   */
  addEquipmentToBag(run: RunState, piece: Equipment): RunState {
    const bag = run.equipmentBag ?? [];
    if (bag.some(p => p.id === piece.id)) return run;
    return { ...run, equipmentBag: [...bag, piece] };
  }

  /**
   * Porte une pièce de la sacoche sur le monstre (remplace celle de
   * l'emplacement, qui retourne dans la sacoche). Hors combat uniquement —
   * l'appelant est responsable de la vérification de phase (UI bloquée).
   */
  equipFromBag(
    monster: Monster,
    run: RunState,
    equipmentId: string,
  ): { run: RunState; displaced: Equipment | null; logs: string[]; blocked: boolean } | null {
    const bag = [...(run.equipmentBag ?? [])];
    const index = bag.findIndex(p => p.id === equipmentId);
    if (index === -1) return null;
    const piece = bag.splice(index, 1)[0]!;

    // Règle Dragon Quest des armes à deux mains : le bouclier attend que
    // l'arme soit retirée. Le portage est refusé, la sacoche est intacte.
    if (!monster.canEquip(piece)) {
      return {
        run,
        displaced: null,
        blocked: true,
        logs: [
          `⛔ ${piece.name} impossible : ${monster.equipped.weapon?.name ?? "l'arme tenue"} se manie à deux mains.`,
        ],
      };
    }

    // Porter une arme à deux mains **chasse le bouclier** (il retourne en
    // sacoche), comme dans DQ où les deux mains sont prises.
    const evicted = monster
      .conflictingSlots(piece)
      .map(slot => monster.unequip(slot))
      .filter((p): p is Equipment => !!p);
    const displaced = monster.equip(piece);
    if (displaced) bag.push(displaced);
    for (const piece2 of evicted) bag.push(piece2);

    const notes = [
      displaced ? `${displaced.name} retiré(e)` : '',
      evicted.length > 0
        ? `${evicted.map(p => p.name).join(', ')} lâché(e) (deux mains)`
        : '',
    ].filter(Boolean);

    return {
      run: { ...run, equipmentBag: bag },
      displaced,
      blocked: false,
      logs: [`${piece.icon} ${piece.name} équipé(e)${notes.length ? ` — ${notes.join(' · ')}` : ''}.`],
    };
  }

  /**
   * « Meilleur équipement » (最強装備 de RPG Maker) : habille le monstre de la
   * meilleure pièce possédée dans chaque emplacement (`bestLoadout`) **et** des
   * `RELIC_SLOT_COUNT` meilleures reliques de la réserve (`relicScore`).
   *
   * Une pièce déjà portée peut gagner : à score égal, `bestLoadout` garde la
   * première — le portage ne tourne donc jamais pour rien. Les pièces délogées
   * retournent en sacoche, les reliques écartées dans la réserve : rien n'est
   * jamais perdu. Hors combat uniquement (même verrou que le portage manuel).
   */
  optimizeEquipment(
    monster: Monster,
    run: RunState,
  ): { run: RunState; logs: string[] } {
    const logs: string[] = [];

    // 1. Reliques : les meilleures d'abord, on libère les emplacements avant.
    const ranked = [...(run.relics ?? [])]
      .sort((a, b) => relicScore(b) - relicScore(a))
      .slice(0, RELIC_SLOT_COUNT);
    let relicsChanged = 0;
    for (const worn of monster.getWornRelics()) {
      if (!ranked.some(relic => relic.id === worn.id)) {
        monster.takeOffRelic(worn.id);
        relicsChanged++;
      }
    }
    for (const relic of ranked) {
      if (monster.wearRelic(relic)) relicsChanged++;
    }

    // 2. Équipement, emplacement par emplacement (arme en premier : la règle
    //    des deux mains chasse le bouclier avant que son tour vienne).
    const chosen = bestLoadout(
      [...(run.equipmentBag ?? []), ...monster.getEquippedList()],
      monster.equipped,
    );
    let next = run;
    let piecesChanged = 0;
    for (const slot of EQUIPMENT_SLOTS) {
      const piece = chosen[slot];
      if (!piece || monster.equipped[slot]?.id === piece.id) continue;
      const result = this.equipFromBag(monster, next, piece.id);
      if (!result) continue;
      next = result.run;
      logs.push(...result.logs);
      if (!result.blocked) piecesChanged++;
    }

    logs.unshift(
      `⚙️ Meilleur équipement : ${piecesChanged} pièce(s) et ${relicsChanged} relique(s) ajustées.`,
    );
    return { run: next, logs };
  }

  /**
   * Porte une relique de la **réserve** du run (elles ne s'appliquent plus à la
   * prise, réglage DQ) — `RELIC_SLOT_COUNT` emplacements, comme des
   * accessoires. Refusé (null) si la relique n'est pas possédée, déjà portée,
   * ou si les emplacements sont pris : c'est un choix, on retire avant.
   */
  wearRelic(
    monster: Monster,
    run: RunState,
    relicId: string,
  ): { logs: string[] } | null {
    const relic = (run.relics ?? []).find(candidate => candidate.id === relicId);
    if (!relic || !monster.wearRelic(relic)) return null;
    return {
      logs: [
        `🔱 ${relic.icon} ${relic.name} portée (${monster.wornRelics.length}/${RELIC_SLOT_COUNT}) : ${relic.description}`,
      ],
    };
  }

  /** Retire une relique portée : elle retourne dans la réserve, intacte. */
  takeOffRelic(
    monster: Monster,
    run: RunState,
    relicId: string,
  ): { run: RunState; logs: string[] } | null {
    const relic = monster.takeOffRelic(relicId);
    if (!relic) return null;
    return {
      run,
      logs: [
        `🔱 ${relic.icon} ${relic.name} retirée — conservée dans la réserve (${monster.wornRelics.length}/${RELIC_SLOT_COUNT}).`,
      ],
    };
  }

  /** Retire une pièce portée et la remet dans la sacoche. */
  unequipToBag(
    monster: Monster,
    run: RunState,
    slot: EquipmentSlot,
  ): { run: RunState; logs: string[] } | null {
    const piece = monster.unequip(slot);
    if (!piece) return null;
    return {
      run: this.addEquipmentToBag(run, piece),
      logs: [`${piece.name} remis(e) dans la sacoche.`],
    };
  }

  // --- Boutique : rachat des possessions ---

  /**
   * **Rachat** d'un article par la boutique (75 % du prix catalogue, cf.
   * `sellPrice`) : **une unité** de potion par appel, ou une pièce de la
   * **sacoche d'équipement**. Les reliques ne se vendent pas (pouvoir arraché
   * aux monstres, et l'anti-doublon repose sur leur possession).
   *
   * L'équipement **porté** est **refusé** : on ne vend pas ce qu'on tient — le
   * joueur le retire d'abord (fenêtre « Équipement », ouverte en boutique).
   *
   * @returns `null` si l'article n'est pas possédé ; sinon le run recrédité, ou
   *          un refus journalisé (`refused: true`, run **et** or intacts).
   */
  sellItem(
    monster: Monster,
    run: RunState,
    input: { kind: 'consumable' | 'equipment'; id: string },
  ): { run: RunState; logs: string[]; refused: boolean } | null {
    if (input.kind === 'consumable') {
      const inventory = [...(run.inventory ?? [])];
      const index = inventory.findIndex(slot => slot.item.id === input.id);
      if (index === -1) return null;
      const slot = inventory[index]!;
      if (slot.quantity <= 0) return null;

      const price = sellPrice(slot.item.price);
      const quantity = slot.quantity - 1;
      if (quantity > 0) inventory[index] = { ...slot, quantity };
      else inventory.splice(index, 1);

      return {
        run: { ...run, inventory, gold: run.gold + price },
        refused: false,
        logs: [`💰 Vendu : ${slot.item.icon} ${slot.item.name} (+${price} or).`],
      };
    }

    const bag = [...(run.equipmentBag ?? [])];
    const index = bag.findIndex(piece => piece.id === input.id);
    if (index === -1) {
      // Peut-être PORTÉE : on le dit explicitement plutôt que de laisser croire
      // à une vente silencieuse.
      const worn = monster.getEquippedList().find(piece => piece.id === input.id);
      if (!worn) return null;
      return {
        run,
        refused: true,
        logs: [
          `⛔ ${worn.icon} ${worn.name} est porté(e) : retirez-la d'abord pour la vendre.`,
        ],
      };
    }

    const piece = bag.splice(index, 1)[0]!;
    const price = sellPrice(piece.price);
    return {
      run: { ...run, equipmentBag: bag, gold: run.gold + price },
      refused: false,
      logs: [`💰 Vendu(e) : ${piece.icon} ${piece.name} (+${price} or).`],
    };
  }

  /** Tire `count` objets distincts du catalogue (butin de boss). */
  private _rollBossLoot(count: number): ConsumableItem[] {
    const pool = [...CONSUMABLE_CATALOG];
    const loot: ConsumableItem[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const index = Math.floor(this.random() * pool.length);
      loot.push(...pool.splice(index, 1));
    }
    return loot;
  }

  /** Récompenses de victoire : score, or, soins, phase suivante (relique / région / victoire). */
  handlePlayerVictory(input: VictoryInput): VictoryResult {
    const { player, enemy, run: currentRun, isBossFight } = input;
    let run: RunState = { ...currentRun };
    const region = REGIONS[run.regionIndex];
    const logs: string[] = [];

    run.score += enemy.level * WILD_SCORE_MULTIPLIER;

    if (isBossFight) {
      run.score += BOSS_SCORE_BONUS;
      run.gold += BOSS_GOLD;
      player.currentHp = player.maxHp; // Full heal after a boss
      logs.push(`💰 +${BOSS_GOLD} or (boss).`);
      logs.push(`⚔️ ${region.name} conquise !`);

      // Butin du boss (réglage 2026-10, choix joueur) : **2 pièces
      // garanties** tombent directement dans la sacoche (inactive tant que
      // non portée) + un consommable courant. L'offre mixte ci-dessous
      // offre une 3ᵉ pièce au choix. Anti-doublon : chaque tirage exclut les
      // pièces déjà possédées (sacoche + portées).
      const bossTaken: string[] = this._ownedEquipmentIds(player, run);
      for (let i = 0; i < 2; i++) {
        const piece = rollEquipmentDrop(run.regionIndex, this.random, bossTaken, enemy.level);
        bossTaken.push(piece.id);
        run = this.addEquipmentToBag(run, piece);
        logs.push(`🎁 Le boss laisse ${piece.icon} ${piece.name} !`);
      }
      const loot = this._rollBossLoot(BOSS_LOOT_COUNT);
      for (const item of loot) {
        run = this.addConsumableToInventory(run, item, 1, 'boss');
        logs.push(`🎁 Le boss laisse ${item.icon} ${item.name}.`);
      }

      if (run.regionIndex >= REGIONS.length - 1) {
        run.phase = 'victory';
        logs.push('★ Vous êtes le Champion ! ★');
      } else {
        run.phase = 'relic';
        // Offres mixtes : 2 reliques rares (anti-doublon, le possédé exclu)
        // + 1 pièce d'équipement au choix. Les reliques sont **le pouvoir du
        // boss vaincu** (rethémées à son nom).
        run.relicOffers = rollRareMonsterPowerOffers(
          { name: enemy.name, type: enemy.type },
          2,
          this.random,
          run.relics.map(r => r.id),
        );
        run.equipOffers = [rollEquipmentDrop(run.regionIndex, this.random, bossTaken, enemy.level)];
        logs.push(`🎁 Pouvoir de ${enemy.name} : une relique ou une pièce au choix !`);
      }
      return { run, logs };
    }

    // Wild win: partial heal + or + relic offer
    const heal = Math.floor(player.maxHp * WILD_WIN_HEAL_PCT / 100);
    player.heal(heal);

    const goldReward = WILD_GOLD_BASE + enemy.level;
    run.gold += goldReward;
    run.phase = 'relic';
    // Offres mixtes (réglage 2026-10, choix joueur) : 2 reliques + 1 pièce
    // d'équipement à choisir. Anti-doublon : le possédé est exclu.
    const taken: string[] = this._ownedEquipmentIds(player, run);
    // Les offres de reliques sont **le pouvoir du monstre vaincu** : elles
    // gardent leurs effets (catalogue inchangé) mais sont rethémées à son nom.
    run.relicOffers = rollMonsterPowerOffers(
      { name: enemy.name, type: enemy.type },
      2,
      this.random,
      run.relics.map(r => r.id),
    );
    logs.push(`🧪 ${player.name} récupère ${heal} PV.`);
    logs.push(`💰 +${goldReward} or.`);
    logs.push(`✨ ${enemy.name} vaincu : son pouvoir est à vous.`);

    // Drop GARANTI d'équipement : une pièce à la fin de chaque combat
    // (réglage 2026-10, choix joueur). Elle rejoint la sacoche — inactive
    // tant que non portée. La QUALITÉ suit le budget de la région ET le
    // niveau de l'ennemi vaincu : un ennemi haut niveau élargit le poly vers
    // les pièces chères et amplifie leurs effets (jusqu'à ×2).
    {
      const dropped = rollEquipmentDrop(run.regionIndex, this.random, taken, enemy.level);
      taken.push(dropped.id);
      run = this.addEquipmentToBag(run, dropped);
      logs.push(`🎁 Le sauvage égoutte ${dropped.icon} ${dropped.name} !`);
    }

    // La pièce offerte s'ajoute APRÈS le drop en sacoche : le bucket `taken`
    // inclut le garanti, offrant et garanti ne peuvent jamais se doubler.
    run.equipOffers = [rollEquipmentDrop(run.regionIndex, this.random, taken, enemy.level)];

    return { run, logs };
  }
}