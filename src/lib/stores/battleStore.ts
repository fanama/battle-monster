import { writable, type Writable } from 'svelte/store';
import type { BattleState, RunState } from '../../core/entities/BattleState';
import type { Monster } from '../../core/entities/Monster';
import type { Move } from '../../core/entities/Move';
import type { Relic } from '../../core/entities/Relic';
import { relicDamagePercent, relicLifestealPercent } from '../../core/entities/Relic';
import { REGIONS } from '../../core/entities/Region';
import type { BattleController, PlayTurnResult } from '../../core/services/BattleController';

// Timings (ms) for the dynamic battle loop — pure responsabilité UI du store.
const ENEMY_TURN_DELAY = 1200;
const ANIMATION_END_DELAY = 550;
const FEEDBACK_CLEAR_DELAY = 1250;

/**
 * Store Svelte du combat — volontairement **mince**.
 *
 * Il ne fait plus que : tenir l'état (`Writable`), déclencher les timers
 * d'animation et lier l'UI au domaine. Toute la logique (tours, IA ennemie,
 * spawn, progression de run, reliques) est déléguée au `BattleController`
 * injecté — testable sans Svelte. Injection de dépendance : le contrôleur est
 * fourni par le composition root (`src/lib/container.ts`).
 */
export class BattleStore {
  private readonly store: Writable<BattleState>;
  public subscribe;

  private readonly controller: BattleController;

  /** Timers de nettoyage des feedbacks flottants (un par camp). */
  private readonly feedbackTimers: Partial<Record<'playerFeedback' | 'enemyFeedback', ReturnType<typeof setTimeout>>> = {};

  constructor(controller: BattleController) {
    this.controller = controller;
    this.store = writable(this._getInitialState());
    this.subscribe = this.store.subscribe;
  }

  private _getInitialState(): BattleState {
    return {
      playerMonster: null,
      enemyMonster: null,
      logs: ['Choisissez votre monstre pour commencer.'],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: {
        phase: 'starter',
        regionIndex: 0,
        encounterIndex: 0,
        relics: [],
        score: 0,
        relicOffers: null,
      },
    };
  }

  // --- Run lifecycle ---

  public startRun = (monster: Monster) => {
    const run: RunState = {
      phase: 'encounter',
      regionIndex: 0,
      encounterIndex: 0,
      relics: [],
      score: 0,
      relicOffers: null,
    };
    const { enemyMonster, isBoss, logs } = this.controller.spawnNextEnemy(monster, run);
    const region = REGIONS[run.regionIndex];

    this.store.set({
      ...this._getInitialState(),
      playerMonster: monster,
      enemyMonster,
      logs: [`— ${region.name} — ${region.description}`, ...logs],
      run,
      isBossFight: isBoss,
    });
  };

  /** Défaite → permadeath : retour à la sélection de starter. */
  public newRun = () => {
    this.store.set(this._getInitialState());
  };

  // --- Battle actions ---

  public attack = (moveIndex: number) => {
    this.store.update(state => {
      if (!state.isPlayerTurn || state.winner || !state.playerMonster || !state.enemyMonster) return state;

      const player = state.playerMonster;
      const enemy = state.enemyMonster;
      const move = player.moves[moveIndex];

      // Le controller résout le round ENTIER (mutations) : initiative d20 +
      // mod(Vitesse), puis les deux actions dans l'ordre. On ne fait ici que
      // rejouer les observables (logs, feedback, animations) avec des timers.
      const round = this.controller.resolveRound({
        player,
        enemy,
        move,
        damagePercent: relicDamagePercent(state.run.relics),
        lifestealPercent: relicLifestealPercent(state.run.relics),
      });

      const playerAction = round.playerTurn;
      const enemyAction = round.enemyTurn;

      if (round.playerFirst) {
        // Le joueur agit immédiatement ; l'ennemi réagit après le délai.
        const followUp = enemyAction != null;
        let s: BattleState = {
          ...state,
          isPlayerTurn: false,
          isAttacking: true,
          playerLastMove: playerAction?.move ?? move,
          logs: [...state.logs, round.logs[0], ...(playerAction?.logs ?? [])],
          winner: followUp ? null : round.winner,
        };
        if (playerAction) s = this._attachFeedback(s, playerAction);
        if (!followUp) s = this._applyRoundWinner(s);
        this._endAnimLater('isAttacking');
        if (followUp) this._enemyLater(enemyAction!, round.winner);
        return s;
      }

      // Ennemi plus rapide : il frappe en premier, le joueur réagit ensuite.
      const followUp = playerAction != null;
      let s: BattleState = {
        ...state,
        isPlayerTurn: false,
        isEnemyAttacking: true,
        enemyLastMove: enemyAction?.move ?? null,
        logs: [...state.logs, round.logs[0], ...(enemyAction?.logs ?? [])],
        winner: followUp ? null : round.winner,
      };
      if (enemyAction) s = this._attachFeedback(s, enemyAction);
      if (!followUp) s = this._applyRoundWinner(s);
      this._endAnimLater('isEnemyAttacking');
      if (followUp) this._playerLater(playerAction!, round.winner);
      return s;
    });
  };

  // --- Roguelike transition actions ---

