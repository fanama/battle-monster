import type { Monster } from '../../core/entities/Monster';
import {
  CHARISMA_BASE,
  charismaHealBonus,
  charismaMagicPercent,
  effectiveArmorBonus,
} from '../../core/entities/Monster';
import type { Relic, RelicEffect } from '../../core/entities/Relic';
import { STAT_LABELS, type MonsterStat } from '../../core/entities/Move';

/**
 * Traduit les champs bruts d'une `RelicEffect` en lignes lisibles
 * (« +2 Force », « Critiques sur 19-20 »). Les 83 reliques du catalogue
 * écrivent leur `description` à la main avec des formulations variables
 * (`+1 CA`, `+2 à la CA (armure)`, `Dégâts +5 %`…) : passer par l'effet
 * garantit un affichage homogène et toujours juste.
 */
export interface RelicEffectLine {
  /** Étiquette de l'effet (stat, armure, soin…). */
  label: string;
  /** Valeur formatée, ex. `+2`, `sur 19-20`. */
  value: string;
  /** Précision stratégique (« ≈ 8 PV par combat », « 10 % de chance par coup »). */
  hint?: string;
}

/** Ordre d'affichage canonique des stats (identique aux fiches monstre). */
const STAT_ORDER: MonsterStat[] = [
  'strength',
  'speed',
  'constitution',
  'charisma',
  'wisdom',
  'instinct',
];

/** Un d20 = 20 faces : chaque point de range de critique vaut 5 % par attaque. */
const DICE_FACES = 20;

/**
 * Le Charisme n'a pas de modificateur lisible : on traduit donc ses points en
 * conséquences concrètes (dégâts magiques en %, PV par sort de soin), en
 * partant de la valeur de création (`CHARISMA_BASE`).
 */
function charismaHint(points: number): string {
  const magic = charismaMagicPercent(CHARISMA_BASE + points) - charismaMagicPercent(CHARISMA_BASE);
  const heal = charismaHealBonus(CHARISMA_BASE + points) - charismaHealBonus(CHARISMA_BASE);
  const parts = [`+${magic} % de dégâts magiques`];
  if (heal > 0) parts.push(`+${heal} PV par soin`);
  return parts.join(', ');
}

function statLines(effect: RelicEffect): RelicEffectLine[] {
  return STAT_ORDER.filter((stat) => effect.stat?.[stat]).map((stat) => ({
    label: STAT_LABELS[stat],
    value: `+${effect.stat?.[stat] ?? 0}`,
    hint: stat === 'charisma' ? charismaHint(effect.stat?.charisma ?? 0) : 'permanent',
  }));
}

/** Lignes d'effet d'une seule relique, dans l'ordre : stats, puis passifs. */
export function relicEffectLines(relic: Relic): RelicEffectLine[] {
  const e = relic.effect;
  const lines: RelicEffectLine[] = statLines(e);

  if (e.acBonus) {
    lines.push({
      label: 'CA',
      value: `+${e.acBonus}`,
      hint: 'armure, à chaque combat',
    });
  }
  if (e.damagePercent) {
    lines.push({
      label: 'Dégâts',
      value: `+${e.damagePercent} %`,
      hint: 'sur chaque coup infligé',
    });
  }
  if (e.lifestealPercent) {
    lines.push({
      label: 'Vol de vie',
      value: `${e.lifestealPercent} %`,
      hint: `≈ ${e.lifestealPercent} PV pour 100 dégâts`,
    });
  }
  if (e.healStartPercent) {
    lines.push({
      label: 'Soin initial',
      value: `${e.healStartPercent} %`,
      hint: 'des PV max, à chaque début de combat',
    });
  }
  if (e.critRange) {
    lines.push({
      label: 'Critique',
      value: `sur ${DICE_FACES + 1 - e.critRange}-${DICE_FACES}`,
      hint: `≈ ${e.critRange * 5} % de chance par attaque`,
    });
  }
  if (e.experiencePercent) {
    lines.push({
      label: 'EXP',
      value: `+${e.experiencePercent} %`,
      hint: 'montée de niveau accélérée',
    });
  }

  return lines;
}

/**
 * Effets cumulés de tout le run, avec les conséquences chiffrées quand le
 * monstre est connu (CA réelle, PV lors du soin de début de combat).
 */
export function relicEffectTotals(relics: Relic[], player: Monster | null = null): RelicEffectLine[] {
  const lines: RelicEffectLine[] = [];

  for (const stat of STAT_ORDER) {
    const total = relics.reduce((sum, r) => sum + (r.effect.stat?.[stat] ?? 0), 0);
    if (total > 0) {
      lines.push({ label: STAT_LABELS[stat], value: `+${total}`, hint: 'permanent' });
    }
  }

  const acBonus = relics.reduce((sum, r) => sum + (r.effect.acBonus ?? 0), 0);
  if (acBonus > 0) {
    lines.push({
      label: 'CA',
      value: `+${acBonus}`,
      hint: player ? `CA actuelle : ${player.getAC()}` : 'armure',
    });
  }

  const damage = relics.reduce((sum, r) => sum + (r.effect.damagePercent ?? 0), 0);
  if (damage > 0) {
    lines.push({ label: 'Dégâts', value: `+${damage} %`, hint: 'cumulés sur chaque coup' });
  }

  const lifesteal = relics.reduce((sum, r) => sum + (r.effect.lifestealPercent ?? 0), 0);
  if (lifesteal > 0) {
    lines.push({
      label: 'Vol de vie',
      value: `${lifesteal} %`,
      hint: `≈ ${lifesteal} PV pour 100 dégâts infligés`,
    });
  }

  const healStart = relics.reduce((sum, r) => sum + (r.effect.healStartPercent ?? 0), 0);
  if (healStart > 0) {
    lines.push({
      label: 'Soin initial',
      value: `${healStart} %`,
      hint: player
        ? `≈ ${Math.floor((player.maxHp * healStart) / 100)} PV restaurés par combat`
        : 'des PV max, à chaque début de combat',
    });
  }

  const critRange = relics.reduce((max, r) => Math.max(max, r.effect.critRange ?? 0), 0);
  if (critRange > 0) {
    lines.push({
      label: 'Critique',
      value: `sur ${DICE_FACES + 1 - critRange}-${DICE_FACES}`,
      hint: `≈ ${critRange * 5} % de chance par attaque`,
    });
  }

  const xp = relics.reduce((sum, r) => sum + (r.effect.experiencePercent ?? 0), 0);
  if (xp > 0) {
    lines.push({ label: 'EXP', value: `+${xp} %`, hint: 'niveaux plus rapides' });
  }

  return lines;
}
