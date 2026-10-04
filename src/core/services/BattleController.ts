import type { Monster } from '../entities/Monster';
import { abilityModifier, MAX_MOVES, MonsterIO } from '../entities/Monster';
import type { RunState } from '../entities/BattleState';
import type { Move, MonsterType } from '../entities/Move';
import { STATUS_CONFIGS } from '../entities/StatusEffect';
import type { ConsumableItem, ItemOrigin } from '../entities/Consumable';
import { CONSUMABLE_CATALOG } from '../entities/Consumable';
import { REGIONS, type RegionDef } from '../entities/Region';
import {
  rollRelicOffers,
  rollRareRelicOffers,
  relicHealStartPercent,
  type Relic,
} from '../entities/Relic';
import { BattleEngine, defaultDice, type BattleModifiers, type CombatFeedback, type Dice } from './BattleEngine';
import type { EnemyFactory, MoveProvider } from './ports';

// Réglages roguelike (orchestration, pas d'UI)
const WILD_WIN_HEAL_PCT = 30; // % de PV max soignés après un combat sauvage
const WILD_SCORE_MULTIPLIER = 15;
const BOSS_SCORE_BONUS = 150;
const RELIC_SCORE_BONUS = 15;
const WILD_GOLD_BASE = 8; // or gagné par combat sauvage : base + niveau ennemi
/** Nombre d'objets laissés par le boss à sa défaite (seuls persistants). */
const BOSS_LOOT_COUNT = 2;
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
 */