  public pickRelic = (relic: Relic) => {
    this.store.update(state => {
      if (state.run.phase !== 'relic' || !state.playerMonster) return state;
      const player = state.playerMonster;

      this.controller.applyRelic(player, relic);
      const run = this.controller.grantRelic(
        { ...state.run, phase: 'encounter', relicOffers: null },
        relic
      );

      const { enemyMonster, isBoss, logs } = this.controller.spawnNextEnemy(player, run);
      return this._nextBattleState(state, run, enemyMonster, isBoss, logs, [
        `✨ ${relic.icon} ${relic.name} : ${relic.description}`,
      ]);
    });
  };

  public skipRelic = () => {
    this.store.update(state => {
      if (state.run.phase !== 'relic' || !state.playerMonster) return state;
      const run: RunState = { ...state.run, phase: 'encounter', relicOffers: null };
      const { enemyMonster, isBoss, logs } = this.controller.spawnNextEnemy(state.playerMonster, run);
      return this._nextBattleState(state, run, enemyMonster, isBoss, logs, ['Vous passez votre chemin.']);
    });
  };

  public advanceRegion = () => {
    this.store.update(state => {
      if (state.run.phase !== 'regionClear' || !state.playerMonster) return state;

      const nextIndex = state.run.regionIndex + 1;
      const run: RunState = {
        ...state.run,
        regionIndex: nextIndex,
        encounterIndex: 0,
        phase: 'encounter',
        relicOffers: null,
      };
      const region = REGIONS[nextIndex];
      const player = state.playerMonster;

      // Full heal before the new region
      player.currentHp = player.maxHp;

      const { enemyMonster, isBoss, logs } = this.controller.spawnNextEnemy(player, run);
      return this._nextBattleState(state, run, enemyMonster, isBoss, logs, [
        `— ${region.name} — ${region.description}`,
      ]);
    });
  };

  // --- Internals ---

  /** État « nouveau combat » partagé par pickRelic / skipRelic / advanceRegion. */
  private _nextBattleState(
    state: BattleState,
    run: RunState,
    enemyMonster: Monster,
    isBoss: boolean,
    logs: string[],
    prefixLogs: string[]
  ): BattleState {
    return {
      ...state,
      enemyMonster,
      isBossFight: isBoss,
      winner: null,
      isPlayerTurn: true,
      run,
      logs: [...state.logs, ...prefixLogs, ...logs],
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
    };
  }

  /** Victoire du joueur : délègue les récompenses (score, soins, reliques) au controller. */
  private _onPlayerWin(state: BattleState): BattleState {
    const result = this.controller.handlePlayerVictory({
      player: state.playerMonster!,
      enemy: state.enemyMonster!,
      run: state.run,
      isBossFight: state.isBossFight,
    });
    return { ...state, run: result.run, logs: [...state.logs, ...result.logs] };
  }

  /** Termine la partie selon le vainqueur du round (une seule application). */
  private _applyRoundWinner(state: BattleState): BattleState {
    if (state.winner === 'player') return this._onPlayerWin(state);
    if (state.winner === 'enemy') return { ...state, run: { ...state.run, phase: 'runover' } };
    return state;
  }

  /**
   * Rejoue le tour de l'ennemi (déjà muté de façon synchrone par resolveRound) :
   * logs, feedback, animation, puis rend la main au joueur et applique l'issue.
   */
  private _enemyLater(action: PlayTurnResult, roundWinner: 'player' | 'enemy' | null): void {
    setTimeout(() => {
      this.store.update(state => {
        if (state.winner) return state;
        let s: BattleState = {
          ...state,
          isEnemyAttacking: true,
          enemyLastMove: action.move,
          logs: [...state.logs, ...action.logs],
          winner: roundWinner,
        };
        s = this._attachFeedback(s, action);
        s = this._applyRoundWinner(s);
        this._endAnimLater('isEnemyAttacking');
        return { ...s, isPlayerTurn: s.winner == null };
      });
    }, ENEMY_TURN_DELAY);
  }

  /** Rejoue le tour du joueur dans un round où l'ennemi passait en premier. */
  private _playerLater(action: PlayTurnResult, roundWinner: 'player' | 'enemy' | null): void {
    setTimeout(() => {
      this.store.update(state => {
        if (state.winner) return state;
        let s: BattleState = {
          ...state,
          isAttacking: true,
          playerLastMove: action.move,
          logs: [...state.logs, ...action.logs],
          winner: roundWinner,
        };
        s = this._attachFeedback(s, action);
        s = this._applyRoundWinner(s);
        this._endAnimLater('isAttacking');
        return { ...s, isPlayerTurn: s.winner == null };
      });
    }, ENEMY_TURN_DELAY);
  }

  /** Pose le feedback d'un tour sur le bon monstre + programme son nettoyage. */
  private _attachFeedback(state: BattleState, action: PlayTurnResult): BattleState {
    const key = action.feedbackTarget === state.playerMonster ? 'playerFeedback' : 'enemyFeedback';
    if (this.feedbackTimers[key]) clearTimeout(this.feedbackTimers[key]!);
    this.feedbackTimers[key] = setTimeout(() => this._clearFeedbackField(key), FEEDBACK_CLEAR_DELAY);
    return { ...state, [key]: action.feedback };
  }

  private _clearFeedbackField = (key: 'playerFeedback' | 'enemyFeedback') => {
    this.store.update(s => ({ ...s, [key]: null }));
  };

  private _endAnimLater(flag: 'isAttacking' | 'isEnemyAttacking'): void {
    setTimeout(() => {
      this.store.update(s => ({ ...s, [flag]: false }));
    }, ANIMATION_END_DELAY);
  }
}

export function createBattleStore(controller: BattleController): BattleStore {
  return new BattleStore(controller);
}