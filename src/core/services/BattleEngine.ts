import type { Monster, MonsterRank, StatGrowth } from "../entities/Monster";
import { abilityModifier, charismaHealBonus, levelPaceFactor } from "../entities/Monster";
import type { Move, MonsterStat, MonsterType } from "../entities/Move";
import { STAT_LABELS, moveAccuracyBonus } from "../entities/Move";
import {
  STATUS_CONFIGS,
  type StatusEffectType,
} from "../entities/StatusEffect";
import { typeEffectiveness } from "./effectiveness";

/**
 * Rapport de montée de niveau (façon RPG Maker, qui liste les gains) : niveau
 * atteint, points gagnés par caractéristique et capacités apprises. Alimente le
 * pop-up de montée de niveau côté UI.
 */
export interface LevelUpSummary {
  /** Niveau atteint (final si plusieurs paliers ont été franchis d'un coup). */
  level: number;
  /** Nombre de niveaux franchis par ce gain d'EXP (≥ 1). */
  levels: number;
  /** Points gagnés par caractéristique, cumulés sur tous les paliers franchis. */
  statGains: StatGrowth;
  /** Noms des capacités apprises à cette montée (remplies par le contrôleur). */
  learnedMoves: string[];
}

export interface BattleLog {
  message: string;
  // Add a payload to signal a level up to the store
  payload?: {
    leveledUp?: boolean;
    /** Détail de la montée de niveau (gains de stats), pour le pop-up. */
    levelUp?: LevelUpSummary;
  };
}

/**
 * Structured visual feedback for the UI (floating numbers, flashes, shakes).
 */
export interface CombatFeedback {
  kind: "damage" | "heal" | "buff" | "fumble" | "miss" | "none";
  damage: number;
  isCrit: boolean;
  label?: string;
}

export interface TurnResult {
  logs: BattleLog[];
  feedback: CombatFeedback;
}

/** Modificateurs de run (reliques) appliqués aux dégâts infligés. */
export interface BattleModifiers {
  /** Bonus de dégâts final en % (ex. 10 → ×1.10). */
  damagePercent?: number;
  /** Range de critiques élargi (2 → critiques sur 19-20). */
  critRange?: number;
  /** Bonus d'EXP gagnée en % (ex. 25 → ×1.25). */
  experiencePercent?: number;
}

/** Générateur de dés injectable — permet des tests déterministes. */
export interface Dice {
  roll(count: number, sides: number): number;
}

/** Dépendances du moteur, injectables pour rendre un tour reproductible. */
export interface BattleEngineDeps {
  dice?: Dice;
  /**
   * Source d'aléatoire de la **variance de dégâts** (0 inclus → 1 exclu).
   * Injectée comme les dés : sans elle, les tests de dégâts exacts deviennent
   * instables. `0.5` = variance neutre (facteur 1).
   */
  variance?: () => number;
}

export const defaultDice: Dice = {
  roll(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  },
};

/**
 * Rang du monstre vaincu → multiplicateur d'XP (dnd : 10 PNJ / 20 minion /
 * 50 boss). Les boss rapportent nettement plus.
 */
export const RANK_XP_MULTIPLIER: Record<MonsterRank, number> = {
  normal: 1,
  boss: 1.5,
};

function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Absorption de dégâts de la victime : si son modificateur de Constitution
 * est **positif**, il est retiré des dégâts d'attaque qu'elle subit (règle
 * « robustesse »). Un modificateur négatif ne rend jamais plus vulnérable :
 * il vaut alors 0. Les dégâts restent bornés à 1 au minimum.
 */
export function constitutionDamageReduction(defender: Monster): number {
  return Math.max(0, abilityModifier(defender.constitution));
}

/**
 * Dégâts de statuts en fin de tour, en fraction du PV max de la victime.
 *
 * Rééquilibré avec le reste du moteur : à 8 % / 5 %, une brûlure durait 3 tours
 * à elle seule consommait un quart de la réserve de PV, et le poison empilait
 * sa toxicité bien au-delà0. En miroir, les deux camps
 * s'infligeaient le même statut en boucle et les combats s'éternisaient
 * (24 rounds moyens au niveau 9). Ces deux valeurs sont des partages de PV, pas
 * des multiplicateurs de dégâts : ils restent lisibles pour le joueur.
 */
