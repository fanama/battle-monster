import { writable } from "svelte/store";

/**
 * Événements « célébration » ponctuels de l'UI : le store expose le type de
 * célébration en cours, App.svelte affiche l'overlay correspondant (fanfare de
 * montée de niveau, victoire de boss avec confettis). Volatil : rien n'est
 * sauvegardé, ceci est purement du juice visuel/sonore.
 */
export type CelebrationKind = "levelup" | "bossClear" | null;

export const celebration = writable<CelebrationKind>(null);

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** Déclenche une célébration ; retombe à `null` après `ms`. */
export function fireCelebration(kind: Exclude<CelebrationKind, null>, ms = 1800): void {
  if (clearTimer != null) clearTimeout(clearTimer);
  celebration.set(kind);
  clearTimer = setTimeout(() => {
    clearTimer = null;
    celebration.set(null);
  }, ms);
}
