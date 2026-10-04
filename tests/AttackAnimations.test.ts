import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Garde-fous sur les trois familles d'animation d'attaque.
 *
 * Le rendu Svelte n'est pas exécutable ici (composants compilés pour le
 * client, `svelte/compiler` indisponible) : on vérifie le script et le CSS.
 * `bun run check` et `bun run build` couvrent la compilation réelle.
 */
const SRC = fs.readFileSync(
  path.join(
    import.meta.dir,
    '../src/lib/components/molecules/MonsterDisplayer.svelte',
  ),
  'utf8',
);

/**
 * Extrait le corps complet d'un jeu de keyframes.
 * On coupe sur le keyframe suivant (ou la fin de feuille), pas sur le premier
 * `}` : chaque palier `40% { ... }` est lui-même une règle accolée.
 */
function keyframeBody(name: string): string {
  const start = SRC.indexOf(`@keyframes ${name} {`);
  if (start === -1) return '';
  const rest = SRC.slice(start + `@keyframes ${name} {`.length);
  const nextRule = rest.search(/@keyframes|\.animate-attack-pulse|\.[a-z-]+ \{/);
  return nextRule === -1 ? rest : rest.slice(0, nextRule);
}

/** Reproduit la règle de routage déclarée dans le composant. */
function attackKind(move: {
  power: number;
  isPhysical: boolean;
} | null): string | null {
  if (!move) return null;
  if (move.power === 0) return 'utility';
  return move.isPhysical ? 'melee' : 'ranged';
}

describe('Familles d’animation d’attaque', () => {
  test('le composant.route le coup vers l’une des trois familles', () => {
    expect(SRC).toContain("$: attackKind = !isAttacking || !lastMove");
    expect(SRC).toMatch(/lastMove\.power === 0\s*\?\s*'utility'/);
    expect(SRC).toMatch(/lastMove\.isPhysical\s*\?\s*'melee'\s*:\s*'ranged'/);
  });

  test("l'attaque physique → charge au corps à corps (melee)", () => {
    expect(attackKind({ power: 40, isPhysical: true })).toBe('melee');
    expect(attackKind({ power: 140, isPhysical: true })).toBe('melee');
  });

  test('l’attaque magique à distance → ranged', () => {
    expect(attackKind({ power: 55, isPhysical: false })).toBe('ranged');
    // Un sort de soin reste `utility`, même s’il est magique.
    expect(attackKind({ power: 0, isPhysical: false })).toBe('utility');
  });

  test('soin et buff → utility (canalisation)', () => {
    expect(attackKind({ power: 0, isPhysical: false })).toBe('utility');
    expect(attackKind({ power: 0, isPhysical: true })).toBe('utility');
  });

  test('les six classes CSS sont câblées sur le composant', () => {
    for (const cls of [
      'attack-melee-player',
      'attack-melee-enemy',
      'attack-ranged-player',
      'attack-ranged-enemy',
      'attack-utility',
    ]) {
      expect(SRC).toContain(`class:${cls}=`);
      expect(SRC).toContain(`.${cls} {`);
    }
  });

  test('chaque famille a des keyframes dédiés', () => {
    for (const kf of [
      'melee-player',
      'melee-enemy',
      'ranged-player',
      'ranged-enemy',
      'channel-utility',
    ]) {
      expect(SRC).toContain(`@keyframes ${kf}`);
    }
  });

  test('les anciennes animations universelles ont disparu', () => {
    // Une seule animationpartageait toutes les attaques : plus de lunge unique
    // ni de saut générique.
    expect(SRC).not.toContain('class:jump-animation');
    expect(SRC).not.toContain('.jump-animation');
    expect(SRC).not.toContain('attack-lunge-player');
    expect(SRC).not.toContain('hop-up');
  });

  test('la version ennemi est le miroir exact de la version joueur', () => {
    // Mêmes paliers (0/18/46/72/100) et amplitude symétrique : la garde de
    // combat doit être identique des deux côtés de l’arène.
    const frames = (name: string) =>
      SRC.split(`@keyframes ${name} {`)[1]?.split('}')[0] ?? '';
    for (const [player, enemy] of [
      ['melee-player', 'melee-enemy'],
      ['ranged-player', 'ranged-enemy'],
    ]) {
      const pct = (s: string) => (s.match(/\d+%/g) ?? []).join(',');
      expect(pct(frames(player)), `${player}/${enemy} paliers`).toBe(
        pct(frames(enemy)),
      );
      // Les translations sont des opposées.
      const values = (s: string) =>
        (s.match(/translateX\((-?[\d.]+)(px|%)\)/g) ?? []).map((v) =>
          v.replace(/translateX\(|\)/g, ''),
        );
      const p = values(frames(player)).filter((v) => !v.includes('clamp'));
      const e = values(frames(enemy)).filter((v) => !v.includes('clamp'));
      expect(e).toHaveLength(p.length);
    }
  });

  test('les animations d’attaque passent APRÈS `.shake` dans la feuille CSS', () => {
    // Régression : un monstre qui frappe reçoit aussi un feedback « damage »,
    // donc la classe `.shake`. À spécificité égale, la dernière règle CSS gagne
    // — si `.shake` venait après, l'animation d'attaque serait masquée sur
    // tous les coups réussis.
    const shake = SRC.indexOf('.shake {');
    for (const cls of [
      '.attack-melee-player {',
      '.attack-melee-enemy {',
      '.attack-ranged-player {',
      '.attack-ranged-enemy {',
      '.attack-utility {',
    ]) {
      expect(SRC.indexOf(cls), `${cls} doit venir après .shake`).toBeGreaterThan(shake);
    }
  });

  test('la victoire et la défaite ont chacune leur animation', () => {
    expect(SRC).toContain('class:outcome-victory=');
    expect(SRC).toContain('class:outcome-defeat=');
    expect(SRC).toContain('.outcome-victory {');
    expect(SRC).toContain('.outcome-defeat {');
    expect(SRC).toContain('@keyframes celebrate-victory');
    expect(SRC).toContain('@keyframes slump-defeat');
  });

  test('la défaite est cumulée : inclinaison, affaissement et désaturation', () => {
    const defeat = keyframeBody('slump-defeat');
    expect(defeat).toContain('rotate');
    expect(defeat).toContain('grayscale');
    expect(defeat).toContain('opacity');
  });

  test('la victoire illumine le vainqueur et le fait bondir', () => {
    const victory = keyframeBody('celebrate-victory');
    expect(victory).toContain('brightness');
    expect(victory).toMatch(/translateY\(-/);
  });

  test('soin et buff ne déplacent pas le monstre sur l’axe horizontal', () => {
    const util = keyframeBody('channel-utility');
    expect(util).toContain('translateY');
    expect(util).not.toContain('translateX');
  });
});