export const BURN_DAMAGE_RATIO = 0.06;
export const POISON_DAMAGE_RATIO = 0.04;

/**
 * Multiplicateur des dégâts d'une attaque qui consomme une **charge**
 * (« ちからため », mécanique RPG Maker/Dragon Quest).
 *
 * 1.6 : un tour investi doit rapporter sensiblement plus qu'une attaque
 * normale (sinon la charge ne se joue jamais), sans transformer la signature
 * de niveau 9 en exécution — ×1.6 sur 130 reste dans l'épaisseur d'une barre
 * de PV de boss.
 */
export const CHARGE_DAMAGE_MULTIPLIER = 1.6;

/**
 * Amplitude de la **variance de dégâts** façon Dragon Quest : chaque coup
 * touche varie dans ±12 %.
 *
 * DQ ne publie jamais un nombre exact — les dégâts « respirent », ce qui
 * interdit les calculs de seuil parfaits (lire « il me faut 3 coups » devient
 * une estimation). La variance reste **modérée** : au-delà de ±20 %, un combat
 * se décide sur un jet de dé et non sur les choix du joueur.
 */
export const DAMAGE_VARIANCE_PERCENT = 12;

/**
 * Maps a move's power to a weapon die face count (1d6…1d20).
 * Recalibré à la hausse (rebalance §5) : les mouvements physiques doivent
 * rester compétitifs face à la magie.
 */
function powerToDie(power: number): number {
  if (power < 40) return 6;
  if (power < 60) return 8;
  if (power < 80) return 10;
  if (power < 110) return 12;
  return 20;
}

/**
 * Dé d'un sort : **quatre faces de plus** que le dé d'arme equivalent.
 *
 * C'est la compensation de la puissance de type dampée (magie ×1.5 / ×0.67
 * contre ×2 / ×0.5 en physique). Multiplicateur moyen sur un adversaire tiré
 * au hasard : ×1.20 en physique contre ×1.07 en magie — sans ce dé plus gros,
 * le sort serait Structurellement plus faible alors que sa table de types est
 * volontairement plus douce.
 */
export const SPELL_DIE_BONUS = 4;

/** Dé d'un sort, dimensionné par la puissance du move (comme `powerToDie`). */
function powerToSpellDie(power: number): number {
  return powerToDie(power) + SPELL_DIE_BONUS;
}

/**
 * Bonus de dégâts d'un move physique, analogue au BonusDégâts d'une arme :
 * ajouté aux dégâts uniquement (le bonus de *toucher* est `moveAccuracyBonus`,
 * inversé à la puissance — voir `core/entities/Move.ts`).
 *
 * Physique uniquement : le sort n'a pas d'arme, son dé fait déjà office.
 */
function moveDamageBonus(move: Move): number {
  return Math.floor(move.power / 20);
}

/** Terme linéaire de la puissance d'un move physique (le move « pèse »). */
function movePowerFlat(move: Move): number {
  return Math.floor(move.power / 10);
}

export interface AttackOutcome {
  hit: boolean;
  crit: boolean;
  fumble: boolean;
  roll: number;
  total: number;
  ac: number;
  attackMod: number;
  /** Bonus de précision du move (inversé à la puissance). */
  bonus: number;
}

export interface DamageRoll {
  desc: string;
  total: number;
}

/**
 * Moteur de combat d20 (règles D&D).
 *
 * Sépare :
 *  1. la **résolution pure** (jets, dégâts, multiplicateurs — aucune mutation),
 *  2. l'**application des effets** (mutation des monstres : dégâts, soin, buff,
 *     cooldowns, exp/niveau),
 *  3. la **génération des logs + feedback**.
 *
 * Le générateur de dés (`Dice`) est injecté pour rendre les tours déterministes
 * dans les tests — principe d'injection de dépendance.
 */
export class BattleEngine {
  private readonly dice: Dice;
  private readonly variance: () => number;

  constructor(deps: BattleEngineDeps = {}) {
    this.dice = deps.dice ?? defaultDice;
    this.variance = deps.variance ?? Math.random;
  }

  /**
   * Facteur de variance Dragon Quest : 1 au centre, borné à
   * ±{@link DAMAGE_VARIANCE_PERCENT} %.
   */
  varianceFactor(): number {
    const spread = DAMAGE_VARIANCE_PERCENT / 100;
    return 1 + (this.variance() * 2 - 1) * spread;
  }

