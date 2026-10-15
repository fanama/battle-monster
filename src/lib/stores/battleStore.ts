import { writable, type Writable } from "svelte/store";
import type { BattleState, RunState } from "../../core/entities/BattleState";
import { Monster } from "../../core/entities/Monster";
import { MonsterIO } from "../../core/entities/Monster";
import type { Move } from "../../core/entities/Move";
import type { Relic, ShopItem } from "../../core/entities/Relic";
import {
  relicDamagePercent,
  relicLifestealPercent,
  relicMaxCritRange,
  relicExperiencePercent,
  rollShopStock,
  RELIC_CATALOG,
} from "../../core/entities/Relic";
import { STARTER_INVENTORY } from "../../core/entities/Consumable";
import {
  EQUIPMENT_SLOTS,
  dedupeEquipmentBag,
  type Equipment,
  type EquipmentSlot,
} from "../../core/entities/Equipment";
import { REGIONS } from "../../core/entities/Region";
import {
  generateRegionMap,
  areLinked,
  nodeAtCol,
} from "../../core/entities/RegionMap";
import type {
  BattleController,
  PlayTurnOptions,
  PlayTurnResult,
} from "../../core/services/BattleController";
import {
  SAVE_VERSION,
  type RunSave,
  type SaveRepository,
  type ChampionRepository,
  type SavedChampion,
} from "../../core/services/ports";
import { playSound } from "../audio/gameAudio";
import { fireCelebration } from "./juiceStore";

// Timings (ms) for the dynamic battle loop — pure responsabilité UI du store.
// Étirés pour la lisibilité des animations 3D articulées (attaque ~620-750 ms
// avec armement + impact, canalisation ~900 ms).
const ENEMY_TURN_DELAY = 1250;
const ANIMATION_END_DELAY = 950;
const FEEDBACK_CLEAR_DELAY = 1250;
/**
 * Temps laissé à l'animation de victoire/défaite avant d'afficher l'écran
 * suivant (relique, région conquise ou fin de run). Pendant ce délai le
 * vainqueur est déjà dans l'état — le monstre qui gagne joue son animation —
 * mais `run.phase` n'a pas encore changé.
 */
