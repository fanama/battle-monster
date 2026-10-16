import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Assertions **structurelles** sur les surfaces de sélection des capacités.
 *
 * Le rendu SSR n'est pas exploitable ici : les composants sont compilés pour le
 * client par Vite, et `svelte/compiler` ne peut pas s'exécuter dans cet
 * environnement (dépendance `esrap` absente). Ces tests vérifient donc que le
 * markup contient bien les branches d'affichage attendues — la compilation
 * réelle, elle, est couverte par `bun run check` et `bun run build`.
 *
 * **Où vivent les effets depuis le reskin DQ** : les quatre cartes de combat
 * (`MoveDisplayer`) qui portaient chacune six pastilles ont été remplacées par
 * la fenêtre de commande en deux temps (`CommandWindow`). Les chiffres n'ont
 * pas disparu — ils ont déménagé dans la **fenêtre de détail**, qui affiche la
 * capacité survolée ou sélectionnée. Ce fichier garde donc exactement les mêmes
 * garanties (chaque effet est visible quelque part, avec ses libellés FR), sur
 * les nouvelles surfaces.
 */
const ROOT = path.join(import.meta.dir, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const commandWindow = read('src/lib/components/molecules/CommandWindow.svelte');
const moveManagerModal = read('src/lib/components/molecules/MoveManagerModal.svelte');
const app = read('src/App.svelte');

describe('Fenêtre de détail (CommandWindow) — effets affichés', () => {
  test('affiche le bonus de buff via STAT_LABELS (jamais la clé brute)', () => {
    expect(commandWindow).toContain('inspected.statBoosts');
    expect(commandWindow).toContain('STAT_LABELS[inspected.statBoosts.stat]');
    // Aucune interpolation directe de `.stat`, qui afficherait « strength ».
    expect(commandWindow).not.toMatch(/\{inspected\.statBoosts\.stat\}/);
  });

  test('affiche la puissance de base des attaques', () => {
    expect(commandWindow).toMatch(/P\.\{inspected\.power\}/);
  });

  test("n'emploie pas ⚡ pour la puissance (réservé à l'état de recharge)", () => {
    expect(commandWindow).toContain('⏳');
    expect(commandWindow).not.toMatch(/⚡\s*\{inspected\.power\}/);
  });

  test('affiche le bonus de soin healPower', () => {
    expect(commandWindow).toMatch(/💚 \+\{inspected\.healPower\} PV/);
  });

  test('affiche la précision et l’efficacité contre la cible', () => {
    expect(commandWindow).toContain('moveAccuracyBonus(inspected)');
    expect(commandWindow).toContain('typeEffectiveness(inspected.type, targetType, inspected.isPhysical)');
    expect(commandWindow).toContain('Super efficace');
    expect(commandWindow).toContain('Peu efficace');
  });

  test('affiche les effets de statut avec leur probabilité et leur DD', () => {
    expect(commandWindow).toContain('inspected.statusEffect.chance');
    expect(commandWindow).toContain('STATUS_CONFIGS');
    expect(commandWindow).toContain('inspected.statusEffect.dc');
  });

  test('importe les libellés FR des stats', () => {
    expect(commandWindow).toMatch(/import \{[^}]*STAT_LABELS[^}]*\} from ".*entities\/Move"/);
  });
});

describe('Fenêtre de commande — menu en deux temps', () => {
  test('le menu racine propose les quatre commandes réelles du moteur', () => {
    // « Fuir » n'existe pas dans le moteur : aucune commande morte n'est
    // affichée. Faiblesses ouvre le Codex élémentaire, comme l'ancien bouton.
    expect(commandWindow).toContain('label: "Attaquer"');
    expect(commandWindow).toContain('label: `Sacoche (${potions})`');
    expect(commandWindow).toContain('label: "Grimoire"');
    expect(commandWindow).toContain('label: "Faiblesses"');
    expect(commandWindow).not.toContain('"Fuir"');
  });

  test('la seconde étape est la liste des capacités, avec retour', () => {
    expect(commandWindow).toContain('type Step = "root" | "moves"');
    expect(commandWindow).toContain('← Retour');
    expect(commandWindow).toContain('"Commandes" : "Capacités"');
  });

  test('le curseur DQ suit le clavier (↑ ↓, Entrée, Échap)', () => {
    expect(commandWindow).toContain('"ArrowDown"');
    expect(commandWindow).toContain('"ArrowUp"');
    expect(commandWindow).toContain('"Enter"');
    expect(commandWindow).toContain('"Escape"');
    expect(commandWindow).toContain('focusRow');
  });

  test('une capacité en recharge reste inspectable mais inerte', () => {
    // `aria-disabled` (et non `disabled`) : la ligne garde le focus pour qu'on
    // puisse lire ses chiffres, mais l'activation ne fait rien.
    expect(commandWindow).toContain('aria-disabled={disabled || !ready}');
    expect(commandWindow).toMatch(/if \(!move \|\| \(move\.coolDown \?\? 0\) > 0\) return;/);
  });

  test('un nouveau tour repart du menu racine', () => {
    expect(commandWindow).toContain('step = "root"');
    expect(commandWindow).toContain('prevDisabled');
  });
});

