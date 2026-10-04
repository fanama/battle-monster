import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Garde-fous sur la mise en scène « Street Fighter » de l'arène.
 *
 * Le rendu Svelte n'est pas exécutable ici (composants compilés pour le
 * client, `svelte/compiler` indisponible) : on vérifie donc le markup et les
 * styles. `bun run check` et `bun run build` couvrent la compilation réelle.
 */
const ROOT = path.join(import.meta.dir, '../');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const app = read('src/App.svelte');
const monster = read('src/lib/components/molecules/MonsterDisplayer.svelte');
const styles = read('src/lib/styles/style.ts');
const hud = read('src/lib/components/atoms/FighterHud.svelte');

describe('Arène en vue Street Fighter', () => {
  test('les deux combattants passent en variante « stage »', () => {
    expect(app.match(/variant="stage"/g)?.length).toBe(2);
  });

  test('la variante « card » reste le défaut du composant', () => {
    expect(monster).toMatch(/export let variant: "card" \| "stage" = "card"/);
  });

  test('en mode scène, le monstre n’est plus encadré', () => {
    // Le style de carte (bordure + fond dégradé) n'est appliqué qu'en `card`.
    expect(monster).toMatch(/variant === 'stage' \? monsterStyles\.container\.stage : monsterStyles\.container\.base/);
    expect(monster).toMatch(/variant === 'card' \? \(isPlayer \?/);
    expect(read('src/lib/styles/monsterStyles.ts')).toMatch(/stage: `/);
  });

  test('la fiche (stats, PV, moves) est masquée en mode scène', () => {
    // nameTag + info.container sont sous un `{#if variant === 'card'}`.
    expect(monster).toMatch(/\{#if variant === 'card'\}[\s\S]*?nameTag\.wrapper_base/);
  });

  test('le sprite de scène a une hauteur explicite (le canvas est h-full)', () => {
    // Sans hauteur fixe, `h-full` sur le canvas ne résout rien et le sprite
    // s'effondre à 0 pixel.
    expect(monster).toMatch(/variant === 'stage'\s*\?\s*'[^']*h-\d+[^']*'/);
  });

  test('la hauteur du combattant tient dans la rangée de scène', () => {
    // Conversions Tailwind utilisées (px) : h-N/NN = 4px par pas, 1rem = 16px.
    const px = (rem: number) => rem * 16;
    const step = (n: number) => (n <= 10 ? n * 4 : (n - 9) * 4);

    // Plus petit palier : arène min-h-[300px], scène pt-16 (64) + pb-4 (16).
    const stageAvail = 300 - px(1) * 4 - px(1);
    // Sprite le plus petit + ombre (h-3 + mt-0.5) + étiquette (mt-1 + ~20px).
    const sprite = step(40);
    const fighter = sprite + 2 + step(3) + 4 + 20;

    // L'arène est en `overflow-hidden` : un dépassement rogne les pieds.
    expect(fighter).toBeLessThan(stageAvail);
  });

  test('le combattant est ancré au sol par une ombre portée', () => {
    expect(monster).toContain('stageShadow.base');
  });

  test('les combattants sont alignés sur une même ligne de sol', () => {
    expect(styles).toMatch(/arenaStage: `[\s\S]*?items-end/);
    expect(app).toContain('styles.layout.arenaStage');
  });

  test('le HUD porte les barres de vie aux coins de l’arène', () => {
    expect(hud).toContain('HealthBar');
    expect(hud).toMatch(/isPlayer \? "items-start text-left" : "items-end text-right"/);
    expect(app).toContain('<FighterHud');
    expect(app.match(/<FighterHud/g)?.length).toBe(2);
  });

  test('la scène a un décor (horizon + sol) et non un simple aplat', () => {
    expect(app).toContain('Ligne d\'horizon');
    expect(app).toContain('Lignes de sol en perspective');
    expect(styles).toMatch(/arena: `[\s\S]*?overflow-hidden/);
  });
});