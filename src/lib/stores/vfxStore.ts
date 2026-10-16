import { writable } from "svelte/store";

/**
 * Le **calque d'effets 3D** de l'arène (`ArenaSpellLayer`) est-il opérationnel ?
 *
 * Il répond à une seule question : les attaques à distance ont-elles leur
 * rendu 3D ? Si oui, l'orbe CSS de `MonsterDisplayer` — qui ne peut pas
 * franchir le gap entre les deux combattants (chaque canvas est rogné à sa
 * boîte) — est masqué au profit du projectile WebGL. Si non (contexte WebGL
 * indisponible), l'orbe CSS reprend la main : le jeu ne perd jamais son
 * projectile.
 *
 * Volatil, purement visuel : rien n'est sauvegardé.
 */
export const spellVfxReady = writable(false);