  // --- 1. Résolution pure (aucune mutation) ---

  /**
   * D&D attack resolution:
   *  - arme physique : 1d20 + mod(Force) + BonusPrécision
   *  - sort :          1d20 + mod(Savoir/i) + BonusPrécision
   *  - CA : 10 + mod(Vitesse) + armure, **plafonnée** (cf. `Monster.getAC` :
   *    sans plafond, `total >= ac` devenait impossible et le monstre
   *    intouchable). `AttackOutcome.ac` renvoie la CA *effective*.
   *  - 20 naturel → touche + critique ; 1 naturel → fumble (raté).
   *  - `critRange` élargit les jets de critique (ex. 2 → 19-20), reliques joueur.
   *  - Le bonus de précision (`moveAccuracyBonus`) est INVERSÉ à la puissance :
   *    les attaques faibles touchent plus facilement que les puissantes.
   */
  resolveAttack(
    attacker: Monster,
    defender: Monster,
    move: Move,
    critRange = 1,
  ): AttackOutcome {
    const attackStat = move.isPhysical ? attacker.strength : attacker.wisdom;
    const attackMod = abilityModifier(attackStat);
    const bonus = moveAccuracyBonus(move);
    const ac = defender.getAC();

    // Coup mortel (Dragon Quest) : **aucun jet**. Il touche toujours — pas de
    // fumble, pas de CA à franchir, pas d'aléa consommé (le ruisseau de dés
    // reste identique, ce qui garde les scénarios de test lisibles).
    if (move.guaranteedCrit) {
      return { hit: true, crit: false, fumble: false, roll: 0, total: 0, ac, attackMod, bonus };
    }

    const roll = this.dice.roll(1, 20);
    const total = roll + attackMod + bonus;
    const fumble = roll === 1;
    // L'Instinct aiguise les réflexes et la perception martiale (élargit la plage de critique)
    const instinctCritBonus = Math.max(
      0,
      Math.floor(abilityModifier(attacker.instinct) / 2),
    );
    const effectiveCritRange = Math.max(1, critRange + instinctCritBonus);
    const crit = !fumble && roll >= 21 - effectiveCritRange;
    const hit = !fumble && (crit || roll === 20 || total >= ac);
    return { hit, crit, fumble, roll, total, ac, attackMod, bonus };
  }

  /**
   * D&D damage roll:
   *  - physique : `1dX + P/10 + P/20 + mod(Force)` (crit : `2dX`) — un
   *    modificateur d'arme sur le jet de dégâts, comme au d20.
   *  - magique : `1d(X+4) + P/10 + mod(Savoir)` (crit : `2d(X+4)`) — même
   *    squelette que l'arme, avec un **dé plus gros** pour compenser la
   *    puissance de type dampée de la magie.
   *
   * **Pourquoi ce changement** : la formule historique `Savoir × (1 + P/120)`
   * faisait des dégâts magiques une fonction *linéaire de la caractéristique
   * brute*. Or le Savoir croît de +2 à +3 par niveau, là où le modificateur de
   * Force ne change que tous les 2 points : mesuré au niveau 7, un monstre
   * Plante (Savoir 24) faisait 32 de dégâts moyens avec son meilleur sort
   * contre 18-21 pour tous les types physiques (Force 22-24). La magie
   * simplement ignorait l'investissement physique et écrasait le reste du
   * catalogue. Passer le sort sur `mod(Savoir)` réaligne les deux natures.
   *
   * Le Charisme reste le multiplicateur **exclusif** de la magie
   * (`charismaMagicFactor`, +2 % par point au-delà de 10) : c'est désormais
   * le seul levier d'amplification, ce qui lui donne enfin un rôle mécanique
   * lisible côté sorcier.
   *
   * Le résultat est **brut** : l'absorption par la Constitution de la victime
   * (`constitutionDamageReduction`) s'applique ensuite, dans `executeTurn`
   * et `calculateDamage`, sur le dégât final.
   */
  rollDamage(attacker: Monster, move: Move, crit: boolean): DamageRoll {
    const count = crit ? 2 : 1;
    // Les dégâts progressent sur la même courbe que les PV (`levelPaceFactor`),
    // sans quoi chaque niveau gagné doublait la réserve sans rien gagner au coup.
    const pace = levelPaceFactor(attacker.level);
    if (move.isPhysical) {
      const sides = powerToDie(move.power);
      const total = Math.max(
        1,
        Math.floor(
          (this.dice.roll(count, sides) +
            movePowerFlat(move) +
            abilityModifier(attacker.strength) +
            moveDamageBonus(move)) *
            pace,
        ),
      );
      return {
        desc: `${count}d${sides}+${movePowerFlat(move)}`,
        total,
      };
    }
    const sides = powerToSpellDie(move.power);
    const charmFactor = attacker.charismaMagicFactor();
    const total = Math.max(
      1,
      Math.floor(
        (this.dice.roll(count, sides) +
          movePowerFlat(move) +
          abilityModifier(attacker.wisdom)) *
          pace *
          charmFactor,
      ),
    );
    const charm = charmFactor > 1 ? ` × Charisme${charmFactor.toFixed(2)}` : "";
    return {
      desc: `${count}d${sides}${sides > 20 ? '' : '+' + movePowerFlat(move)}${charm}${crit ? ' (crit)' : ''}`,
      total: Math.max(1, total),
    };
  }