describe('Câblage de l’arène', () => {
  test('la fenêtre de commande remplace la grille de cartes de combat', () => {
    expect(app).toContain('<CommandWindow');
    expect(app).toContain('onAttack={(index) => battleStore.attack(index)}');
    expect(app).toContain('moves={player.moves}');
    // L'ancienne barre d'action et ses cartes ne sont plus référencées.
    expect(app).not.toContain('MoveDisplayer');
    expect(app).not.toContain('styles.actionBar');
  });

  test('les commandes secondaires passent par la même fenêtre', () => {
    expect(app).toContain('onOpenInventory={() => (isInventoryOpen = true)}');
    expect(app).toContain('onOpenMoves={() => battleStore.openMoveModal(false)}');
    expect(app).toContain('onOpenCodex={() => openCodex("elements")}');
  });
});

describe('Modal de gestion (MoveManagerModal) — effets affichés', () => {
  test('la liste des moves disponibles rend le buff avec son libellé FR', () => {
    // `STAT_LABELS[move.statBoosts!.stat]` : plus aucune interpolation
    // directe de `.stat`, qui afficherait « strength ».
    expect(moveManagerModal).toContain('STAT_LABELS[move.statBoosts!.stat]');
    expect(moveManagerModal).not.toMatch(/\{move\.statBoosts\?\.stat\}/);
  });

  test('la liste des moves « équipées » rend le buff avec son libellé FR', () => {
    expect(moveManagerModal).toContain(
      'STAT_LABELS[equippedMove.statBoosts!.stat]',
    );
    expect(moveManagerModal).not.toMatch(/\{equippedMove\.statBoosts\?\.stat\}/);
  });

  test('les deux listes affichent healPower sur les soins', () => {
    expect(moveManagerModal).toContain('💚 Soin{move.healPower ?');
    expect(moveManagerModal).toContain('💚 Soin{equippedMove.healPower ?');
  });

  test('les deux listes affichent la puissance et les statuts', () => {
    expect(moveManagerModal).toContain('⚡ P.{move.power}');
    expect(moveManagerModal).toContain('⚡ P.{equippedMove.power}');
    expect(moveManagerModal).toContain('{move.statusEffect.chance}');
    expect(moveManagerModal).toContain('{equippedMove.statusEffect.chance}');
  });
});

describe('Dépôt de moves — les effets existent bien dans les données', () => {
  const repo = read('src/infra/repositories/MoveRepositories.ts');

  test('un move de buff par type déclare un statBoosts (6 au total)', () => {
    expect(repo.match(/statBoosts:/g)?.length).toBe(6);
  });

  test('un sort de soin par type déclare healPower (6 au total)', () => {
    expect(repo.match(/healPower:/g)?.length).toBe(6);
  });

  test('aucun sort de soin ne porte de power > 0', () => {
    // Garantit qu'un soin n'est jamais résolu comme une attaque dans
    // `executeTurn` (`if (power > 0)`), donc n'inflige pas de dégâts.
    for (const id of ['normal-heal', 'water-cascade', 'fire-bain', 'elec-regen']) {
      // Bloc de l'objet du move : de son id jusqu'à sa fermeture.
      const block = new RegExp(`"${id}":\\s*\\{([\\s\\S]*?)\\n\\s*\\},`).exec(repo);
      expect(block?.[1], `bloc ${id} introuvable`).toBeTruthy();
      expect(block![1]).toMatch(/power:\s*0\b/);
      expect(block![1]).toMatch(/isHeal:\s*true/);
    }
  });
});
