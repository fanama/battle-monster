import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Garde-fous du hub de combat (réglage lisibilité + ambiance) :
 *  - les points de vie restent lisibles sur grand écran (barre haute, texte
 *    contrasté) — le web est le principal écran de jeu ;
 *  - l'arène porte le décor « Dragon Quest » : ciel étoilé, lune, vignette.
 * La compilation réelle est couverte par `svelte-check` / `bun run build`.
 */
const SRC_DIR = path.join(import.meta.dir, '../src');

const healthbar = fs.readFileSync(
  path.join(SRC_DIR, 'lib/components/atoms/HealthBar.svelte'),
  'utf8',
);
const app = fs.readFileSync(path.join(SRC_DIR, 'App.svelte'), 'utf8');

describe('Points de vie lisibles en web', () => {
  test('la barre de vie gagne en hauteur au format desktop', () => {
    expect(healthbar).toMatch(/h-5 md:h-6/);
  });

  test('la valeur des PV est grande, en mono, sur fond opaque', () => {
    expect(healthbar).toMatch(/text-\[11px\] md:text-sm/);
    // `tabular-nums` : les chiffres ne « dansent » pas quand les PV changent.
    expect(healthbar).toContain('tabular-nums');
    // Plaque opaque derrière le texte (lisible sur barre rouge/jaune).
    expect(healthbar).toMatch(/bg-black\/60/);
  });

  test('le fond de la barre est sombre : le dégradé de vie tranche dessus', () => {
    expect(healthbar).toContain('bg-slate-950/85');
  });
});

describe('Décor d’arène façon Dragon Quest', () => {
  test('le ciel porte deux couches d’étoiles scintillantes', () => {
    // Deux densités distinctes, scintillement décalé.
    expect(app).toContain('dq-stars-far');
    expect(app).toContain('dq-stars-near');
    expect(app).toContain('animation-delay: 1.4s');
  });

  test('une lune éclaire le ciel', () => {
    expect(app).toContain('dq-moon');
  });

  test('l’horizon est un décor 3D (calque WebGL, ligne lumineuse)', () => {
    expect(app).toContain('<ArenaEnvironment />');
  });

  test('une vignette assombrit les bords (encadré de combat DQ)', () => {
    expect(app).toContain('dq-vignette');
  });

  test('le sol est un décor 3D et gagne une lueur centrale', () => {
    // Le sol, la grille et les piliers viennent du calque WebGL.
    expect(app).not.toContain('repeating-linear-gradient(to bottom, rgba(147,197,253,0.09)');
    // Halo de terrain au centre (entre les deux combattants).
    expect(app).toContain('radial-gradient(ellipse 58% 42% at 50% 76%');
  });

  test('le décor repose AU-DESSUS de la teinte régionale (arenaBg inchangé)', () => {
    // La scène DQ ne remplace pas la couleur régionale : elle la teinte.
    expect(app).toContain('style={arenaStyle}');
    expect(app).toContain('regionColors.arenaBg');
  });
});