  /**
   * Multiplicateur de type : ×2/×0.5 en physique, ×1.5/×0.67 en magie
   * (dampé pour éviter les one-shots, cf. rebalance §5).
   */
  typeMultiplier(
    moveType: MonsterType,
    defenderType: MonsterType,
    isPhysical = true,
  ): number {
    return typeEffectiveness(moveType, defenderType, isPhysical);
  }

  /** Dégâts finaux arrondis (multiplicateur de type × modificateurs de run). */
  computeFinalDamage(
    rawDamage: number,
    multiplier: number,
    modifiers?: BattleModifiers,
    variance = 1,
  ): number {
    const damageBonusFactor = modifiers?.damagePercent
      ? 1 + modifiers.damagePercent / 100
      : 1;
    return Math.max(
      1,
      Math.floor(rawDamage * multiplier * damageBonusFactor * variance),
    );
  }

  calculateDamage(attacker: Monster, defender: Monster, move: Move): number {
    const outcome = this.resolveAttack(attacker, defender, move);
    if (!outcome.hit) return 0;
    const roll = this.rollDamage(attacker, move, outcome.crit);
    const base = this.computeFinalDamage(
      roll.total,
      this.typeMultiplier(move.type, defender.type, move.isPhysical),
      undefined,
      this.varianceFactor(),
    );
    // Absorption : mod(Constitution) positif de la victime retiré des dégâts.
    // Un coup mortel ignore cette défense.
    const reduction = move.guaranteedCrit ? 0 : constitutionDamageReduction(defender);
    return Math.max(1, base - reduction);
  }

  /**
   * XP gagnée : `40 + 16 × niveau de l'attaquant` (la base croît avec votre
   * niveau), modulée par l'écart de niveau (`1.5^écart`, **bornée ×0.4…×2.5**
   * pour qu'un ennemi quelques niveaux en dessous reste rentable) et par le
   * rang du vaincu (boss ×1.5). Les reliques d'XP s'ajoutent en %.
   *
   * Rebalance 2026-09 (§16) : aplatit la courbe de début de run — l'ancienne
   * formule (`100 × 1.9^écart`) s'effondrait dès que le joueur dépassait ses
   * ennemis et le garde-fou « min 50 XP » était du code mort (jamais atteint
   * dans le scénario normal de jeu).
   */
  calculateExperienceGained(
    attacker: Monster,
    defender: Monster,
    experiencePercent = 0,
  ): number {
    const baseExperience = 40 + 16 * attacker.level;
    const levelDifference = defender.level - attacker.level;
    const levelMultiplier = Math.min(
      2.5,
      Math.max(0.4, Math.pow(1.5, levelDifference)),
    );
    const rankMultiplier = RANK_XP_MULTIPLIER[defender.rank] ?? 1;
    const relicMultiplier = 1 + experiencePercent / 100;

    return Math.floor(
      baseExperience * levelMultiplier * rankMultiplier * relicMultiplier,
    );
  }

  // --- 2. Application des effets (mutation des monstres) ---