function moveScore(move: Move): number {
  const effectivePower = move.power + (move.healPower ?? 0);
  return move.level * 100 + effectivePower;
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
 */
const WILD_LEVEL_OFFSETS: readonly number[] = [-1, 0, 1];

/** Le boss se cale un niveau au-dessus du joueur, dans la bande de la région. */
const BOSS_LEVEL_OFFSET = 1;

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

    // Préfère les moves qui tapent fort sur la cible (multiplicateur > 1)
    const attacking = candidates.filter(m => m.power > 0);
    const effective = attacking.filter(m => this.engine.typeMultiplier(m.type, target.type, m.isPhysical) > 1);
    const damaging = effective.length > 0 ? effective : attacking;
    const chosen = damaging.length > 0 ? damaging : candidates;

    return chosen[Math.floor(this.random() * chosen.length)];
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
    if (leveledUp && attackerSide === 'player') {
      const eligible = this.moveProvider.getMovesForMonster(attacker);
      const existingIds = new Set(attacker.moves.map(m => m.id));
      const newlyUnlocked = eligible.filter(m => !existingIds.has(m.id));

      if (newlyUnlocked.length > 0) {
        for (const newMove of newlyUnlocked) {
          if (attacker.moves.length < MAX_MOVES) {
            attacker.learnMove(newMove);
            logs.push(`✨ ${attacker.name} a appris « ${newMove.name} » !`);
            learnedNewMoves = true;
          } else {
            // Monstre a 4 attaques : remplacement automatique du move le plus faible si le nouveau est supérieur
            let lowestIdx = 0;
            let lowestScore = moveScore(attacker.moves[0]!);
            for (let i = 1; i < attacker.moves.length; i++) {
              const score = moveScore(attacker.moves[i]!);
              if (score < lowestScore) {
                lowestScore = score;
                lowestIdx = i;
              }
            }
            const newScore = moveScore(newMove);
            if (newScore > lowestScore) {
              const { replacedMove, success } = attacker.learnMove(newMove, lowestIdx);
              if (success && replacedMove) {
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

    return { logs, feedback: turn.feedback, move, feedbackTarget, winner, leveledUp, learnedNewMoves, lifesteal };
  }

  /** Retourne toutes les capacités actuellement débloquées pour ce monstre (selon type & niveau). */
  public getAvailableMovesForMonster(monster: Monster): Move[] {
    return this.moveProvider.getMovesForMonster(monster);
  }

  // --- Spawn & progression de run ---

  /** Prépare un combat : reset des cooldowns & statuts + soin de début (reliques). */
  private prepareCombat(player: Monster, run: RunState): void {
    player.resetCooldowns();
    player.clearStatuses();
    const healPercent = relicHealStartPercent(run.relics);
    if (healPercent > 0 && player.currentHp < player.maxHp) {
      player.heal(Math.floor(player.maxHp * healPercent / 100));
    }
  }

  /**
   * Niveau d'un sauvage : niveau du joueur + écart tiré, borné par la bande
   * `[minLevel, maxLevel]` de la région. Un joueur dans les clous de la région
   * croise des adversaires de son niveau ; un joueur sous-élevé n'est plus
   * facing-checké, un joueur sur-élevé ne rencontre plus des proies.
   */
  private wildLevelFor(player: Monster, region: RegionDef): number {
    const offset = WILD_LEVEL_OFFSETS[Math.floor(this.random() * WILD_LEVEL_OFFSETS.length)];
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
    this.prepareCombat(player, run);
    const region = REGIONS[run.regionIndex];
    const level = this.wildLevelFor(player, region);
    const type = opts.type ?? region.types[Math.floor(this.random() * region.types.length)];
    const enemy = this.enemyFactory.createRandomEnemy(level, { type });
    return { enemyMonster: enemy, logs: [`Un ${enemy.name} sauvage (niv. ${enemy.level}) apparaît !`] };
  }

  /** Lance le combat contre le boss de région. */
  enterBossCombat(player: Monster, run: RunState): { enemyMonster: Monster; logs: string[] } {
    this.prepareCombat(player, run);
    const region = REGIONS[run.regionIndex];
    const bossLevel = this.bossLevelFor(player, region);
    const enemy = this.enemyFactory.createBoss(bossLevel, region.bossType, region.bossName);
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
   * Fige dans le monstre les objets à effet **durable** de l'inventaire.
   *
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

  /** Applique une relique au monstre (stats permanentes + armure). */
  applyRelic(monster: Monster, relic: Relic): void {
    const { stat, acBonus } = relic.effect;
    if (stat) {
      (Object.keys(stat) as Array<keyof typeof stat>).forEach(key => {
        monster.boostStat(key, stat[key]!);
      });
    }
    if (acBonus) {
      monster.armorBonus += acBonus;
    }
  }

  /** Ajoute la relique au run (score + inventaire) ; enchaîne hors phase relic. */
  grantRelic(run: RunState, relic: Relic): RunState {
    return {
      ...run,
      relics: [...run.relics, relic],
      score: run.score + RELIC_SCORE_BONUS,
      phase: run.phase === 'relic' ? 'encounter' : run.phase,
      relicOffers: null,
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

      // Butin du boss : 2 objets tirés au sort dans le catalogue. Marqués
      // `boss`, ce sont les seuls objets qui survivent d'une partie à l'autre
      // (fusionnés dans la fiche du champion en fin de région).
      const loot = this._rollBossLoot(BOSS_LOOT_COUNT);
      for (const item of loot) {
        run = this.addConsumableToInventory(run, item, 1, 'boss');
        logs.push(`🎁 Le boss laisse ${item.name}.`);
      }

      if (run.regionIndex >= REGIONS.length - 1) {
        run.phase = 'victory';
        logs.push('★ Vous êtes le Champion ! ★');
      } else {
        run.phase = 'relic';
        run.relicOffers = rollRareRelicOffers(3, this.random);
        logs.push('🎁 Une relique rare vous est offerte !');
      }
      return { run, logs };
    }

    // Wild win: partial heal + or + relic offer
    const heal = Math.floor(player.maxHp * WILD_WIN_HEAL_PCT / 100);
    player.heal(heal);

    const goldReward = WILD_GOLD_BASE + enemy.level;
    run.gold += goldReward;
    run.phase = 'relic';
    run.relicOffers = rollRelicOffers(3, this.random);
    logs.push(`🧪 ${player.name} récupère ${heal} PV.`);
    logs.push(`💰 +${goldReward} or.`);

    return { run, logs };
  }
}