const ROUND_END_DELAY = 1400;

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
  private readonly saveRepository: SaveRepository;
  private readonly championRepository: ChampionRepository;

  /** Timers de nettoyage des feedbacks flottants (un par camp). */
  private readonly feedbackTimers: Partial<
    Record<"playerFeedback" | "enemyFeedback", ReturnType<typeof setTimeout>>
  > = {};

  /** Évite d'empiler deux fins de round programmées (cf. `_scheduleRoundEnd`). */
  private roundEndScheduled = false;

  /** Tous les `setTimeout` de round / animation — annulés au (re)start d'un run. */
  private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  /** Une partie sauvegardée existe → le menu titre propose « Continuer ». */
  public readonly savedRun: Writable<boolean>;

  /** Champions victorieux sauvegardés (Panthéon) disponibles pour une nouvelle partie. */
  public readonly savedChampions: Writable<SavedChampion[]>;

  /** Modale de gestion/sélection des capacités ouverte. */
  public readonly isMoveModalOpen: Writable<boolean>;

  /** Indique si l'ouverture de la modale fait suite directe à une montée de niveau. */
  public readonly isLevelUpMovePrompt: Writable<boolean>;

  constructor(
    controller: BattleController,
    saveRepository: SaveRepository,
    championRepository: ChampionRepository,
  ) {
    this.controller = controller;
    this.saveRepository = saveRepository;
    this.championRepository = championRepository;
    this.store = writable(this._getInitialState());
    this.subscribe = this.store.subscribe;
    this.savedRun = writable(saveRepository.load() != null);
    this.savedChampions = writable(championRepository.list());
    this.isMoveModalOpen = writable(false);
    this.isLevelUpMovePrompt = writable(false);
  }

  private _getInitialState(): BattleState {
    return {
      playerMonster: null,
      enemyMonster: null,
      logs: ["Choisissez votre monstre pour commencer."],
      isPlayerTurn: true,
      winner: null,
      isAttacking: false,
      isEnemyAttacking: false,
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
      isBossFight: false,
      run: this._newRunState(),
    };
  }

  /** État de run vierge (menu titre / début de partie). */
  private _newRunState(): RunState {
    return {
      phase: "starter",
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
      inventory: STARTER_INVENTORY.map((slot) => ({
        item: { ...slot.item },
        quantity: slot.quantity,
      })),
      /** Roguelike choisi : l'équipement est effacé — chaque run se ré-équipe. */
      equipmentBag: [],
      equipOffers: null,
    };
  }

  /**
   * Démarre la carte d'une région : nouvelle carte aléatoire (une couche par
   * combat de la région), le run repasse en phase `map`.
   */
  private _startNewRegion(regionIndex: number, base: RunState): RunState {
    const region = REGIONS[regionIndex];
    return {
      ...base,
      phase: "map",
      regionIndex,
      map: generateRegionMap(region.mapLayers, undefined, region.types),
      mapLayer: 0,
      path: [],
      shopStock: null,
      bossBattle: false,
      relicOffers: null,
      equipOffers: null,
    };
  }

  // --- Run lifecycle ---

  public startRun = (monster: Monster) => {
    this._clearTimers();
    const run = this._startNewRegion(0, this._newRunState());
    const region = REGIONS[0];

    // Roguelike choisi : chaque run se ré-équipe. Si le champion part d'une
    // fiche sauvegardée avec des pièces portées, celles-ci sont déséquipées
    // (les stats des pièces lui restent gravées via la sauvegarde du
    // panthéon, pas doubled : unequip inverse exactement l'effet de pose).
    for (const slot of EQUIPMENT_SLOTS) monster.unequip(slot);

    const state: BattleState = {
      ...this._getInitialState(),
      playerMonster: monster,
      enemyMonster: null,
      isBossFight: false,
      run,
      logs: [
        `— ${region.name} — ${region.description}`,
        "🗺️ Choisissez votre destination à travers la carte.",
      ],
    };
    this.store.set(state);
    this._persistState(state);
  };

  /** Défaite → permadeath : retour à la sélection de starter, sauvegarde effacée. */
  public newRun = () => {
    this._clearTimers();
    this._clearSaved();
    this.store.set(this._getInitialState());
  };

  // --- Persistance (menu titre « Continuer ») ---

  /**
   * Restaure une partie sauvegardée : reconstruit le monstre joueur, re-spawn
   * l'ennemi du combat courant (ou rétablit l'overlay relique / région).
   */
  public loadSaved = (): boolean => {
    const save = this.saveRepository.load();
    if (!save) return false;

    this._clearTimers();
    const player = MonsterIO.fromSnapshot(save.playerMonster);
    const run: RunState = {
      ...save.run,
      path: save.run.path ?? [],
      inventory:
        save.run.inventory ??
        STARTER_INVENTORY.map((slot) => ({
          item: { ...slot.item },
          quantity: slot.quantity,
        })),
      // Sacoche d'équipements (capacités signature) : restaure le bag DÉ-DU-PÉ
      // (une pièce = un exemplaire) — d'anciennes sauvegardes (recouvrement
      // drop/offre) pouvaient contenir des ids dupliqués, mortels pour un
      // `each` keyé à l'affichage. Les pièces portées vivent déjà dans le
      // champ `equipped` du monstre, restauré par `MonsterIO.fromSnapshot`.
      equipmentBag: dedupeEquipmentBag(save.run.equipmentBag ?? []),
      // Offres d'équipement : dé-du-plées elles aussi (même clé `each` de
      // l'écran de butin) — une sauvegarde ancienne pouvait les dupliquer.
      equipOffers: save.run.equipOffers
        ? dedupeEquipmentBag(save.run.equipOffers)
        : null,
      shopStock:
        save.run.shopStock &&
        save.run.shopStock.some((i) => i.kind === "consumable")
          ? save.run.shopStock
          : save.run.phase === "shop"
            ? rollShopStock(
                RELIC_CATALOG.length,
                undefined,
                save.run.regionIndex,
                2,
                (save.run.relics ?? []).map((r) => r.id),
                [
                  ...dedupeEquipmentBag(save.run.equipmentBag ?? []).map((p) => p.id),
                  ...player.getEquippedList().map((p) => p.id),
                ],
              )
            : save.run.shopStock,
    };

    let enemyMonster: Monster | null = null;
    let isBoss = run.bossBattle;
    let spawnLogs: string[] = [];
    if (run.phase === "encounter") {
      if (save.enemyMonster) {
        // Restauration exacte et déterministe de l'ennemi sauvegardé
        enemyMonster = MonsterIO.fromSnapshot(save.enemyMonster);
        spawnLogs = [
          `${enemyMonster.name} (${isBoss ? "Boss" : "Niv. " + enemyMonster.level}) vous fait face.`,
        ];
      } else {
        // Fallback si ancien format de sauvegarde
        const chosen = run.map
          ? nodeAtCol(run.map, run.mapLayer, run.path[run.path.length - 1] ?? 0)
          : undefined;
        const spawned = isBoss
          ? this.controller.enterBossCombat(player, run)
          : this.controller.enterWildCombat(player, run, {
              type: chosen?.enemyType,
            });
        enemyMonster = spawned.enemyMonster;
        spawnLogs = spawned.logs;
      }
    }

    this.store.set({
      ...this._getInitialState(),
      playerMonster: player,
      enemyMonster,
      isBossFight: isBoss,
      run,
      isPlayerTurn: true,
      logs: ["— Sauvegarde restaurée —", ...spawnLogs],
    });
    return true;
  };

  /** Infos affichées par le menu titre (« Continuer »). */
  public getSaveInfo(): {
    regionIndex: number;
    playerName: string;
    playerLevel: number;
    score: number;
  } | null {
    const save = this.saveRepository.load();
    if (!save) return null;
    return {
      regionIndex: save.run.regionIndex,
      playerName: save.playerMonster.name,
      playerLevel: save.playerMonster.level,
      score: save.run.score,
    };
  }

  /** Menu titre « Nouvelle partie » : supprime la sauvegarde (reste sur le starter). */
  public deleteSave = (): void => {
    this._clearTimers();
    this._clearSaved();
  };

  /** Quitte vers l'écran d'accueil en conservant la sauvegarde. */
  public quitToMenu = (): void => {
    this._clearTimers();
    this.store.set(this._getInitialState());
  };

  // --- Battle actions ---

  public attack = (moveIndex: number) => {
    this.store.update((state) => {
      if (
        !state.isPlayerTurn ||
        state.winner ||
        state.isAttacking ||
        state.isEnemyAttacking ||
        !state.playerMonster ||
        !state.enemyMonster
      )
        return state;

      const player = state.playerMonster;
      const enemy = state.enemyMonster;
      const move = player.moves[moveIndex];

      // 1. Ordre de résolution du round : un soin passe avant une attaque,
      //    l'initiative départage les autres cas. Le joueur a déjà choisi son
      //    move ; côté ennemi on se contente de sonder s'il *peut* soigner
      //    (sonde sans aléa : l'IA garde le choix de son move au moment
      //    d'agir, donc en connaissance des dégâts reçus).
      const round = this.controller.beginRound({
        player,
        enemy,
        playerCastsHeal: !!move.isHeal,
        enemyCanHeal: this.controller.hasUsableHeal(enemy),
      });

      // 2. Les deux camps agissent STRICTEMENT dans cet ordre : le tour du
      //    second n'est exécuté (et muté) qu'après l'animation du premier,
      //    afin que PV, logs et feedback suivent réellement l'ordre affiché.
      //    Le tour suivant est annulé si le premier a mis la cible K.O.
      const playerTurnOpts = (): PlayTurnOptions => ({
        attacker: player,
        defender: enemy,
        move,
        attackerSide: "player",
        // Reliques **+ équipement porté** : les chiffres de la fiche viennent
        // de la possession effective du monstre (sacoche = inerte).
        damagePercent:
          relicDamagePercent(state.run.relics) + player.equipmentDamagePercent(),
        lifestealPercent:
          relicLifestealPercent(state.run.relics) + player.equipmentLifestealPercent(),
        critRange: Math.max(
          relicMaxCritRange(state.run.relics),
          player.equipmentCritRange(),
        ),
        experiencePercent:
          relicExperiencePercent(state.run.relics) + player.equipmentExperiencePercent(),
      });
      const enemyTurnOpts = (): PlayTurnOptions => ({
        attacker: enemy,
        defender: player,
        // L'IA choisit sa riposte au moment où elle agit (après les dégâts reçus).
        // Exception : si la règle d'ordre l'a placé en premier *parce qu'il
        // pouvait soigner*, il doit effectivement soigner — sinon il n'aurait
        // gagné que le bonus d'initiative.
        move: this.controller.selectEnemyMove(
          enemy.moves,
          enemy,
          player,
          round.healFirst && !move.isHeal,
        ),
        attackerSide: "enemy",
      });

      if (round.playerFirst) {
        // Le joueur ouvre le round ; l'ennemi réagit après le délai,
        // uniquement s'il est toujours en vie.
        const first = this.controller.playTurn(playerTurnOpts());
        const followUp = first.winner == null;
        let s: BattleState = {
          ...state,
          isPlayerTurn: false,
          isAttacking: true,
          playerLastMove: first.move,
          logs: [...state.logs, ...round.logs, ...first.logs],
          winner: followUp ? null : first.winner,
        };
        s = this._attachFeedback(s, first);
        if (followUp) {
          s = this._applyRoundWinner(s);
        } else {
          // Coup fatal du premier frappeur : on diffère l'écran suivant.
          this._scheduleRoundEnd(s.winner!, this._isBossFightOf(s));
        }
        this._endAnimLater("isAttacking");
        if (followUp) this._enemyLater(enemyTurnOpts);
        if (first.leveledUp) {
          const wait = followUp ? 0 : ROUND_END_DELAY;
          this._levelUpJuice();
          this._later(
            () => this.openMoveModal(true),
            wait + ANIMATION_END_DELAY + 300,
          );
        }
        return s;
      }

      // Ennemi plus rapide : il frappe en premier, le joueur réagit ensuite
      // (seulement s'il est toujours debout).
      const first = this.controller.playTurn(enemyTurnOpts());
      const followUp = first.winner == null;
      let s: BattleState = {
        ...state,
        isPlayerTurn: false,
        isEnemyAttacking: true,
        enemyLastMove: first.move,
        logs: [...state.logs, ...round.logs, ...first.logs],
        winner: followUp ? null : first.winner,
      };
      s = this._attachFeedback(s, first);
      if (followUp) {
        s = this._applyRoundWinner(s);
      } else {
        this._scheduleRoundEnd(s.winner!, this._isBossFightOf(s));
      }
      this._endAnimLater("isEnemyAttacking");
      if (followUp) this._playerLater(playerTurnOpts);
      return s;
    });
  };

  // --- Carte & boutique (roguelike) ---

  /** Choisit un nœud de la carte (combat / soin / boutique). */
  public chooseNode = (col: number) => {
    this.store.update((state) => {
      const run = state.run;
      if (run.phase !== "map" || run.map == null || !state.playerMonster)
        return state;
      // Les couches sont mélangées : on retombe sur le nœud par son id de
      // colonne (et non par sa position dans le tableau), sinon un clic sur un
      // combat pourrait ouvrir une boutique d'un nœud voisin et vice-versa.
      const node = nodeAtCol(run.map, run.mapLayer, col);
      if (!node) return state;

      // Accessibilité : depuis le dernier nœud choisi, seules les colonnes
      // voisines (±1) sont reliées à la couche courante.
      const prevCol =
        run.path.length > 0 ? run.path[run.path.length - 1]! : null;
      if (prevCol != null && !areLinked(prevCol, col)) return state;

      const path = [...run.path, col];

      if (node.site === "combat") {
        const { enemyMonster, logs } = this.controller.enterWildCombat(
          state.playerMonster,
          run,
          { type: node.enemyType },
        );
        const next: BattleState = {
          ...state,
          enemyMonster,
          isBossFight: false,
          winner: null,
          isPlayerTurn: true,
          run: { ...run, phase: "encounter", path },
          logs: [...state.logs, ...logs],
          playerLastMove: null,
          enemyLastMove: null,
          playerFeedback: null,
          enemyFeedback: null,
        };
        this._persistState(next);
        playSound("encounter");
        return next;
      }

      if (node.site === "heal") {
        const player = state.playerMonster;
        const heal = Math.floor(player.maxHp * 0.35);
        const restored = player.heal(heal);
        const logMsg =
          restored > 0
            ? `🩹 Vous vous reposez : +${restored} PV.`
            : `🩹 Vous vous reposez (PV déjà au maximum).`;
        return this._advanceMap({
          ...state,
          run: { ...run, path },
          logs: [...state.logs, logMsg],
        });
      }

      // Boutique : TOUT le catalogue est accessible (toutes les reliques + potion
      // + un rayon d'équipements adapté à la profondeur de la région).
      // Anti-doublon : reliques ET pièces déjà possédées (sacoche + portées).
      const shopStock = rollShopStock(
        RELIC_CATALOG.length,
        undefined,
        run.regionIndex,
        2,
        run.relics.map((r) => r.id),
        this._ownedEquipmentIds(state),
      );
      const next: BattleState = {
        ...state,
        run: { ...run, phase: "shop", shopStock, path },
        logs: [...state.logs, "🛒 La boutique s’ouvre : dépensez votre or."],
      };
      this._persistState(next);
      return next;
    });
  };

  /** Achète un article de la boutique (si assez d'or et pas déjà acheté). */
  public buyShopItem = (item: ShopItem) => {
    this.store.update((state) => {
      const run = state.run;
      if (run.phase !== "shop" || !state.playerMonster || !run.shopStock)
        return state;
      // Anti-doublon (plafonds de reliques, unicité par pièce) : une relique
      // déjà possédée n'est plus vendable — refus explicite, or intact.
      // Anti-doublon : relique déjà possédée, OU pièce d'équipement déjà
      // détenue (sacoche + portée). Refus explicite, or intact.
      const alreadyOwned =
        (item.kind === "relic" &&
          item.relic != null &&
          this.controller.ownsRelic(run, item.relic.id)) ||
        (item.kind === "equipment" &&
          item.equipment != null &&
          this._ownedEquipmentIds(state).includes(item.equipment.id));
      if (alreadyOwned) {
        return {
          ...state,
          logs: [
            ...state.logs,
            `⛔ ${item.icon} ${item.label} est déjà en votre possession — l'anti-doublon s'y oppose.`,
          ],
        };
      }
      if (item.bought || run.gold < item.price) return state;

      const player = state.playerMonster;
      let logs = state.logs;
      let nextRun = run;

      if (item.kind === "heal") {
        const healed = player.maxHp - player.currentHp;
        if (healed <= 0) return state; // PV pleins : pas d'achat ni d'or perdu.
        player.heal(healed);
        logs = [...logs, `🏨 ${item.label} : +${healed} PV.`];
      } else if (item.kind === "consumable" && item.consumable) {
        nextRun = this.controller.addConsumableToInventory(
          nextRun,
          item.consumable,
        );
        logs = [
          ...logs,
          `🎒 ${item.icon} ${item.label} ajouté à votre sacoche.`,
        ];
      } else if (item.relic) {
        this.controller.applyRelic(player, item.relic);
        nextRun = this.controller.grantRelic(
          { ...run, phase: "shop" },
          item.relic,
        );
        logs = [...logs, `✨ ${item.icon} ${item.label} achetée.`];
      } else if (item.kind === "equipment" && item.equipment) {
        // La pièce rejoint la SACOCHE (inactive) : elle ne s'active qu'une
        // fois portée via la fenêtre « Équipement ».
        nextRun = this.controller.addEquipmentToBag(nextRun, item.equipment);
        logs = [...logs, `🎒 ${item.icon} ${item.label} ajouté(e) à la sacoche d'équipement.`];
      }

      nextRun = { ...nextRun, gold: nextRun.gold - item.price };
      if (item.kind !== "consumable") {
        item.bought = true;
      }
      const next: BattleState = { ...state, run: nextRun, logs };
      this._persistState(next);
      playSound("coin");
      return next;
    });
  };

  /**
   * Utilise un objet consommable depuis la sacoche d'inventaire.
   * L'action peut être effectuée pendant le tour du joueur ou hors combat.
   */
  public useConsumable = (itemId: string): boolean => {
    let success = false;
    this.store.update((state) => {
      if (!state.playerMonster) return state;
      // Pendant un combat, utilisable uniquement si c'est le tour du joueur et pas d'animation en cours
      if (state.run.phase === "encounter") {
        if (
          !state.isPlayerTurn ||
          state.isAttacking ||
          state.isEnemyAttacking ||
          state.winner
        ) {
          return state;
        }
      }

      const res = this.controller.useConsumable(
        state.playerMonster,
        state.run,
        itemId,
      );
      if (!res) return state;

      success = true;
      const next: BattleState = {
        ...state,
        run: res.run,
        logs: [...state.logs, ...res.logs],
        playerFeedback:
          res.feedback.kind !== "none" ? res.feedback : state.playerFeedback,
      };

      if (res.feedback.kind !== "none") {
        const key = "playerFeedback";
        if (this.feedbackTimers[key]) clearTimeout(this.feedbackTimers[key]!);
        this.feedbackTimers[key] = setTimeout(
          () => this._clearFeedbackField(key),
          FEEDBACK_CLEAR_DELAY,
        );
      }

      this._persistState(next);
      return next;
    });
    return success;
  };

  /** Quitte la boutique : progression sur la carte (couche suivante ou boss). */
  public leaveShop = () => {
    this.store.update((state) => {
      if (state.run.phase !== "shop") return state;
      const run: RunState = { ...state.run, phase: "map", shopStock: null };
      return this._advanceMap({ ...state, run });
    });
  };

  /**
   * L'équipement se gère **hors combat uniquement** : les phases où c'est
   * permis sont la carte (map) et la boutique (shop).
   */
  private _canManageEquipment(state: BattleState): boolean {
    return (
      (state.run.phase === "map" || state.run.phase === "shop") &&
      !!state.playerMonster
    );
  }

  /**
   * Ids de TOUTES les pièces d'équipement détenues : sacoche + emplacements
   * portés. Sert d'anti-doublon (boutique) — une pièce possédée n'est jamais
   * re-proposée, ce qui évite les clés dupliquées côté affichage.
   */
  private _ownedEquipmentIds(state: BattleState): string[] {
    return [
      ...dedupeEquipmentBag(state.run.equipmentBag ?? []).map((p) => p.id),
      ...(state.playerMonster?.getEquippedList() ?? []).map((p) => p.id),
    ];
  }

  /** Porte une pièce de la sacoche (remplace la pièce de l'emplacement). */
  public equipPiece = (equipmentId: string) => {
    this.store.update((state) => {
      if (!this._canManageEquipment(state) || !state.playerMonster) return state;
      const result = this.controller.equipFromBag(
        state.playerMonster,
        state.run,
        equipmentId,
      );
      if (!result) return state;
      const next: BattleState = {
        ...state,
        run: result.run,
        logs: [...state.logs, ...result.logs],
      };
      this._persistState(next);
      return next;
    });
  };

  /** Retire une pièce portée (la remet dans la sacoche). */
  public unequipPiece = (slot: EquipmentSlot) => {
    this.store.update((state) => {
      if (!this._canManageEquipment(state) || !state.playerMonster) return state;
      const result = this.controller.unequipToBag(
        state.playerMonster,
        state.run,
        slot,
      );
      if (!result) return state;
      const next: BattleState = {
        ...state,
        run: result.run,
        logs: [...state.logs, ...result.logs],
      };
      this._persistState(next);
      return next;
    });
  };

  /**
   * Carte « pièce d'équipement » des offres mixées : la pièce rejoint la
   * sacoche (inactive tant que non portée) et TOUTE l'offre s'évapore.
   */
  public pickEquipOffer = (piece: Equipment) => {
    this.store.update((state) => {
      if (state.run.phase !== "relic" || !state.playerMonster) return state;
      if (!state.run.equipOffers?.some(p => p.id === piece.id)) return state;
      // Filet anti-doublon : une pièce déjà détenue (sacoche + portée) ne peut
      // pas entrer une seconde fois — l'offre s'évapore en le signalant, ce qui
      // garantit que la sacoche reste sans clé dupliquée à l'affichage.
      if (this._ownedEquipmentIds(state).includes(piece.id)) {
        const runRefused: RunState = {
          ...state.run,
          phase: "relic",
          relicOffers: null,
          equipOffers: null,
        };
        const sRefused: BattleState = {
          ...state,
          run: runRefused,
          enemyMonster: null,
          winner: null,
          isPlayerTurn: true,
          logs: [
            ...state.logs,
            `⛔ ${piece.icon} ${piece.name} : déjà en votre possession — l'offre s'évapore.`,
          ],
          playerLastMove: null,
          enemyLastMove: null,
          playerFeedback: null,
          enemyFeedback: null,
        };
        return this._afterRelicDecision(sRefused);
      }
      const run: RunState = {
        ...this.controller.addEquipmentToBag(state.run, piece),
        phase: "relic",
        relicOffers: null,
        equipOffers: null,
      };
      const s0: BattleState = {
        ...state,
        run,
        enemyMonster: null,
        winner: null,
        isPlayerTurn: true,
        logs: [
          ...state.logs,
          `🧰 ${piece.icon} ${piece.name} rejoint la sacoche d'équipement (portez-la hors combat).`,
        ],
        playerLastMove: null,
        enemyLastMove: null,
        playerFeedback: null,
        enemyFeedback: null,
      };
      this._persistState(s0);
      return this._afterRelicDecision(s0);
    });
  };

  // --- Roguelike transition actions ---

  public pickRelic = (relic: Relic) => {
    this.store.update((state) => {
      if (state.run.phase !== "relic" || !state.playerMonster) return state;

      // Anti-doublon (unicité par pièce) : si la relique est déjà possédée
      // (ne devrait plus arriver — les tirages excluent le possédé —, la
      // garde subsiste), l'offre retombe en « passe ton chemin ».
      if (this.controller.ownsRelic(state.run, relic.id)) {
        const runSkipped: RunState = { ...state.run, phase: "relic", relicOffers: null };
        const sSkipped: BattleState = {
          ...state,
          run: runSkipped,
          enemyMonster: null,
          winner: null,
          isPlayerTurn: true,
          logs: [
            ...state.logs,
            `⛔ ${relic.name} : déjà en votre possession — l'offre s'évapore.`,
          ],
          playerLastMove: null,
          enemyLastMove: null,
          playerFeedback: null,
          enemyFeedback: null,
        };
        return this._afterRelicDecision(sSkipped);
      }

      const player = state.playerMonster;

      this.controller.applyRelic(player, relic);
      // Le choix se porte sur UNE carte : reliques et pièces d'équipement
      // s'évaporent ensemble (offres mixées, réglage 2026-10).
      const run = this.controller.grantRelic(
        { ...state.run, phase: "relic", relicOffers: null, equipOffers: null },
        relic,
      );

      const s0: BattleState = {
        ...state,
        run,
        enemyMonster: null,
        winner: null,
        isPlayerTurn: true,
        logs: [
          ...state.logs,
          `✨ ${relic.icon} ${relic.name} : ${relic.description}`,
        ],
        playerLastMove: null,
        enemyLastMove: null,
        playerFeedback: null,
        enemyFeedback: null,
      };
      return this._afterRelicDecision(s0);
    });
  };

  public skipRelic = () => {
    this.store.update((state) => {
      if (state.run.phase !== "relic" || !state.playerMonster) return state;
      const run: RunState = { ...state.run, phase: "relic", relicOffers: null, equipOffers: null };
      const s0: BattleState = {
        ...state,
        run,
        enemyMonster: null,
        winner: null,
        isPlayerTurn: true,
        logs: [...state.logs, "Vous passez votre chemin."],
        playerLastMove: null,
        enemyLastMove: null,
        playerFeedback: null,
        enemyFeedback: null,
      };
      return this._afterRelicDecision(s0);
    });
  };

  /**
   * Enchaînement après le choix/skip de relique :
   * Si le combat terminé était un boss, on bascule vers la victoire ou l'écran
   * de transition de région (`regionClear`). Sinon, on avance sur la carte.
   */
  private _afterRelicDecision(state: BattleState): BattleState {
    if (state.isBossFight || state.run.bossBattle) {
      if (state.run.regionIndex >= REGIONS.length - 1) {
        const next: BattleState = {
          ...state,
          run: { ...state.run, phase: "victory", bossBattle: false },
          isBossFight: false,
        };
        this._persistState(next);
        return next;
      }
      const next: BattleState = {
        ...state,
        run: { ...state.run, phase: "regionClear", bossBattle: false },
        isBossFight: false,
      };
      this._persistState(next);
      return next;
    }
    return this._advanceMap(state);
  }

  public advanceRegion = () => {
    this.store.update((state) => {
      if (state.run.phase !== "regionClear" || !state.playerMonster)
        return state;

      const player = state.playerMonster;
      player.currentHp = player.maxHp; // Full heal before the new region

      const nextIndex = state.run.regionIndex + 1;
      const run = this._startNewRegion(nextIndex, state.run);
      const region = REGIONS[nextIndex];
      const next: BattleState = {
        ...state,
        run,
        enemyMonster: null,
        isBossFight: false,
        winner: null,
        isPlayerTurn: true,
        logs: [
          ...state.logs,
          `— ${region.name} — ${region.description}`,
          "🗺️ Choisissez votre destination à travers la carte.",
        ],
        playerLastMove: null,
        enemyLastMove: null,
        playerFeedback: null,
        enemyFeedback: null,
      };
      this._persistState(next);
      return next;
    });
  };

  // --- Internals ---

  /**
   * Avance d'une couche sur la carte : couche suivante (phase `map`) ou, si la
   * dernière couche est traversée, lancement du boss de région.
   */
  private _advanceMap(state: BattleState): BattleState {
    const run = state.run;
    if (run.map == null || !state.playerMonster) return state;

    const nextLayer = run.mapLayer + 1;
    if (run.map.layers[nextLayer]) {
      const next: BattleState = {
        ...state,
        run: { ...run, mapLayer: nextLayer, phase: "map" },
        enemyMonster: null,
        isBossFight: false,
        winner: null,
        isPlayerTurn: true,
        playerLastMove: null,
        enemyLastMove: null,
        playerFeedback: null,
        enemyFeedback: null,
      };
      this._persistState(next);
      return next;
    }

    const { enemyMonster, logs } = this.controller.enterBossCombat(
      state.playerMonster,
      run,
    );
    const next: BattleState = {
      ...state,
      enemyMonster,
      isBossFight: true,
      winner: null,
      isPlayerTurn: true,
      run: {
        ...run,
        mapLayer: nextLayer,
        phase: "encounter",
        bossBattle: true,
      },
      logs: [...state.logs, ...logs],
      playerLastMove: null,
      enemyLastMove: null,
      playerFeedback: null,
      enemyFeedback: null,
    };
    this._persistState(next);
    playSound("encounter");
    return next;
  }

  /** Victoire du joueur : délègue les récompenses (score, soins, reliques) au controller. */
  private _onPlayerWin(state: BattleState): BattleState {
    const isBoss = state.isBossFight || state.run.bossBattle;
    const result = this.controller.handlePlayerVictory({
      player: state.playerMonster!,
      enemy: state.enemyMonster!,
      run: state.run,
      isBossFight: isBoss,
    });

    if (isBoss && state.playerMonster) {
      const region = REGIONS[state.run.regionIndex];
      // Fin de région : le champion est gravé TEL QUEL. Les objets à effet
      // durable ne sont plus fusionnés — ils tombent désormais en pièces
      // d'équipement (capacités signature), portées via la fenêtre
      // « Équipement » (seules les pièces portées sont actives).
      this.championRepository.saveChampion(
        state.playerMonster,
        state.run.regionIndex,
        region.name,
      );
      this.savedChampions.set(this.championRepository.list());
      result.logs.push(
        `🏆 ${state.playerMonster.name} a été gravé au Panthéon des Champions !`,
      );
    }

    return { ...state, run: result.run, logs: [...state.logs, ...result.logs] };
  }

  /**
   * Programme la fin de round (récompenses, relique, région conquise, ou
   * permadeath) **après** `ROUND_END_DELAY`, le temps que l'animation de
   * victoire ou de défaite se joue. Sans ce délai, l'écran suivant s'affichait
   * dans la même frame que le coup fatal.
   *
   * Idempotent : un second round ne peut pas empiler deux programmations.
   * Juice : au passage, on déclenche la fanfare de victoire / le tir de
   * défaite et, sur un boss, l'overlay de célébration (confettis) qui
   * couvrira précisément le délai de `ROUND_END_DELAY`.
   */
  private _scheduleRoundEnd(winner: "player" | "enemy", isBoss?: boolean): void {
    if (this.roundEndScheduled) return;
    this.roundEndScheduled = true;
    playSound(winner === "player" ? "victory" : "defeat");
    if (winner === "player" && isBoss) {
      fireCelebration("bossClear", ROUND_END_DELAY);
    }
    this._later(() => {
      this.store.update((state) => {
        // Le round a pu être relancé entre-temps : on ne forge rien.
        if (state.winner !== winner) return state;
        this.roundEndScheduled = false;
        return this._applyRoundWinner(state);
      });
    }, ROUND_END_DELAY);
  }

  /**
   * Vrai si le combat courant est une confrontation de boss de région.
   * Utilisé par les appels à `_scheduleRoundEnd` pour saquer le juice.
   */
  private _isBossFightOf(state: BattleState): boolean {
    return state.isBossFight || state.run.bossBattle;
  }

  /** Juice de montée de niveau : fanfare 8 bits + overlay de célébration. */
  private _levelUpJuice(): void {
    playSound("levelup");
    fireCelebration("levelup", 1600);
  }

  /** Termine la partie selon le vainqueur du round (une seule application). */
  private _applyRoundWinner(state: BattleState): BattleState {
    if (state.winner === "player") {
      const s = this._onPlayerWin(state);
      // Victoire → persiste (relique / région conquise) ou efface (Champion).
      this._persistState(s);
      return s;
    }
    if (state.winner === "enemy") {
      // Permadeath : la sauvegarde du run est supprimée.
      this._clearSaved();
      return { ...state, run: { ...state.run, phase: "runover" } };
    }
    return state;
  }

  /**
   * Exécute (après le délai) le tour de l'ennemi — second dans l'ordre
   * d'initiative — puis affiche logs, feedback et issue du round.
   * Les mutations n'ont lieu qu'à cet instant : les PV ennemis/joueur
   * défilent donc dans le bon ordre.
   */
  private _enemyLater(makeOpts: () => PlayTurnOptions): void {
    this._later(() => {
      this.store.update((state) => {
        if (state.winner) return state;
        const action = this.controller.playTurn(makeOpts());
        let s: BattleState = {
          ...state,
          isEnemyAttacking: true,
          enemyLastMove: action.move,
          logs: [...state.logs, ...action.logs],
          winner: action.winner,
        };
        s = this._attachFeedback(s, action);
        if (s.winner) {
          // Le coup fatal : on laisse l'animation de victoire/défaite se jouer
          // avant de basculer sur l'écran suivant.
          this._scheduleRoundEnd(s.winner, this._isBossFightOf(s));
        } else {
          s = this._applyRoundWinner(s);
        }
        this._endAnimLater("isEnemyAttacking");
        return { ...s, isPlayerTurn: s.winner == null };
      });
    }, ENEMY_TURN_DELAY);
  }

  /**
   * Exécute (après le délai) le tour du joueur — second dans l'ordre
   * d'initiative — puis affiche logs, feedback et issue du round.
   */
  private _playerLater(makeOpts: () => PlayTurnOptions): void {
    this._later(() => {
      let leveledUp = false;
      let roundWinner: "player" | "enemy" | null = null;
      this.store.update((state) => {
        if (state.winner) return state;
        const action = this.controller.playTurn(makeOpts());
        leveledUp = action.leveledUp;
        roundWinner = action.winner;
        let s: BattleState = {
          ...state,
          isAttacking: true,
          playerLastMove: action.move,
          logs: [...state.logs, ...action.logs],
          winner: action.winner,
        };
        s = this._attachFeedback(s, action);
        if (s.winner) {
          this._scheduleRoundEnd(s.winner, this._isBossFightOf(s));
        } else {
          s = this._applyRoundWinner(s);
        }
        this._endAnimLater("isAttacking");
        return { ...s, isPlayerTurn: s.winner == null };
      });
      if (leveledUp) {
        // Si le coup a été fatal, la fenêtre de niveau s'ouvre après
        // l'animation de fin de round, pas dessus.
        const wait = roundWinner ? ROUND_END_DELAY : 0;
        this._levelUpJuice();
        this._later(
          () => this.openMoveModal(true),
          wait + ANIMATION_END_DELAY + 300,
        );
      }
    }, ENEMY_TURN_DELAY);
  }

  /** Pose le feedback d'un tour sur le bon monstre + programme son nettoyage. */
  private _attachFeedback(
    state: BattleState,
    action: PlayTurnResult,
  ): BattleState {
    const key =
      action.feedbackTarget === state.playerMonster
        ? "playerFeedback"
        : "enemyFeedback";
    if (this.feedbackTimers[key]) clearTimeout(this.feedbackTimers[key]!);
    this.feedbackTimers[key] = setTimeout(
      () => this._clearFeedbackField(key),
      FEEDBACK_CLEAR_DELAY,
    );
    // Juice sonore : chaque feedback porte son bruit (coup, critique, soin…) —
    // un seul point de branchement couvre tous les chemins du combat.
    const fb = action.feedback;
    if (fb.kind === "damage") playSound(fb.isCrit ? "crit" : "hit");
    else if (fb.kind === "heal") playSound("heal");
    else if (fb.kind === "buff") playSound("buff");
    else if (fb.kind === "fumble") playSound("fumble");
    else if (fb.kind === "miss") playSound("miss");
    return { ...state, [key]: action.feedback };
  }

  private _clearFeedbackField = (key: "playerFeedback" | "enemyFeedback") => {
    this.store.update((s) => ({ ...s, [key]: null }));
  };

  private _endAnimLater(flag: "isAttacking" | "isEnemyAttacking"): void {
    this._later(() => {
      this.store.update((s) => ({ ...s, [flag]: false }));
    }, ANIMATION_END_DELAY);
  }

  /** Exécute `cb` dans `ms`, en traçant le timer pour pouvoir l'annuler. */
  private _later(cb: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      cb();
    }, ms);
    this.pendingTimers.add(timer);
  }

  // --- Panthéon des Champions (Monstres victorieux de boss & import/export) ---

  public getSavedChampions(): SavedChampion[] {
    return this.championRepository.list();
  }

  public deleteSavedChampion = (id: string): void => {
    this.championRepository.remove(id);
    this.savedChampions.set(this.championRepository.list());
  };

  public saveImportedChampion = (
    monster: Monster,
    regionIndex = 0,
    regionName = "Importé",
  ): void => {
    this.championRepository.saveChampion(monster, regionIndex, regionName);
    this.savedChampions.set(this.championRepository.list());
  };

  // --- Gestion & Grimoire des Capacités ---

  public openMoveModal = (isLevelUp = false): void => {
    this.isLevelUpMovePrompt.set(isLevelUp);
    this.isMoveModalOpen.set(true);
  };

  public closeMoveModal = (): void => {
    this.isMoveModalOpen.set(false);
    this.isLevelUpMovePrompt.set(false);
  };

  public getAvailableMoves = (): Move[] => {
    let currentMonster: Monster | null = null;
    const unsub = this.store.subscribe((s) => {
      currentMonster = s.playerMonster;
    });
    unsub();
    if (!currentMonster) return [];
    return this.controller.getAvailableMovesForMonster(currentMonster);
  };

  public setPlayerMoves = (newMoves: Move[]): void => {
    this.store.update((state) => {
      if (!state.playerMonster) return state;
      state.playerMonster.setMoves(newMoves);
      this._persistState(state);
      return { ...state };
    });
    this.closeMoveModal();
  };

  /** Annule tous les timers en vol (round, animations, feedback) — newRun/load/startRun. */
  private _clearTimers(): void {
    this.pendingTimers.forEach((timer) => clearTimeout(timer));
    this.pendingTimers.clear();
    this.roundEndScheduled = false;
    for (const key of ["playerFeedback", "enemyFeedback"] as const) {
      if (this.feedbackTimers[key]) {
        clearTimeout(this.feedbackTimers[key]!);
        this.feedbackTimers[key] = undefined;
      }
    }
  }

  // --- Persistance (helpers) ---

  /** Sauvegarde l'état si la run est en cours ; efface si la partie est finie. */
  private _persistState(state: BattleState): void {
    if (!state.playerMonster) return;

    if (
      state.run.phase === "starter" ||
      state.run.phase === "runover" ||
      state.run.phase === "victory"
    ) {
      this._clearSaved();
      return;
    }

    const save: RunSave = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      playerMonster: MonsterIO.toSnapshot(state.playerMonster),
      enemyMonster: state.enemyMonster
        ? MonsterIO.toSnapshot(state.enemyMonster)
        : undefined,
      run: state.run,
    };
    this.saveRepository.save(save);
    this.savedRun.set(true);
  }

  private _clearSaved(): void {
    this.saveRepository.clear();
    this.savedRun.set(false);
  }
}

export function createBattleStore(
  controller: BattleController,
  saveRepository: SaveRepository,
  championRepository: ChampionRepository,
): BattleStore {
  return new BattleStore(controller, saveRepository, championRepository);
}