  /**
   * Vérifie si le monstre peut agir ce tour-ci face aux altérations de statut :
   *  - Gel : jet de sauvegarde d20 CON (DD 12) pour briser la glace. Si échec, tour sauté !
   *  - Paralysie : jet de sauvegarde d20 CON (DD 11). Si échec, action interrompue !
   */
  checkCanAct(actor: Monster): {
    canAct: boolean;
    logs: BattleLog[];
    skippedDueToStatus?: StatusEffectType;
  } {
    const logs: BattleLog[] = [];

    // 1. Contrôle du Gel
    if (actor.hasStatus("freeze")) {
      const roll = this.dice.roll(1, 20);
      const saveMod = abilityModifier(actor.constitution);
      const total = roll + saveMod;
      const dc = 12;

      if (roll === 20 || (roll !== 1 && total >= dc)) {
        actor.removeStatus("freeze");
        logs.push({
          message: `❄️✨ ${actor.name} réussit son jet de sauvegarde CON [1d20${sign(saveMod)} = ${total} vs DD ${dc}] et brise la glace ! Le gel se dissipe.`,
        });
      } else {
        const st = actor.getStatus("freeze")!;
        st.duration -= 1;
        logs.push({
          message: `❄️❌ ${actor.name} est gelé et ne peut pas agir ! [1d20${sign(saveMod)} = ${total} < DD ${dc}].`,
        });
        if (st.duration <= 0) {
          actor.removeStatus("freeze");
          logs.push({ message: `❄️ La couche de glace finit par fondre.` });
        }
        return { canAct: false, logs, skippedDueToStatus: "freeze" };
      }
    }

    // 2. Contrôle de la Paralysie
    if (actor.hasStatus("paralysis")) {
      const roll = this.dice.roll(1, 20);
      const saveMod = abilityModifier(actor.constitution);
      const total = roll + saveMod;
      const dc = 11;

      if (roll === 20 || (roll !== 1 && total >= dc)) {
        logs.push({
          message: `⚡💪 ${actor.name} surmonte la paralysie pour cette action ! [1d20${sign(saveMod)} = ${total} vs DD ${dc}]`,
        });
      } else {
        logs.push({
          message: `⚡❌ Une décharge nerveuse paralyse ${actor.name} ! [1d20${sign(saveMod)} = ${total} < DD ${dc}] Son action échoue !`,
        });
        return { canAct: false, logs, skippedDueToStatus: "paralysis" };
      }
    }

    return { canAct: true, logs };
  }

