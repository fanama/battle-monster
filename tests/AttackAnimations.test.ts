import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { attackFamily } from '../src/lib/renderers/spellVfx';

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

describe('Familles d’animation d’attaque', () => {
  test('le composant.route le coup vers l’une des trois familles', () => {
    // La règle vit désormais dans `spellVfx.attackFamily` (**source de vérité
    // unique**) : la pose articulée et le projectile 3D de l'arène la partagent,
    // donc ils ne peuvent plus diverger. Le composant ne fait que la consommer.
    expect(SRC).toContain('import { attackFamily } from "../../renderers/spellVfx"');
    expect(SRC).toContain(
      '$: attackKind = !isAttacking || !lastMove ? null : attackFamily(lastMove);',
    );
  });

  test("l'attaque physique → charge au corps à corps (melee)", () => {
    expect(attackFamily({ power: 40, isPhysical: true })).toBe('melee');
    expect(attackFamily({ power: 140, isPhysical: true })).toBe('melee');
  });

  test('l’attaque magique à distance → ranged', () => {
    expect(attackFamily({ power: 55, isPhysical: false })).toBe('ranged');
    // Un sort de soin reste `utility`, même s’il est magique.
    expect(attackFamily({ power: 0, isPhysical: false })).toBe('utility');
  });

  test('soin et buff → utility (canalisation)', () => {
    expect(attackFamily({ power: 0, isPhysical: false })).toBe('utility');
    expect(attackFamily({ power: 0, isPhysical: true })).toBe('utility');
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

  test('la charge physique porte le corps jusqu’au contact (≥ 40 % de la scène)', () => {
    // Au sommet de la charge (palier 46 %), le corps est propulsé vers
    // l’adversaire : l’amplitude du clamp doit dépasser 40 % du conteneur
    // pour que les deux créatures se croisent. Le clamp de l’ennemi est le
    // miroir exact (bornes px et % opposés).
    const matches = (kf: string) =>
      keyframeBody(kf).match(/clamp\((-?[\d.]+)px,\s*(-?[\d.]+)%/);
    const p = matches('melee-player');
    const e = matches('melee-enemy');
    expect(p, 'melee-player : charge au clamp').not.toBeNull();
    expect(e, 'melee-enemy : charge au clamp').not.toBeNull();
    expect(Math.abs(Number(p![2])), 'amplitude joueur ≥ 40 %').toBeGreaterThanOrEqual(40);
    expect(Math.abs(Number(e![2])), 'amplitude ennemi ≥ 40 %').toBeGreaterThanOrEqual(40);
    // Miroir exact : le % au sommet est le même en valeur absolue, et les
    // bornes px suivent (valeur absolue identique, signe opposé).
    expect(Math.abs(Number(e![2]))).toBe(Math.abs(Number(p![2])));
    expect(Math.sign(Number(e![2]))).toBe(-Math.sign(Number(p![2])));
    // Le clamp CSS range ses bornes [min, val, max] : avec les valeurs
    // négatives de l’ennemi, l’ordre des bornes px est inversé — on compare
    // l’ENSEMBLE des bornes absolues {38, 84}.
    const pxBounds = (kf: string) =>
      [...keyframeBody(kf).matchAll(/clamp\(([^)]+)\)/g)]
        .flatMap((m) => m[1]!.split(',').map((v) => Math.abs(parseFloat(v))))
        .sort((a, b) => a - b)
        .join(',');
    expect(pxBounds('melee-enemy')).toBe(pxBounds('melee-player'));
  });

  test('l’attaque à distance a un projectile, avec le 3D en primaire et le CSS en repli', () => {
    // Le projectile 3D de l'arène (`ArenaSpellLayer`) est la version principale :
    // il relie réellement les deux combattants. L'orbe CSS reste le repli quand
    // le contexte WebGL manque — il n'est donc jamais du code mort.
    expect(SRC).toContain("attackKind === 'ranged' && isAttacking && !$spellVfxReady");
    expect(SRC).toContain('class:projectile-fx-player=');
    expect(SRC).toContain('class:projectile-fx-enemy=');
    expect(SRC).toContain('@keyframes projectile-player');
    expect(SRC).toContain('@keyframes projectile-enemy');
    for (const kf of ['projectile-player', 'projectile-enemy']) {
      const body = keyframeBody(kf);
      // Départ du corps (40 %) puis arrivée au-delà du centre de l’arène
      // (115 % du conteneur : franchit le gap central).
      expect(body).toContain('40%');
      expect(body).toContain('115%');
      // Petite courbe (le projectile passe au-dessus du sol).
      expect(body).toContain('top');
    }
    // Le vol est chronométré pour coïncider avec la fin de l’animation ranged
    // (0.72 s = 0.28 s d’armement + 0.44 s de vol).
    // 0.72 s attendus = 0.28 s d’armement (delay) + 0.44 s de vol,
    // pour les DEUX camps (la règle figure deux fois, player + enemy).
    expect(SRC.match(/0\.44s cubic-bezier\([^;]*0\.28s both/g) ?? []).toHaveLength(2);
  });
});