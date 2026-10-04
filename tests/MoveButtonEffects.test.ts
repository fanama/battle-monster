import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Assertions **structurelles** sur les templates des écrans de sélection.
 *
 * Le rendu SSR n'est pas exploitable ici : les composants sont compilés pour
 * le client par Vite, et `svelte/compiler` ne peut pas s'exécuter dans cet
 * environnement (dépendance `esrap` absente). Ces tests vérifient donc que le
 * markup contient bien les branches d'affichage attendues — la compilation
 * réelle, elle, est couverte par `bun run check` et `bun run build`.
 */
const ROOT = path.join(import.meta.dir, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const moveDisplayer = read('src/lib/components/atoms/MoveDisplayer.svelte');
const moveManagerModal = read('src/lib/components/molecules/MoveManagerModal.svelte');

describe('Bouton de combat (MoveDisplayer) — effets affichés', () => {
  test('affiche le bonus de buff via STAT_LABELS (jamais la clé brute)', () => {
    expect(moveDisplayer).toContain('move.statBoosts');
    expect(moveDisplayer).toContain('STAT_LABELS[move.statBoosts.stat]');
  });

  test('affiche la puissance de base des attaques', () => {
    expect(moveDisplayer).toMatch(/P\.\{move\.power\}/);
  });

  test("n'emploie pas ⚡ pour la puissance (déjà utilisé par l'indicateur PRÊT)", () => {
    // `⚡` appartient à « ⚡ PRÊT » dans l'en-tête du bouton.
    expect(moveDisplayer).toMatch(/⚡ PRÊT/);
    expect(moveDisplayer).not.toMatch(/⚡\s*\{move\.power\}/);
  });

  test('affiche le bonus de soin healPower', () => {
    expect(moveDisplayer).toMatch(/💚 \+\{move\.healPower\} PV/);
  });

  test('affiche les effets de statut avec leur probabilité', () => {
    expect(moveDisplayer).toContain('move.statusEffect.chance');
    expect(moveDisplayer).toContain('STATUS_CONFIGS');
  });

  test('importe les libellés FR des stats', () => {
    expect(moveDisplayer).toMatch(/import \{[^}]*STAT_LABELS[^}]*\} from ".*entities\/Move"/);
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