  /**
   * Traitement des effets de statut en fin de tour pour le monstre actif :
   *  - Brûlure : dégâts fixes de feu (8 % PV max) + jet CON (DD 12) pour éteindre.
   *  - Poison : dégâts progressifs (5 % × toxicité PV max) + jet CON (DD 13) pour purger.
   *  - Paralysie : jet CON (DD 12) pour récupérer sa pleine motricité.
   */
  processEndOfTurnStatus(monster: Monster): {
    logs: BattleLog[];
    totalDamage: number;
    fainted: boolean;
  } {
    const logs: BattleLog[] = [];
    let totalDamage = 0;

    // 1. Brûlure
    if (monster.hasStatus("burn")) {
      const burnDmg = Math.max(1, Math.floor(monster.maxHp * BURN_DAMAGE_RATIO));
      monster.takeDamage(burnDmg);
      totalDamage += burnDmg;
      logs.push({
        message: `🔥 ${monster.name} brûle et subit ${burnDmg} dégâts de feu !`,
      });

      if (monster.isFainted()) {
        return { logs, totalDamage, fainted: true };
      }

      const saveRoll = this.dice.roll(1, 20);
      const saveMod = abilityModifier(monster.constitution);
      const saveTotal = saveRoll + saveMod;
      if (saveRoll === 20 || (saveRoll !== 1 && saveTotal >= 12)) {
        monster.removeStatus("burn");
        logs.push({
          message: `🔥✨ ${monster.name} réussit son jet de sauvegarde [1d20${sign(saveMod)} = ${saveTotal} vs DD 12] et éteint les flammes !`,
        });
      } else {
        const st = monster.getStatus("burn");
        if (st) {
          st.duration -= 1;
          if (st.duration <= 0) {
            monster.removeStatus("burn");
            logs.push({
              message: `🔥 Les flammes autour de ${monster.name} finissent par s'éteindre.`,
            });
          }
        }
      }
    }

    // 2. Poison (dégâts progressifs)
    if (monster.hasStatus("poison")) {
      const st = monster.getStatus("poison")!;
      const potency = st.potency ?? 1;
      const poisonDmg = Math.max(
        1,
        Math.floor(monster.maxHp * (POISON_DAMAGE_RATIO * potency)),
      );
      monster.takeDamage(poisonDmg);
      totalDamage += poisonDmg;
      logs.push({
        message: `🌿 ${monster.name} souffre du poison (toxicité ${potency}) : -${poisonDmg} PV !`,
      });
      st.potency = potency + 1;

      if (monster.isFainted()) {
        return { logs, totalDamage, fainted: true };
      }

      const saveRoll = this.dice.roll(1, 20);
      const saveMod = abilityModifier(monster.constitution);
      const saveTotal = saveRoll + saveMod;
      if (saveRoll === 20 || (saveRoll !== 1 && saveTotal >= 13)) {
        monster.removeStatus("poison");
        logs.push({
          message: `🌿✨ Le système immunitaire de ${monster.name} neutralise le poison [1d20${sign(saveMod)} = ${saveTotal} vs DD 13] !`,
        });
      } else {
        st.duration -= 1;
        if (st.duration <= 0) {
          monster.removeStatus("poison");
          logs.push({
            message: `🌿 Le poison dans les veines de ${monster.name} s'estompe naturellement.`,
          });
        }
      }
    }

    // 3. Paralysie (jet de récupération de fin de tour)
    if (monster.hasStatus("paralysis")) {
      const saveRoll = this.dice.roll(1, 20);
      const saveMod = abilityModifier(monster.constitution);
      const saveTotal = saveRoll + saveMod;
      if (saveRoll === 20 || (saveRoll !== 1 && saveTotal >= 12)) {
        monster.removeStatus("paralysis");
        logs.push({
          message: `⚡✨ ${monster.name} dissipe la paralysie [1d20${sign(saveMod)} = ${saveTotal} vs DD 12] et retrouve sa pleine motricité !`,
        });
      } else {
        const st = monster.getStatus("paralysis");
        if (st) {
          st.duration -= 1;
          if (st.duration <= 0) {
            monster.removeStatus("paralysis");
            logs.push({
              message: `⚡ Les spasmes électriques de ${monster.name} cessent.`,
            });
          }
        }
      }
    }

    return { logs, totalDamage, fainted: monster.isFainted() };
  }

  /**
   * Soin (règle sorts D&D) : `(niveau + 1)d4 + mod(Constitution) +
   * max(0, mod(Savoir)) + max(0, mod(Charisme)) + healPower`, plafonné aux PV max.
   *
   * Le Charisme s'ajoute au Savoir (rebalance P0) : il rend les reliques
   * « +N Charisme » jouables, et donne un vrai archétype de soigneur.
   *
   * `healPower` (et non `power`) gradue les sorts de soin entre eux : ils
   * gardent `power: 0` afin de ne jamais passer par le jet d'attaque.
   */
  applyHeal(attacker: Monster, move: Move): number {
    const healAmount = Math.max(
      1,
      this.dice.roll(attacker.level + 1, 4) +
        abilityModifier(attacker.constitution) +
        Math.max(0, abilityModifier(attacker.wisdom)) +
        charismaHealBonus(attacker.charisma) +
        (move.healPower ?? 0),
    );
    attacker.heal(healAmount);
    return healAmount;
  }

  /** Buff additif et permanent sur une stat (règle D&D). */
  applyBuff(attacker: Monster, move: Move): MonsterStat | null {
    const boost = move.statBoosts;
    if (!boost) return null;
    attacker.boostStat(boost.stat, boost.value);
    return boost.stat;
  }

  /** Cooldowns : la move utilisée entre en recharge, les autres décrémentent. */
  manageCooldowns(attacker: Monster, usedMove: Move): void {
    attacker.moves.forEach((move) => {
      if (move.id === usedMove.id && move.maxCoolDown) {
        move.coolDown = move.maxCoolDown;
      } else if (move.coolDown && move.coolDown > 0) {
        move.coolDown -= 1;
      }
    });
  }

  /** Récompenses de défaite : exp + montée de niveau(s) de l'attaquant. */
  applyDefeatRewards(
    attacker: Monster,
    defender: Monster,
    experiencePercent?: number,
  ): { leveledUp: boolean; levels: number; statGains: StatGrowth; logs: BattleLog[] } {
    const experience = this.calculateExperienceGained(
      attacker,
      defender,
      experiencePercent,
    );
    const { leveledUp, levels, statGains, logs: expMessages } =
      attacker.gainExperience(experience);
    return {
      leveledUp,
      levels,
      statGains,
      logs: expMessages.map((message) => ({ message })),
    };
  }

  // --- 3. Orchestration du tour ---

  executeTurn(
    attacker: Monster,
    defender: Monster,
    chosenMove: Move,
    modifiers?: BattleModifiers,
  ): TurnResult {
    const logs: BattleLog[] = [];
    let feedback: CombatFeedback = { kind: "none", damage: 0, isCrit: false };

    // 1. Validation: Does the monster know the move?
    const actualMoveInstance = attacker.moves.find(
      (m) => m.id === chosenMove.id,
    );
    if (!actualMoveInstance) {
      logs.push({
        message: `Erreur : Le monstre ne connaît pas ce mouvement.`,
      });
      return { logs, feedback };
    }

    // 2. Cooldown Check
    if (actualMoveInstance.coolDown && actualMoveInstance.coolDown > 0) {
      logs.push({
        message: `${attacker.name} échoue ! ${actualMoveInstance.name} est en recharge (${actualMoveInstance.coolDown} tours).`,
      });
      return { logs, feedback };
    }

    // 3. Execution Start
    logs.push({
      message: `${attacker.name} utilise ${actualMoveInstance.name}!`,
    });

    // 4. Damaging move: D&D d20 attack resolution
    let isFumble = false;
    if (actualMoveInstance.power > 0) {
      const outcome = this.resolveAttack(
        attacker,
        defender,
        actualMoveInstance,
        modifiers?.critRange ?? 1,
      );

      if (outcome.fumble) {
        isFumble = true;
        feedback = { kind: "fumble", damage: 0, isCrit: false };
        logs.push({
          message: `❌ ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! [1d20 = 1] ❌ Raté (fumble) !`,
        });
      } else if (outcome.hit) {
        const roll = this.rollDamage(
          attacker,
          actualMoveInstance,
          outcome.crit,
        );
        const multiplier = this.typeMultiplier(
          actualMoveInstance.type,
          defender.type,
          actualMoveInstance.isPhysical,
        );
        // Variance Dragon Quest : les dégâts « respirent » (±12 %).
        const base = this.computeFinalDamage(
          roll.total,
          multiplier,
          modifiers,
          this.varianceFactor(),
        );
        // Absorption : si le mod(Constitution) de la victime est positif, il
        // est retiré des dégâts d'attaque (minimum 1 dégât infligé).
        // Un **coup mortel** traverse cette défense.
        const mortal = Boolean(actualMoveInstance.guaranteedCrit);
        const reduction = mortal ? 0 : constitutionDamageReduction(defender);
        let final = Math.max(1, base - reduction);

        // Charge armée : consommée par la première attaque qui **touche**
        // (un raté la laisse en place, elle n'est pas dépensée).
        const charged = attacker.consumeCharge();
        if (charged > 0) final = Math.max(1, Math.floor(final * charged));

        defender.takeDamage(final);
        feedback = { kind: "damage", damage: final, isCrit: outcome.crit };

        const critMark = outcome.crit ? " 💥 CRITIQUE !" : "";
        const signature = mortal
          ? "Coup mortel"
          : `[1d20${sign(outcome.attackMod)}${sign(outcome.bonus)}${outcome.bonus ? " précision" : ""} = ${outcome.total}] vs CA ${outcome.ac}`;
        const effective = multiplier !== 1 ? ` (×${multiplier})` : "";
        const soak =
          reduction > 0
            ? ` − ${reduction} (mod CON ${sign(reduction)} de ${defender.name})`
            : "";
        const chargeMark =
          charged > 0 ? ` ⚡ charge dépensée ×${charged.toFixed(2)}` : "";
        const hitLine = mortal
          ? `${signature} → touche toujours (ignore la défense) !`
          : `Jet ${signature} → Touché !`;

        logs.push({
          message:
            `🎯${critMark} ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! ` +
            `${hitLine} Dégâts : ${roll.total}${effective} = ${base}${soak}${chargeMark} = ${final}.`,
        });

        // Application de l'effet de statut élémentaire (si la capacité en possède un et la cible est vivante)
        if (actualMoveInstance.statusEffect && !defender.isFainted()) {
          const statusEffect = actualMoveInstance.statusEffect;
          const chanceRoll = this.dice.roll(1, 100);
          if (chanceRoll <= statusEffect.chance) {
            const saveRoll = this.dice.roll(1, 20);
            const saveMod = abilityModifier(defender.constitution);
            const saveTotal = saveRoll + saveMod;
            const dc = statusEffect.dc ?? 12;
            const cfg = STATUS_CONFIGS[statusEffect.type];

            if (saveRoll === 20 || (saveRoll !== 1 && saveTotal >= dc)) {
              logs.push({
                message: `🛡️ ${defender.name} réussit son jet de sauvegarde CON [1d20${sign(saveMod)} = ${saveTotal} vs DD ${dc}] et résiste à l'effet ${cfg.name} !`,
              });
            } else {
              defender.addStatus(
                statusEffect.type,
                statusEffect.duration ?? 3,
                1,
              );
              logs.push({
                message: `${cfg.icon} Échec du jet de sauvegarde [1d20${sign(saveMod)} = ${saveTotal} < DD ${dc}] ! ${defender.name} subit l'effet ${cfg.name} (${statusEffect.duration ?? 3} tours) !`,
              });
            }
          }
        }
      } else {
        feedback = { kind: "miss", damage: 0, isCrit: false };
        logs.push({
          message:
            `❌ ${attacker.name} attaque ${defender.name} avec ${actualMoveInstance.name} ! ` +
            `Jet [1d20${sign(outcome.attackMod)}${sign(outcome.bonus)}${outcome.bonus ? " précision" : ""} = ${outcome.total}] < CA ${outcome.ac} → Raté !`,
        });
      }
    }

    // 5. Soin sur soi-même — jamais de jet d'attaque ni de fumble possible.
    if (actualMoveInstance.isHeal && !isFumble) {
      const healAmount = this.applyHeal(attacker, actualMoveInstance);
      feedback = { kind: "heal", damage: healAmount, isCrit: false };
      logs.push({ message: `🧪 ${attacker.name} récupère ${healAmount} PV !` });
    }

    // 6. Stat Buffing (self, permanent additive boost — D&D buff rule)
    if (actualMoveInstance.statBoosts && !isFumble) {
      const stat = this.applyBuff(attacker, actualMoveInstance);
      if (stat) {
        feedback = {
          kind: "buff",
          damage: actualMoveInstance.statBoosts.value,
          isCrit: false,
        };
        logs.push({
          message: `✨ Les statistiques de ${attacker.name} augmentent : +${actualMoveInstance.statBoosts.value} ${STAT_LABELS[stat]} (permanent).`,
        });
      }
    }

    // 6b. Charge (« ちからため ») : arme la prochaine attaque de l'attaquant.
    if (actualMoveInstance.charge) {
      attacker.armCharge(CHARGE_DAMAGE_MULTIPLIER);
      logs.push({
        message: `⚡ ${attacker.name} concentre son énergie : sa prochaine attaque infligera ×${CHARGE_DAMAGE_MULTIPLIER.toFixed(2)} dégâts !`,
      });
    }

    // 7. Cooldown Management (always, even on fumble)
    this.manageCooldowns(attacker, actualMoveInstance);

    // 8. Post-Turn Check
    if (defender.isFainted()) {
      logs.push({ message: `☠️ ${defender.name} est K.O. !` });
      const { leveledUp, levels, statGains, logs: expLogs } =
        this.applyDefeatRewards(
          attacker,
          defender,
          modifiers?.experiencePercent,
        );
      expLogs.forEach((log) => logs.push(log));

      if (leveledUp) {
        logs.push({
          message: `(Système) ${attacker.name} a gagné un niveau !`,
          payload: {
            leveledUp: true,
            levelUp: {
              level: attacker.level,
              levels,
              statGains,
              learnedMoves: [],
            },
          },
        });
      }
    }

    return { logs, feedback };
  }
}
